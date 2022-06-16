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
exports.getDownVaultPubkey = exports.getUpVaultPubkey = exports.getVaultPubkey = exports.getGameFeeVaultPubkey = exports.getGamePubkey = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@project-serum/anchor"));
async function getGamePubkey(workspace) {
    return await web3_js_1.PublicKey.findProgramAddress([workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))], workspace.program.programId);
}
exports.getGamePubkey = getGamePubkey;
async function getGameFeeVaultPubkey(workspace, gamePubkey) {
    return await web3_js_1.PublicKey.findProgramAddress([workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))], workspace.program.programId);
}
exports.getGameFeeVaultPubkey = getGameFeeVaultPubkey;
async function getVaultPubkey(workspace, gamePubkey) {
    return await web3_js_1.PublicKey.findProgramAddress([workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))], workspace.program.programId);
}
exports.getVaultPubkey = getVaultPubkey;
async function getUpVaultPubkey(workspace, gamePubkey, vaultPubkey) {
    return await web3_js_1.PublicKey.findProgramAddress([workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))], workspace.program.programId);
}
exports.getUpVaultPubkey = getUpVaultPubkey;
async function getDownVaultPubkey(workspace, gamePubkey, vaultPubkey) {
    return await web3_js_1.PublicKey.findProgramAddress([workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))], workspace.program.programId);
}
exports.getDownVaultPubkey = getDownVaultPubkey;
//# sourceMappingURL=programAddresses.js.map