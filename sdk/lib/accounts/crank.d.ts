import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
import Game from './game';
import User from './user';
export declare type CrankAccount = {
    address: PublicKey;
    owner: PublicKey;
    user: PublicKey;
    userClaimable: PublicKey;
    game: PublicKey;
    cranks: number;
    lastCrankRound: PublicKey;
    lastPaidCrankRound: PublicKey;
    padding01: PublicKey[];
};
export default class Crank implements DataUpdatable<CrankAccount> {
    account: CrankAccount;
    constructor(account: CrankAccount);
    updateData(data: CrankAccount): Promise<boolean>;
    static initializeCrankInstruction(workspace: Workspace, gamePubkey: PublicKey, userPubkey: PublicKey, crankPubkey: PublicKey): Promise<TransactionInstruction>;
    static initializeCrank(workspace: Workspace, game: Game, user: User): Promise<Crank>;
    closeCrankAccountInstruction(workspace: Workspace): Promise<TransactionInstruction>;
    closeCrankAccount(workspace: Workspace): Promise<boolean>;
    adminCloseCrankAccountInstruction(workspace: Workspace): Promise<TransactionInstruction>;
    adminCloseCrankAccount(workspace: Workspace): Promise<boolean>;
}
