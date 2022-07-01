import * as anchor from "@project-serum/anchor";
import { AccountMeta, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Account } from '@solana/spl-token';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
import Round from "../accounts/round";
import Crank from "./crank";
import Vault from "./vault";
export declare type GameAccount = {
    owner: PublicKey;
    address: PublicKey;
    tokenDecimal: number;
    baseSymbol: string | String;
    roundNumber: number;
    currentRound: PublicKey;
    previousRound: PublicKey;
    roundLength: number;
    vault: PublicKey;
    unclaimedFees: anchor.BN;
    feeBps: number;
    crankBps: number;
    totalVolume: anchor.BN;
    totalVolumeRollover: anchor.BN;
    priceProgram: PublicKey;
    priceFeed: PublicKey;
    oracle: number;
};
export declare enum Oracle {
    Undefined = 0,
    Chainlink = 1,
    Pyth = 2,
    Switchboard = 3
}
export default class Game implements DataUpdatable<GameAccount> {
    account: GameAccount;
    currentRound: Round;
    previousRound: Round;
    constructor(account: GameAccount);
    updateData(data: GameAccount): Promise<boolean>;
    loadRoundData(workspace: Workspace): Promise<Game>;
    getUpdatedGameData(workspace: Workspace): Promise<GameAccount>;
    updateGameData(workspace: Workspace): Promise<Game>;
    updateRoundData(workspace: Workspace): Promise<Game>;
    collectFeeInstruction(workspace: Workspace, crank: Crank): Promise<TransactionInstruction>;
    collectFee(workspace: Workspace, crank: Crank): Promise<Game>;
    withdrawFeeInstruction(workspace: Workspace, vault: Vault, toTokenAccount: Account | PublicKey): Promise<TransactionInstruction>;
    withdrawFee(workspace: Workspace, vault: Vault, toTokenAccount: Account | PublicKey): Promise<Game>;
    claimFeeInstruction(workspace: Workspace, vault: Vault): Promise<TransactionInstruction>;
    claimFee(workspace: Workspace, vault: Vault): Promise<Game>;
    payoutCranksInstruction(workspace: Workspace, remainingAccounts: AccountMeta[]): Promise<TransactionInstruction>;
    payoutCranks(workspace: Workspace): Promise<Game>;
    adminCloseGame(workspace: Workspace): Promise<unknown>;
    static initializeGame(workspace: Workspace, baseSymbol: string, vault: Vault, oracle: Oracle, priceProgram: PublicKey, priceFeed: PublicKey, feeBps: number, crankBps: number, roundLength: anchor.BN): Promise<Game>;
    updateGame(workspace: Workspace, crank: Crank): Promise<Game>;
    settlePredictionsInstruction(workspace: Workspace, crank: Crank, remainingAccounts: AccountMeta[]): Promise<TransactionInstruction>;
    settlePredictions(workspace: Workspace, crank: Crank): Promise<Game>;
}
