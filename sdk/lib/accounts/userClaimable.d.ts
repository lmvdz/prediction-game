import * as anchor from "@project-serum/anchor";
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Workspace } from "../workspace";
import { DataUpdatable } from "../dataUpdatable";
export declare type Claim = {
    amount: anchor.BN;
    mint: PublicKey;
    vault: PublicKey;
};
export declare type UserClaimableAccount = {
    address: PublicKey;
    user: PublicKey;
    claims: Claim[];
};
export default class UserClaimable implements DataUpdatable<UserClaimableAccount> {
    account: UserClaimableAccount;
    constructor(account: UserClaimableAccount);
    updateData(data: UserClaimableAccount): Promise<boolean>;
    static adminCloseUserClaimableInstruction(workspace: Workspace, userClaimablePubkey: PublicKey): Promise<TransactionInstruction>;
    static adminCloseUserClaimable(workspace: Workspace, userClaimablePubkey: PublicKey): Promise<boolean>;
}
