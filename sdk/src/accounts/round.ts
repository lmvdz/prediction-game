import * as anchor from "@project-serum/anchor"
import { PublicKey } from '@solana/web3.js'
import { Workspace } from '../workspace'
import Game, { Oracle } from "./game"
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

    public convertOraclePriceToNumber(oraclePrice: anchor.BN, game: Game) : number {
        if (game.account.oracle === Oracle.Chainlink) {
            let scaled_val = oraclePrice.toString();
            if (scaled_val.length <= (this.account.roundPriceDecimals * 8)) {
                let zeros = "";
                for(let x = 0; x < (this.account.roundPriceDecimals * 8) - scaled_val.length; x++) {
                    zeros += "0";
                }
                let charArray = [...scaled_val];
                charArray.splice(0, 0, ...zeros)
                scaled_val = "0." + charArray.join("")
                return parseFloat(scaled_val);
            } else {
                let charArray = Array.from(scaled_val);
                charArray.splice(charArray.length - (this.account.roundPriceDecimals * 8), 0, ".")
                return parseFloat(charArray.join(""))
            }
        } else if (game.account.oracle === Oracle.Pyth || game.account.oracle === Oracle.Switchboard) {
            return parseFloat((oraclePrice.div(new anchor.BN(10).pow(new anchor.BN(this.account.roundPriceDecimals))).toNumber() +
            (oraclePrice.mod(new anchor.BN(10).pow(new anchor.BN(this.account.roundPriceDecimals))).toNumber() / (10 ** this.account.roundPriceDecimals))).toFixed(2))
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
                workspace.program.methods.initSecondRoundInstruction().accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    secondRound: roundPubkey,
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
            workspace.programAddresses.getRoundPubkey(game.account.address, nextRoundNumber).then(([roundPubkey, _roundPubkeyBump]) => {
                workspace.program.methods.initNextRoundAndClosePreviousInstruction().accounts({
                    signer: workspace.owner,
                    game: game.account.address,
                    crank: crank.account.address,
                    receiver: workspace.owner,
                    nextRound: roundPubkey,
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
                game: round.account.game,
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