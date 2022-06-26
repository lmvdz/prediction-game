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
const spl_token_1 = require("@solana/spl-token");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const anchor = __importStar(require("@project-serum/anchor"));
const dotenv_1 = require("dotenv");
const bs58_1 = __importDefault(require("bs58"));
const game_1 = __importStar(require("sdk/lib/accounts/game"));
const spl_token_2 = require("@solana/spl-token");
const round_1 = __importDefault(require("sdk/lib/accounts/round"));
const util_1 = require("sdk/lib/util");
const sdk_1 = require("sdk");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
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
// const connection: Connection = new Connection('http://localhost:8899');
const connection = new web3_js_2.Connection(endpoint);
const workspace = sdk_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
const mintKeypair = web3_js_2.Keypair.fromSecretKey(bs58_1.default.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"));
const mintDecimals = 6;
let gameSeeds = [
    {
        baseSymbol: "SOL",
        priceProgram: new web3_js_1.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"),
        priceFeed: new web3_js_1.PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"),
        roundLength: new anchor.BN(300),
        oracle: game_1.Oracle.Chainlink
    },
    {
        baseSymbol: "BTC",
        priceProgram: new web3_js_1.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"),
        priceFeed: new web3_js_1.PublicKey("CzZQBrJCLqjXRfMjRN3fhbxur2QYHUzkpaRwkWsiPqbz"),
        roundLength: new anchor.BN(300),
        oracle: game_1.Oracle.Chainlink
    },
    {
        baseSymbol: "ETH",
        priceProgram: new web3_js_1.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"),
        priceFeed: new web3_js_1.PublicKey("2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b7Go"),
        roundLength: new anchor.BN(300),
        oracle: game_1.Oracle.Chainlink
    }
];
async function createFakeMint(connection, keypair, mintDecimals = 6) {
    const mintKey = keypair || web3_js_2.Keypair.generate();
    try {
        await (0, spl_token_2.createMint)(connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mintKey);
    }
    catch (error) {
        console.warn("mint already created");
    }
    return await (0, spl_token_2.getMint)(connection, mintKey.publicKey);
}
const initVault = (workspace, tokenMint) => {
    return new Promise((resolve, reject) => {
        vault_1.default.initializeVault(workspace, tokenMint).then(vault => {
            resolve(vault);
        }).catch(error => {
            reject(error);
        });
    });
};
const loadVault = (workspace, tokenMint) => {
    return new Promise((resolve, reject) => {
        initVault(workspace, tokenMint).then((vault) => {
            resolve(vault);
        }).catch((error) => {
            workspace.programAddresses.getVaultPubkey(tokenMint).then(([vaultPubkey, _vaultPubkeyBump]) => {
                (0, util_1.fetchAccountRetry)(workspace, 'vault', (vaultPubkey)).then(vaultAccount => {
                    resolve(new vault_1.default(vaultAccount));
                }).catch(error => {
                    console.warn("failed to fetch vault account");
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        });
    });
};
const startGame = (workspace, baseSymbol, vault, oracle, priceProgram, priceFeed) => {
    return new Promise((resolve, reject) => {
        game_1.default.initializeGame(workspace, baseSymbol, vault, oracle, priceProgram, priceFeed, 30, 1000).then(game => {
            resolve(game);
        }).catch(error => {
            reject(error);
        });
    });
};
const loadGame = (workspace, baseSymbol, vault, oracle, priceProgram, priceFeed) => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed).then(([gamePubkey, _gamePubkeyBump]) => {
            (0, util_1.fetchAccountRetry)(workspace, 'game', (gamePubkey)).then(gameAccount => {
                resolve(new game_1.default(gameAccount));
            }).catch(error => {
                console.error(error);
                startGame(workspace, baseSymbol, vault, oracle, priceProgram, priceFeed).then((game) => {
                    resolve(game);
                }).catch((error) => {
                    reject(error);
                });
            });
        }).catch(error => {
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
                console.log(game.currentRound.convertOraclePriceToNumber(game), vaultTokenAccountBalanaceResponse.value.uiAmount, feeVaultTokenAccountBalanaceResponse.value.uiAmount, ((game.account.unclaimedFees.div(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() + ((game.account.unclaimedFees.mod(new anchor.BN(10).pow(new anchor.BN(vault.account.tokenDecimals)))).toNumber() / (10 ** vault.account.tokenDecimals))), game.account.baseSymbol, game.currentRound.account.roundNumber, game.currentRound.account.roundTimeDifference.toNumber(), game.currentRound.account.roundCurrentPrice.toNumber(), game.currentRound.account.finished, game.currentRound.account.feeCollected, game.currentRound.account.cranksPaid, game.currentRound.account.settled, game.currentRound.account.invalid, game.currentRound.account.totalUniqueCrankers, game.currentRound.account.totalCranksPaid);
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
const crankLoop = async (workspace, mint, gameSeed) => {
    try {
        // load required accounts to crank
        let vault = await loadVault(workspace, mint.address);
        let game = await loadGame(workspace, gameSeed.baseSymbol, vault, gameSeed.oracle, gameSeed.priceProgram, gameSeed.priceFeed);
        let user = await loadUser(workspace);
        let crank = await loadCrank(workspace, game, user);
        // first round initialization
        if (game.account.currentRound.toBase58() === web3_js_1.PublicKey.default.toBase58() && game.account.previousRound.toBase58() === web3_js_1.PublicKey.default.toBase58()) {
            game = await round_1.default.initializeFirst(workspace, game, crank, gameSeed.roundLength);
        }
        else {
            game = await game.loadRoundData(workspace);
        }
        updateLoop(workspace, vault, game, crank);
    }
    catch (error) {
        console.error(error);
        setTimeout(() => {
            crankLoop(workspace, mint, gameSeed);
        }, 1000);
    }
};
async function run() {
    let mint = await createFakeMint(connection, mintKeypair, mintDecimals);
    gameSeeds.forEach(async (gameSeed) => {
        crankLoop(workspace, mint, gameSeed);
    });
}
run();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.get('/airdrop/:destination', async (req, res) => {
    let address = new web3_js_1.PublicKey(req.params.destination);
    let tryAirdrop = async (retry = 0) => {
        if (retry < 10) {
            try {
                let account = await (0, spl_token_1.getAccount)(connection, address);
                if (account.isInitialized) {
                    (0, spl_token_2.mintTo)(connection, owner, mintKeypair.publicKey, address, owner, BigInt(((new anchor.BN(1000)).mul((new anchor.BN(10)).pow(new anchor.BN(mintDecimals)))).toString()), [owner]).then((signature) => {
                        return res.send(signature);
                    }).catch(error => {
                        return res.status(500).send(error);
                    });
                }
                else {
                    setTimeout(() => {
                        tryAirdrop(retry + 1);
                    }, 1000);
                }
            }
            catch (error) {
                setTimeout(() => {
                    tryAirdrop(retry + 1);
                }, 1000);
            }
        }
        else {
            return res.status(400).send(new Error("Airdrop failed"));
        }
    };
    await tryAirdrop();
});
app.listen(8444, () => {
    console.log('listening on 8444');
});
//# sourceMappingURL=index.js.map