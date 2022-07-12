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

    public static fromJSON2<UserPredictionHistoryItem>(json: any): UserPredictionHistoryItem {
        return { 
            recordId: new anchor.BN(json.recordId, 16),
            address: new PublicKey(json.address),
            game: new PublicKey(json.game),
            round: new PublicKey(json.round),
            upOrDown: json.upOrDown,
            amount: new anchor.BN(json.amount, 16)
        } as unknown as UserPredictionHistoryItem
    }

    public static fromJSON<UserPredictionHistoryAccount>(json: any): UserPredictionHistoryAccount {
        return { 
            head: new anchor.BN(json.head, 16),
            game: new PublicKey(json.game),
            address: new PublicKey(json.address),
            userPredictions: json.userPredictions.map((x: any) => this.fromJSON2<UserPredictionHistoryItem>(x))
        } as unknown as UserPredictionHistoryAccount
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