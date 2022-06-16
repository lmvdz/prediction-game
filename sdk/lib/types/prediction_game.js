"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "version": "1.0.0",
    "name": "prediction_game",
    "instructions": [
        {
            "name": "testRoundRolloverInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                }
            ],
            "args": []
        },
        {
            "name": "initGameInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "gameFeeVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "vaultUpTokenAccountNonce",
                    "type": "u8"
                },
                {
                    "name": "vaultDownTokenAccountNonce",
                    "type": "u8"
                },
                {
                    "name": "tokenDecimal",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "initFirstRoundInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "round",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "priceProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "priceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initSecondRoundInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "secondRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "firstRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "priceProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "priceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initNextRoundAndClosePreviousInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "nextRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "currentRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "previousRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "priceProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "priceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "updateGameInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "currentRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "gameFeeVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "gameFeeVaultAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccountAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccountAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "priceProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "priceFeed",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "settlePredictionsInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "currentRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccountAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccountAuthority",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initUserInstruction",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "transferUserTokenAccountInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "toTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "fromTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "initUserPredictionInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "currentRound",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userPrediction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "toTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "fromTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "upOrDown",
                    "type": "u8"
                },
                {
                    "name": "amount",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "closeGameInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeGameFeeVaultInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "gameFeeVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeRoundInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "round",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeVaultInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeVaultAndTokenAccountsInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "game",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeVaultTokenAccountsInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "upTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "downTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeUserPredictionInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "game",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "round",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "userPrediction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "userPredictionCloseReceiver",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeUserAccountInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "closeUserTokenAccountInstruction",
            "accounts": [
                {
                    "name": "signer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "userTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "receiver",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "game",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "publicKey"
                    },
                    {
                        "name": "address",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenDecimal",
                        "type": "u8"
                    },
                    {
                        "name": "tokenMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "roundNumber",
                        "type": "u32"
                    },
                    {
                        "name": "currentRound",
                        "type": "publicKey"
                    },
                    {
                        "name": "previousRound",
                        "type": "publicKey"
                    },
                    {
                        "name": "vault",
                        "type": "publicKey"
                    },
                    {
                        "name": "feeVault",
                        "type": "publicKey"
                    },
                    {
                        "name": "totalVolume",
                        "type": "u128"
                    },
                    {
                        "name": "totalVolumeRollover",
                        "type": "u128"
                    }
                ]
            }
        },
        {
            "name": "decimal",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "value",
                        "type": "i128"
                    },
                    {
                        "name": "decimals",
                        "type": "u32"
                    }
                ]
            }
        },
        {
            "name": "round",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "publicKey"
                    },
                    {
                        "name": "game",
                        "type": "publicKey"
                    },
                    {
                        "name": "address",
                        "type": "publicKey"
                    },
                    {
                        "name": "finished",
                        "type": "bool"
                    },
                    {
                        "name": "settled",
                        "type": "bool"
                    },
                    {
                        "name": "feeCollected",
                        "type": "bool"
                    },
                    {
                        "name": "roundNumber",
                        "type": "u32"
                    },
                    {
                        "name": "priceProgramPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "priceFeedPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "roundStartTime",
                        "type": "i64"
                    },
                    {
                        "name": "roundCurrentTime",
                        "type": "i64"
                    },
                    {
                        "name": "roundTimeDifference",
                        "type": "i64"
                    },
                    {
                        "name": "roundStartPrice",
                        "type": "i128"
                    },
                    {
                        "name": "roundCurrentPrice",
                        "type": "i128"
                    },
                    {
                        "name": "roundEndPrice",
                        "type": "i128"
                    },
                    {
                        "name": "roundPriceDifference",
                        "type": "i128"
                    },
                    {
                        "name": "roundWinningDirection",
                        "type": "u8"
                    },
                    {
                        "name": "totalUpAmount",
                        "type": "u64"
                    },
                    {
                        "name": "totalDownAmount",
                        "type": "u64"
                    },
                    {
                        "name": "totalAmountSettled",
                        "type": "u128"
                    },
                    {
                        "name": "totalPredictionsSettled",
                        "type": "u32"
                    },
                    {
                        "name": "totalPredictions",
                        "type": "u32"
                    }
                ]
            }
        },
        {
            "name": "user",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "address",
                        "type": "publicKey"
                    },
                    {
                        "name": "owner",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenMintPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenAccountPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenAccountAuthorityPubkey",
                        "type": "publicKey"
                    }
                ]
            }
        },
        {
            "name": "userPrediction",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "publicKey"
                    },
                    {
                        "name": "address",
                        "type": "publicKey"
                    },
                    {
                        "name": "user",
                        "type": "publicKey"
                    },
                    {
                        "name": "game",
                        "type": "publicKey"
                    },
                    {
                        "name": "round",
                        "type": "publicKey"
                    },
                    {
                        "name": "upOrDown",
                        "type": "u8"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    },
                    {
                        "name": "settled",
                        "type": "bool"
                    },
                    {
                        "name": "deposited",
                        "type": "bool"
                    }
                ]
            }
        },
        {
            "name": "vault",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "address",
                        "type": "publicKey"
                    },
                    {
                        "name": "owner",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenMintPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "upTokenAccountPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "upTokenAccountAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "upTokenAccountNonce",
                        "type": "u8"
                    },
                    {
                        "name": "downTokenAccountPubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "downTokenAccountAuthority",
                        "type": "publicKey"
                    },
                    {
                        "name": "downTokenAccountNonce",
                        "type": "u8"
                    },
                    {
                        "name": "upAmount",
                        "type": "u64"
                    },
                    {
                        "name": "downAmount",
                        "type": "u64"
                    }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "UpOrDown",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "None"
                    },
                    {
                        "name": "Up"
                    },
                    {
                        "name": "Down"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "InvalidUpVaultAccountAuthority",
            "msg": "Game not up_vault owner"
        },
        {
            "code": 6001,
            "name": "InvalidDownVaultAccountAuthority",
            "msg": "Game not down_vault owner"
        },
        {
            "code": 6002,
            "name": "PriceFeedKeyMismatch",
            "msg": "Price Feed PublicKey does not match"
        },
        {
            "code": 6003,
            "name": "CheckedSubOverflow",
            "msg": "Checked subtraction overflow"
        },
        {
            "code": 6004,
            "name": "PriceProgramNotOwnerOfPriceFeed",
            "msg": "Price Program not owner of Price Feed"
        },
        {
            "code": 6005,
            "name": "NextComputedRoundNumberError",
            "msg": "Next round number does not match what was computed"
        },
        {
            "code": 6006,
            "name": "FailedToFinishRound",
            "msg": "Round failed to finish"
        },
        {
            "code": 6007,
            "name": "DepositOverflow",
            "msg": "The deposit amount attempted was too much"
        },
        {
            "code": 6008,
            "name": "WithdrawUnderflow",
            "msg": "The withraw amount attempted was too much"
        },
        {
            "code": 6009,
            "name": "UserPredictionAmountNotZero",
            "msg": "User account amount not zero"
        },
        {
            "code": 6010,
            "name": "InsufficientTokenAccountAmount",
            "msg": "Token account has insufficient amount"
        },
        {
            "code": 6011,
            "name": "FailedToAppendUserPrediction",
            "msg": "Failed to append user prediction"
        },
        {
            "code": 6012,
            "name": "PredictionAlreadyPushed",
            "msg": "Prediction already exists"
        },
        {
            "code": 6013,
            "name": "NoPredictionToPopFound",
            "msg": "No prediction to pop off array found based on pubkey"
        },
        {
            "code": 6014,
            "name": "FailedToPopUserPrediction",
            "msg": "Failed to pop user prediction"
        },
        {
            "code": 6015,
            "name": "PredictionHasntBeenSettled",
            "msg": "Prediction hasn't been settled"
        },
        {
            "code": 6016,
            "name": "NoSpaceToPushPrediction",
            "msg": "No space to add Prediction"
        },
        {
            "code": 6017,
            "name": "PredictionNotValidToPop",
            "msg": "Position not valid to Pop"
        },
        {
            "code": 6018,
            "name": "FailedToInitUserPrediction",
            "msg": "Failed to initialize user prediction"
        },
        {
            "code": 6019,
            "name": "UserPredictionFailedToDeposit",
            "msg": "Failed to complete deposit for user prediction"
        },
        {
            "code": 6020,
            "name": "FailedToCloseUnsettledUserPosition",
            "msg": "User position could not be closed because it is unsettled"
        },
        {
            "code": 6021,
            "name": "UserPredictionDeniedRoundFinished",
            "msg": "User prediction was denied because round finished"
        },
        {
            "code": 6022,
            "name": "FailedToUpdateRound",
            "msg": "Failed to update round"
        },
        {
            "code": 6023,
            "name": "RoundNotFinished",
            "msg": "Round not finished"
        },
        {
            "code": 6024,
            "name": "RoundAlreadyFinished",
            "msg": "Round already finished"
        },
        {
            "code": 6025,
            "name": "FailedToSettleUserPrediction",
            "msg": "Failed to settle user prediction"
        },
        {
            "code": 6026,
            "name": "SignerNotOwnerOfVault",
            "msg": "Signer not owner of vault"
        },
        {
            "code": 6027,
            "name": "FailedToDeposit",
            "msg": "Failed to deposit"
        },
        {
            "code": 6028,
            "name": "FailedToWithdraw",
            "msg": "Failed to withdraw"
        },
        {
            "code": 6029,
            "name": "ToAccountDoesNotMatchVaultUpOrDown",
            "msg": "The account to deposit to doesn't equal the up or down token account"
        },
        {
            "code": 6030,
            "name": "RoundPredictionsIsUninitialized",
            "msg": "Round predictions array is uninitialized"
        },
        {
            "code": 6031,
            "name": "UserTokenAccountNotEmpty",
            "msg": "Can't close user account when user token account is not empty"
        },
        {
            "code": 6032,
            "name": "UserTokenAccountNotClosed",
            "msg": "Can't close user account when user token account is not closed"
        },
        {
            "code": 6033,
            "name": "UserNotOwnerOfTokenAccount",
            "msg": "User is not the owner of the token account"
        },
        {
            "code": 6034,
            "name": "FromTokenAccountAuthorityNotEqual",
            "msg": "Token account authority not equal"
        },
        {
            "code": 6035,
            "name": "UserOwnerNotToTokenAccountOwner",
            "msg": "User owner not the same as the to token account owner"
        },
        {
            "code": 6036,
            "name": "UserOwnerNotFromTokenAccountOwner",
            "msg": "User owner not the same as the from token account owner"
        },
        {
            "code": 6037,
            "name": "RoundGameKeyNotEqual",
            "msg": "Game key not equal to the round's game key"
        },
        {
            "code": 6038,
            "name": "RoundOwnerNotVaultOwner",
            "msg": "Round owner not the vault owner"
        },
        {
            "code": 6039,
            "name": "SignerNotOwnerOfUser",
            "msg": "Signer not owner of user"
        },
        {
            "code": 6040,
            "name": "VaultOwnerNotToTokenAccountOwner",
            "msg": "Vault owner not to token account owner"
        },
        {
            "code": 6041,
            "name": "ToTokenAccountNotPartOfVault",
            "msg": "To token account not part of vault"
        },
        {
            "code": 6042,
            "name": "SignerNotOwnerOfFromTokenAccount",
            "msg": "Signer not owner of from token account"
        },
        {
            "code": 6043,
            "name": "SignerNotOwner",
            "msg": "Signer not owner"
        },
        {
            "code": 6044,
            "name": "UserPredictionOwnerNotToTokenAccountOwner",
            "msg": "User prediction owner and to token account owner mismatch"
        },
        {
            "code": 6045,
            "name": "UserPredictionOwnerNotFromTokenAccountOwner",
            "msg": "User prediction owner and from token account owner mismatch"
        },
        {
            "code": 6046,
            "name": "VaultTokenAccountAuthorityNotEqualToFromTokenAccount",
            "msg": "vault token account account authority not equal to from token account"
        },
        {
            "code": 6047,
            "name": "FailedToInitGame",
            "msg": "Failed to init game"
        },
        {
            "code": 6048,
            "name": "FailedToInitRound",
            "msg": "Failed to init round"
        },
        {
            "code": 6049,
            "name": "FailedToInitVault",
            "msg": "Failed to init vault"
        },
        {
            "code": 6050,
            "name": "RoundPriceProgramNotEqual",
            "msg": "Round Price Program Not Equal"
        },
        {
            "code": 6051,
            "name": "RoundPriceFeedNotEqual",
            "msg": "Round Price Feed Not Equal"
        },
        {
            "code": 6052,
            "name": "VaultUpTokenAccountAuthorityMismatch",
            "msg": "Vault up token account authority not equal to the one provided"
        },
        {
            "code": 6053,
            "name": "VaultDownTokenAccountAuthorityMismatch",
            "msg": "Vault down token account authority not equal to the one provided"
        },
        {
            "code": 6054,
            "name": "RoundAlreadySettled",
            "msg": "Round already settled"
        },
        {
            "code": 6055,
            "name": "RoundNotSettled",
            "msg": "Round not settled"
        },
        {
            "code": 6056,
            "name": "FailedToSettleRound",
            "msg": "Failed to settle round"
        },
        {
            "code": 6057,
            "name": "FailedToWithdrawWinnings",
            "msg": "Failed to withdraw winnings"
        },
        {
            "code": 6058,
            "name": "FailedToWithdrawInitialAmount",
            "msg": "Failed to withdraw initial amount"
        },
        {
            "code": 6059,
            "name": "UserPredictionCanOnlyBeUpOrDown",
            "msg": "User prediction can only be up or down"
        },
        {
            "code": 6060,
            "name": "RoundWinningDirectionInvalid",
            "msg": "Round winning direction invalid"
        },
        {
            "code": 6061,
            "name": "FailedToCloseUpTokenAccount",
            "msg": "Failed to Close Up Vault Token Account"
        },
        {
            "code": 6062,
            "name": "FailedToCloseDownTokenAccount",
            "msg": "Failed to Close Down Vault Token Account"
        },
        {
            "code": 6063,
            "name": "TokenAccountMintMismatch",
            "msg": "Token Account Mint mismatch"
        },
        {
            "code": 6064,
            "name": "FromTokenAccountZeroBalance",
            "msg": "From token account zero balance"
        },
        {
            "code": 6065,
            "name": "SignerNotOwnerOfUserPrediction",
            "msg": "Signer is not the owner of the user prediction"
        },
        {
            "code": 6066,
            "name": "InvalidUserPredictionDirection",
            "msg": "Invalid User Prediction Directionl"
        },
        {
            "code": 6067,
            "name": "UserPredictionNotSettled",
            "msg": "User Prediction Not Settled"
        },
        {
            "code": 6068,
            "name": "UserOwnerNotReceiver",
            "msg": "User not owner of receiver"
        },
        {
            "code": 6069,
            "name": "GameFeeVaultTokenAccountAuthorityMismatch",
            "msg": "Game fee vault authority mismatch"
        },
        {
            "code": 6070,
            "name": "FailedToTakeFee",
            "msg": "Failed to take fee"
        },
        {
            "code": 6071,
            "name": "MinimumPredictionAmountNotMet",
            "msg": "Minimum Predicion amount not met"
        },
        {
            "code": 6072,
            "name": "PredictionAndTokenAccountOwnerMismatch",
            "msg": "Prediction and Token Account Owner Mismatch"
        },
        {
            "code": 6073,
            "name": "TestRoundRolloverFailed",
            "msg": "Test Round Rollover Failed"
        }
    ]
};
//# sourceMappingURL=prediction_game.js.map