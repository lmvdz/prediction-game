import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as anchor from "@project-serum/anchor"
import { config } from 'dotenv';
import bs58 from 'bs58';
import Game, { GameAccount } from "sdk/lib/accounts/game";
import Round from "sdk/lib/accounts/round";
import { fetchAccountRetry } from "sdk/lib/util";
import { Oracle, Workspace } from "sdk";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Crank, { CrankAccount } from "sdk/lib/accounts/crank";
import Vault from "sdk/lib/accounts/vault";
import cluster from 'cluster';

let args = process.argv.slice(2)

let env = args[0]

config({path: '.env.'+env})

const privateKeyEnvVariable = "PRIVATE_KEY"
// ENVIRONMENT VARIABLE FOR THE BOT PRIVATE KEY
const privateKey = process.env[privateKeyEnvVariable]
const endpoint = process.env.DEVNET;
const rpcCluster = process.env.CLUSTER as Cluster;

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
        if (game.currentRound.account.cranksPaid, game.currentRound.account.finished, game.currentRound.account.feeCollected, game.currentRound.account.settled) {
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
        } else {
            resolve(game);
        }
        
    })
}

const settleOrInitNext = (workspace: Workspace, game: Game, crank: Crank) : Promise<Game> => {
    return new Promise((resolve, reject) => {
        if (game.currentRound.account.finished && !game.currentRound.account.feeCollected) {
            console.log('collecting game fee')
            game.collectFee(workspace, crank).then((game) => {
                resolve(game);
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        } else if (game.currentRound.account.feeCollected && !game.currentRound.account.settled) {
            console.log('settling game positions')
            game.settlePredictions(workspace, crank).then((game) => {
                resolve(game);
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        } else if (game.currentRound.account.settled && !game.currentRound.account.cranksPaid) {
            console.log('paying out game cranks')
            game.payoutCranks(workspace).then(game => {
                resolve(game);
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        } else if (game.currentRound.account.cranksPaid) {
            console.log('initializing next round')
            initNext(workspace, game, crank).then(game => {
                resolve(game);
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        } else {
            resolve(game);
        }
        
    })
}

let loopCount = 0;

const updateLoop = (workspace: Workspace, vault: Vault, game: Game, crank: Crank) => {
    // console.log('updateLoop', game.baseSymbolAsString())
    if (loopCount > (60 * 60)) {
        run();
        loopCount = 0;
        return;
    }
    loopCount++;
    setTimeout(() => {
        
        // workspace.program.provider.connection.getTokenAccountBalance(vault.account.vaultAta).then(vaultTokenAccountBalanaceResponse => {
        //     workspace.program.provider.connection.getTokenAccountBalance(vault.account.feeVaultAta).then(feeVaultTokenAccountBalanaceResponse => {
                
        //     }).catch(error => {
        //         console.error(error);
        //     })
        // }).catch(error => {
        //     console.error(error);
        // })
        try {
            console.log(
                game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game.currentRound.account.roundStartPriceDecimals, game),
                game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game),
                // vaultTokenAccountBalanaceResponse.value.uiAmount,
                // feeVaultTokenAccountBalanaceResponse.value.uiAmount,
                ((game.account.unclaimedFees.div(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() + ((game.account.unclaimedFees.mod(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() / (10 ** vault.account.tokenDecimals))),
                game.baseSymbolAsString(),
                Oracle[game.account.oracle],
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
            // get the latest vault data (debug purposes)
            vault.updateVaultData(workspace).then((vault: Vault) => {
                // console.log('updatedVaultData', game.baseSymbolAsString())
                // update the game state (required)
                game.updateGame(workspace, crank).then((game: Game) => {
                    // console.log('updatedGame', game.baseSymbolAsString())
                    // fetch latest game data (required)
                    game.updateGameData(workspace).then((game: Game) => {
                        // console.log('updatedGameData', game.baseSymbolAsString())
                        // fetch latest round data (required)
                        game.updateRoundData(workspace).then((game: Game) => {
                            // console.log('updatedRoundData', game.baseSymbolAsString())
                            // finished round logic (required)
                            settleOrInitNext(workspace, game, crank).then((game: Game) => {
                                updateLoop(workspace, vault, game, crank)
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
            }).catch(error => {
                console.error(error);
                updateLoop(workspace, vault, game, crank)
            })
        } catch (error) {
            console.error(error);
        }
        
        
        
    }, game.currentRound.account.finished ? 10 * 1000 : 15 * 1000)
}



const crankLoop = async (workspace: Workspace, vault: Vault, game: Game) => {
    try {
        
        // load required accounts to crank
        let user = await loadUser(workspace);
        let crank = await loadCrank(workspace, game, user);

        // first round initialization
        if (game.account.currentRound.toBase58() === PublicKey.default.toBase58() && game.account.previousRound.toBase58() === PublicKey.default.toBase58()) {
            game = await Round.initializeFirst(workspace, game, crank);
        } else {
            game = await game.loadRoundData(workspace) ;
        }

        updateLoop(workspace, vault, game, crank)
    } catch (error) {
        console.error(error);
        setTimeout(() => {
            crankLoop(workspace, vault, game);
        }, 1000)
        
    }
}

async function run() {
    console.log('running');
    const connection: Connection = new Connection(endpoint)
    console.log((await connection.getEpochInfo()).absoluteSlot)

    const workspace: Workspace = Workspace.load(connection, botWallet, rpcCluster, { commitment: 'confirmed' })

    let vaults = (await workspace.program.account.vault.all()).map(vaultProgramAccount => {
        return new Vault(vaultProgramAccount.account)
    })
    console.log(vaults);
    let games = (await workspace.program.account.game.all()).map((gameProgramAccount) => {
        return new Game(gameProgramAccount.account as unknown as GameAccount)
    })
    console.log(games);
    games.forEach((game, index) => {
        let vault = vaults.find(v => v.account.address.toBase58() === game.account.vault.toBase58())
        if (vault) {
            setTimeout(() => {
                try {
                    crankLoop(workspace, vault, game);
                } catch(error) {
                    console.error(error);
                    crankLoop(workspace, vault, game);
                }
                
            }, 1000)
            
        }
    })
    
}


const runLoop = () => {
    try {
        run();
    } catch (error) {
        console.error(error);
        setTimeout(() => {
            runLoop();
        }, 1000)
    }
}

if (cluster.isPrimary) {
    cluster.fork();
    cluster.on('exit', function(worker){
        console.log('Worker ' + worker.id + ' died..');
        cluster.fork();
    });
} else {
    runLoop();
}


