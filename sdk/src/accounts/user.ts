import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Account, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import * as anchor from '@project-serum/anchor';
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Game from './game';
import Vault from './vault';


export type UserAccount = {

    address: PublicKey,
    owner: PublicKey
    
    claimable: anchor.BN,

}


export default class User implements DataUpdatable<UserAccount> {
    account: UserAccount
    tokenAccounts: Map<String, Account>

    constructor(account: UserAccount) {
        this.account = account;
    }

    public async updateData(data: UserAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public static async initializeUserInstruction(workspace: Workspace, userPubkey: PublicKey): Promise<TransactionInstruction> {
        return await workspace.program.methods.initUserInstruction().accounts({
            owner: workspace.owner,
            user: userPubkey,
            systemProgram: SystemProgram.programId
        }).instruction();
    }

    public static async initializeUser(workspace: Workspace): Promise<User> {
        let [userPubkey, _userPubkeyBump] = await workspace.programAddresses.getUserPubkey(workspace.owner);

        let ix = await this.initializeUserInstruction(workspace, userPubkey);
        let tx = new Transaction().add(ix);
        

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    reject(error);
                }
                // let user = await workspace.program.account.user.fetch(userPubkey) as UserAccount;
                try {
                    let userAccount = await fetchAccountRetry<UserAccount>(workspace, 'user', userPubkey)
                    resolve(new User(userAccount));
                } catch(error) {
                    reject(error);
                }
            }, 500)
        })
    }

    public async userClaimInstruction(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN): Promise<TransactionInstruction> {
        
        if (workspace.owner.toBase58() !== this.account.owner.toBase58()) throw Error("Signer not Owner")
        if (this.account.claimable.lt(amount)) throw Error("Insufficient Claimable Amount")

        return await workspace.program.methods.userClaimInstruction(amount).accounts({
            signer: workspace.owner,
            user: this.account.address,
            toTokenAccount: toTokenAccount.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAuthority: vault.account.vaultAuthority,
            tokenMint: toTokenAccount.mint,
            tokenProgram: TOKEN_PROGRAM_ID
        }).instruction();
    }

    public async userClaim(workspace: Workspace, vault: Vault, toTokenAccount: Account, amount: anchor.BN) : Promise<User> {
        let ix = await this.userClaimInstruction(workspace, vault, toTokenAccount, amount);
        let tx = new Transaction().add(ix);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    reject(error);
                }
                // let user = await workspace.program.account.user.fetch(userPubkey) as UserAccount;
                try {
                    await this.updateData(await fetchAccountRetry<UserAccount>(workspace, 'user', this.account.address))
                    resolve(this);
                } catch(error) {
                    reject(error);
                }
            }, 500)
        }) 
    }

    public async closeUserAccountInstruction(workspace: Workspace) : Promise<TransactionInstruction> {
        return await workspace.program.methods.closeUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            receiver: workspace.owner
        }).instruction()
    }

    public async closeUserAccount(workspace: Workspace): Promise<boolean> {

        let ix = await this.closeUserAccountInstruction(workspace);
        let tx = new Transaction().add(ix);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    reject(error);
                }
                try {
                    this.account = null;
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
                
            }, 500)
        })
    }
}