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
Object.defineProperty(exports, "__esModule", { value: true });
exports.U64MAX = exports.U32MAX = exports.USER_PREDICTION_MIN_AMOUNT = exports.UNSIGNED_MIN = exports.PROGRAM_ID = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const LOCALNET_PROGRAM_ID = new web3_js_1.PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const MAINNET_PROGRAM_ID = new web3_js_1.PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const DEVNET_PROGRAM_ID = new web3_js_1.PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const TESTNET_PROGRAM_ID = new web3_js_1.PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const PROGRAM_ID = (cluster) => {
    if (cluster === 'devnet') {
        return DEVNET_PROGRAM_ID;
    }
    else if (cluster === 'mainnet-beta') {
        return MAINNET_PROGRAM_ID;
    }
    else if (cluster === 'testnet') {
        return TESTNET_PROGRAM_ID;
    }
    else if (cluster === 'localnet') {
        return LOCALNET_PROGRAM_ID;
    }
    return null;
};
exports.PROGRAM_ID = PROGRAM_ID;
exports.UNSIGNED_MIN = new anchor.BN(0);
const USER_PREDICTION_MIN_AMOUNT = (mintDecimals) => (new anchor.BN(1)).mul((new anchor.BN(10)).pow(new anchor.BN(mintDecimals)));
exports.USER_PREDICTION_MIN_AMOUNT = USER_PREDICTION_MIN_AMOUNT;
exports.U32MAX = new anchor.BN("4294967295");
exports.U64MAX = new anchor.BN("18446744073709551615");
//# sourceMappingURL=constants.js.map