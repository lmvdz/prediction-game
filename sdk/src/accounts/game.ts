import * as anchor from "@project-serum/anchor"
import { AccountMeta, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Account, Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Workspace } from '../workspace'
import chunk from "../util/chunk"
import { DataUpdatable } from "../dataUpdatable"
import Round, { RoundAccount } from "../accounts/round"
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Crank from "./crank"
import Vault from "./vault"

export type GameAccount = {

    owner: PublicKey
    address: PublicKey

    tokenDecimal: number
    tokenMint: PublicKey

    baseSymbol: string | String,

    roundNumber: number
    currentRound: PublicKey
    previousRound: PublicKey
    roundLength: number

    vault: PublicKey

    unclaimedFees: anchor.BN

    feeBps: number,
    crankBps: number,

    totalVolume: anchor.BN
    totalVolumeRollover: anchor.BN
    
    priceProgram: PublicKey
    priceFeed: PublicKey
    oracle: number
}

export enum Oracle {
    Undefined = 0,
    Chainlink = 1,
    Pyth = 2,
    Switchboard = 3
}

export default class Game implements DataUpdatable<GameAccount> {

    account: GameAccount
    currentRound: Round
    previousRound: Round

    constructor(
        account: GameAccount,
    ) {
        this.account = account;
    }

    public async updateData(data: GameAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public async loadRoundData(workspace: Workspace) : Promise<Game> {
        this.currentRound = new Round(await fetchAccountRetry<RoundAccount>(workspace, 'round', (this.account.currentRound)));
        this.previousRound = new Round(await fetchAccountRetry<RoundAccount>(workspace, 'round', (this.account.previousRound)));
        return this;
    }

    public async getUpdatedGameData(workspace: Workspace) : Promise<GameAccount> {
        return await fetchAccountRetry<GameAccount>(workspace, 'game', (this.account.address));
    }

    public async updateGameData(workspace: Workspace) : Promise<Game> {
        await this.updateData(await this.getUpdatedGameData(workspace));
        return this;
    }

    public async updateRoundData(workspace: Workspace) : Promise<Game> {
        await this.currentRound.updateData(await fetchAccountRetry<RoundAccount>(workspace, 'round', (this.account.currentRound)));
        await this.previousRound.updateData(await fetchAccountRetry<RoundAccount>(workspace, 'round', (this.account.previousRound)));
        return this;
    }

    public async collectFeeInstruction(workspace: Workspace, crank: Crank): Promise<TransactionInstruction> {
        return await workspace.program.methods.collectFeeInstruction().accounts({
            signer: workspace.owner,
            crank: crank.account.address,
            game: this.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: SystemProgram.programId
        }).instruction();
    }

    public async collectFee(workspace: Workspace, crank: Crank) : Promise<Game> {
        if (!this.currentRound.account.feeCollected) {
            try {
                let ix = await this.collectFeeInstruction(workspace, crank);
                let tx = new Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx)
                await confirmTxRetry(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            } catch(error) {
                console.error(error);
                return this;
            }
        } else {
            return this;
        }
    }


    public async withdrawFeeInstruction(workspace: Workspace, vault: Vault, toTokenAccount: Account | PublicKey) : Promise<TransactionInstruction> {
        return await workspace.program.methods.withdrawFeeInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            vault: vault.account.address,
            feeVaultAta: vault.account.feeVaultAta,
            feeVaultAtaAuthority: vault.account.feeVaultAtaAuthority,
            toTokenAccount: (toTokenAccount as Account).address !== undefined ? (toTokenAccount as Account).address : (toTokenAccount as PublicKey),
            tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction();
    }

    public async withdrawFee(workspace: Workspace, vault: Vault, toTokenAccount: Account | PublicKey) : Promise<Game> {
        if (!this.account.unclaimedFees.gt(new anchor.BN(0))) {
            try {
                let ix = await this.withdrawFeeInstruction(workspace, vault, toTokenAccount);
                let tx = new Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx)
                await confirmTxRetry(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            } catch(error) {
                console.error(error);
                return this;
            }
        } else {
            return this;
        }
    }

    public async claimFeeInstruction(workspace: Workspace, vault: Vault) : Promise<TransactionInstruction> {
        return await workspace.program.methods.claimFeeInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAtaAuthority: vault.account.vaultAtaAuthority,
            feeVaultAta: vault.account.feeVaultAta,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction();
    }

    public async claimFee(workspace: Workspace, vault: Vault) : Promise<Game> {
        if (!this.account.unclaimedFees.gt(new anchor.BN(0))) {
            try {
                let ix = await this.claimFeeInstruction(workspace, vault);
                let tx = new Transaction().add(ix);
                let txSignature = await workspace.sendTransaction(tx)
                await confirmTxRetry(workspace, txSignature);
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            } catch(error) {
                console.error(error);
                return this;
            }
        } else {
            return this;
        }
    }

    public async payoutCranksInstruction(workspace: Workspace, remainingAccounts: AccountMeta[] ) : Promise<TransactionInstruction> {
        return await workspace.program.methods.payoutCranksInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: SystemProgram.programId
        }).remainingAccounts(remainingAccounts).instruction();
    }

    public async payoutCranks(workspace: Workspace) : Promise<Game> {
        if (!this.currentRound.account.finished) throw Error("Round Not Finished");
        if (!this.currentRound.account.feeCollected) throw Error("Round Fee Not Collected");
        if (!this.currentRound.account.settled) throw Error("Round Not Settled");
        if (!this.currentRound.account.cranksPaid) {
            let unpaidCranks = (await workspace.program.account.crank.all()).filter(crank => {
                return crank.account.lastCrankRound.toBase58() === this.currentRound.account.address.toBase58() &&
                crank.account.lastPaidCrankRound.toBase58() !== this.currentRound.account.address.toBase58()
            });
    
            let unpaidCrankChunks = chunk((await Promise.all(unpaidCranks.map(async (crank) => {
                return [{
                    pubkey: crank.account.address,
                    isSigner: false,
                    isWritable: true
                }, {
                    pubkey: crank.account.user,
                    isSigner: false,
                    isWritable: true
                }]
            }))).flat(Infinity) as AccountMeta[], 20);
    
            if (unpaidCrankChunks.length > 0) {
                await Promise.allSettled(unpaidCrankChunks.map(async (chunk: AccountMeta[]): Promise<String | any> => {
                    try {
                        let ix = await this.payoutCranksInstruction(workspace, chunk);
                        let tx = new Transaction().add(ix);
                        let txSignature = await workspace.sendTransaction(tx)
                        await confirmTxRetry(workspace, txSignature);
                    } catch (error) {
                        console.error(error);
                        return error;
                    }
                }))
                return await (await this.updateGameData(workspace)).updateRoundData(workspace);
            } else {
                try {
                    let ix = await this.payoutCranksInstruction(workspace, []);
                    let tx = new Transaction().add(ix);
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                    return await (await this.updateGameData(workspace)).updateRoundData(workspace);
                } catch (error) {
                    console.error(error);
                    return this;
                }
            }
        } else {
            return this;
        }

        
    }

    public async closeGame(workspace: Workspace) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.closeGameInstruction().accounts({
                signer: workspace.owner,
                receiver: workspace.owner,
                game: this.account.address,
                systemProgram: SystemProgram.programId,
            }).transaction().then((tx) => {
                tx.feePayer = workspace.wallet.payer.publicKey;
                workspace.program.provider.connection.getLatestBlockhash().then(blockhash => {
                    tx.recentBlockhash = blockhash.blockhash;
                    tx.sign(workspace.wallet.payer)
                    let message = tx.compileMessage();
                    console.log(message);
                    workspace.program.provider.connection.simulateTransaction(message).then((simulation) => {
                        console.log(simulation.value.logs);
                        workspace.sendTransaction(tx).then(txSignature => {
                            confirmTxRetry(workspace, txSignature).then(() => {
                                resolve(true);
                            }).catch(error => {
                                reject(error);
                            })
                        }).catch(error => {
                            reject(error);
                        })
                    })
                })
                
                
            }).catch(error => {
                reject(error);
            })
            
        })
    }

    public static async initializeGame(workspace: Workspace, baseSymbol: string, vault: Vault, oracle: Oracle, priceProgram: PublicKey, priceFeed: PublicKey, feeBps: number, crankBps: number, roundLength: anchor.BN): Promise<Game> {
        const [gamePubkey, _gamePubkeyBump] = await workspace.programAddresses.getGamePubkey(vault, priceProgram, priceFeed);

        // console.log(baseSymbol, vaultPubkeyBump, feeVaultPubkeyBump)

        return new Promise((resolve, reject) => {
            workspace.program.methods.initGameInstruction(oracle, baseSymbol, feeBps, crankBps, roundLength).accounts({
                owner: workspace.owner,
                game: gamePubkey,
                vault: vault.account.address,

                priceProgram,
                priceFeed,
                rent: SYSVAR_RENT_PUBKEY,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                
            }).transaction().then((tx) => {
                workspace.sendTransaction(tx).then(txSignature => {
                    confirmTxRetry(workspace, txSignature).then(() => {
                        fetchAccountRetry<GameAccount>(workspace, 'game', gamePubkey).then(gameAccount => {
                            resolve(
                                new Game(
                                    gameAccount
                                )
                            )
                        }).catch(error => {
                            reject(error);
                        })
                    }).catch(error => {
                        reject(error);
                    })
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
            
        })


    }

    public updateGame(workspace: Workspace, crank: Crank): Promise<Game> {
        return new Promise((resolve, reject) => {
            workspace.program.methods.updateGameInstruction().accounts({
                signer: workspace.owner,
                game: this.account.address,
                crank: crank.account.address,
                currentRound: this.account.currentRound,
                priceProgram: this.account.priceProgram,
                priceFeed: this.account.priceFeed,
                systemProgram: SystemProgram.programId
            }).transaction().then(tx => {
                workspace.sendTransaction(tx).then(txSignature => {
                    confirmTxRetry(workspace, txSignature).then(() => {
                        resolve(this)
                    }).catch(error => {
                        reject(error);
                    })
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        })
    }

    public async settlePredictionsInstruction(workspace: Workspace, crank: Crank, remainingAccounts: AccountMeta[]) : Promise<TransactionInstruction> {
        return await workspace.program.methods.settlePredictionsInstruction().accounts({
            signer: workspace.owner,
            game: this.account.address,
            crank: crank.account.address,
            currentRound: this.currentRound.account.address,
            systemProgram: SystemProgram.programId
        }).remainingAccounts(remainingAccounts).instruction();
    }

    public async settlePredictions(workspace: Workspace, crank: Crank): Promise<Game> {

        if (!this.currentRound.account.finished) throw Error("Round Not Finished");
        if (!this.currentRound.account.feeCollected) throw Error("Round Fee Not Collected");

        if (!this.currentRound.account.settled) {
            let unSettledPredictions = (await workspace.program.account.userPrediction.all()).filter(prediction => {
                return prediction.account.round.toBase58() === this.currentRound.account.address.toBase58() && !prediction.account.settled
            });
    
            let unSettledPredictionChunks = chunk((await Promise.all(unSettledPredictions.map(async (prediction) => {
                return [
                    {
                        pubkey: prediction.account.address,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: prediction.account.user,
                        isSigner: false,
                        isWritable: true
                    }
                ]
            }))).flat(Infinity) as AccountMeta[], 20);
    
            if (unSettledPredictionChunks.length > 0) {
                await Promise.allSettled(unSettledPredictionChunks.map(async (chunk: AccountMeta[]): Promise<String | any> => {
                    try {
                        let ix = await this.settlePredictionsInstruction(workspace, crank, chunk);
                        let tx = new Transaction().add(ix);
                        let txSignature = await workspace.sendTransaction(tx)
                        await confirmTxRetry(workspace, txSignature);
                    } catch (error) {
                        return error;
                    }
                }))
                await this.updateGameData(workspace);
                return await this.updateRoundData(workspace);
            } else {
                try {
                    let ix = await this.settlePredictionsInstruction(workspace, crank, []);
                    let tx = new Transaction().add(ix);
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                    await this.updateGameData(workspace);
                    return await this.updateRoundData(workspace);
                } catch (error) {
                    console.error(error);
                    return this;
                }
            }
        } else {
            return this;
        }

        
    }

}