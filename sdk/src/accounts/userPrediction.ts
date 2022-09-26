import * as anchor from "@project-serum/anchor"
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Account, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import Round from "./round"
import Game from './game'
import { U64MAX, USER_PREDICTION_MIN_AMOUNT } from "../constants"
import { UpOrDown } from "../types"
import User from "./user"
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Vault from "./vault"
import UserClaimable from "./userClaimable"


export type UserPredictionAccount = {

    owner: PublicKey
    address: PublicKey

    user: PublicKey
    userClaimable: PublicKey
    game: PublicKey
    round: PublicKey

    upOrDown: number
    amount: anchor.BN
    
    settled: boolean,

    padding01: PublicKey[]

}

export default class UserPrediction implements DataUpdatable<UserPredictionAccount> {
    account: UserPredictionAccount

    constructor(account: UserPredictionAccount){
        this.account = account;
    }
    
    public async updateData(data: UserPredictionAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public static async initializeUserPredictionInstruction(
        workspace: Workspace, 
        vault: Vault,
        game: Game, 
        round: Round | PublicKey, 
        user: User | PublicKey,
        userClaimable: PublicKey,
        fromTokenAccount: Account | PublicKey, 
        fromTokenAccountAuthority: PublicKey,
        userPredictionPubkey: PublicKey, 
        upOrDown: UpOrDown, 
        amount: anchor.BN
    ) : Promise<TransactionInstruction> {

        if (amount.gt(U64MAX) || amount.lt(USER_PREDICTION_MIN_AMOUNT(game.account.tokenDecimal))) throw Error("Amount does not fall in the required range for [1, u64::MAX]")
        const roundNumberBuffer = new anchor.BN(game.account.roundNumber).toArrayLike(Buffer, 'be', 4);

        return await workspace.program.methods.initUserPredictionInstruction(
            upOrDown.valueOf(), 
            amount, 
            [
                roundNumberBuffer.readUintBE(0, 1), 
                roundNumberBuffer.readUintBE(1, 1), 
                roundNumberBuffer.readUintBE(2, 1), 
                roundNumberBuffer.readUintBE(3, 1), 
            ]
        ).accounts({
            signer: workspace.owner,
            game: game.account.address,
            user: (user as User).account !== undefined ? (user as User).account.address : (user as PublicKey),
            userClaimable: (userClaimable as PublicKey),
            currentRound: (round as Round).account !== undefined ? (round as Round).account.address : round as PublicKey,
            
            userPrediction: userPredictionPubkey,
            userPredictionHistory: game.account.userPredictionHistory,

            // deposit
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            fromTokenAccount: (fromTokenAccount as Account).address !== undefined ? (fromTokenAccount as Account).address : ( fromTokenAccount as PublicKey ),
            fromTokenAccountAuthority: fromTokenAccountAuthority, 

            tokenMint: vault.account.tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        }).instruction();
    }
    
    public static async initializeUserPrediction(workspace: Workspace, vault: Vault, game: Game, round: Round, user: User | PublicKey, userClaimable: PublicKey, userTokenAccount: PublicKey, userTokenAccountAuthority: PublicKey, upOrDown: UpOrDown, amount: anchor.BN) : Promise<UserPrediction> {
        let [userPredictionPubkey, _userPredictionPubkeyBump] = await workspace.programAddresses.getUserPredictionPubkey(game, round, user);
        
        let ix = await this.initializeUserPredictionInstruction(workspace, vault, game, round, user, userClaimable, userTokenAccount, userTokenAccountAuthority, userPredictionPubkey, upOrDown, amount);
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
                    let userPrediction = await fetchAccountRetry<UserPredictionAccount>(workspace, 'userPrediction', userPredictionPubkey)
                    resolve(new UserPrediction(userPrediction));
                } catch (error) {
                    reject(error);
                }
            }, 500)
        })
    }


    public static async closeUserPredictionInstruction(workspace: Workspace, prediction: UserPrediction) : Promise<TransactionInstruction> {
        return await workspace.program.methods.closeUserPredictionInstruction().accounts({
            signer: workspace.owner,
            userPrediction: prediction.account.address,
            userPredictionCloseReceiver: prediction.account.owner
        }).instruction()
    }

    public static async closeUserPrediction(workspace: Workspace, prediction: UserPrediction) : Promise<boolean> {
        
        let ix = await this.closeUserPredictionInstruction(workspace, prediction);
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
                    prediction = null;
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
                
            }, 500)
        })

    }


    public static async adminCloseUserPredictionInstruction(workspace: Workspace, prediction: UserPrediction) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseUserPredictionInstruction().accounts({
            signer: workspace.owner,
            userPrediction: prediction.account.address,
            userPredictionCloseReceiver: prediction.account.owner
        }).instruction()
    }

    public static async adminCloseUserPrediction(workspace: Workspace, prediction: UserPrediction) : Promise<boolean> {
        
        let ix = await this.adminCloseUserPredictionInstruction(workspace, prediction);
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
                    prediction = null;
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
                
            }, 500)
        })

    }


    public static async adminCloseUserPredictionFromPubkeysInstruction(workspace: Workspace, userPrediction: PublicKey, receiver: PublicKey) : Promise<TransactionInstruction> {
        return await workspace.program.methods.adminCloseUserPredictionInstruction().accounts({
            signer: workspace.owner,
            userPrediction,
            userPredictionCloseReceiver: receiver
        }).instruction()
    }

    public static async adminCloseUserPredictionFromPubkeys(workspace: Workspace, userPrediction: PublicKey, receiver: PublicKey) : Promise<boolean> {
        
        let ix = await this.adminCloseUserPredictionFromPubkeysInstruction(workspace, userPrediction, receiver);
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
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
                
            }, 500)
        })

    }
}