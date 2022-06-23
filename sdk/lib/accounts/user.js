"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const index_1 = require("../util/index");
class User {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static async initializeUserInstruction(workspace, userPubkey) {
        return await workspace.program.methods.initUserInstruction().accounts({
            owner: workspace.owner,
            user: userPubkey,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    static async initializeUser(workspace) {
        let [userPubkey, _userPubkeyBump] = await workspace.programAddresses.getUserPubkey(workspace.owner);
        let ix = await this.initializeUserInstruction(workspace, userPubkey);
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
                    let userAccount = await (0, index_1.fetchAccountRetry)(workspace, 'user', userPubkey);
                    resolve(new User(userAccount));
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async userClaimInstruction(workspace, vault, toTokenAccount, amount) {
        if (workspace.owner.toBase58() !== this.account.owner.toBase58())
            throw Error("Signer not Owner");
        if (this.account.claimable.lt(amount))
            throw Error("Insufficient Claimable Amount");
        return await workspace.program.methods.userClaimInstruction(amount).accounts({
            signer: workspace.owner,
            user: this.account.address,
            toTokenAccount: toTokenAccount.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAuthority: vault.account.vaultAuthority,
            tokenMint: toTokenAccount.mint,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
        }).instruction();
    }
    async userClaim(workspace, vault, toTokenAccount, amount) {
        let ix = await this.userClaimInstruction(workspace, vault, toTokenAccount, amount);
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
                    await this.updateData(await (0, index_1.fetchAccountRetry)(workspace, 'user', this.account.address));
                    resolve(this);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async closeUserAccountInstruction(workspace) {
        return await workspace.program.methods.closeUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            receiver: workspace.owner
        }).instruction();
    }
    async closeUserAccount(workspace) {
        let ix = await this.closeUserAccountInstruction(workspace);
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
}
exports.default = User;
//# sourceMappingURL=user.js.map