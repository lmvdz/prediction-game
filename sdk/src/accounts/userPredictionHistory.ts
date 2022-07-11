import * as anchor from "@project-serum/anchor"
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { confirmTxRetry } from "../util"
import { Workspace } from "../workspace"
import { DataUpdatable } from "../dataUpdatable"


export type  UserPredictionHistoryItem = {
    recordId: anchor.BN,

    address: PublicKey,
    game: PublicKey,
    round: PublicKey,
    upOrDown: number,
    amount: anchor.BN
}

export type UserPredictionHistoryAccount = {

    head: anchor.BN,
    game: PublicKey,
    address: PublicKey,
    userPredictions: UserPredictionHistoryItem[]

}

export default class UserPredictionHistory implements DataUpdatable<UserPredictionHistoryAccount> {
    account: UserPredictionHistoryAccount

    constructor(account: UserPredictionHistoryAccount){
        this.account = account;
    }
    
    public async updateData(data: UserPredictionHistoryAccount): Promise<boolean> {
        this.account = data;
        return true;
    }


    public static async adminCloseUserUserPredictionHistoryInstruction(workspace: Workspace, userPredictionHistory: PublicKey) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseUserPredictionHistoryInstruction().accounts({
            signer: workspace.owner,
            userPredictionHistory: userPredictionHistory,
            userPredictionHistoryCloseReceiver: workspace.owner
        }).instruction()
    }

    public static async adminCloseUserUserPredictionHistory(workspace: Workspace, userPredictionHistory: PublicKey): Promise<boolean> {

        let ix = await this.adminCloseUserUserPredictionHistoryInstruction(workspace, userPredictionHistory);
        let tx = new Transaction().add(ix);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    reject(error);
                }
                try {
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
                
            }, 500)
        })
    }


}