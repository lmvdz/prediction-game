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
exports.ProgramAddresses = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@project-serum/anchor"));
class ProgramAddresses {
    constructor(program, owner) {
        this.program = program;
        this.owner = owner;
    }
    async getGamePubkey(vault, priceProgram, priceFeed) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            this.owner.toBuffer(),
            vault.account.address.toBuffer(),
            priceProgram.toBuffer(),
            priceFeed.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('game')),
        ], this.program.programId);
    }
    async getGameRoundHistoryPubkey(game) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            game.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('round_history')),
        ], this.program.programId);
    }
    async getGameUserPredictionHistoryPubkey(game) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            game.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction_history')),
        ], this.program.programId);
    }
    async getFeeVaultATAPubkey(vaultPubkey) {
        return await web3_js_1.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('fee_vault_ata'))], this.program.programId);
    }
    async getFeeVaultATAAuthorityPubkey(feeVaultAta) {
        return await web3_js_1.PublicKey.findProgramAddress([feeVaultAta.toBuffer()], this.program.programId);
    }
    async getVaultATAPubkey(vaultPubkey) {
        return await web3_js_1.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault_ata'))], this.program.programId);
    }
    async getVaultATAAuthorityPubkey(vaultAta) {
        return await web3_js_1.PublicKey.findProgramAddress([vaultAta.toBuffer()], this.program.programId);
    }
    async getVaultPubkey(tokenMint) {
        return await web3_js_1.PublicKey.findProgramAddress([Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)), this.owner.toBuffer(), tokenMint.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))], this.program.programId);
    }
    roundToBuffer(roundNumber) {
        return new anchor.BN(roundNumber).toArrayLike(Buffer, 'be', 4);
    }
    async getRoundPubkey(gamePubkey, roundNumber) {
        const roundNumberBuffer = this.roundToBuffer(roundNumber);
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            gamePubkey.toBuffer(),
            roundNumberBuffer.subarray(0, 1),
            roundNumberBuffer.subarray(1, 2),
            roundNumberBuffer.subarray(2, 3),
            roundNumberBuffer.subarray(3, 4),
            Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ], this.program.programId);
    }
    async getUserPredictionPubkey(game, round, user) {
        const roundNumberBuffer = new anchor.BN(round.account.roundNumber).toArrayLike(Buffer, 'be', 4);
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            user.account !== undefined ? user.account.owner.toBuffer() : user.toBuffer(),
            game.account.address.toBuffer(),
            round.account.address.toBuffer(),
            roundNumberBuffer.subarray(0, 1),
            roundNumberBuffer.subarray(1, 2),
            roundNumberBuffer.subarray(2, 3),
            roundNumberBuffer.subarray(3, 4),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
        ], this.program.programId);
    }
    async getUserPubkey(userOwner) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            userOwner.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('user'))
        ], this.program.programId);
    }
    async getUserClaimablePubkey(userAccount) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            userAccount.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_claimable'))
        ], this.program.programId);
    }
    async getCrankPubkey(crankOwner, gamePubkey, userPubkey) {
        return await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from(anchor.utils.bytes.utf8.encode(this.program.idl.version)),
            crankOwner.toBuffer(),
            userPubkey.toBuffer(),
            gamePubkey.toBuffer(),
            Buffer.from(anchor.utils.bytes.utf8.encode('crank'))
        ], this.program.programId);
    }
}
exports.ProgramAddresses = ProgramAddresses;
//# sourceMappingURL=programAddresses.js.map