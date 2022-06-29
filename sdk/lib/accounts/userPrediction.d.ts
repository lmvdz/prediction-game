import * as anchor from "@project-serum/anchor";
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Account } from '@solana/spl-token';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
import Round from "./round";
import Game from './game';
import { UpOrDown } from "../types";
import User from "./user";
import Vault from "./vault";
export declare type UserPredictionAccount = {
    owner: PublicKey;
    address: PublicKey;
    user: PublicKey;
    userClaimable: PublicKey;
    game: PublicKey;
    round: PublicKey;
    upOrDown: number;
    amount: anchor.BN;
    settled: boolean;
};
export default class UserPrediction implements DataUpdatable<UserPredictionAccount> {
    account: UserPredictionAccount;
    constructor(account: UserPredictionAccount);
    updateData(data: UserPredictionAccount): Promise<boolean>;
    static initializeUserPredictionInstruction(workspace: Workspace, vault: Vault, game: Game, round: Round | PublicKey, user: User | PublicKey, userClaimable: PublicKey, fromTokenAccount: Account | PublicKey, fromTokenAccountAuthority: PublicKey, userPredictionPubkey: PublicKey, upOrDown: UpOrDown, amount: anchor.BN): Promise<TransactionInstruction>;
    static initializeUserPrediction(workspace: Workspace, vault: Vault, game: Game, round: Round, user: User | PublicKey, userClaimable: PublicKey, userTokenAccount: PublicKey, userTokenAccountAuthority: PublicKey, upOrDown: UpOrDown, amount: anchor.BN): Promise<UserPrediction>;
    static closeUserPredictionInstruction(workspace: Workspace, prediction: UserPrediction): Promise<TransactionInstruction>;
    static closeUserPrediction(workspace: Workspace, prediction: UserPrediction): Promise<boolean>;
}
