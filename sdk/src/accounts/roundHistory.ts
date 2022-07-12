import * as anchor from "@project-serum/anchor"
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { confirmTxRetry } from "../util"
import { Workspace } from "../workspace"
import { DataUpdatable } from "../dataUpdatable"


export type  RoundHistoryItem = {
    recordId: anchor.BN,
    address: PublicKey,
    roundNumber: number,
    roundStartTime: anchor.BN,
    roundCurrentTime: anchor.BN,
    roundTimeDifference: anchor.BN,
    roundStartPrice: anchor.BN,
    roundStartPriceDecimals: anchor.BN,
    roundCurrentPrice: anchor.BN,
    roundCurrentPriceDecimals: anchor.BN,
    roundEndPrice: anchor.BN,
    roundEndPriceDecimals: anchor.BN,
    roundPriceDifference: anchor.BN,
    roundPriceDifferenceDecimals: anchor.BN,
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

    public static fromJSON2<RoundHistoryAccountItem>(json: any): RoundHistoryAccountItem {
        return { 
            recordId: new anchor.BN(json.recordId, 16) ,
            roundNumber: json.roundNumber,
            roundStartTime: new anchor.BN(json.roundStartTime, 16) ,
            roundCurrentTime: new anchor.BN(json.roundCurrentTime, 16) ,
            roundTimeDifference: new anchor.BN(json.roundTimeDifference, 16) ,
            roundStartPrice: new anchor.BN(json.roundStartPrice, 16) ,
            roundCurrentPrice: new anchor.BN(json.roundCurrentPrice, 16) ,
            roundEndPrice: new anchor.BN(json.roundEndPrice, 16) ,
            roundPriceDifference: new anchor.BN(json.roundPriceDifference, 16) ,
            roundStartPriceDecimals: new anchor.BN(json.roundStartPriceDecimals, 16) ,
            roundCurrentPriceDecimals: new anchor.BN(json.roundCurrentPriceDecimals, 16) ,
            roundEndPriceDecimals: new anchor.BN(json.roundEndPriceDecimals, 16) ,
            roundPriceDifferenceDecimals: new anchor.BN(json.roundPriceDifferenceDecimals, 16) ,
            roundWinningDirection: json.roundWinningDirection,
            totalFeeCollected: new anchor.BN(json.totalFeeCollected, 16) ,
            totalUpAmount: new anchor.BN(json.totalUpAmount, 16) ,
            totalDownAmount: new anchor.BN(json.totalDownAmount, 16) ,
            totalAmountSettled: new anchor.BN(json.totalAmountSettled, 16) ,
            totalPredictionsSettled: json.totalPredictionsSettled,
            totalPredictions: json.totalPredictions,
            totalUniqueCrankers: json.totalUniqueCrankers,
            totalCranks: json.totalCranks,
            totalCranksPaid: json.totalCranksPaid,
            totalAmountPaidToCranks: new anchor.BN(json.totalAmountPaidToCranks, 16) 
        } as unknown as RoundHistoryAccountItem
    }

    public static fromJSON<RoundHistoryAccount>(json: any): RoundHistoryAccount {
        return { 
            head: new anchor.BN(json.head, 16),
            game: new PublicKey(json.game),
            address: new PublicKey(json.address),
            rounds: json.rounds.map((x: any) => this.fromJSON2(x))
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