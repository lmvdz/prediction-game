import * as anchor from "@project-serum/anchor"
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { confirmTxRetry } from "../util"
import { Workspace } from "../workspace"
import { DataUpdatable } from "../dataUpdatable"


export type Claim = {
    amount: anchor.BN
    mint: PublicKey
    vault: PublicKey
}

export type UserClaimableAccount = {

    address: PublicKey
    user: PublicKey
    claims: Claim[]

}

export default class UserClaimable implements DataUpdatable<UserClaimableAccount> {
    account: UserClaimableAccount

    constructor(account: UserClaimableAccount){
        this.account = account;
    }
    
    public async updateData(data: UserClaimableAccount): Promise<boolean> {
        this.account = data;
        return true;
    }


    public static async adminCloseUserClaimableInstruction(workspace: Workspace, userClaimablePubkey: PublicKey) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseUserClaimableInstruction().accounts({
            signer: workspace.owner,
            userClaimable: userClaimablePubkey,
            userClaimableCloseReceiver: workspace.owner
        }).instruction()
    }

    public static async adminCloseUserClaimable(workspace: Workspace, userClaimablePubkey: PublicKey): Promise<boolean> {

        let ix = await this.adminCloseUserClaimableInstruction(workspace, userClaimablePubkey);
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