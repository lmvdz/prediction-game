import * as anchor from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js'
import { Workspace } from '../workspace'
import Game from "./game"
import { U32MAX } from "../constants"
import { DataUpdatable } from "../dataUpdatable"
import { confirmTxRetry } from "../util/index"
import Crank from "./crank"


export type RoundAccount = {

    owner: PublicKey
    game: PublicKey
    address: PublicKey

    roundNumber: number
    roundLength: number
    
    finished: boolean
    invalid: boolean
    settled: boolean
    feeCollected: boolean
    cranksPaid: boolean
 
    roundPredictionsAllowed: boolean,

    roundStartTime: anchor.BN
    roundCurrentTime: anchor.BN
    roundTimeDifference: anchor.BN

    roundStartPrice: anchor.BN
    roundCurrentPrice: anchor.BN
    roundEndPrice: anchor.BN
    roundPriceDifference: anchor.BN

    roundPriceDecimals: number,

    roundWinningDirection: number

    totalFeeCollected: anchor.BN

    totalUpAmount: anchor.BN
    totalDownAmount: anchor.BN

    totalAmountSettled: anchor.BN
    totalPredictionsSettled: number
    totalPredictions: number

    totalUniqueCrankers: number
    totalCranks: number
    totalCranksPaid: number
    totalAmountPaidToCranks: anchor.BN

}

export default class Round implements DataUpdatable<RoundAccount> {
    account: RoundAccount

    constructor(account: RoundAccount) {
        this.account = account;
    }

    public async updateData(data: RoundAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public static initializeFirst(workspace: Workspace, game: Game, crank: Crank, roundLength: anchor.BN): Promise<Game> {
    
        return new Promise((resolve, reject) => {
            workspace.programAddresses.getRoundPubkey(game.account.address, new anchor.BN(1)).then(([roundPubkey, _roundPubkeyBump]) => {
                workspace.program.methods.initFirstRoundInstruction(roundLength).accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    round: roundPubkey,
                    systemProgram: anchor.web3.SystemProgram.programId
                }).transaction().then(tx => {
                    workspace.sendTransaction(tx).then(txSignature => {
                        confirmTxRetry(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game: Game) => {
                                game.loadRoundData(workspace).then((game: Game) => {
                                    resolve(game);
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
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        })
    }

    public static initializeSecond(workspace: Workspace, game: Game, crank: Crank): Promise<Game> {
        
        return new Promise((resolve, reject) => {
            workspace.programAddresses.getRoundPubkey(game.account.address, new anchor.BN(2)).then(([roundPubkey, _secondRoundPubkeyBump]) => {
                workspace.program.methods.initSecondRoundInstruction().accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    secondRound: roundPubkey,
                    firstRound: game.currentRound.account.address,
                    systemProgram: anchor.web3.SystemProgram.programId
                }).transaction().then(tx => {
                    workspace.sendTransaction(tx).then(txSignature => {
                        confirmTxRetry(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game: Game) => {
                                game.updateRoundData(workspace).then((game: Game) => {
                                    resolve(game);
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
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        })
       
    }


    public static initializeNext(workspace: Workspace, game: Game, crank: Crank): Promise<Game> {
        
        return new Promise((resolve, reject) => {
            let nextRoundNumber = new anchor.BN(game.currentRound.account.roundNumber + 1);
            if (nextRoundNumber.gt(U32MAX)) {
                nextRoundNumber = new anchor.BN(1);
            }
            workspace.programAddresses.getRoundPubkey(game.account.address, nextRoundNumber).then(([roundPubkey, _roundPubkeyBump]) => {
                workspace.program.methods.initNextRoundAndClosePreviousInstruction().accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    receiver: workspace.owner,
                    nextRound: roundPubkey,
                    currentRound: game.currentRound.account.address,
                    previousRound: game.previousRound.account.address,
                    systemProgram: anchor.web3.SystemProgram.programId
                }).transaction().then(tx => {
                    workspace.sendTransaction(tx).then(txSignature => {
                        confirmTxRetry(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game: Game) => {
                                game.updateRoundData(workspace).then((game: Game) => {
                                    resolve(game);
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
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            })
        })
    }
}