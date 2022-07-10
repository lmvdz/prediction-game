import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Game from './game';
import User from './user';


export type CrankAccount = {

    address: PublicKey,
    owner: PublicKey,
    user: PublicKey,
    userClaimable: PublicKey,
    game: PublicKey

    cranks: number,
    lastCrankRound: PublicKey,
    lastPaidCrankRound: PublicKey,

    padding01: PublicKey[]

}


export default class Crank implements DataUpdatable<CrankAccount> {
    account: CrankAccount

    constructor(account: CrankAccount) {
        this.account = account;
    }

    public async updateData(data: CrankAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public static async initializeCrankInstruction(workspace: Workspace, gamePubkey: PublicKey, userPubkey: PublicKey, crankPubkey: PublicKey): Promise<TransactionInstruction> {
        return await workspace.program.methods.initCrankInstruction().accounts({
            owner: workspace.owner,
            game: gamePubkey,
            user: userPubkey,
            crank: crankPubkey,
            systemProgram: SystemProgram.programId
        }).instruction();
    }


    public static async initializeCrank(workspace: Workspace, game: Game, user: User): Promise<Crank> {
        let [crankPubkey, _crankPubkeyBump] = await workspace.programAddresses.getCrankPubkey(workspace.owner, game.account.address, user.account.address);

        let ix = await this.initializeCrankInstruction(workspace, game.account.address, user.account.address, crankPubkey);
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
                    let crankAccount = await fetchAccountRetry<CrankAccount>(workspace, 'crank', crankPubkey)
                    resolve(new Crank(crankAccount));
                } catch(error) {
                    reject(error);
                }
            }, 500)
        })
    }

    public async closeCrankAccountInstruction(workspace: Workspace) : Promise<TransactionInstruction> {
        return await workspace.program.methods.closeCrankAccountInstruction().accounts({
            signer: workspace.owner,
            crank: this.account.address,
            receiver: workspace.owner
        }).instruction()
    }

    public async closeCrankAccount(workspace: Workspace): Promise<boolean> {

        let ix = await this.closeCrankAccountInstruction(workspace);
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

    public async adminCloseCrankAccountInstruction(workspace: Workspace) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseCrankAccountInstruction().accounts({
            signer: workspace.owner,
            crank: this.account.address,
            receiver: workspace.owner
        }).instruction()
    }

    public async adminCloseCrankAccount(workspace: Workspace): Promise<boolean> {

        let ix = await this.adminCloseCrankAccountInstruction(workspace);
        let tx = new Transaction().add(ix);

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    console.error(error);
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