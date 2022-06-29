"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const constants_1 = require("../constants");
const index_1 = require("../util/index");
class UserPrediction {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static async initializeUserPredictionInstruction(workspace, vault, game, round, user, userClaimable, fromTokenAccount, fromTokenAccountAuthority, userPredictionPubkey, upOrDown, amount) {
        if (amount.gt(constants_1.U64MAX) || amount.lt((0, constants_1.USER_PREDICTION_MIN_AMOUNT)(game.account.tokenDecimal)))
            throw Error("Amount does not fall in the required range for [1, u64::MAX]");
        return await workspace.program.methods.initUserPredictionInstruction(upOrDown.valueOf(), amount).accounts({
            signer: workspace.owner,
            game: game.account.address,
            user: user.account !== undefined ? user.account.address : user,
            userClaimable: userClaimable,
            currentRound: round.account !== undefined ? round.account.address : round,
            userPrediction: userPredictionPubkey,
            // deposit
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            fromTokenAccount: fromTokenAccount.address !== undefined ? fromTokenAccount.address : fromTokenAccount,
            fromTokenAccountAuthority: fromTokenAccountAuthority,
            tokenMint: vault.account.tokenMint,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    static async initializeUserPrediction(workspace, vault, game, round, user, userClaimable, userTokenAccount, userTokenAccountAuthority, upOrDown, amount) {
        let [userPredictionPubkey, _userPredictionPubkeyBump] = await workspace.programAddresses.getUserPredictionPubkey(game, round, user);
        let ix = await this.initializeUserPredictionInstruction(workspace, vault, game, round, user, userClaimable, userTokenAccount, userTokenAccountAuthority, userPredictionPubkey, upOrDown, amount);
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
                    let userPrediction = await (0, index_1.fetchAccountRetry)(workspace, 'userPrediction', userPredictionPubkey);
                    resolve(new UserPrediction(userPrediction));
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    static async closeUserPredictionInstruction(workspace, prediction) {
        return await workspace.program.methods.closeUserPredictionInstruction().accounts({
            signer: workspace.owner,
            userPrediction: prediction.account.address,
            userPredictionCloseReceiver: prediction.account.owner
        }).instruction();
    }
    static async closeUserPrediction(workspace, prediction) {
        let ix = await this.closeUserPredictionInstruction(workspace, prediction);
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
                    prediction = null;
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
}
exports.default = UserPrediction;
//# sourceMappingURL=userPrediction.js.map