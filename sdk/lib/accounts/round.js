"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@project-serum/anchor"));
const constants_1 = require("../constants");
const index_1 = require("../util/index");
class Round {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static initializeFirst(workspace, game, crank, roundLength) {
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
                        (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game) => {
                                game.loadRoundData(workspace).then((game) => {
                                    resolve(game);
                                }).catch(error => {
                                    reject(error);
                                });
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            reject(error);
                        });
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        });
    }
    static initializeSecond(workspace, game, crank) {
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
                        (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game) => {
                                game.updateRoundData(workspace).then((game) => {
                                    resolve(game);
                                }).catch(error => {
                                    reject(error);
                                });
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            reject(error);
                        });
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        });
    }
    static initializeNext(workspace, game, crank) {
        return new Promise((resolve, reject) => {
            let nextRoundNumber = new anchor.BN(game.currentRound.account.roundNumber + 1);
            if (nextRoundNumber.gt(constants_1.U32MAX)) {
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
                        (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                            game.updateGameData(workspace).then((game) => {
                                game.updateRoundData(workspace).then((game) => {
                                    resolve(game);
                                }).catch(error => {
                                    reject(error);
                                });
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            reject(error);
                        });
                    }).catch(error => {
                        reject(error);
                    });
                }).catch(error => {
                    reject(error);
                });
            }).catch(error => {
                reject(error);
            });
        });
    }
}
exports.default = Round;
//# sourceMappingURL=round.js.map