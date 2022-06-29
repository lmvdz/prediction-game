import * as anchor from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js'
import { DataUpdatable } from "../dataUpdatable"


export type Claim = {
    game: PublicKey
    amount: anchor.BN
}

export type UserClaimableAccount = {

    user: PublicKey
    claims: Claim[]

}

export default class UserClaimable implements DataUpdatable<UserClaimableAccount> {
    account: UserClaimableAccount

    constructor(account: UserClaimableAccount){
        this.account = account;
    }
    
    public async updateData(data: UserClaimableAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

}