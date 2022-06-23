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
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const chunk_1 = __importDefault(require("../util/chunk"));
const round_1 = __importDefault(require("../accounts/round"));
const index_1 = require("../util/index");
class Game {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    async loadRoundData(workspace) {
        this.currentRound = new round_1.default(await (0, index_1.fetchAccountRetry)(workspace, 'round', (this.account.currentRound)));
        this.previousRound = new round_1.default(await (0, index_1.fetchAccountRetry)(workspace, 'round', (this.account.previousRound)));
        return this;
    }
    async getUpdatedGameData(workspace) {
        return await (0, index_1.fetchAccountRetry)(workspace, 'game', (this.account.address));
    }
    async updateGameData(workspace) {
        await this.updateData(await this.getUpdatedGameData(workspace));
        return this;
    }
    async updateRoundData(workspace) {
        await this.currentRound.updateData(await (0, index_1.fetchAccountRetry)(workspace, 'round', (this.account.currentRound)));
        await this.previousRound.updateData(await (0, index_1.fetchAccountRetry)(workspace, 'round', (this.account.previousRound)));
        return this;
    }
    async collectFeeInstruction(workspace, crank) {
        return await workspace.program.methods.collectFeeInstruction().accounts({
            signer: workspace.owner,
            crank: crank.account.address,
            game: this.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    async collectFee(workspace, crank) {
        if (!this.currentRound.account.feeCollected) {
            try {
                let ix = await this.collectFeeInstruction(workspace, crank);
                let tx = new web3_js_1.Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx);
                await (0, index_1.confirmTxRetry)(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            }
            catch (error) {
                console.error(error);
                return this;
            }
        }
        else {
            return this;
        }
    }
    async withdrawFeeInstruction(workspace, vault, toTokenAccount) {
        return await workspace.program.methods.withdrawFeeInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            vault: vault.account.address,
            feeVaultAta: vault.account.feeVaultAta,
            feeVaultAuthority: vault.account.feeVaultAuthority,
            toTokenAccount: toTokenAccount.address !== undefined ? toTokenAccount.address : toTokenAccount,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        }).instruction();
    }
    async withdrawFee(workspace, vault, toTokenAccount) {
        if (!this.account.unclaimedFees.gt(new anchor.BN(0))) {
            try {
                let ix = await this.withdrawFeeInstruction(workspace, vault, toTokenAccount);
                let tx = new web3_js_1.Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx);
                await (0, index_1.confirmTxRetry)(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            }
            catch (error) {
                console.error(error);
                return this;
            }
        }
        else {
            return this;
        }
    }
    async claimFeeInstruction(workspace, vault) {
        return await workspace.program.methods.claimFeeInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAuthority: vault.account.vaultAuthority,
            feeVaultAta: vault.account.feeVaultAta,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        }).instruction();
    }
    async claimFee(workspace, vault) {
        if (!this.account.unclaimedFees.gt(new anchor.BN(0))) {
            try {
                let ix = await this.claimFeeInstruction(workspace, vault);
                let tx = new web3_js_1.Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx);
                await (0, index_1.confirmTxRetry)(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            }
            catch (error) {
                console.error(error);
                return this;
            }
        }
        else {
            return this;
        }
    }
    async payoutCranksInstruction(workspace, remainingAccounts) {
        return await workspace.program.methods.payoutCranksInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: web3_js_1.SystemProgram.programId
        }).remainingAccounts(remainingAccounts).instruction();
    }
    async payoutCranks(workspace) {
        if (!this.currentRound.account.finished)
            throw Error("Round Not Finished");
        if (!this.currentRound.account.feeCollected)
            throw Error("Round Fee Not Collected");
        if (!this.currentRound.account.settled)
            throw Error("Round Not Settled");
        if (!this.currentRound.account.cranksPaid) {
            let unpaidCranks = (await workspace.program.account.crank.all()).filter(crank => {
                return crank.account.lastCrankRound.toBase58() === this.currentRound.account.address.toBase58() &&
                    crank.account.lastPaidCrankRound.toBase58() !== this.currentRound.account.address.toBase58();
            });
            let unpaidCrankChunks = (0, chunk_1.default)((await Promise.all(unpaidCranks.map(async (crank) => {
                return [{
                        pubkey: crank.account.address,
                        isSigner: false,
                        isWritable: true
                    }, {
                        pubkey: crank.account.user,
                        isSigner: false,
                        isWritable: true
                    }];
            }))).flat(Infinity), 20);
            if (unpaidCrankChunks.length > 0) {
                await Promise.allSettled(unpaidCrankChunks.map(async (chunk) => {
                    try {
                        let ix = await this.payoutCranksInstruction(workspace, chunk);
                        let tx = new web3_js_1.Transaction().add(ix);
                        let txSignature = await workspace.sendTransaction(tx);
                        await (0, index_1.confirmTxRetry)(workspace, txSignature);
                    }
                    catch (error) {
                        console.error(error);
                        return error;
                    }
                }));
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            }
            else {
                try {
                    let ix = await this.payoutCranksInstruction(workspace, []);
                    let tx = new web3_js_1.Transaction().add(ix);
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                    return await (await this.updateGameData(workspace)).updateRoundData(workspace);
                }
                catch (error) {
                    console.error(error);
                    return this;
                }
            }
        }
        else {
            return this;
        }
    }
    static async initializeGame(workspace, baseSymbol, vault, priceProgram, priceFeed, feeBps, crankBps) {
        const [gamePubkey, _gamePubkeyBump] = await workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed);
        // console.log(baseSymbol, vaultPubkeyBump, feeVaultPubkeyBump)
        return new Promise((resolve, reject) => {
            workspace.program.methods.initGameInstruction(baseSymbol, feeBps, crankBps).accounts({
                owner: workspace.owner,
                game: gamePubkey,
                vault: vault.account.address,
                priceProgram,
                priceFeed,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            }).transaction().then((tx) => {
                workspace.sendTransaction(tx).then(txSignature => {
                    (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                        (0, index_1.fetchAccountRetry)(workspace, 'game', gamePubkey).then(gameAccount => {
                            resolve(new Game(gameAccount));
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
    }
    updateGame(workspace, crank) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.updateGameInstruction().accounts({
                signer: workspace.owner,
                game: this.account.address,
                crank: crank.account.address,
                currentRound: this.account.currentRound,
                priceProgram: this.account.priceProgram,
                priceFeed: this.account.priceFeed,
                systemProgram: web3_js_1.SystemProgram.programId
            }).transaction().then(tx => {
                workspace.sendTransaction(tx).then(txSignature => {
                    (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                        resolve(this);
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
    }
    async settlePredictionsInstruction(workspace, crank, remainingAccounts) {
        return await workspace.program.methods.settlePredictionsInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            crank: crank.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: web3_js_1.SystemProgram.programId
        }).remainingAccounts(remainingAccounts).instruction();
    }
    async settlePredictions(workspace, crank) {
        if (!this.currentRound.account.finished)
            throw Error("Round Not Finished");
        if (!this.currentRound.account.feeCollected)
            throw Error("Round Fee Not Collected");
        if (!this.currentRound.account.settled) {
            let unSettledPredictions = (await workspace.program.account.userPrediction.all()).filter(prediction => {
                return prediction.account.round.toBase58() === this.currentRound.account.address.toBase58() && !prediction.account.settled;
            });
            let unSettledPredictionChunks = (0, chunk_1.default)((await Promise.all(unSettledPredictions.map(async (prediction) => {
                return [
                    {
                        pubkey: prediction.account.address,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: prediction.account.user,
                        isSigner: false,
                        isWritable: true
                    }
                ];
            }))).flat(Infinity), 20);
            if (unSettledPredictionChunks.length > 0) {
                await Promise.allSettled(unSettledPredictionChunks.map(async (chunk) => {
                    try {
                        let ix = await this.settlePredictionsInstruction(workspace, crank, chunk);
                        let tx = new web3_js_1.Transaction().add(ix);
                        let txSignature = await workspace.sendTransaction(tx);
                        await (0, index_1.confirmTxRetry)(workspace, txSignature);
                    }
                    catch (error) {
                        return error;
                    }
                }));
                await this.updateGameData(workspace);
                return await this.updateRoundData(workspace);
            }
            else {
                try {
                    let ix = await this.settlePredictionsInstruction(workspace, crank, []);
                    let tx = new web3_js_1.Transaction().add(ix);
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                    await this.updateGameData(workspace);
                    return await this.updateRoundData(workspace);
                }
                catch (error) {
                    console.error(error);
                    return this;
                }
            }
        }
        else {
            return this;
        }
    }
}
exports.default = Game;
//# sourceMappingURL=game.js.map