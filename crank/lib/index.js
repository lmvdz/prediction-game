"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const anchor = __importStar(require("@project-serum/anchor"));
const dotenv_1 = require("dotenv");
const bs58_1 = __importDefault(require("bs58"));
const game_1 = __importDefault(require("sdk/lib/accounts/game"));
const round_1 = __importDefault(require("sdk/lib/accounts/round"));
const util_1 = require("sdk/lib/util");
const sdk_1 = require("sdk");
const user_1 = __importDefault(require("sdk/lib/accounts/user"));
const crank_1 = __importDefault(require("sdk/lib/accounts/crank"));
const vault_1 = __importDefault(require("sdk/lib/accounts/vault"));
(0, dotenv_1.config)({ path: '.env.local' });
const privateKeyEnvVariable = "PRIVATE_KEY";
// ENVIRONMENT VARIABLE FOR THE BOT PRIVATE KEY
const privateKey = process.env[privateKeyEnvVariable];
const endpoint = process.env.ENDPOINT;
const cluster = process.env.CLUSTER;
if (privateKey === undefined) {
    console.error('need a ' + privateKeyEnvVariable + ' env variable');
    process.exit();
}
// setup wallet
let owner;
try {
    owner = web3_js_2.Keypair.fromSecretKey(bs58_1.default.decode(privateKey));
}
catch {
    try {
        owner = web3_js_2.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(privateKey)));
    }
    catch {
        console.error('Failed to parse private key from Uint8Array (solana-keygen) and base58 encoded string (phantom wallet export)');
        process.exit();
    }
}
const botWallet = new nodewallet_1.default(owner);
const loadVault = (workspace, vaultPubkey) => {
    return new Promise((resolve, reject) => {
        (0, util_1.fetchAccountRetry)(workspace, 'vault', (vaultPubkey)).then(vaultAccount => {
            resolve(new vault_1.default(vaultAccount));
        }).catch(error => {
            console.error(error);
            reject(error);
        });
    });
};
const loadGame = (workspace, gamePubkey) => {
    return new Promise((resolve, reject) => {
        (0, util_1.fetchAccountRetry)(workspace, 'game', (gamePubkey)).then(gameAccount => {
            resolve(new game_1.default(gameAccount));
        }).catch(error => {
            console.error(error);
            reject(error);
        });
    });
};
const loadCrank = (workspace, game, user) => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getCrankPubkey(workspace.owner, game.account.address, user.account.address).then(([crankAccountPubkey, _crankAccountPubkeyBump]) => {
            (0, util_1.fetchAccountRetry)(workspace, 'crank', crankAccountPubkey).then(crankAccount => {
                resolve(new crank_1.default(crankAccount));
            }).catch(error => {
                console.error(error);
                initCrank(workspace, game, user).then((crank) => {
                    resolve(crank);
                }).catch(error => {
                    reject(error);
                });
            });
        }).catch(error => {
            reject(error);
        });
    });
};
const initCrank = (workspace, game, user) => {
    return new Promise((resolve, reject) => {
        crank_1.default.initializeCrank(workspace, game, user).then(crank => {
            resolve(crank);
        }).catch(error => {
            reject(error);
        });
    });
};
const loadUser = (workspace) => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getUserPubkey(workspace.owner).then(([userAccountPubkey, _userAccountPubkeyBump]) => {
            (0, util_1.fetchAccountRetry)(workspace, 'user', userAccountPubkey).then(userAccount => {
                resolve(new user_1.default(userAccount));
            }).catch(error => {
                console.error(error);
                initUser(workspace).then((user) => {
                    resolve(user);
                }).catch(error => {
                    reject(error);
                });
            });
        }).catch(error => {
            reject(error);
        });
    });
};
const initUser = (workspace) => {
    return new Promise((resolve, reject) => {
        user_1.default.initializeUser(workspace).then(user => {
            resolve(user);
        }).catch(error => {
            reject(error);
        });
    });
};
const initNext = (workspace, game, crank) => {
    return new Promise((resolve, reject) => {
        if (game.account.currentRound.toBase58() === game.account.previousRound.toBase58()) {
            round_1.default.initializeSecond(workspace, game, crank).then((game) => {
                resolve(game);
            }).catch(error => {
                reject(error);
            });
        }
        else {
            round_1.default.initializeNext(workspace, game, crank).then(game => {
                resolve(game);
            }).catch(error => {
                reject(error);
            });
        }
    });
};
const settleOrInitNext = (workspace, game, crank) => {
    return new Promise((resolve, reject) => {
        game.collectFee(workspace, crank).then((game) => {
            game.settlePredictions(workspace, crank).then((game) => {
                game.payoutCranks(workspace).then(game => {
                    initNext(workspace, game, crank).then(game => {
                        resolve(game);
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        }).catch(error => {
            reject(error);
        });
    });
};
let loopCount = 0;
const updateLoop = (workspace, vault, game, crank) => {
    if (loopCount > (60 * 60)) {
        run();
        loopCount = 0;
        return;
    }
    loopCount++;
    setTimeout(() => {
        workspace.program.provider.connection.getTokenAccountBalance(vault.account.vaultAta).then(vaultTokenAccountBalanaceResponse => {
            workspace.program.provider.connection.getTokenAccountBalance(vault.account.feeVaultAta).then(feeVaultTokenAccountBalanaceResponse => {
                console.log(game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game), vaultTokenAccountBalanaceResponse.value.uiAmount, feeVaultTokenAccountBalanaceResponse.value.uiAmount, ((game.account.unclaimedFees.div(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() + ((game.account.unclaimedFees.mod(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() / (10 ** vault.account.tokenDecimals))), game.account.baseSymbol, game.currentRound.account.roundNumber, game.currentRound.account.roundTimeDifference.toNumber(), game.currentRound.account.roundCurrentPrice.toNumber(), game.currentRound.account.finished, game.currentRound.account.feeCollected, game.currentRound.account.cranksPaid, game.currentRound.account.settled, game.currentRound.account.invalid, game.currentRound.account.totalUniqueCrankers, game.currentRound.account.totalCranksPaid);
            });
        });
        vault.updateVaultData(workspace).then((vault) => {
            game.updateGame(workspace, crank).then((game) => {
                game.updateGameData(workspace).then((game) => {
                    game.updateRoundData(workspace).then((game) => {
                        if (game.currentRound.account.finished) {
                            settleOrInitNext(workspace, game, crank).then((game) => {
                                updateLoop(workspace, vault, game, crank);
                            }).catch(error => {
                                console.error(error);
                                updateLoop(workspace, vault, game, crank);
                            });
                        }
                        else {
                            updateLoop(workspace, vault, game, crank);
                        }
                    }).catch(error => {
                        console.error(error);
                        updateLoop(workspace, vault, game, crank);
                    });
                }).catch(error => {
                    console.error(error);
                    updateLoop(workspace, vault, game, crank);
                });
            }).catch(error => {
                console.error(error);
                updateLoop(workspace, vault, game, crank);
            });
        }).catch(error => {
            console.error(error);
            updateLoop(workspace, vault, game, crank);
        });
    }, 10 * 1000);
};
const crankLoop = async (workspace, vault, game) => {
    try {
        // load required accounts to crank
        let user = await loadUser(workspace);
        let crank = await loadCrank(workspace, game, user);
        // first round initialization
        if (game.account.currentRound.toBase58() === web3_js_1.PublicKey.default.toBase58() && game.account.previousRound.toBase58() === web3_js_1.PublicKey.default.toBase58()) {
            game = await round_1.default.initializeFirst(workspace, game, crank);
        }
        else {
            game = await game.loadRoundData(workspace);
        }
        updateLoop(workspace, vault, game, crank);
    }
    catch (error) {
        console.error(error);
        setTimeout(() => {
            crankLoop(workspace, vault, game);
        }, 1000);
    }
};
async function run() {
    const connection = new web3_js_2.Connection(endpoint);
    const workspace = sdk_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    let vaults = (await workspace.program.account.vault.all()).map(vaultProgramAccount => {
        return new vault_1.default(vaultProgramAccount.account);
    });
    let games = (await workspace.program.account.game.all()).map((gameProgramAccount) => {
        return new game_1.default(gameProgramAccount.account);
    });
    games.forEach(game => {
        let vault = vaults.find(v => v.account.address.toBase58() === game.account.vault.toBase58());
        if (vault) {
            crankLoop(workspace, vault, game);
        }
    });
}
run();
//# sourceMappingURL=index.js.map