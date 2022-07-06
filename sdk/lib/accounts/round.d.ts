import * as anchor from "@project-serum/anchor";
import { PublicKey } from '@solana/web3.js';
import { Workspace } from '../workspace';
import Game from "./game";
import { DataUpdatable } from "../dataUpdatable";
import Crank from "./crank";
export declare type RoundAccount = {
    owner: PublicKey;
    game: PublicKey;
    address: PublicKey;
    roundNumber: number;
    roundLength: number;
    finished: boolean;
    invalid: boolean;
    settled: boolean;
    feeCollected: boolean;
    cranksPaid: boolean;
    roundPredictionsAllowed: boolean;
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
    padding01: PublicKey[];
};
export default class Round implements DataUpdatable<RoundAccount> {
    account: RoundAccount;
    constructor(account: RoundAccount);
    updateData(data: RoundAccount): Promise<boolean>;
    convertOraclePriceToNumber(oraclePrice: anchor.BN, game: Game): number;
    static initializeFirst(workspace: Workspace, game: Game, crank: Crank): Promise<Game>;
    static initializeSecond(workspace: Workspace, game: Game, crank: Crank): Promise<Game>;
    static initializeNext(workspace: Workspace, game: Game, crank: Crank): Promise<Game>;
    static adminCloseRound(workspace: Workspace, round: Round): Promise<void>;
}
