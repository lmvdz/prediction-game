"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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