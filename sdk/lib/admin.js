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
exports.init = exports.closeAllUserClaimable = exports.closeAllUser = exports.closeAllRounds = exports.closeAllCranks = exports.closeAllUserPredictions = exports.closeAllGames = exports.closeAll = exports.gameSeeds = void 0;
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const anchor = __importStar(require("@project-serum/anchor"));
const game_1 = __importStar(require("./accounts/game"));
const spl_token_1 = require("@solana/spl-token");
const util_1 = require("./util");
const workspace_1 = require("./workspace");
const vault_1 = __importDefault(require("./accounts/vault"));
const userPrediction_1 = __importDefault(require("./accounts/userPrediction"));
const crank_1 = __importDefault(require("./accounts/crank"));
const round_1 = __importDefault(require("./accounts/round"));
const user_1 = __importDefault(require("./accounts/user"));
const userClaimable_1 = __importDefault(require("./accounts/userClaimable"));
exports.gameSeeds = [
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
async function createFakeMint(connection, owner, keypair, mintDecimals = 6) {
    const mintKey = keypair || web3_js_2.Keypair.generate();
    try {
        await (0, spl_token_1.createMint)(connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mintKey);
    }
    catch (error) {
        console.warn("mint already created");
    }
    return await (0, spl_token_1.getMint)(connection, mintKey.publicKey);
}
const loadGame = (workspace, baseSymbol, vault, oracle, priceProgram, priceFeed, roundLength) => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed).then(([gamePubkey, _vaultPubkeyBump]) => {
            console.log(gamePubkey.toBase58(), vault.account.address.toBase58());
            (0, util_1.fetchAccountRetry)(workspace, 'game', (gamePubkey)).then(gameAccount => {
                resolve(new game_1.default(gameAccount));
            }).catch(error => {
                game_1.default.initializeGame(workspace, baseSymbol, vault, oracle, priceProgram, priceFeed, 30, 1000, roundLength).then(game => {
                    resolve(game);
                }).catch(error => {
                    reject(error);
                });
            });
        }).catch(error => {
            console.error(error);
            reject(error);
        });
    });
};
const loadVault = (workspace, tokenMint) => {
    return new Promise((resolve, reject) => {
        workspace.programAddresses.getVaultPubkey(tokenMint).then(([vaultPubkey, _vaultPubkeyBump]) => {
            (0, util_1.fetchAccountRetry)(workspace, 'vault', (vaultPubkey)).then(vaultAccount => {
                resolve(new vault_1.default(vaultAccount));
            }).catch(error => {
                vault_1.default.initializeVault(workspace, tokenMint).then(vault => {
                    resolve(vault);
                }).catch(error => {
                    reject(error);
                });
            });
        }).catch(error => {
            console.error(error);
            reject(error);
        });
    });
};
async function initFromGameSeed(workspace, gameSeed, mint) {
    try {
        let vault = await loadVault(workspace, mint);
        let game = await loadGame(workspace, gameSeed.baseSymbol, vault, gameSeed.oracle, gameSeed.priceProgram, gameSeed.priceFeed, gameSeed.roundLength);
        return [vault, game];
    }
    catch (error) {
        console.error(error);
        return [null, null];
    }
}
async function closeAll(owner, connection, cluster) {
    Promise.allSettled([
        await closeAllRounds(owner, connection, cluster),
        await closeAllCranks(owner, connection, cluster),
        await closeAllUserPredictions(owner, connection, cluster),
        await closeAllUser(owner, connection, cluster),
        await closeAllGames(owner, connection, cluster)
    ]);
}
exports.closeAll = closeAll;
async function closeAllGames(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.game.all()).map(async (gameAccount) => {
        console.log('game', gameAccount.publicKey.toBase58());
        let game = new game_1.default(gameAccount.account);
        await (game).adminCloseGame(workspace);
    }));
}
exports.closeAllGames = closeAllGames;
async function closeAllUserPredictions(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.userPrediction.all()).map(async (userPredictionAccount) => {
        console.log('userPrediction', userPredictionAccount.publicKey.toBase58());
        let userPrediction = new userPrediction_1.default(userPredictionAccount.account);
        await userPrediction_1.default.adminCloseUserPrediction(workspace, userPrediction);
    }));
}
exports.closeAllUserPredictions = closeAllUserPredictions;
async function closeAllCranks(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.crank.all()).map(async (crankAccount) => {
        console.log('crank', crankAccount.publicKey.toBase58());
        let crank = new crank_1.default(crankAccount.account);
        await crank.adminCloseCrankAccount(workspace);
    }));
}
exports.closeAllCranks = closeAllCranks;
async function closeAllRounds(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.round.all()).map(async (roundAccount) => {
        console.log('round', roundAccount.publicKey.toBase58());
        let round = new round_1.default(roundAccount.account);
        await round_1.default.adminCloseRound(workspace, round);
    }));
}
exports.closeAllRounds = closeAllRounds;
async function closeAllUser(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.user.all()).map(async (userAccount) => {
        console.log('user', userAccount.publicKey.toBase58());
        let user = new user_1.default(userAccount.account);
        await user.adminCloseUserAccount(workspace);
    }));
}
exports.closeAllUser = closeAllUser;
async function closeAllUserClaimable(owner, connection, cluster) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    await Promise.allSettled((await workspace.program.account.userClaimable.all()).map(async (userClaimableAccount) => {
        console.log('userClaimable', userClaimableAccount.publicKey.toBase58());
        await userClaimable_1.default.adminCloseUserClaimable(workspace, userClaimableAccount.publicKey);
    }));
}
exports.closeAllUserClaimable = closeAllUserClaimable;
async function init(owner, connection, cluster, mint) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    (await Promise.all(exports.gameSeeds.map(async (gameSeed) => {
        console.log(gameSeed);
        return await initFromGameSeed(workspace, gameSeed, mint.address);
    }))).forEach(([vault, game]) => {
        console.log(vault.account.address.toBase58(), game.account.baseSymbol, game.account.vault.toBase58());
    });
}
exports.init = init;
//# sourceMappingURL=admin.js.map