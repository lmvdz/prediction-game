import * as anchor from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js'
import { Workspace } from '../workspace'
import Game from "./game"
import { U32MAX } from "../constants"
import { DataUpdatable } from "../dataUpdatable"
import { confirmTxRetry } from "../util/index"
import Crank from "./crank"
import { Oracle } from "../types"


export type RoundAccount = {

    owner: PublicKey
    game: PublicKey
    address: PublicKey

    roundNumber: number
    roundLength: anchor.BN
    
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
    roundStartPriceDecimals: anchor.BN
    
    roundCurrentPrice: anchor.BN
    roundCurrentPriceDecimals: anchor.BN

    roundEndPrice: anchor.BN
    roundEndPriceDecimals: anchor.BN

    roundPriceDifference: anchor.BN,
    roundPriceDifferenceDecimals: anchor.BN,

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
    totalAmountPaidToCranks: anchor.BN,

    padding01: PublicKey[]

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

    public static fromJSON<RoundAccount>(json: any): RoundAccount {
        
        let owner = new PublicKey(json.owner);
        let game = new PublicKey(json.game);
        let address = new PublicKey(json.address);
        let roundNumber = json.roundNumber;
        let roundLength = new anchor.BN(json.roundLength, 16);
        let finished = json.finished;
        let invalid = json.invalid;
        let settled = json.settled;
        let feeCollected = json.feeCollected;
        let cranksPaid = json.cranksPaid;
        let roundPredictionsAllowed = json.roundPredictionsAllowed;
        let roundStartTime = new anchor.BN(json.roundStartTime, 16);
        let roundCurrentTime = new anchor.BN(json.roundCurrentTime, 16);
        let roundTimeDifference = new anchor.BN(json.roundTimeDifference, 16);
        let roundStartPrice = new anchor.BN(json.roundStartPrice, 16);
        let roundStartPriceDecimals = new anchor.BN(json.roundStartPriceDecimals, 16);
        let roundCurrentPrice = new anchor.BN(json.roundCurrentPrice, 16);
        let roundCurrentPriceDecimals = new anchor.BN(json.roundCurrentPriceDecimals, 16);
        let roundEndPrice = new anchor.BN(json.roundEndPrice, 16);
        let roundEndPriceDecimals = new anchor.BN(json.roundEndPriceDecimals, 16);
        let roundPriceDifference = new anchor.BN(json.roundPriceDifference, 16);
        let roundPriceDifferenceDecimals = new anchor.BN(json.roundPriceDifferenceDecimals, 16);
        let roundWinningDirection = json.roundWinningDirection;
        let totalFeeCollected = new anchor.BN(json.totalFeeCollected, 16);
        let totalUpAmount = new anchor.BN(json.totalUpAmount, 16);
        let totalDownAmount = new anchor.BN(json.totalDownAmount, 16);
        let totalAmountSettled = new anchor.BN(json.totalAmountSettled, 16);
        let totalPredictionsSettled = json.totalPredictionsSettled;
        let totalPredictions = json.totalPredictions;
        let totalUniqueCrankers = json.totalUniqueCrankers;
        let totalCranks = json.totalCranks;
        let totalCranksPaid = json.totalCranksPaid;
        let totalAmountPaidToCranks = new anchor.BN(json.totalAmountPaidToCranks, 16);
        let padding01 = json.padding01.map((x: string) => new PublicKey(x)) as PublicKey[];

        return {
            owner,
            game,
            address,
            roundNumber,
            roundLength,
            finished,
            invalid,
            settled,
            feeCollected,
            cranksPaid,
            roundPredictionsAllowed,
            roundStartTime,
            roundCurrentTime,
            roundTimeDifference,
            roundStartPrice,
            roundStartPriceDecimals,
            roundCurrentPrice,
            roundCurrentPriceDecimals,
            roundEndPrice,
            roundEndPriceDecimals,
            roundPriceDifference,
            roundPriceDifferenceDecimals,
            roundWinningDirection,
            totalFeeCollected,
            totalUpAmount,
            totalDownAmount,
            totalAmountSettled,
            totalPredictionsSettled,
            totalPredictions,
            totalUniqueCrankers,
            totalCranks,
            totalCranksPaid,
            totalAmountPaidToCranks,
            padding01
        } as unknown as RoundAccount;
    }

    public convertOraclePriceToNumber(price: anchor.BN, decimals_: anchor.BN, game: Game) : number {
        try {
            let decimals = decimals_.abs();
            if (game.account.oracle === Oracle.Chainlink) {
                let scaled_val = price.toString();
                if (scaled_val.length <= decimals.toNumber()) {
                    let zeros = "";
                    for(let x = 0; x < decimals.toNumber() - scaled_val.length; x++) {
                        zeros += "0";
                    }
                    let charArray = [...scaled_val];
                    charArray.splice(0, 0, ...zeros)
                    scaled_val = "0." + charArray.join("")
                    return parseFloat(scaled_val);
                } else {
                    let charArray = Array.from(scaled_val);
                    charArray.splice(charArray.length - decimals.toNumber(), 0, ".")
                    return parseFloat(charArray.join(""))
                }
            } else if (game.account.oracle === Oracle.Pyth || game.account.oracle === Oracle.Switchboard) {
                
                return parseFloat(
                    (price.div((new anchor.BN(10)).pow(decimals)).toNumber() + (price.mod((new anchor.BN(10)).pow(decimals)).toNumber() / (10 ** decimals.toNumber()))).toFixed(2)
                )
            }
        } catch(error) {
            console.error(error);
        }
        
        
    }

    public static initializeFirst(workspace: Workspace, game: Game, crank: Crank): Promise<Game> {
    
        return new Promise((resolve, reject) => {
            workspace.programAddresses.getRoundPubkey(game.account.address, new anchor.BN(1)).then(([roundPubkey, _roundPubkeyBump]) => {
                workspace.program.methods.initFirstRoundInstruction().accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    round: roundPubkey,
                    priceProgram: game.account.priceProgram,
                    priceFeed: game.account.priceFeed,
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
                let roundNumberAsBuffer = workspace.programAddresses.roundToBuffer(new anchor.BN(2));
                workspace.program.methods.initSecondRoundInstruction([roundNumberAsBuffer[0], roundNumberAsBuffer[1], roundNumberAsBuffer[2], roundNumberAsBuffer[3]]).accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    secondRound: roundPubkey,
                    roundHistory: game.account.roundHistory,
                    firstRound: game.currentRound.account.address,
                    priceProgram: game.account.priceProgram,
                    priceFeed: game.account.priceFeed,
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
            let roundNumberAsBuffer = workspace.programAddresses.roundToBuffer(nextRoundNumber);
            workspace.programAddresses.getRoundPubkey(game.account.address, nextRoundNumber).then(([roundPubkey, _roundPubkeyBump]) => {
                workspace.program.methods.initNextRoundAndClosePreviousInstruction([roundNumberAsBuffer[0], roundNumberAsBuffer[1], roundNumberAsBuffer[2], roundNumberAsBuffer[3]]).accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    receiver: workspace.owner,
                    nextRound: roundPubkey,
                    roundHistory: game.account.roundHistory,
                    currentRound: game.currentRound.account.address,
                    previousRound: game.previousRound.account.address,
                    priceProgram: game.account.priceProgram,
                    priceFeed: game.account.priceFeed,
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

    public static adminCloseRound(workspace: Workspace, round: Round): Promise<void> {
        
        return new Promise((resolve, reject) => {
            workspace.program.methods.adminCloseRoundInstruction().accounts({
                signer: workspace.owner,
                round: round.account.address,
                receiver: workspace.owner
            }).transaction().then(tx => {
                workspace.sendTransaction(tx).then(txSignature => {
                    confirmTxRetry(workspace, txSignature).then(() => {
                        resolve();
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