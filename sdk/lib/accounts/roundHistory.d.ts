import * as anchor from "@project-serum/anchor";
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Workspace } from "../workspace";
import { DataUpdatable } from "../dataUpdatable";
export declare type RoundHistoryItem = {
    recordId: anchor.BN;
    roundNumber: number;
    roundStartTime: anchor.BN;
    roundCurrentTime: anchor.BN;
    roundTimeDifference: anchor.BN;
    roundStartPrice: anchor.BN;
    roundCurrentPrice: anchor.BN;
    roundEndPrice: anchor.BN;
    roundPriceDifference: anchor.BN;
    roundPriceDecimals: number;
    roundWinningDirection: number;
    totalFeeCollected: anchor.BN;
    totalUpAmount: anchor.BN;
    totalDownAmount: anchor.BN;
    totalAmountSettled: anchor.BN;
    totalPredictionsSettled: number;
    totalPredictions: number;
    totalUniqueCrankers: number;
    totalCranks: number;
    totalCranksPaid: number;
    totalAmountPaidToCranks: anchor.BN;
};
export declare type RoundHistoryAccount = {
    head: anchor.BN;
    rounds: RoundHistoryItem[];
};
export default class RoundHistory implements DataUpdatable<RoundHistoryAccount> {
    account: RoundHistoryAccount;
    constructor(account: RoundHistoryAccount);
    updateData(data: RoundHistoryAccount): Promise<boolean>;
    static adminCloseUserRoundHistoryInstruction(workspace: Workspace, roundHistory: PublicKey): Promise<TransactionInstruction>;
    static adminCloseUserRoundHistory(workspace: Workspace, roundHistory: PublicKey): Promise<boolean>;
}
