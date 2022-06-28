import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import * as anchor from "@project-serum/anchor"
import { config } from 'dotenv';
import bs58 from 'bs58';
import Game, { GameAccount, Oracle } from "sdk/lib/accounts/game";
import Round, { RoundAccount } from "sdk/lib/accounts/round";
import { fetchAccountRetry } from "sdk/lib/util";
import { Workspace } from "sdk";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Crank, { CrankAccount } from "sdk/lib/accounts/crank";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";
import { ProgramAccount } from "@project-serum/anchor";

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
                reject(error);
            })
        } else if (game.currentRound.account.feeCollected && !game.currentRound.account.settled) {
            console.log('settling game positions')
            game.settlePredictions(workspace, crank).then((game) => {
                resolve(game);
            }).catch(error => {
                reject(error);
            })
        } else if (game.currentRound.account.settled && !game.currentRound.account.cranksPaid) {
            console.log('paying out game cranks')
            game.payoutCranks(workspace).then(game => {
                resolve(game);
            }).catch(error => {
                reject(error);
            })
        } else if (game.currentRound.account.cranksPaid) {
            console.log('initializing next round')
            initNext(workspace, game, crank).then(game => {
                resolve(game);
            }).catch(error => {
                reject(error);
            })
        } else {
            resolve(game);
        }
        
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
                    game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game),
                    game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game),
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
        
    }, game.currentRound.account.finished ? 5 * 1000 : 10 * 1000)
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

    const connection: Connection = new Connection(endpoint)
    const workspace: Workspace = Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' })

    let vaults = (await workspace.program.account.vault.all()).map(vaultProgramAccount => {
        return new Vault(vaultProgramAccount.account)
    })
    let games = (await workspace.program.account.game.all()).map((gameProgramAccount) => {
        return new Game(gameProgramAccount.account as unknown as GameAccount)
    })

    games.forEach((game, index) => {
        let vault = vaults.find(v => v.account.address.toBase58() === game.account.vault.toBase58())
        if (vault) {
            setTimeout(() => {
                crankLoop(workspace, vault, game);
            }, 1000)
            
        }
    })
    
}

const runLoop = () => {
    try {
        run();
    } catch (error) {
        setTimeout(() => {
            runLoop();
        }, 1000)
    }
}

runLoop();

