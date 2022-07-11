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
class UserPredictionHistory {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static fromJSON2(json) {
        return {
            recordId: new anchor.BN(json.recordId),
            address: new web3_js_1.PublicKey(json.address),
            game: new web3_js_1.PublicKey(json.game),
            round: new web3_js_1.PublicKey(json.round),
            upOrDown: json.upOrDown,
            amount: new anchor.BN(json.amount)
        };
    }
    static fromJSON(json) {
        return {
            head: new anchor.BN(json.head),
            game: new web3_js_1.PublicKey(json.game),
            address: new web3_js_1.PublicKey(json.address),
            userPredictions: json.userPredictions.map((x) => this.fromJSON(JSON.parse(x)))
        };
    }
    static async adminCloseUserUserPredictionHistoryInstruction(workspace, userPredictionHistory) {
        return await workspace.program.methods.adminCloseUserPredictionHistoryInstruction().accounts({
            signer: workspace.owner,
            userPredictionHistory: userPredictionHistory,
            userPredictionHistoryCloseReceiver: workspace.owner
        }).instruction();
    }
    static async adminCloseUserUserPredictionHistory(workspace, userPredictionHistory) {
        let ix = await this.adminCloseUserUserPredictionHistoryInstruction(workspace, userPredictionHistory);
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
exports.default = UserPredictionHistory;
//# sourceMappingURL=userPredictionHistory.js.map