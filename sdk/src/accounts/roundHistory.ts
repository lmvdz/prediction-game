import * as anchor from "@project-serum/anchor"
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { confirmTxRetry } from "../util"
import { Workspace } from "../workspace"
import { DataUpdatable } from "../dataUpdatable"


export type  RoundHistoryItem = {
    recordId: anchor.BN,
    roundNumber: number,
    roundStartTime: anchor.BN,
    roundCurrentTime: anchor.BN,
    roundTimeDifference: anchor.BN,
    roundStartPrice: anchor.BN,
    roundCurrentPrice: anchor.BN,
    roundEndPrice: anchor.BN,
    roundPriceDifference: anchor.BN,
    roundPriceDecimals: anchor.BN,
    roundWinningDirection: number,
    totalFeeCollected: anchor.BN,
    totalUpAmount: anchor.BN,
    totalDownAmount: anchor.BN,
    totalAmountSettled: anchor.BN,
    totalPredictionsSettled: number,
    totalPredictions: number,
    totalUniqueCrankers: number,
    totalCranks: number,
    totalCranksPaid: number,
    totalAmountPaidToCranks: anchor.BN
}

export type RoundHistoryAccount = {

    head: anchor.BN,
    game: PublicKey,
    address: PublicKey,
    rounds: RoundHistoryItem[]

}

export default class RoundHistory implements DataUpdatable<RoundHistoryAccount> {
    account: RoundHistoryAccount

    constructor(account: RoundHistoryAccount){
        this.account = account;
    }
    
    public async updateData(data: RoundHistoryAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    fromJSON2<RoundHistoryAccountItem>(json: any): RoundHistoryAccountItem {
        return { 
            recordId: new anchor.BN(json.recordId) ,
            roundNumber: json.roundNumber,
            roundStartTime: new anchor.BN(json.roundStartTime) ,
            roundCurrentTime: new anchor.BN(json.roundCurrentTime) ,
            roundTimeDifference: new anchor.BN(json.roundTimeDifference) ,
            roundStartPrice: new anchor.BN(json.roundStartPrice) ,
            roundCurrentPrice: new anchor.BN(json.roundCurrentPrice) ,
            roundEndPrice: new anchor.BN(json.roundEndPrice) ,
            roundPriceDifference: new anchor.BN(json.roundPriceDifference) ,
            roundPriceDecimals: new anchor.BN(json.roundPriceDecimals) ,
            roundWinningDirection: json.roundWinningDirection,
            totalFeeCollected: new anchor.BN(json.totalFeeCollected) ,
            totalUpAmount: new anchor.BN(json.totalUpAmount) ,
            totalDownAmount: new anchor.BN(json.totalDownAmount) ,
            totalAmountSettled: new anchor.BN(json.totalAmountSettled) ,
            totalPredictionsSettled: json.totalPredictionsSettled,
            totalPredictions: json.totalPredictions,
            totalUniqueCrankers: json.totalUniqueCrankers,
            totalCranks: json.totalCranks,
            totalCranksPaid: json.totalCranksPaid,
            totalAmountPaidToCranks: new anchor.BN(json.totalAmountPaidToCranks) 
        } as unknown as RoundHistoryAccountItem
    }

    fromJSON<RoundHistoryAccount>(json: any): RoundHistoryAccount {
        return { 
            head: new anchor.BN(json.head),
            game: new PublicKey(json.game),
            address: new PublicKey(json.address),
            rounds: json.rounds.map((x: any) => this.fromJSON2(JSON.parse(x)))
        } as unknown as RoundHistoryAccount
    }


    public static async adminCloseUserRoundHistoryInstruction(workspace: Workspace, roundHistory: PublicKey) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseRoundHistoryInstruction().accounts({
            signer: workspace.owner,
            roundHistory: roundHistory,
            roundHistoryCloseReceiver: workspace.owner
        }).instruction()
    }

    public static async adminCloseUserRoundHistory(workspace: Workspace, roundHistory: PublicKey): Promise<boolean> {

        let ix = await this.adminCloseUserRoundHistoryInstruction(workspace, roundHistory);
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