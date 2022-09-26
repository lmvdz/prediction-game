export type PredictionGame = {
  "version": "1.0.8",
  "name": "prediction_game",
  "instructions": [
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
          "name": "vault",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "oracle",
          "type": "u8"
        },
        {
          "name": "baseSymbol",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "crankBps",
          "type": "u16"
        },
        {
          "name": "roundLength",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initGameHistoryInstruction",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistory",
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
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
      "name": "collectFeeInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claimFeeInstruction",
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
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAta",
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
      "name": "withdrawFeeInstruction",
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
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "toTokenAccount",
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
      "name": "payoutCranksInstruction",
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
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
          "name": "currentRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "previousRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundHistory",
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
      "name": "initVaultInstruction",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
          "name": "vaultNonce",
          "type": "u8"
        },
        {
          "name": "feeVaultNonce",
          "type": "u8"
        }
      ]
    },
    {
      "name": "closeFeeVaultAtaInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
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
      "name": "closeVaultAtaInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
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
      "name": "initFirstRoundInstruction",
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
          "name": "crank",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "crank",
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
      "args": [
        {
          "name": "nextRoundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
    },
    {
      "name": "initNextRoundAndClosePreviousInstruction",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
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
          "name": "previousRound",
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
      "args": [
        {
          "name": "nextRoundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
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
          "name": "userClaimable",
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
      "name": "initUserPredictionInstruction",
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
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPrediction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromTokenAccountAuthority",
          "isMut": false,
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
        },
        {
          "name": "roundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
    },
    {
      "name": "userClaimInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
      "name": "userClaimAllInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userClaimable",
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
          "name": "userClaimable",
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
      "name": "initCrankInstruction",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "game",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "crank",
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
      "name": "closeCrankAccountInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "crank",
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
      "name": "adminCloseCrankAccountInstruction",
      "docs": [
        "* DEVNET SPECIFIC\n     * SHOULD BE REMOVED BEFORE DEPLOYING TO MAINNET"
      ],
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "crank",
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
      "name": "adminCloseGameInstruction",
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
      "name": "adminCloseVaultInstruction",
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
      "name": "adminCloseRoundInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "round",
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
      "name": "adminCloseUserPredictionInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
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
      "name": "adminCloseUserAccountInstruction",
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
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseRoundHistoryInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundHistoryCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseUserPredictionHistoryInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistoryCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseUserClaimableInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userClaimableCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "crank",
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
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "userClaimable",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "cranks",
            "type": "u16"
          },
          {
            "name": "lastCrankRound",
            "type": "publicKey"
          },
          {
            "name": "lastPaidCrankRound",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
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
            "name": "baseSymbol",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
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
            "name": "roundLength",
            "type": "i64"
          },
          {
            "name": "vault",
            "type": "publicKey"
          },
          {
            "name": "unclaimedFees",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "crankBps",
            "type": "u16"
          },
          {
            "name": "totalVolume",
            "type": "u128"
          },
          {
            "name": "totalVolumeRollover",
            "type": "u128"
          },
          {
            "name": "oracle",
            "type": "u8"
          },
          {
            "name": "priceProgram",
            "type": "publicKey"
          },
          {
            "name": "priceFeed",
            "type": "publicKey"
          },
          {
            "name": "userPredictionHistory",
            "type": "publicKey"
          },
          {
            "name": "roundHistory",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roundHistory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "rounds",
            "type": {
              "array": [
                {
                  "defined": "RoundHistoryItem"
                },
                1024
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userPredictionHistory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "userPredictions",
            "type": {
              "array": [
                {
                  "defined": "UserPredictionHistoryItem"
                },
                1024
              ]
            }
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
            "name": "roundNumber",
            "type": "u32"
          },
          {
            "name": "roundLength",
            "type": "i64"
          },
          {
            "name": "finished",
            "type": "bool"
          },
          {
            "name": "invalid",
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
            "name": "cranksPaid",
            "type": "bool"
          },
          {
            "name": "roundPredictionsAllowed",
            "type": "bool"
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
            "name": "roundStartPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundCurrentPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundEndPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundPriceDifferenceDecimals",
            "type": "i128"
          },
          {
            "name": "roundWinningDirection",
            "type": "u8"
          },
          {
            "name": "totalFeeCollected",
            "type": "u64"
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
            "type": "u64"
          },
          {
            "name": "totalPredictionsSettled",
            "type": "u32"
          },
          {
            "name": "totalPredictions",
            "type": "u32"
          },
          {
            "name": "totalUniqueCrankers",
            "type": "u32"
          },
          {
            "name": "totalCranks",
            "type": "u32"
          },
          {
            "name": "totalCranksPaid",
            "type": "u32"
          },
          {
            "name": "totalAmountPaidToCranks",
            "type": "u64"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userClaimable",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "claims",
            "type": {
              "array": [
                {
                  "defined": "Claim"
                },
                64
              ]
            }
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
            "name": "userClaimable",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
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
            "name": "userClaimable",
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
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
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
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "tokenDecimals",
            "type": "u8"
          },
          {
            "name": "vaultAta",
            "type": "publicKey"
          },
          {
            "name": "vaultAtaAuthorityNonce",
            "type": "u8"
          },
          {
            "name": "vaultAtaAuthority",
            "type": "publicKey"
          },
          {
            "name": "feeVaultAta",
            "type": "publicKey"
          },
          {
            "name": "feeVaultAtaAuthorityNonce",
            "type": "u8"
          },
          {
            "name": "feeVaultAtaAuthority",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "RoundHistoryItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recordId",
            "type": "u128"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "roundNumber",
            "type": "u32"
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
            "name": "roundStartPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundCurrentPrice",
            "type": "i128"
          },
          {
            "name": "roundCurrentPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundEndPrice",
            "type": "i128"
          },
          {
            "name": "roundEndPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundPriceDifference",
            "type": "i128"
          },
          {
            "name": "roundPriceDifferenceDecimals",
            "type": "i128"
          },
          {
            "name": "roundWinningDirection",
            "type": "u8"
          },
          {
            "name": "totalFeeCollected",
            "type": "u64"
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
            "type": "u64"
          },
          {
            "name": "totalPredictionsSettled",
            "type": "u32"
          },
          {
            "name": "totalPredictions",
            "type": "u32"
          },
          {
            "name": "totalUniqueCrankers",
            "type": "u32"
          },
          {
            "name": "totalCranks",
            "type": "u32"
          },
          {
            "name": "totalCranksPaid",
            "type": "u32"
          },
          {
            "name": "totalAmountPaidToCranks",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserPredictionHistoryItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recordId",
            "type": "u128"
          },
          {
            "name": "address",
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
          }
        ]
      }
    },
    {
      "name": "Claim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "vault",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "Oracle",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Undefined"
          },
          {
            "name": "Chainlink"
          },
          {
            "name": "Pyth"
          },
          {
            "name": "Switchboard"
          }
        ]
      }
    },
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
      "name": "FailedToCloseVaultTokenAccount",
      "msg": "Failed to Close Vault Token Account"
    },
    {
      "code": 6062,
      "name": "TokenAccountMintMismatch",
      "msg": "Token Account Mint mismatch"
    },
    {
      "code": 6063,
      "name": "FromTokenAccountZeroBalance",
      "msg": "From token account zero balance"
    },
    {
      "code": 6064,
      "name": "SignerNotOwnerOfUserPrediction",
      "msg": "Signer is not the owner of the user prediction"
    },
    {
      "code": 6065,
      "name": "InvalidUserPredictionDirection",
      "msg": "Invalid User Prediction Directionl"
    },
    {
      "code": 6066,
      "name": "UserPredictionNotSettled",
      "msg": "User Prediction Not Settled"
    },
    {
      "code": 6067,
      "name": "UserOwnerNotReceiver",
      "msg": "User not owner of receiver"
    },
    {
      "code": 6068,
      "name": "GameFeeVaultTokenAccountAuthorityMismatch",
      "msg": "Game fee vault authority mismatch"
    },
    {
      "code": 6069,
      "name": "GameVaultTokenAccountAuthorityMismatch",
      "msg": "Game vault authority mismatch"
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
    },
    {
      "code": 6074,
      "name": "RoundPredictionsNotAllowed",
      "msg": "Round Predictions Not Allowed"
    },
    {
      "code": 6075,
      "name": "OwnerNotUserOwner",
      "msg": "Owner not User Owner"
    },
    {
      "code": 6076,
      "name": "OwnerNotRoundOwner",
      "msg": "Owner not Round Owner"
    },
    {
      "code": 6077,
      "name": "RoundKeyNotGameCurrentKey",
      "msg": "Round Key Not Game Current Key"
    },
    {
      "code": 6078,
      "name": "OwnerNotReceiver",
      "msg": "Owner Not Receiver"
    },
    {
      "code": 6079,
      "name": "GameOwnerNotVaultOwner",
      "msg": "Game Owner Not Vault Owner"
    },
    {
      "code": 6080,
      "name": "VaultUpTokenAccountDoesNotMatchProvidedUpTokenAccount",
      "msg": "Vault Up Token Account Does Not Match Provided Up Token Account"
    },
    {
      "code": 6081,
      "name": "SignerNotOwnerOfUpTokenAccount",
      "msg": "Signer Not Owner Of Up Token Account"
    },
    {
      "code": 6082,
      "name": "VaultDownTokenAccountDoesNotMatchProvidedDownTokenAccount",
      "msg": "Vault Down Token Account Does Not Match Provided Down Token Account"
    },
    {
      "code": 6083,
      "name": "SignerNotOwnerOfDownTokenAccount",
      "msg": "Signer Not Owner Of Down Token Account"
    },
    {
      "code": 6084,
      "name": "PredictionAndClaimUserMismatch",
      "msg": "Prediction and Claim User Mismatch"
    },
    {
      "code": 6085,
      "name": "InsufficientClaimableAmount",
      "msg": "Insufficient Claimable Amount"
    },
    {
      "code": 6086,
      "name": "FailedToClaim",
      "msg": "Failed to Claim"
    },
    {
      "code": 6087,
      "name": "FeeAlreadyCollected",
      "msg": "Fee Already Collected"
    },
    {
      "code": 6088,
      "name": "RoundFeeNotCollected",
      "msg": "Round Fee Not Collected"
    },
    {
      "code": 6089,
      "name": "RoundCranksAlreadyPaid",
      "msg": "Round Cranks Already Paid"
    },
    {
      "code": 6090,
      "name": "RoundCranksNotPaid",
      "msg": "Round Cranks Not Paid"
    },
    {
      "code": 6091,
      "name": "GameVaultMismatch",
      "msg": "Game Vault Mismatch"
    },
    {
      "code": 6092,
      "name": "GameFeeVaultMismatch",
      "msg": "Game Fee Vault Mismatch"
    },
    {
      "code": 6093,
      "name": "NoAvailableClaimFound",
      "msg": "No Available Claim Found"
    },
    {
      "code": 6094,
      "name": "ToTokenAccountNotOwnedByUserOwner",
      "msg": "To Token Account Owner Not Owned by User Owner"
    },
    {
      "code": 6095,
      "name": "VaultAtaNotEqualToAtaOnVault",
      "msg": "The ATA Provided is not associated with the Vault ATA"
    },
    {
      "code": 6096,
      "name": "UserClaimableCrankUserMismatch",
      "msg": "The user associated with the Crank is not the same as the UserClaimable user"
    },
    {
      "code": 6097,
      "name": "InvalidFeeVaultATAAuthority",
      "msg": "The Fee Vault ATA Authority did not match the one generated"
    },
    {
      "code": 6098,
      "name": "InvalidVaultATAAuthority",
      "msg": "The Vault ATA Authority did not match the one generated"
    },
    {
      "code": 6099,
      "name": "InvalidFeeVaultAuthorityNonce",
      "msg": "The Fee Vault ATA Authority Nonce did not match the one generated"
    },
    {
      "code": 6100,
      "name": "InvalidVaultAuthorityNonce",
      "msg": "The Vault ATA Authority Nonce did not match the one generated"
    },
    {
      "code": 6101,
      "name": "RoundNumberMismatch",
      "msg": "Round Number Mismatch"
    }
  ]
};

export const IDL: PredictionGame = {
  "version": "1.0.8",
  "name": "prediction_game",
  "instructions": [
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
          "name": "vault",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "oracle",
          "type": "u8"
        },
        {
          "name": "baseSymbol",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "crankBps",
          "type": "u16"
        },
        {
          "name": "roundLength",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initGameHistoryInstruction",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistory",
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
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
      "name": "collectFeeInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claimFeeInstruction",
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
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAta",
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
      "name": "withdrawFeeInstruction",
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
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "toTokenAccount",
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
      "name": "payoutCranksInstruction",
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
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
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
          "name": "currentRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "previousRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundHistory",
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
      "name": "initVaultInstruction",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
          "name": "vaultNonce",
          "type": "u8"
        },
        {
          "name": "feeVaultNonce",
          "type": "u8"
        }
      ]
    },
    {
      "name": "closeFeeVaultAtaInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "feeVaultAtaAuthority",
          "isMut": false,
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
      "name": "closeVaultAtaInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
          "name": "feeVaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAta",
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
      "name": "initFirstRoundInstruction",
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
          "name": "crank",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "crank",
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
      "args": [
        {
          "name": "nextRoundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
    },
    {
      "name": "initNextRoundAndClosePreviousInstruction",
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
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "crank",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
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
          "name": "previousRound",
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
      "args": [
        {
          "name": "nextRoundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
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
          "name": "userClaimable",
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
      "name": "initUserPredictionInstruction",
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
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "currentRound",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPrediction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromTokenAccountAuthority",
          "isMut": false,
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
        },
        {
          "name": "roundNumber",
          "type": {
            "array": [
              "u8",
              4
            ]
          }
        }
      ]
    },
    {
      "name": "userClaimInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAtaAuthority",
          "isMut": false,
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
      "name": "userClaimAllInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userClaimable",
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
          "name": "userClaimable",
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
      "name": "initCrankInstruction",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "game",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "crank",
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
      "name": "closeCrankAccountInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "crank",
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
      "name": "adminCloseCrankAccountInstruction",
      "docs": [
        "* DEVNET SPECIFIC\n     * SHOULD BE REMOVED BEFORE DEPLOYING TO MAINNET"
      ],
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "crank",
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
      "name": "adminCloseGameInstruction",
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
      "name": "adminCloseVaultInstruction",
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
      "name": "adminCloseRoundInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "round",
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
      "name": "adminCloseUserPredictionInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
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
      "name": "adminCloseUserAccountInstruction",
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
          "name": "receiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseRoundHistoryInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "roundHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundHistoryCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseUserPredictionHistoryInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userPredictionHistory",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userPredictionHistoryCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "adminCloseUserClaimableInstruction",
      "accounts": [
        {
          "name": "signer",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userClaimable",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userClaimableCloseReceiver",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "crank",
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
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "userClaimable",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "cranks",
            "type": "u16"
          },
          {
            "name": "lastCrankRound",
            "type": "publicKey"
          },
          {
            "name": "lastPaidCrankRound",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
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
            "name": "baseSymbol",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
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
            "name": "roundLength",
            "type": "i64"
          },
          {
            "name": "vault",
            "type": "publicKey"
          },
          {
            "name": "unclaimedFees",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "crankBps",
            "type": "u16"
          },
          {
            "name": "totalVolume",
            "type": "u128"
          },
          {
            "name": "totalVolumeRollover",
            "type": "u128"
          },
          {
            "name": "oracle",
            "type": "u8"
          },
          {
            "name": "priceProgram",
            "type": "publicKey"
          },
          {
            "name": "priceFeed",
            "type": "publicKey"
          },
          {
            "name": "userPredictionHistory",
            "type": "publicKey"
          },
          {
            "name": "roundHistory",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "roundHistory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "rounds",
            "type": {
              "array": [
                {
                  "defined": "RoundHistoryItem"
                },
                1024
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userPredictionHistory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "head",
            "type": "u64"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "game",
            "type": "publicKey"
          },
          {
            "name": "userPredictions",
            "type": {
              "array": [
                {
                  "defined": "UserPredictionHistoryItem"
                },
                1024
              ]
            }
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
            "name": "roundNumber",
            "type": "u32"
          },
          {
            "name": "roundLength",
            "type": "i64"
          },
          {
            "name": "finished",
            "type": "bool"
          },
          {
            "name": "invalid",
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
            "name": "cranksPaid",
            "type": "bool"
          },
          {
            "name": "roundPredictionsAllowed",
            "type": "bool"
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
            "name": "roundStartPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundCurrentPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundEndPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundPriceDifferenceDecimals",
            "type": "i128"
          },
          {
            "name": "roundWinningDirection",
            "type": "u8"
          },
          {
            "name": "totalFeeCollected",
            "type": "u64"
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
            "type": "u64"
          },
          {
            "name": "totalPredictionsSettled",
            "type": "u32"
          },
          {
            "name": "totalPredictions",
            "type": "u32"
          },
          {
            "name": "totalUniqueCrankers",
            "type": "u32"
          },
          {
            "name": "totalCranks",
            "type": "u32"
          },
          {
            "name": "totalCranksPaid",
            "type": "u32"
          },
          {
            "name": "totalAmountPaidToCranks",
            "type": "u64"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userClaimable",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "claims",
            "type": {
              "array": [
                {
                  "defined": "Claim"
                },
                64
              ]
            }
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
            "name": "userClaimable",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
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
            "name": "userClaimable",
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
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
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
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "tokenDecimals",
            "type": "u8"
          },
          {
            "name": "vaultAta",
            "type": "publicKey"
          },
          {
            "name": "vaultAtaAuthorityNonce",
            "type": "u8"
          },
          {
            "name": "vaultAtaAuthority",
            "type": "publicKey"
          },
          {
            "name": "feeVaultAta",
            "type": "publicKey"
          },
          {
            "name": "feeVaultAtaAuthorityNonce",
            "type": "u8"
          },
          {
            "name": "feeVaultAtaAuthority",
            "type": "publicKey"
          },
          {
            "name": "padding01",
            "type": {
              "array": [
                "publicKey",
                8
              ]
            }
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "RoundHistoryItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recordId",
            "type": "u128"
          },
          {
            "name": "address",
            "type": "publicKey"
          },
          {
            "name": "roundNumber",
            "type": "u32"
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
            "name": "roundStartPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundCurrentPrice",
            "type": "i128"
          },
          {
            "name": "roundCurrentPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundEndPrice",
            "type": "i128"
          },
          {
            "name": "roundEndPriceDecimals",
            "type": "i128"
          },
          {
            "name": "roundPriceDifference",
            "type": "i128"
          },
          {
            "name": "roundPriceDifferenceDecimals",
            "type": "i128"
          },
          {
            "name": "roundWinningDirection",
            "type": "u8"
          },
          {
            "name": "totalFeeCollected",
            "type": "u64"
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
            "type": "u64"
          },
          {
            "name": "totalPredictionsSettled",
            "type": "u32"
          },
          {
            "name": "totalPredictions",
            "type": "u32"
          },
          {
            "name": "totalUniqueCrankers",
            "type": "u32"
          },
          {
            "name": "totalCranks",
            "type": "u32"
          },
          {
            "name": "totalCranksPaid",
            "type": "u32"
          },
          {
            "name": "totalAmountPaidToCranks",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserPredictionHistoryItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recordId",
            "type": "u128"
          },
          {
            "name": "address",
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
          }
        ]
      }
    },
    {
      "name": "Claim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "vault",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "Oracle",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Undefined"
          },
          {
            "name": "Chainlink"
          },
          {
            "name": "Pyth"
          },
          {
            "name": "Switchboard"
          }
        ]
      }
    },
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
      "name": "FailedToCloseVaultTokenAccount",
      "msg": "Failed to Close Vault Token Account"
    },
    {
      "code": 6062,
      "name": "TokenAccountMintMismatch",
      "msg": "Token Account Mint mismatch"
    },
    {
      "code": 6063,
      "name": "FromTokenAccountZeroBalance",
      "msg": "From token account zero balance"
    },
    {
      "code": 6064,
      "name": "SignerNotOwnerOfUserPrediction",
      "msg": "Signer is not the owner of the user prediction"
    },
    {
      "code": 6065,
      "name": "InvalidUserPredictionDirection",
      "msg": "Invalid User Prediction Directionl"
    },
    {
      "code": 6066,
      "name": "UserPredictionNotSettled",
      "msg": "User Prediction Not Settled"
    },
    {
      "code": 6067,
      "name": "UserOwnerNotReceiver",
      "msg": "User not owner of receiver"
    },
    {
      "code": 6068,
      "name": "GameFeeVaultTokenAccountAuthorityMismatch",
      "msg": "Game fee vault authority mismatch"
    },
    {
      "code": 6069,
      "name": "GameVaultTokenAccountAuthorityMismatch",
      "msg": "Game vault authority mismatch"
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
    },
    {
      "code": 6074,
      "name": "RoundPredictionsNotAllowed",
      "msg": "Round Predictions Not Allowed"
    },
    {
      "code": 6075,
      "name": "OwnerNotUserOwner",
      "msg": "Owner not User Owner"
    },
    {
      "code": 6076,
      "name": "OwnerNotRoundOwner",
      "msg": "Owner not Round Owner"
    },
    {
      "code": 6077,
      "name": "RoundKeyNotGameCurrentKey",
      "msg": "Round Key Not Game Current Key"
    },
    {
      "code": 6078,
      "name": "OwnerNotReceiver",
      "msg": "Owner Not Receiver"
    },
    {
      "code": 6079,
      "name": "GameOwnerNotVaultOwner",
      "msg": "Game Owner Not Vault Owner"
    },
    {
      "code": 6080,
      "name": "VaultUpTokenAccountDoesNotMatchProvidedUpTokenAccount",
      "msg": "Vault Up Token Account Does Not Match Provided Up Token Account"
    },
    {
      "code": 6081,
      "name": "SignerNotOwnerOfUpTokenAccount",
      "msg": "Signer Not Owner Of Up Token Account"
    },
    {
      "code": 6082,
      "name": "VaultDownTokenAccountDoesNotMatchProvidedDownTokenAccount",
      "msg": "Vault Down Token Account Does Not Match Provided Down Token Account"
    },
    {
      "code": 6083,
      "name": "SignerNotOwnerOfDownTokenAccount",
      "msg": "Signer Not Owner Of Down Token Account"
    },
    {
      "code": 6084,
      "name": "PredictionAndClaimUserMismatch",
      "msg": "Prediction and Claim User Mismatch"
    },
    {
      "code": 6085,
      "name": "InsufficientClaimableAmount",
      "msg": "Insufficient Claimable Amount"
    },
    {
      "code": 6086,
      "name": "FailedToClaim",
      "msg": "Failed to Claim"
    },
    {
      "code": 6087,
      "name": "FeeAlreadyCollected",
      "msg": "Fee Already Collected"
    },
    {
      "code": 6088,
      "name": "RoundFeeNotCollected",
      "msg": "Round Fee Not Collected"
    },
    {
      "code": 6089,
      "name": "RoundCranksAlreadyPaid",
      "msg": "Round Cranks Already Paid"
    },
    {
      "code": 6090,
      "name": "RoundCranksNotPaid",
      "msg": "Round Cranks Not Paid"
    },
    {
      "code": 6091,
      "name": "GameVaultMismatch",
      "msg": "Game Vault Mismatch"
    },
    {
      "code": 6092,
      "name": "GameFeeVaultMismatch",
      "msg": "Game Fee Vault Mismatch"
    },
    {
      "code": 6093,
      "name": "NoAvailableClaimFound",
      "msg": "No Available Claim Found"
    },
    {
      "code": 6094,
      "name": "ToTokenAccountNotOwnedByUserOwner",
      "msg": "To Token Account Owner Not Owned by User Owner"
    },
    {
      "code": 6095,
      "name": "VaultAtaNotEqualToAtaOnVault",
      "msg": "The ATA Provided is not associated with the Vault ATA"
    },
    {
      "code": 6096,
      "name": "UserClaimableCrankUserMismatch",
      "msg": "The user associated with the Crank is not the same as the UserClaimable user"
    },
    {
      "code": 6097,
      "name": "InvalidFeeVaultATAAuthority",
      "msg": "The Fee Vault ATA Authority did not match the one generated"
    },
    {
      "code": 6098,
      "name": "InvalidVaultATAAuthority",
      "msg": "The Vault ATA Authority did not match the one generated"
    },
    {
      "code": 6099,
      "name": "InvalidFeeVaultAuthorityNonce",
      "msg": "The Fee Vault ATA Authority Nonce did not match the one generated"
    },
    {
      "code": 6100,
      "name": "InvalidVaultAuthorityNonce",
      "msg": "The Vault ATA Authority Nonce did not match the one generated"
    },
    {
      "code": 6101,
      "name": "RoundNumberMismatch",
      "msg": "Round Number Mismatch"
    }
  ]
};
