import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Account } from '@solana/spl-token';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
import * as anchor from '@project-serum/anchor';
import Vault from './vault';
export declare type UserAccount = {
    address: PublicKey;
    owner: PublicKey;
    claimable: anchor.BN;
};
export default class User implements DataUpdatable<UserAccount> {
    account: UserAccount;
    tokenAccounts: Map<String, Account>;
    constructor(account: UserAccount);
    updateData(data: UserAccount): Promise<boolean>;
    static initializeUserInstruction(workspace: Workspace, userPubkey: PublicKey): Promise<TransactionInstruction>;
    static initializeUser(workspace: Workspace): Promise<User>;
    userClaimInstruction(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN): Promise<TransactionInstruction>;
    userClaim(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN): Promise<User>;
    closeUserAccountInstruction(workspace: Workspace): Promise<TransactionInstruction>;
    closeUserAccount(workspace: Workspace): Promise<boolean>;
}
