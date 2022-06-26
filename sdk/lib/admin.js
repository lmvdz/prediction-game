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
exports.init = exports.gameSeeds = void 0;
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const anchor = __importStar(require("@project-serum/anchor"));
const bs58_1 = __importDefault(require("bs58"));
const game_1 = __importStar(require("./accounts/game"));
const spl_token_1 = require("@solana/spl-token");
const util_1 = require("./util");
const workspace_1 = require("./workspace");
const vault_1 = __importDefault(require("./accounts/vault"));
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
        workspace.programAddresses.getGamePubkey(vault, priceProgram, priceProgram).then(([gamePubkey, _vaultPubkeyBump]) => {
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
        let game = await loadGame(workspace, gameSeed.baseSymbol, vault, gameSeed.oracle, gameSeed.priceProgram, gameSeed.priceProgram, gameSeed.roundLength);
        return [vault, game];
    }
    catch (error) {
        console.error(error);
        return [null, null];
    }
}
async function init(owner, connection, cluster, mint) {
    const botWallet = new nodewallet_1.default(owner);
    const workspace = workspace_1.Workspace.load(connection, botWallet, cluster, { commitment: 'confirmed' });
    if (cluster === 'devnet') {
        // devnet mint
        const mintKeypair = web3_js_2.Keypair.fromSecretKey(bs58_1.default.decode("3dS4W9gKuGQcvA4s9dSRKLGJ8UAdu9ZeFLxJfv6WLK4BzZZnt3L2WNSJchjtgLi7BnxMTcpPRU1AG9yfEkR2cxDT"));
        const mintDecimals = 6;
        mint = await createFakeMint(connection, mintKeypair, owner, mintDecimals);
    }
    (await Promise.all(exports.gameSeeds.map(async (gameSeed) => {
        return await initFromGameSeed(workspace, gameSeed, mint.address);
    }))).forEach(([vault, game]) => {
        console.log(vault.account.address.toBase58(), game.account.baseSymbol);
    });
}
exports.init = init;
//# sourceMappingURL=admin.js.map