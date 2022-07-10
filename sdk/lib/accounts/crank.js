"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const index_1 = require("../util/index");
class Crank {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static async initializeCrankInstruction(workspace, gamePubkey, userPubkey, crankPubkey) {
        return await workspace.program.methods.initCrankInstruction().accounts({
            owner: workspace.owner,
            game: gamePubkey,
            user: userPubkey,
            crank: crankPubkey,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    static async initializeCrank(workspace, game, user) {
        let [crankPubkey, _crankPubkeyBump] = await workspace.programAddresses.getCrankPubkey(workspace.owner, game.account.address, user.account.address);
        let ix = await this.initializeCrankInstruction(workspace, game.account.address, user.account.address, crankPubkey);
        let tx = new web3_js_1.Transaction().add(ix);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                }
                catch (error) {
                    reject(error);
                }
                // let user = await workspace.program.account.user.fetch(userPubkey) as UserAccount;
                try {
                    let crankAccount = await (0, index_1.fetchAccountRetry)(workspace, 'crank', crankPubkey);
                    resolve(new Crank(crankAccount));
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async closeCrankAccountInstruction(workspace) {
        return await workspace.program.methods.closeCrankAccountInstruction().accounts({
            signer: workspace.owner,
            crank: this.account.address,
            receiver: workspace.owner
        }).instruction();
    }
    async closeCrankAccount(workspace) {
        let ix = await this.closeCrankAccountInstruction(workspace);
        let tx = new web3_js_1.Transaction().add(ix);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                }
                catch (error) {
                    reject(error);
                }
                try {
                    this.account = null;
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async adminCloseCrankAccountInstruction(workspace) {
        return await workspace.program.methods.adminCloseCrankAccountInstruction().accounts({
            signer: workspace.owner,
            crank: this.account.address,
            receiver: workspace.owner
        }).instruction();
    }
    async adminCloseCrankAccount(workspace) {
        let ix = await this.adminCloseCrankAccountInstruction(workspace);
        let tx = new web3_js_1.Transaction().add(ix);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                }
                catch (error) {
                    console.error(error);
                    reject(error);
                }
                try {
                    this.account = null;
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
}
exports.default = Crank;
//# sourceMappingURL=crank.js.map