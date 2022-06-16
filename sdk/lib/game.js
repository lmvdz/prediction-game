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
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const ProgramAddresses = __importStar(require("./programAddresses"));
class Game {
    constructor(owner, address, tokenDecimal, tokenMint, roundNumber, currentRound, previousRound, vault, feeVault, totalVolume, totalVolumeRollover) {
        this.owner = owner;
        this.address = address;
        this.tokenDecimal = tokenDecimal;
        this.tokenMint = tokenMint;
        this.roundNumber = roundNumber;
        this.currentRound = currentRound;
        this.previousRound = previousRound;
        this.vault = vault;
        this.feeVault = feeVault;
        this.totalVolume = totalVolume;
        this.totalVolumeRollover = totalVolumeRollover;
    }
    static async initialize(workspace, mint) {
        const [gamePubkey, _gamePubkeyBump] = await ProgramAddresses.getGamePubkey(workspace);
        const [gameFeeVaultPubkey, _gameFeeVaultPubkeyBump] = await ProgramAddresses.getGameFeeVaultPubkey(workspace, gamePubkey);
        const [vaultPubkey, _vaultPubkeyBump] = await ProgramAddresses.getVaultPubkey(workspace, gamePubkey);
        const [upVaultPubkey, upVaultPubkeyBump] = await ProgramAddresses.getUpVaultPubkey(workspace, gamePubkey, vaultPubkey);
        const [downVaultPubkey, downVaultPubkeyBump] = await ProgramAddresses.getDownVaultPubkey(workspace, gamePubkey, vaultPubkey);
        let initGameInstruction = await workspace.program.methods.initGameInstruction(upVaultPubkeyBump, downVaultPubkeyBump, mint.decimals).accounts({
            owner: workspace.owner,
            game: gamePubkey,
            gameFeeVault: gameFeeVaultPubkey,
            vault: vaultPubkey,
            upTokenAccount: upVaultPubkey,
            downTokenAccount: downVaultPubkey,
            tokenMint: mint.address,
            rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
        }).instruction();
        try {
            await (0, web3_js_1.sendAndConfirmTransaction)(workspace.program.provider.connection, new web3_js_1.Transaction().add(initGameInstruction), [workspace.program.provider.wallet.payer], { commitment: 'confirmed' });
            let game = await workspace.program.account.game.fetch(gamePubkey);
            return new Game(game.owner, game.address, game.tokenDecimal, game.tokenMint, game.roundNumber, game.currentRound, game.previousRound, game.vault, game.feeVault, game.totalVolume, game.totalVolumeRollover);
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = Game;
//# sourceMappingURL=game.js.map