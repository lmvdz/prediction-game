"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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