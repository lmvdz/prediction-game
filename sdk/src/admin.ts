import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as anchor from "@project-serum/anchor"
import Game, { GameAccount } from "./accounts/game";
import { createMint, getMint, Mint } from "@solana/spl-token";
import { fetchAccountRetry } from "./util";
import { Workspace } from "./workspace";
import { Oracle } from './types'
import Vault, { VaultAccount } from "./accounts/vault";
import UserPrediction, { UserPredictionAccount } from "./accounts/userPrediction";
import Crank, { CrankAccount } from "./accounts/crank";
import Round, { RoundAccount } from "./accounts/round";
import User, { UserAccount } from "./accounts/user";
import UserClaimable from "./accounts/userClaimable";
import UserPredictionHistory, { UserPredictionHistoryAccount } from "./accounts/userPredictionHistory";
import RoundHistory, { RoundHistoryAccount } from "./accounts/roundHistory";

export const gameSeeds: Array<GameSeed> = [ 
    {
        baseSymbol: "DOT",
        priceProgram: new PublicKey("2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG"), // switchboard program devnet
        priceFeed: new PublicKey("B6bjqp6kL3qniMn9nuzHvjzRLiJvvVusugDXJXhYjNYz"), 
        roundLength: new anchor.BN(300),
        oracle: Oracle.Switchboard
    },
    {
        baseSymbol: "ATOM",
        priceProgram: new PublicKey("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s"),  // pyth oracle program devnet
        priceFeed: new PublicKey("7YAze8qFUMkBnyLVdKT4TFUUFui99EwS5gfRArMcrvFk"),
        roundLength: new anchor.BN(300),
        oracle: Oracle.Pyth
    },
    { 
        baseSymbol: "SOL", 
        priceProgram: new PublicKey("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s"), // pyth oracle program devnet
        priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL pyth price feed devnet
        roundLength: new anchor.BN(300),
        oracle: Oracle.Pyth
    }, 
    {
        baseSymbol: "BTC", 
        priceProgram: new PublicKey("2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG"),  // switchboard program devnet
        priceFeed: new PublicKey("8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"), // BTC switchboard price feed devnet
        roundLength: new anchor.BN(300),
        oracle: Oracle.Switchboard
    }, 
    {
        baseSymbol: "ETH", 
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"),  // ETH chainlink program devnet
        priceFeed: new PublicKey("2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b7Go"), // ETH chainlink price feed devnet
        roundLength: new anchor.BN(300),
        oracle: Oracle.Chainlink
    }
] as Array<GameSeed>;

export type GameSeed = {
    baseSymbol: string,
    priceProgram: PublicKey,
    priceFeed: PublicKey,
    roundLength: anchor.BN,
    oracle: Oracle
}

export async function createFakeMint(connection: Connection, owner: Keypair, keypair?: Keypair, mintDecimals = 6) : Promise<Mint> {
    const mintKey = keypair || Keypair.generate();

    try {
        await createMint(connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mintKey)
    } catch (error) {
        console.warn("mint already created");
    }
    
    return await getMint(connection, mintKey.publicKey);
}

const loadGame = (workspace: Workspace, baseSymbol: string, vault: Vault, oracle: Oracle, priceProgram: PublicKey, priceFeed: PublicKey, roundLength: anchor.BN) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed).then(([gamePubkey, _vaultPubkeyBump]) => {
            fetchAccountRetry<GameAccount>(workspace, 'game', (gamePubkey)).then(gameAccount => {
                resolve(new Game(
                    gameAccount
                ));
            }).catch(error => {
                Game.initGameAndHistory(
                    workspace, 
                    baseSymbol,
                    vault, 
                    oracle,
                    priceProgram, 
                    priceFeed,
                    30,
                    1000,
                    roundLength
                ).then(game => {
                    resolve(game);
                }).catch(error => {
                    reject(error)
                })
            })
        }).catch(error => {
            console.error(error);
                reject(error);
        })
    })
}

const loadVault = (workspace: Workspace, tokenMint: PublicKey) : Promise<Vault> => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getVaultPubkey(tokenMint).then(([vaultPubkey, _vaultPubkeyBump]) => {
            fetchAccountRetry<VaultAccount>(workspace, 'vault', (vaultPubkey)).then(vaultAccount => {
                resolve(new Vault(
                    vaultAccount
                ));
            }).catch(error => {
                Vault.initializeVault(workspace, tokenMint).then(vault => {
                    resolve(vault);
                }).catch(error => {
                    reject(error);
                })
            })
        }).catch(error => {
            console.error(error);
            reject(error);
        })
    })
}

async function initFromGameSeed(workspace: Workspace, gameSeed: GameSeed, mint: PublicKey) : Promise<[Vault, Game]> {
    try {
        let vault = await loadVault(workspace, mint)
        let game = await loadGame(workspace, gameSeed.baseSymbol, vault, gameSeed.oracle, gameSeed.priceProgram, gameSeed.priceFeed, gameSeed.roundLength)
        return [vault, game]
    } catch (error) {
        console.error(error);
        return [null, null]
    }
    
}

export async function closeAll(owner: Keypair, connection: Connection, cluster: Cluster, mintReceiverAta: PublicKey) {
    Promise.allSettled([
        await closeAllVaults(owner, connection, cluster, mintReceiverAta),
        await closeAllUserClaimable(owner, connection, cluster),
        await closeAllRounds(owner, connection, cluster),
        await closeAllCranks(owner, connection, cluster),
        await closeAllUserPredictions(owner, connection, cluster),
        await closeAllUser(owner, connection, cluster),
        await closeAllGames(owner, connection, cluster),
        await closeAllHistory(owner, connection, cluster)
    ])
}

export async function closeAllGames(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.game.all()).map(async gameAccount => {
        console.log('game', gameAccount.publicKey.toBase58());
        let game = new Game(gameAccount.account as unknown as GameAccount);
        try {
            return await (game).adminCloseGame(workspace);
        } catch (error) {
            console.error(error);
        }
        
    }));
}

export async function closeAllVaults(owner: Keypair, connection: Connection, cluster: Cluster, mintReceiverAta: PublicKey) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    try {
        await Promise.allSettled( (await workspace.program.account.vault.all()).map(async vaultAccount => {
            try {
                console.log('vault', vaultAccount.publicKey.toBase58());
                let vault = new Vault(vaultAccount.account);
                await vault.closeVaultTokenAccounts(workspace, mintReceiverAta)
                await vault.closeVault(workspace)
            } catch (error) {
                console.error(error);
            }
        }));
    } catch (error) {
        console.error(error);
    }

    
}

export async function closeAllUserPredictions(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.userPrediction.all()).map(async userPredictionAccount => {
        console.log('userPrediction', userPredictionAccount.publicKey.toBase58());
        let userPrediction = new UserPrediction(userPredictionAccount.account as unknown as UserPredictionAccount);
        try {
            return await UserPrediction.adminCloseUserPrediction(workspace, userPrediction);
        } catch (error) {
            console.error(error);
        }
        
    }));
}

export async function closeAllCranks(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.crank.all()).map(async crankAccount => {
        console.log('crank', crankAccount.publicKey.toBase58());
        let crank = new Crank(crankAccount.account as unknown as CrankAccount);
        try {
            return await crank.adminCloseCrankAccount(workspace)
        } catch (error) {
            console.error(error)
        }
        
    }));
}

export async function closeAllRounds(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.round.all()).map(async roundAccount => {
        console.log('round', roundAccount.publicKey.toBase58());
        let round = new Round(roundAccount.account as unknown as RoundAccount);
        try {
            return await Round.adminCloseRound(workspace, round)
        } catch(error) {
            console.error(error);
        }
        
    }));
}

export async function closeAllUser(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.user.all()).map(async userAccount => {
        console.log('user', userAccount.publicKey.toBase58());
        let user = new User(userAccount.account as unknown as UserAccount);
        try {
            return await user.adminCloseUserAccount(workspace)
        } catch(error) {
            console.error(error);
        }
        
    }));
}

export async function closeAllUserClaimable(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.userClaimable.all()).map(async userClaimableAccount => {
        console.log('userClaimable', userClaimableAccount.publicKey.toBase58());
        try {
            return await UserClaimable.adminCloseUserClaimable(workspace, userClaimableAccount.publicKey)
        } catch(error) {
            console.error(error);
        }
        
    }));
}

export async function closeAllHistory(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( [...(await workspace.program.account.userPredictionHistory.all()).map(async userPredictionHistory => {
        console.log('userPredictionHistory', userPredictionHistory.publicKey.toBase58());
        try {
            return await UserPredictionHistory.adminCloseUserUserPredictionHistory(workspace, userPredictionHistory.publicKey)
        } catch (error) {
            console.error(error);
        }
        
    }), ...(await workspace.program.account.roundHistory.all()).map(async roundHistory => {
        console.log('roundHistory', roundHistory.publicKey.toBase58());
        try {
            return await RoundHistory.adminCloseUserRoundHistory(workspace, roundHistory.publicKey)
        } catch (error) {
            console.error(error);
        }
    })] );
}



export async function init(owner: Keypair, connection: Connection, cluster: Cluster, mint: Mint) {

    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    
    (await Promise.all(gameSeeds.map(async (gameSeed : GameSeed) => {
        return await initFromGameSeed(workspace, gameSeed, mint.address);
    }))).forEach(([vault, game]) => {
        console.log(game.baseSymbolAsString() + ' loaded.');
    })

}