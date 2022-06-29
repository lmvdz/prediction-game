import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Account } from '@solana/spl-token';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
import * as anchor from '@project-serum/anchor';
import Game from './game';
import Vault from './vault';
import UserClaimable from './userClaimable';
export declare type UserAccount = {
    address: PublicKey;
    owner: PublicKey;
    userClaimable: PublicKey;
};
export default class User implements DataUpdatable<UserAccount> {
    account: UserAccount;
    constructor(account: UserAccount);
    updateData(data: UserAccount): Promise<boolean>;
    static initializeUserInstruction(workspace: Workspace, userPubkey: PublicKey, userClaimablePubkey: PublicKey): Promise<TransactionInstruction>;
    static initializeUser(workspace: Workspace): Promise<User>;
    userClaimInstruction(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN): Promise<TransactionInstruction>;
    userClaim(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN): Promise<User>;
    userClaimAllInstruction(workspace: Workspace, userClaimable: UserClaimable, vaults: Array<Vault>, games: Array<Game>, tokenAccounts: Array<Account>): Promise<Array<TransactionInstruction>>;
    userClaimAll(workspace: Workspace, userClaimable: UserClaimable, vaults: Array<Vault>, games: Array<Game>, tokenAccounts: Array<Account>): Promise<User>;
    closeUserAccountInstruction(workspace: Workspace): Promise<TransactionInstruction>;
    closeUserAccount(workspace: Workspace): Promise<boolean>;
}
