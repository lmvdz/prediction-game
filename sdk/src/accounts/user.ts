import { AccountMeta, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Account, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import * as anchor from '@project-serum/anchor';
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Game from './game';
import Vault from './vault';
import UserClaimable from './userClaimable';
import chunk from '../util/chunk';


export type UserAccount = {

    address: PublicKey,
    owner: PublicKey

    userClaimable: PublicKey,

    padding01: PublicKey[]

}


export default class User implements DataUpdatable<UserAccount> {
    account: UserAccount

    constructor(account: UserAccount) {
        this.account = account;
    }

    public async updateData(data: UserAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public static async initializeUserInstruction(workspace: Workspace, userPubkey: PublicKey, userClaimablePubkey: PublicKey): Promise<TransactionInstruction> {
        return await workspace.program.methods.initUserInstruction().accounts({
            owner: workspace.owner,
            user: userPubkey,
            userClaimable: userClaimablePubkey,
            systemProgram: SystemProgram.programId
        }).instruction();
    }

    public static async initializeUser(workspace: Workspace): Promise<User> {
        let [userPubkey, _userPubkeyBump] = await workspace.programAddresses.getUserPubkey(workspace.owner);
        let [userClaimablePubkey, _userClaimablePubkeyBump] = await workspace.programAddresses.getUserClaimablePubkey(userPubkey);
        let ix = await this.initializeUserInstruction(workspace, userPubkey, userClaimablePubkey);
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
        if (toTokenAccount.owner.toBase58() !== this.account.owner.toBase58()) throw Error("To Token Account Owner not the same as User Owner");

        return await workspace.program.methods.userClaimInstruction(amount).accounts({
            signer: workspace.owner,
            user: this.account.address,
            userClaimable: this.account.userClaimable,
            toTokenAccount: toTokenAccount.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAtaAuthority: vault.account.vaultAtaAuthority,
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

    public async userClaimAllInstruction(workspace: Workspace, userClaimable: UserClaimable, vaults: Array<Vault>, tokenAccounts: Array<Account>, filterMint: PublicKey): Promise<Array<TransactionInstruction>> {
        
        let accountMetas : Array<Array<AccountMeta>> = chunk(userClaimable.account.claims.filter(claim => 
                claim.amount.gt(new anchor.BN(0)) && claim.mint.toBase58() !== PublicKey.default.toBase58() && ( filterMint.toBase58() !== PublicKey.default.toBase58() ? claim.mint.toBase58() === filterMint.toBase58() : true )
        ).map(claim => {
            let vault = vaults.find(v => v.account.address.toBase58() === claim.vault.toBase58());
            let tokenAccount = tokenAccounts.find(t => t.mint.toBase58() === vault.account.tokenMint.toBase58())
            return [
                {
                    pubkey: vault.account.address,
                    isSigner: false,
                    isWritable: false
                },
                {
                    pubkey: vault.account.vaultAta,
                    isSigner: false,
                    isWritable: true
                },
                {
                    pubkey: vault.account.vaultAtaAuthority,
                    isSigner: false,
                    isWritable: false
                },
                {
                    pubkey: tokenAccount.address,
                    isSigner: false,
                    isWritable: true
                }
            ]
        }).flat(Infinity), 20)
        
        return await Promise.all(accountMetas.map(async accountMeta => {
            return await workspace.program.methods.userClaimAllInstruction().accounts({
                signer: workspace.owner,
                user: this.account.address,
                userClaimable: this.account.userClaimable,
                tokenProgram: TOKEN_PROGRAM_ID
            }).remainingAccounts(accountMeta).instruction();
        }))

        
    }

    public async userClaimAll(workspace: Workspace, userClaimable: UserClaimable, vaults: Array<Vault>, tokenAccounts: Array<Account>, filterMint: PublicKey) : Promise<User> {
        if (workspace.owner.toBase58() !== this.account.owner.toBase58()) throw Error("Signer not Owner")
       
        let instructions = await this.userClaimAllInstruction(workspace, userClaimable, vaults, tokenAccounts, filterMint)

        if (instructions.length > 0) {
            
            await Promise.allSettled(instructions.map(async instruction => {
                let tx = new Transaction().add(instruction)
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
            }))
            return this;
        } else {
            throw Error("User has no valid claimables")
        }

         
    }

    public async closeUserAccountInstruction(workspace: Workspace) : Promise<TransactionInstruction> {
        return await workspace.program.methods.closeUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            userClaimable: this.account.userClaimable,
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

    public async adminCloseUserAccountInstruction(workspace: Workspace) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            receiver: this.account.owner
        }).instruction()
    }

    public async adminCloseUserAccount(workspace: Workspace): Promise<boolean> {

        let ix = await this.adminCloseUserAccountInstruction(workspace);
        ix.keys.forEach(k => console.log(k.pubkey.toBase58()))
        console.log('\n')
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