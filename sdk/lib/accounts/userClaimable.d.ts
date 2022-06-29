import * as anchor from "@project-serum/anchor";
import { PublicKey } from '@solana/web3.js';
import { DataUpdatable } from "../dataUpdatable";
export declare type Claim = {
    game: PublicKey;
    amount: anchor.BN;
};
export declare type UserClaimableAccount = {
    user: PublicKey;
    claims: Claim[];
};
export default class UserClaimable implements DataUpdatable<UserClaimableAccount> {
    account: UserClaimableAccount;
    constructor(account: UserClaimableAccount);
    updateData(data: UserClaimableAccount): Promise<boolean>;
}
