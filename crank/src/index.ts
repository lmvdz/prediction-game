import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as anchor from "@project-serum/anchor"
import { config } from 'dotenv';
import bs58 from 'bs58';
import Game, { GameAccount, Oracle } from "sdk/lib/accounts/game";
import { createMint, getMint, Mint, MintLayout, mintTo } from "@solana/spl-token";
import Round, { RoundAccount } from "sdk/lib/accounts/round";
import { fetchAccountRetry } from "sdk/lib/util";
import { Workspace } from "sdk";
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import User, { UserAccount } from "sdk/lib/accounts/user";
import Crank, { CrankAccount } from "sdk/lib/accounts/crank";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";

config({path: '.env.local'})

const privateKeyEnvVariable = "PRIVATE_KEY"
// ENVIRONMENT VARIABLE FOR THE BOT PRIVATE KEY
const privateKey = process.env[privateKeyEnvVariable]
const endpoint = process.env.ENDPOINT;
const cluster = process.env.CLUSTER as Cluster;

if (privateKey === undefined) {
    console.error('need a ' + privateKeyEnvVariable +' env variable');
    process.exit()
}
// setup wallet
let owner: Keypair;

try {
    owner = Keypair.fromSecretKey(
        bs58.decode(privateKey)!
    );
} catch {
    try {
        owner = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(privateKey))
        );
    } catch {
        console.error('Failed to parse private key from Uint8Array (solana-keygen) and base58 encoded string (phantom wallet export)')
        process.exit();
    }
}

const botWallet: NodeWallet = new NodeWallet(owner);

// const connection: Connection = new Connection('http://localhost:8899');
const connection: Connection = new Connection(endpoint)
const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' })
const mintKeypair = Keypair.fromSecretKey(bs58.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"))
const mintDecimals = 6;

let gameSeeds: Array<GameSeed> = [ 
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

async function createFakeMint(connection: Connection, keypair?: Keypair, mintDecimals = 6) : Promise<Mint> {
    const mintKey = keypair || Keypair.generate();

    try {
        await createMint(connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mintKey)
    } catch (error) {
        console.warn("mint already created");
    }
    
    return await getMint(connection, mintKey.publicKey);
}

const initVault = (workspace: Workspace, tokenMint: PublicKey) : Promise<Vault> => {
    return new Promise((resolve, reject) => {
        Vault.initializeVault(workspace, tokenMint).then(vault => {
            resolve(vault);
        }).catch(error => {
            reject(error);
        })
    })
}

const loadVault = (workspace: Workspace, tokenMint: PublicKey) : Promise<Vault> => {
    return new Promise((resolve, reject) => {
        initVault(workspace, tokenMint).then((vault: Vault) => {
            resolve(vault);
        }).catch((error) => {
            workspace.programAddresses.getVaultPubkey(tokenMint).then(([vaultPubkey, _vaultPubkeyBump]) => {
                fetchAccountRetry<VaultAccount>(workspace, 'vault', (vaultPubkey)).then(vaultAccount => {
                    resolve(new Vault(
                        vaultAccount
                    ));
                }).catch(error => {
                    console.warn("failed to fetch vault account")
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        })
    }) 
}

const startGame = (workspace: Workspace, baseSymbol: string, vault: Vault, oracle: Oracle, priceProgram: PublicKey, priceFeed: PublicKey) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        Game.initializeGame(
            workspace, 
            baseSymbol,
            vault, 
            oracle,
            priceProgram, 
            priceFeed,
            30,
            1000
        ).then(game => {
            resolve(game);
        }).catch(error => {
            reject(error)
        })
    })
}

const loadGame = (workspace: Workspace, baseSymbol: string, vault: Vault, oracle: Oracle, priceProgram: PublicKey, priceFeed: PublicKey) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed).then(([gamePubkey, _gamePubkeyBump]) => {
            fetchAccountRetry<GameAccount>(workspace, 'game', (gamePubkey)).then(gameAccount => {
                resolve(new Game(
                    gameAccount
                ));
            }).catch(error => {
                console.error(error);
                startGame(workspace, baseSymbol, vault, oracle, priceProgram, priceFeed).then((game: Game) => {
                    resolve(game);
                }).catch((error) => {
                    reject(error);
                })
            })
        }).catch(error => {
            reject(error);
        })
        
    })
}

const loadCrank = (workspace: Workspace, game: Game, user: User) : Promise<Crank> => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getCrankPubkey(workspace.owner, game.account.address, user.account.address).then(([crankAccountPubkey, _crankAccountPubkeyBump] ) => {
            fetchAccountRetry<CrankAccount>(workspace, 'crank', crankAccountPubkey).then(crankAccount => {
                resolve(new Crank(crankAccount))
            }).catch(error => {
                console.error(error);
                initCrank(workspace, game, user).then((crank: Crank) => {
                    resolve(crank);
                }).catch(error => {
                    reject(error);
                })
            })
        }).catch(error => {
            reject(error);
        })
       
    })
}

const initCrank = (workspace: Workspace, game: Game, user: User) : Promise<Crank> => {
    return new Promise((resolve, reject) => {
        Crank.initializeCrank(workspace, game, user).then(crank => {
            resolve(crank);
        }).catch(error => {
            reject(error);
        })
    })
}

const loadUser = (workspace: Workspace) : Promise<User> => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getUserPubkey(workspace.owner).then(([userAccountPubkey, _userAccountPubkeyBump] ) => {
            fetchAccountRetry<UserAccount>(workspace, 'user', userAccountPubkey).then(userAccount => {
                resolve(new User(userAccount))
            }).catch(error => {
                console.error(error);
                initUser(workspace).then((user: User) => {
                    resolve(user);
                }).catch(error => {
                    reject(error);
                })
            })
        }).catch(error => {
            reject(error);
        })
    })
}

const initUser = (workspace: Workspace) : Promise<User> => {
    return new Promise((resolve, reject) => {
        User.initializeUser(workspace).then(user => {
            resolve(user);
        }).catch(error => {
            reject(error);
        })
    })
}

const initNext = (workspace: Workspace, game: Game, crank: Crank) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        if (game.account.currentRound.toBase58() === game.account.previousRound.toBase58()) {
            Round.initializeSecond(workspace, game, crank).then((game) => {
                resolve(game);
            }).catch(error => {
                reject(error);
            })
        } else {
            Round.initializeNext(workspace, game, crank).then(game => {
                resolve(game)
            }).catch(error => {
                reject(error);
            })
        }
    })
}

const settleOrInitNext = (workspace: Workspace, game: Game, crank: Crank) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        game.collectFee(workspace, crank).then((game) => {
            game.settlePredictions(workspace, crank).then((game) => {
                game.payoutCranks(workspace).then(game => {
                    initNext(workspace, game, crank).then(game => {
                        resolve(game);
                    }).catch(error => {
                        reject(error);
                    })
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        }).catch(error => {
            reject(error);
        })
    })
}

let loopCount = 0;

const updateLoop = (workspace: Workspace, vault: Vault, game: Game, crank: Crank) => {
    if (loopCount > (60 * 60)) {
        run();
        loopCount = 0;
        return;
    }
    loopCount++;
    setTimeout(() => {
        workspace.program.provider.connection.getTokenAccountBalance(vault.account.vaultAta).then(vaultTokenAccountBalanaceResponse => {
            workspace.program.provider.connection.getTokenAccountBalance(vault.account.feeVaultAta).then(feeVaultTokenAccountBalanaceResponse => {
                console.log(
                    vaultTokenAccountBalanaceResponse.value.uiAmount,
                    feeVaultTokenAccountBalanaceResponse.value.uiAmount,
                    ((game.account.unclaimedFees.div(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() + ((game.account.unclaimedFees.mod(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() / (10 ** vault.account.tokenDecimals))),
                    game.account.baseSymbol,
                    game.currentRound.account.roundNumber, 
                    game.currentRound.account.roundTimeDifference.toNumber(),
                    game.currentRound.account.roundCurrentPrice.toNumber(),
                    game.currentRound.account.finished,
                    game.currentRound.account.feeCollected,
                    game.currentRound.account.cranksPaid,
                    game.currentRound.account.settled,
                    game.currentRound.account.invalid,
                    game.currentRound.account.totalUniqueCrankers,
                    game.currentRound.account.totalCranksPaid
                );
            })
        })
        vault.updateVaultData(workspace).then((vault: Vault) => {
            game.updateGame(workspace, crank).then((game: Game) => {
                game.updateGameData(workspace).then((game: Game) => {
                    game.updateRoundData(workspace).then((game: Game) => {
                        if (game.currentRound.account.finished) {
                            settleOrInitNext(workspace, game, crank).then((game: Game) => {
                                updateLoop(workspace, vault, game, crank)
                            }).catch(error => {
                                console.error(error);
                                updateLoop(workspace, vault, game, crank)
                            })
                        } else {
                            updateLoop(workspace, vault, game, crank)
                        }
                    }).catch(error => {
                        console.error(error);
                        updateLoop(workspace, vault, game, crank)
                    })
                }).catch(error => {
                    console.error(error);
                    updateLoop(workspace, vault, game, crank)
                })
                
            }).catch(error => {
                console.error(error);
                updateLoop(workspace, vault, game, crank)
            })
        }).catch(error => {
            console.error(error);
            updateLoop(workspace, vault, game, crank)
        })
        
    }, 10 * 1000)
}



const crankLoop = async (workspace: Workspace, mint: Mint, gameSeed: GameSeed) => {
    try {
        // load required accounts to crank
        let vault = await loadVault(workspace, mint.address);
        let game = await loadGame(workspace, gameSeed.baseSymbol, vault, gameSeed.oracle, gameSeed.priceProgram, gameSeed.priceFeed);
        let user = await loadUser(workspace);
        let crank = await loadCrank(workspace, game, user);

        // first round initialization
        if (game.account.currentRound.toBase58() === PublicKey.default.toBase58() && game.account.previousRound.toBase58() === PublicKey.default.toBase58()) {
            game = await Round.initializeFirst(workspace, game, crank, gameSeed.roundLength);
        } else {
            game = await game.loadRoundData(workspace) ;
        }

        updateLoop(workspace, vault, game, crank)
    } catch (error) {
        console.error(error);
        setTimeout(() => {
            crankLoop(workspace, mint, gameSeed);
        }, 1000)
        
    }
}

type GameSeed = {
    baseSymbol: string,
    priceProgram: PublicKey,
    priceFeed: PublicKey,
    roundLength: anchor.BN,
    oracle: Oracle
}

async function run() {

    let mint = await createFakeMint(connection, mintKeypair, mintDecimals);

    gameSeeds.forEach(async (gameSeed : GameSeed) => {
        crankLoop(workspace, mint, gameSeed)
    })
}

run();


const app = express();
app.use(cors());
app.use(bodyParser.json())
app.get('/airdrop/:destination', async (req, res) => {
    let address = new PublicKey(req.params.destination);
    let tryAirdrop = async (retry=0) => {
        if (retry < 10) {
            try {
                let account = await getAccount(connection, address);
                if (account.isInitialized) {
                    mintTo(connection, owner, mintKeypair.publicKey, address, owner, BigInt(((new anchor.BN(1000)).mul((new anchor.BN(10)).pow(new anchor.BN(mintDecimals)))).toString()), [owner]).then((signature) => {
                        return res.send(signature);
                    }).catch(error => {
                        return res.status(500).send(error);
                    })
                } else {
                    setTimeout(() => {
                        tryAirdrop(retry+1);
                    }, 1000)
                }
            } catch (error) {
                setTimeout(() => {
                    tryAirdrop(retry+1);
                }, 1000)
            }
        } else {
            return res.status(400).send(new Error("Airdrop failed"))
        }
    }
    await tryAirdrop();
});

app.listen(8444, () => {
    console.log('listening on 8444');
})