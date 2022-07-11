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
const anchor = __importStar(require("@project-serum/anchor"));
const web3_js_1 = require("@solana/web3.js");
const util_1 = require("../util");
class RoundHistory {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static fromJSON2(json) {
        return {
            recordId: new anchor.BN(json.recordId, 16),
            roundNumber: json.roundNumber,
            roundStartTime: new anchor.BN(json.roundStartTime, 16),
            roundCurrentTime: new anchor.BN(json.roundCurrentTime, 16),
            roundTimeDifference: new anchor.BN(json.roundTimeDifference, 16),
            roundStartPrice: new anchor.BN(json.roundStartPrice, 16),
            roundCurrentPrice: new anchor.BN(json.roundCurrentPrice, 16),
            roundEndPrice: new anchor.BN(json.roundEndPrice, 16),
            roundPriceDifference: new anchor.BN(json.roundPriceDifference, 16),
            roundPriceDecimals: new anchor.BN(json.roundPriceDecimals, 16),
            roundWinningDirection: json.roundWinningDirection,
            totalFeeCollected: new anchor.BN(json.totalFeeCollected, 16),
            totalUpAmount: new anchor.BN(json.totalUpAmount, 16),
            totalDownAmount: new anchor.BN(json.totalDownAmount, 16),
            totalAmountSettled: new anchor.BN(json.totalAmountSettled, 16),
            totalPredictionsSettled: json.totalPredictionsSettled,
            totalPredictions: json.totalPredictions,
            totalUniqueCrankers: json.totalUniqueCrankers,
            totalCranks: json.totalCranks,
            totalCranksPaid: json.totalCranksPaid,
            totalAmountPaidToCranks: new anchor.BN(json.totalAmountPaidToCranks, 16)
        };
    }
    static fromJSON(json) {
        return {
            head: new anchor.BN(json.head),
            game: new web3_js_1.PublicKey(json.game),
            address: new web3_js_1.PublicKey(json.address),
            rounds: json.rounds.map((x) => this.fromJSON2(JSON.parse(x)))
        };
    }
    static async adminCloseUserRoundHistoryInstruction(workspace, roundHistory) {
        return await workspace.program.methods.adminCloseRoundHistoryInstruction().accounts({
            signer: workspace.owner,
            roundHistory: roundHistory,
            roundHistoryCloseReceiver: workspace.owner
        }).instruction();
    }
    static async adminCloseUserRoundHistory(workspace, roundHistory) {
        let ix = await this.adminCloseUserRoundHistoryInstruction(workspace, roundHistory);
        let tx = new web3_js_1.Transaction().add(ix);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, util_1.confirmTxRetry)(workspace, txSignature);
                }
                catch (error) {
                    reject(error);
                }
                try {
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
}
exports.default = RoundHistory;
//# sourceMappingURL=roundHistory.js.map