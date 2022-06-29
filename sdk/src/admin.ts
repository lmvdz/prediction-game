import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as anchor from "@project-serum/anchor"
import bs58 from 'bs58';
import Game, { GameAccount, Oracle } from "./accounts/game";
import { createMint, getMint, Mint, MintLayout, mintTo } from "@solana/spl-token";
import { fetchAccountRetry } from "./util";
import { Workspace } from "./workspace";
import Vault, { VaultAccount } from "./accounts/vault";
import { ProgramAccount } from "@project-serum/anchor";
import UserPrediction, { UserPredictionAccount } from "./accounts/userPrediction";
import Crank, { CrankAccount } from "./accounts/crank";
import Round, { RoundAccount } from "./accounts/round";

export const gameSeeds: Array<GameSeed> = [ 
    { 
        baseSymbol: "SOL", 
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), 
        priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"),
        roundLength: new anchor.BN(300),
        oracle: Oracle.Chainlink
    }, 
    {
        baseSymbol: "BTC", 
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), 
        priceFeed: new PublicKey("CzZQBrJCLqjXRfMjRN3fhbxur2QYHUzkpaRwkWsiPqbz"),
        roundLength: new anchor.BN(300),
        oracle: Oracle.Chainlink
    }, 
    {
        baseSymbol: "ETH", 
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), 
        priceFeed: new PublicKey("2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b7Go"),
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

async function createFakeMint(connection: Connection, owner: Keypair, keypair?: Keypair, mintDecimals = 6) : Promise<Mint> {
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
            console.log(gamePubkey.toBase58(), vault.account.address.toBase58());
            fetchAccountRetry<GameAccount>(workspace, 'game', (gamePubkey)).then(gameAccount => {
                resolve(new Game(
                    gameAccount
                ));
            }).catch(error => {
                Game.initializeGame(
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

export async function closeAll(owner: Keypair, connection: Connection, cluster: Cluster) {
    Promise.allSettled([
        await closeAllUserPredictions(owner, connection, cluster),
        await closeAllRounds(owner, connection, cluster),
        await closeAllCranks(owner, connection, cluster),
        await closeAllGames(owner, connection, cluster)
    ])
}

export async function closeAllGames(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.game.all()).map(async gameAccount => {
        let game = new Game(gameAccount.account as unknown as GameAccount);
        await (game).adminCloseGame(workspace);
    }));
}

export async function closeAllUserPredictions(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.userPrediction.all()).map(async userPredictionAccount => {
        let userPrediction = new UserPrediction(userPredictionAccount.account as unknown as UserPredictionAccount);
        await UserPrediction.adminCloseUserPrediction(workspace, userPrediction);
    }));
}

export async function closeAllCranks(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.crank.all()).map(async crankAccount => {
        let crank = new Crank(crankAccount.account as unknown as CrankAccount);
        await crank.adminCloseCrankAccount(workspace)
    }));
}

export async function closeAllRounds(owner: Keypair, connection: Connection, cluster: Cluster) {
    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });

    await Promise.allSettled( (await workspace.program.account.round.all()).map(async roundAccount => {
        let round = new Round(roundAccount.account as unknown as RoundAccount);
        await Round.adminCloseRound(workspace, round)
    }));
}



export async function init(owner: Keypair, connection: Connection, cluster: Cluster, mint: Mint) {

    const botWallet: NodeWallet = new NodeWallet(owner);
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    
    (await Promise.all(gameSeeds.map(async (gameSeed : GameSeed) => {
        console.log(gameSeed);
        return await initFromGameSeed(workspace, gameSeed, mint.address);
    }))).forEach(([vault, game]) => {
        console.log(vault.account.address.toBase58(), game.account.baseSymbol, game.account.vault.toBase58())
    })

}