import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { closeAccountInstructionData, createAssociatedTokenAccount, createInitializeMintInstruction, createMint, getAccount, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, mintTo, MINT_SIZE, TOKEN_PROGRAM_ID, transfer } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, SYSVAR_CLOCK_PUBKEY, Connection } from "@solana/web3.js";
import { BN } from "bn.js";
import { PredictionGame } from "../target/types/prediction_game";


function chunk(array : Array<any>, size: number) {
  if (!array) return [];
  const firstChunk = array.slice(0, size); // create the first chunk of the given array
  if (!firstChunk.length) {
    return array; // this is the base case to terminal the recursive
  }
  return [firstChunk].concat(chunk(array.slice(size, array.length), size)); 
}


describe("prediction_game", () => {

  // const connection = new Connection("https://api.devnet.solana.com");
  // const owner = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")))
  // const wallet = new anchor.Wallet(owner)
  // const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'finalized'})
  // anchor.setProvider(provider);

  const owner = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")));
  anchor.setProvider(anchor.AnchorProvider.env())
  const program = anchor.workspace.PredictionGame as Program<PredictionGame>;

  console.log(program.programId.toBase58())


  const players = new Array<Keypair>();
  for(let x = 0; x < 500; x++) {
    players.push(Keypair.generate());
  }


  const mint = anchor.web3.Keypair.generate();
  const mintDecimals = 6;

  it("send_SOL_to_players", async () => {
    let txCount = 0;
    Promise.allSettled(players.map(async (player) => {
      await anchor.web3.sendAndConfirmTransaction(program.provider.connection, new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: owner.publicKey,
          toPubkey: player.publicKey,
          lamports: anchor.web3.LAMPORTS_PER_SOL * 3
        })
      ), [owner])
      txCount++;
    })).then(() => {
      console.log('sent ' + txCount + ' txs for players SOL');
    })
  })

  it("init_game_and_first_round!", async () => {    
    await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mint);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    
    const [gameFeeVaultPubkey, _gameFeeVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
        program.programId
      );
    const roundNumberBuffer = new anchor.BN(1).toArrayLike(Buffer, 'be', 4);
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );

    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    
    
    try {
      const initSignature = await program.methods.initGameInstruction(_upVaultBump, _downVaultBump, mintDecimals).accounts({
        owner: owner.publicKey,
        game: gamePubkey,
        gameFeeVault: gameFeeVaultPubkey,
        vault: vaultPubkey,
        upTokenAccount: upVaultPubkey,
        downTokenAccount: downVaultPubkey,
        tokenMint: mint.publicKey,        
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      }).signers([owner]).rpc();

      const initRoundSignature = await program.methods.initFirstRoundInstruction().accounts({
        owner: owner.publicKey,
        game: gamePubkey,
        round: roundPubkey,
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
        // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
        priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
        // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
        // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
        // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
        systemProgram: anchor.web3.SystemProgram.programId
      }).signers([owner]).rpc();
  
      
  
      console.log("init game transaction signature", initSignature);
      console.log("init first round transaction signature", initRoundSignature);
  
      let game = await program.account.game.fetch(gamePubkey);
      let round = await program.account.round.fetch(game.currentRound);
  
      console.log("round start time", round.roundCurrentTime.toNumber());
      console.log("round number", round.roundNumber);
    } catch(error) {
      console.error(error);
    }
    
    
  });

  it("test_round_rollover!", async () => {

    const u32MAX = new anchor.BN("4294967295")

    // console.log(game.roundNumber);
    let nextRoundNumber = new anchor.BN(u32MAX.add(new anchor.BN(1)));
    // console.log(nextRoundNumber.toNumber())
    if (u32MAX.lt(nextRoundNumber)) {
      nextRoundNumber = new anchor.BN(1);
    }

    // console.log(nextRoundNumber.toNumber())

    try {
      await program.methods.testRoundRolloverInstruction().accounts({
        owner: owner.publicKey,
      }).signers([owner]).rpc();     
    } catch (error) {
      console.error(error);
    }
  })

  it("init_user_predictions!", async () => {
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    const roundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    let playersInit = 0, playerTransferFunds = 0, playerPredictionInit = 0;

    enum UpOrDown {
      Up = 1,
      Down = 2
    }

    function getDepositAccountBasedOnPredictionDirection(direction: UpOrDown) : PublicKey {
      if (direction === UpOrDown.Up)
        return upVaultPubkey;
      else if (direction === UpOrDown.Down)
        return downVaultPubkey;
      else
        throw Error("invalid direction");
    }

    await Promise.allSettled(players.map(async player => {
      try {
        const [playerPredictionPubkey, _playerPredictionPubkeyBump] =
        await PublicKey.findProgramAddress(
          [
            program.programId.toBuffer(), 
            Buffer.from(program.idl.version), 
            player.publicKey.toBuffer(), 
            gamePubkey.toBuffer(), 
            roundPubkey.toBuffer(), 
            roundNumberBuffer.slice(0, 1), 
            roundNumberBuffer.slice(1, 2), 
            roundNumberBuffer.slice(2, 3), 
            roundNumberBuffer.slice(3, 4),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
          ],
          program.programId
        )


        const [playerPubkey, _playerPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user'))],
            program.programId
          )
        const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
            program.programId
          )

        const playerATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, player, mint.publicKey, player.publicKey);
        await mintTo(program.provider.connection, player, mint.publicKey, playerATA.address, owner.publicKey, 100 * (10 ** mintDecimals), [owner]);

        let initPlayerSignature = await program.methods.initUserInstruction().accounts({

          owner: player.publicKey,
          user: playerPubkey,
          tokenAccount: playerTokenAccountPubkey,
          tokenMint: mint.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
      
        }).signers([player]).rpc();
      
        // console.log("init player transaction signature", initPlayerSignature);
        playersInit++;


        let transferFundsToPlayer1ATA = await program.methods.transferUserTokenAccountInstruction(new anchor.BN(100 * (10 ** mintDecimals))).accounts({
          signer: player.publicKey,
          user: playerPubkey,
          toTokenAccount: playerTokenAccountPubkey,
          fromTokenAccount: playerATA.address,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        }).signers([player]).rpc();

        playerTransferFunds++;

        // console.log('player transfer funds transaction signature', transferFundsToPlayer1ATA);
        // const userATA = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log('player ata amount', userATA.amount)

        let playerPrediction = Math.random() > 0.5 ? UpOrDown.Up : UpOrDown.Down

        // console.log(playerPrediction);

        let initPlayerPredictionSignature = await program.methods.initUserPredictionInstruction(playerPrediction, new anchor.BN(((Math.random() + 1) * 50) * (10 ** mintDecimals))).accounts({

          signer: player.publicKey,
          user: playerPubkey,
          game: gamePubkey,
          vault: vaultPubkey,
          currentRound: roundPubkey,
          userPrediction: playerPredictionPubkey,
          toTokenAccount: getDepositAccountBasedOnPredictionDirection(playerPrediction),
          fromTokenAccount: playerTokenAccountPubkey,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
    
        }).signers([player]).rpc();

        playerPredictionInit++;
        
        // console.log("initialize player prediction transaction signature", initPlayerPredictionSignature);
        // let user_token_account = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log("player 1 ata amount", user_token_account.amount);
        return;
      } catch (error) {
        console.error(error);
      }
    }))

    console.log('player initialized', playersInit, 'player funds transfered', playerTransferFunds, 'player prediction initialized', playerPredictionInit);

  })

  it("update_game_and_settle_predictions_round_1!", async () => {
    console.log('waiting 5 minutes before calling update...');


    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    
    const roundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [gameFeeVaultPubkey, _gameFeeVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );

    const vault = await program.account.vault.fetch(vaultPubkey);
    console.log(vault.upAmount.toNumber(), vault.downAmount.toNumber());
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      ); 
    
    await Promise.allSettled([new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const updateSignature = await program.methods.updateGameInstruction().accounts({
            signer: owner.publicKey,
            game: gamePubkey,
            currentRound: roundPubkey,
            vault: vaultPubkey,
            gameFeeVault: gameFeeVaultPubkey,
            gameFeeVaultAuthority: owner.publicKey,
            upTokenAccount: upVaultPubkey,
            upTokenAccountAuthority: owner.publicKey,
            downTokenAccount: downVaultPubkey,
            downTokenAccountAuthority: owner.publicKey,
            priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
            // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
            priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
            // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
            // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
            // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
          }).signers([owner]).rpc();
      
          console.log("update transaction signature", updateSignature);
      
          let game = await program.account.game.fetch(gamePubkey);
          let gameFeeVaultATA = await getAccount(program.provider.connection, game.feeVault)
          console.log("game fee vault amount", gameFeeVaultATA.amount);
          let round = await program.account.round.fetch(game.currentRound);

          if (round.finished) {
            
            let predictionChunks = chunk((await Promise.all(players.map(async player => {
              const [playerPredictionPubkey, _playerPredictionPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [
                    program.programId.toBuffer(), 
                    Buffer.from(program.idl.version), 
                    player.publicKey.toBuffer(), 
                    gamePubkey.toBuffer(), 
                    roundPubkey.toBuffer(), 
                    roundNumberBuffer.slice(0, 1), 
                    roundNumberBuffer.slice(1, 2), 
                    roundNumberBuffer.slice(2, 3), 
                    roundNumberBuffer.slice(3, 4),
                    Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
                  ],
                  program.programId
                )
  
              const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
                  program.programId
                )
              return [
                {
                  pubkey: playerPredictionPubkey,
                  isSigner: false,
                  isWritable: true
                },
                {
                  pubkey: playerTokenAccountPubkey,
                  isSigner: false,
                  isWritable: true
                }
              ]
            }))).flat(Infinity) as anchor.web3.AccountMeta[], 20);

            let settledTxCount = 0;
            await Promise.allSettled(predictionChunks.map(async (chunk : anchor.web3.AccountMeta[]) => {
              try {
                // let tx = 
                await program.methods.settlePredictionsInstruction().accounts({
                  signer: owner.publicKey,
                  game: gamePubkey,
                  currentRound: roundPubkey,
                  vault: vaultPubkey,
                  upTokenAccount: upVaultPubkey,
                  upTokenAccountAuthority: owner.publicKey,
                  downTokenAccount: downVaultPubkey,
                  downTokenAccountAuthority: owner.publicKey,
                  // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
                  // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
                  // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
                  systemProgram: anchor.web3.SystemProgram.programId,
                  tokenProgram: TOKEN_PROGRAM_ID
                }).remainingAccounts(chunk).signers([owner]).rpc();
                // setTimeout(async () => {
                //   let txResponse = await program.provider.connection.getTransaction(tx, { commitment: 'confirmed'})
                //   console.log(txResponse.meta.logMessages);
                // }, 2000)
              } catch (error) {
                console.error(error);
              }
              
              settledTxCount++;
              return;
            }))
            console.log("settled predictions tx count", settledTxCount)
          }

          let vault = await program.account.vault.fetch(game.vault);
          round = await program.account.round.fetch(roundPubkey);
          console.log("round number", round.roundNumber);
          console.log("round current time", round.roundCurrentTime.toNumber());
          console.log("round current price", round.roundCurrentPrice.toNumber());
          console.log("round time difference", round.roundTimeDifference.toNumber());
          console.log("round price difference", round.roundPriceDifference.toNumber());
          console.log("round total up amount", round.totalUpAmount.toNumber());
          console.log("round total down amount", round.totalDownAmount.toNumber());
          console.log("round winning direction", round.roundWinningDirection);
          console.log("round total settled", round.totalAmountSettled.toNumber());
          console.log("round total predictions", round.totalPredictions);
          console.log("round total predictions settled", round.totalPredictionsSettled);
          console.log("vault up amount", vault.upAmount.toNumber());
          console.log("vault down amount", vault.downAmount.toNumber());

        } catch(error) {
          console.error(error);
        }
        resolve();
      }, 5000);
      // }, 5 * 60 * 1001);
    })]);
  })


  // second round specific
  it("init_second_round", async () => {
    try {
    // await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mint);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );

    let game = await program.account.game.fetch(gamePubkey);
    // const currentRound = await program.account.round.fetch(game.currentRound);
    

    const u32MAX = new anchor.BN("4294967295")
    
    const currentRoundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);

    let nextRoundNumberBuffer;
    // console.log(game.roundNumber);
    let nextRoundNumber = new anchor.BN(game.roundNumber+1);
    // console.log(nextRoundNumber.toNumber())
    if (u32MAX.lt(nextRoundNumber)) {
      nextRoundNumber = new anchor.BN(1);
    }

    // console.log(nextRoundNumber.toNumber())
    nextRoundNumberBuffer = nextRoundNumber.toArrayLike(Buffer, 'be', 4);


    const [currentRoundPubkey, _currentRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          currentRoundNumberBuffer.slice(0, 1),
          currentRoundNumberBuffer.slice(1, 2),
          currentRoundNumberBuffer.slice(2, 3),
          currentRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );
    const [nextRoundPubkey, _nextRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          nextRoundNumberBuffer.slice(0, 1),
          nextRoundNumberBuffer.slice(1, 2),
          nextRoundNumberBuffer.slice(2, 3),
          nextRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );

    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );
    
      const initNextRoundSignature = await program.methods.initSecondRoundInstruction().accounts({
        owner: owner.publicKey,
        receiver: owner.publicKey,
        game: gamePubkey,
        vault: vaultPubkey,
        firstRound: currentRoundPubkey,
        secondRound: nextRoundPubkey,
        tokenMint: mint.publicKey,
        upTokenAccount: upVaultPubkey,
        downTokenAccount: downVaultPubkey,
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
        // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
        priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
        // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
        // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
        // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
        systemProgram: anchor.web3.SystemProgram.programId
      }).signers([owner]).rpc();
      console.log("init next round transaction signature", initNextRoundSignature);
  
      game = await program.account.game.fetch(gamePubkey);
      let round = await program.account.round.fetch(game.currentRound);
  
      console.log("round start time", round.roundCurrentTime.toNumber());
      console.log("round number", round.roundNumber);
    } catch(error) {
      console.error(error);
    }
  })

  it("init_user_predictions_for_second_round_and_close_settled_predictions!", async () => {
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    const currentRoundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    const [currentRoundPubkey, _currentRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          currentRoundNumberBuffer.slice(0, 1),
          currentRoundNumberBuffer.slice(1, 2),
          currentRoundNumberBuffer.slice(2, 3),
          currentRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    let playerTransferFunds = 0, playerPredictionInit = 0;

    enum UpOrDown {
      Up = 1,
      Down = 2
    }

    function getDepositAccountBasedOnPredictionDirection(direction: UpOrDown) : PublicKey {
      if (direction === UpOrDown.Up)
        return upVaultPubkey;
      else if (direction === UpOrDown.Down)
        return downVaultPubkey;
      else
        throw Error("invalid direction");
    }

    let predictions = (await program.account.userPrediction.all())
    let closedSettledPredictions = 0;
    await Promise.allSettled(players.map(async player => {
      try {

        const [playerPredictionCurrentRoundPubkey, _playerPredictionCurrentRoundPubkeyBump] =
        await PublicKey.findProgramAddress(
          [
            program.programId.toBuffer(), 
            Buffer.from(program.idl.version), 
            player.publicKey.toBuffer(), 
            gamePubkey.toBuffer(), 
            currentRoundPubkey.toBuffer(), 
            currentRoundNumberBuffer.slice(0, 1), 
            currentRoundNumberBuffer.slice(1, 2), 
            currentRoundNumberBuffer.slice(2, 3), 
            currentRoundNumberBuffer.slice(3, 4),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
          ],
          program.programId
        )


        const [playerPubkey, _playerPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user'))],
            program.programId
          )
        const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
            program.programId
          )

        let settledPredictions = [], unsettledPredictions = [];
        predictions.forEach(prediction => {
          if (prediction.account.owner.toBase58() === player.publicKey.toBase58()) {
            if (prediction.account.settled) {
              settledPredictions.push(prediction);
            } else {
              unsettledPredictions.push(prediction);
            }
          }
        })

        
        await Promise.allSettled(settledPredictions.map(async settledPrediction => {
          try {
            let closeUserPredictionSignature = await program.methods.closeUserPredictionInstruction().accounts({
              signer: player.publicKey,
              game: gamePubkey,
              round: settledPrediction.account.round,
              user: playerPubkey,
              userPrediction: settledPrediction.account.address,
              userPredictionCloseReceiver: player.publicKey
            }).signers([player]).rpc();

            // let closeUserPredictionResponse = await program.provider.connection.getTransaction(closeUserPredictionSignature, { commitment: 'confirmed'});

            // console.log(closeUserPredictionResponse.meta.logMessages);

            closedSettledPredictions++;
          } catch(error) {
            console.error(error);
          }
        }));

        // console.log("closed " + closedSettledPredictions + " out of " + settledPredictions.length + " settled predictions");
        // console.log("player has " + unsettledPredictions.length + " unsettledPredictions");


        const playerATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, player, mint.publicKey, player.publicKey);
        await mintTo(program.provider.connection, player, mint.publicKey, playerATA.address, owner.publicKey, 100 * (10 ** mintDecimals), [owner]);


        let transferFundsToPlayerATA = await program.methods.transferUserTokenAccountInstruction(new anchor.BN(100 * (10 ** mintDecimals))).accounts({
          signer: player.publicKey,
          user: playerPubkey,
          toTokenAccount: playerTokenAccountPubkey,
          fromTokenAccount: playerATA.address,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        }).signers([player]).rpc();

        playerTransferFunds++;

        // console.log('player transfer funds transaction signature', transferFundsToPlayer1ATA);
        // const userATA = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log('player ata amount', userATA.amount)

        let playerPrediction = Math.random() > 0.5 ? UpOrDown.Up : UpOrDown.Down

        // console.log(playerPrediction);

        let initPlayerPredictionSignature = await program.methods.initUserPredictionInstruction(playerPrediction, new anchor.BN(((Math.random() + 1) * 50) * (10 ** mintDecimals))).accounts({

          signer: player.publicKey,
          user: playerPubkey,
          game: gamePubkey,
          vault: vaultPubkey,
          currentRound: currentRoundPubkey,
          userPrediction: playerPredictionCurrentRoundPubkey,
          toTokenAccount: getDepositAccountBasedOnPredictionDirection(playerPrediction),
          fromTokenAccount: playerTokenAccountPubkey,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
    
        }).signers([player]).rpc();

        playerPredictionInit++;
        
        // console.log("initialize player prediction transaction signature", initPlayerPredictionSignature);
        // let user_token_account = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log("player 1 ata amount", user_token_account.amount);
        return;
      } catch (error) {
        console.error(error);
      }
    }))

    console.log('player settled predictions closed', closedSettledPredictions, 'player funds transfered', playerTransferFunds, 'player predictions initialized', playerPredictionInit);

  })

  it("update_game_and_settle_predictions_round_2!", async () => {
    console.log('waiting 5 minutes before calling update...');


    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    
    const roundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [gameFeeVaultPubkey, _gameFeeVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );

    const vault = await program.account.vault.fetch(vaultPubkey);
    console.log(vault.upAmount.toNumber(), vault.downAmount.toNumber());
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      ); 
    
    await Promise.allSettled([new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const updateSignature = await program.methods.updateGameInstruction().accounts({
            signer: owner.publicKey,
            game: gamePubkey,
            currentRound: roundPubkey,
            vault: vaultPubkey,
            gameFeeVault: gameFeeVaultPubkey,
            gameFeeVaultAuthority: owner.publicKey,
            upTokenAccount: upVaultPubkey,
            upTokenAccountAuthority: owner.publicKey,
            downTokenAccount: downVaultPubkey,
            downTokenAccountAuthority: owner.publicKey,
            priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
            // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
            priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
            // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
            // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
            // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
          }).signers([owner]).rpc();
      
          console.log("update transaction signature", updateSignature);
      
          let game = await program.account.game.fetch(gamePubkey);
          let gameFeeVaultATA = await getAccount(program.provider.connection, game.feeVault)
          console.log("game fee vault amount", gameFeeVaultATA.amount);
          let round = await program.account.round.fetch(game.currentRound);

          if (round.finished) {
            
            let predictionChunks = chunk((await Promise.all(players.map(async player => {
              const [playerPredictionPubkey, _playerPredictionPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [
                    program.programId.toBuffer(), 
                    Buffer.from(program.idl.version), 
                    player.publicKey.toBuffer(), 
                    gamePubkey.toBuffer(), 
                    roundPubkey.toBuffer(), 
                    roundNumberBuffer.slice(0, 1), 
                    roundNumberBuffer.slice(1, 2), 
                    roundNumberBuffer.slice(2, 3), 
                    roundNumberBuffer.slice(3, 4),
                    Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
                  ],
                  program.programId
                )
  
              const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
                  program.programId
                )
              return [
                {
                  pubkey: playerPredictionPubkey,
                  isSigner: false,
                  isWritable: true
                },
                {
                  pubkey: playerTokenAccountPubkey,
                  isSigner: false,
                  isWritable: true
                }
              ]
            }))).flat(Infinity) as anchor.web3.AccountMeta[], 20);

            let settledTxCount = 0;
            await Promise.allSettled(predictionChunks.map(async (chunk : anchor.web3.AccountMeta[]) => {
              try {
                // let tx = 
                await program.methods.settlePredictionsInstruction().accounts({
                  signer: owner.publicKey,
                  game: gamePubkey,
                  currentRound: roundPubkey,
                  vault: vaultPubkey,
                  upTokenAccount: upVaultPubkey,
                  upTokenAccountAuthority: owner.publicKey,
                  downTokenAccount: downVaultPubkey,
                  downTokenAccountAuthority: owner.publicKey,
                  // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
                  // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
                  // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
                  systemProgram: anchor.web3.SystemProgram.programId,
                  tokenProgram: TOKEN_PROGRAM_ID
                }).remainingAccounts(chunk).signers([owner]).rpc();
                settledTxCount++;
                // setTimeout(async () => {
                //   let txResponse = await program.provider.connection.getTransaction(tx, { commitment: 'confirmed'})
                //   console.log(txResponse.meta.logMessages);
                // }, 2000)
                return;
              } catch (error) {
                console.error(error);
              }
            }))
            console.log("settled predictions tx count", settledTxCount)
          }

          let vault = await program.account.vault.fetch(game.vault);
          round = await program.account.round.fetch(roundPubkey);
          console.log("round number", round.roundNumber);
          console.log("round current time", round.roundCurrentTime.toNumber());
          console.log("round current price", round.roundCurrentPrice.toNumber());
          console.log("round time difference", round.roundTimeDifference.toNumber());
          console.log("round price difference", round.roundPriceDifference.toNumber());
          console.log("round total up amount", round.totalUpAmount.toNumber());
          console.log("round total down amount", round.totalDownAmount.toNumber());
          console.log("round winning direction", round.roundWinningDirection);
          console.log("round total settled", round.totalAmountSettled.toNumber());
          console.log("round total predictions", round.totalPredictions);
          console.log("round total predictions settled", round.totalPredictionsSettled);
          console.log("vault up amount", vault.upAmount.toNumber());
          console.log("vault down amount", vault.downAmount.toNumber());        

        } catch(error) {
          console.error(error);
        }
        resolve();
      }, 5000);
      // }, 5 * 60 * 1001);
    })]);
  })


  // 
  it("init_next_round_and_close_previous!", async () => {
    try {
    // await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, mintDecimals, mint);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );

    let game = await program.account.game.fetch(gamePubkey);
    // const currentRound = await program.account.round.fetch(game.currentRound);
    

    let previousRoundNumber;
    const u32MAX = new anchor.BN("4294967295")

    if (game.currentRound.toBase58() !== game.previousRound.toBase58()) {
      previousRoundNumber = BN.max(new anchor.BN(1), BN.min(u32MAX, new anchor.BN(game.roundNumber-1)))
    } else {
      previousRoundNumber = new anchor.BN( Math.max(1, game.roundNumber-1) )
    }
    

    const previousRoundNumberBuffer = previousRoundNumber.toArrayLike(Buffer, 'be', 4);
    const currentRoundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);

    let nextRoundNumberBuffer;
    // console.log(game.roundNumber);
    let nextRoundNumber = new anchor.BN(game.roundNumber+1);
    // console.log(nextRoundNumber.toNumber())
    if (u32MAX.lt(nextRoundNumber)) {
      nextRoundNumber = new anchor.BN(1);
    }

    // console.log(nextRoundNumber.toNumber())
    nextRoundNumberBuffer = nextRoundNumber.toArrayLike(Buffer, 'be', 4);

    const [previousRoundPubkey, _previousRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          previousRoundNumberBuffer.slice(0, 1),
          previousRoundNumberBuffer.slice(1, 2),
          previousRoundNumberBuffer.slice(2, 3),
          previousRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );


    const [currentRoundPubkey, _currentRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          currentRoundNumberBuffer.slice(0, 1),
          currentRoundNumberBuffer.slice(1, 2),
          currentRoundNumberBuffer.slice(2, 3),
          currentRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );
    const [nextRoundPubkey, _nextRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          nextRoundNumberBuffer.slice(0, 1),
          nextRoundNumberBuffer.slice(1, 2),
          nextRoundNumberBuffer.slice(2, 3),
          nextRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );

    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );
    
      const initNextRoundSignature = await program.methods.initNextRoundAndClosePreviousInstruction().accounts({
        owner: owner.publicKey,
        receiver: owner.publicKey,
        game: gamePubkey,
        vault: vaultPubkey,
        currentRound: currentRoundPubkey,
        previousRound: previousRoundPubkey,
        nextRound: nextRoundPubkey,
        tokenMint: mint.publicKey,
        upTokenAccount: upVaultPubkey,
        downTokenAccount: downVaultPubkey,
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
        // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
        priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
        // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
        // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
        // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
        systemProgram: anchor.web3.SystemProgram.programId
      }).signers([owner]).rpc();
      console.log("init next round transaction signature", initNextRoundSignature);
  
      game = await program.account.game.fetch(gamePubkey);
      let round = await program.account.round.fetch(game.currentRound);
  
      console.log("round start time", round.roundCurrentTime.toNumber());
      console.log("round number", round.roundNumber);
    } catch(error) {
      console.error(error);
    }
  })

  it("init_user_predictions_for_third_round_and_close_settled_predictions!", async () => {
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    const currentRoundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    const [currentRoundPubkey, _currentRoundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          currentRoundNumberBuffer.slice(0, 1),
          currentRoundNumberBuffer.slice(1, 2),
          currentRoundNumberBuffer.slice(2, 3),
          currentRoundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    let playerTransferFunds = 0, playerPredictionInit = 0;

    enum UpOrDown {
      Up = 1,
      Down = 2
    }

    function getDepositAccountBasedOnPredictionDirection(direction: UpOrDown) : PublicKey {
      if (direction === UpOrDown.Up)
        return upVaultPubkey;
      else if (direction === UpOrDown.Down)
        return downVaultPubkey;
      else
        throw Error("invalid direction");
    }

    let predictions = (await program.account.userPrediction.all())
    let closedSettledPredictions = 0;
    await Promise.allSettled(players.map(async player => {
      try {

        const [playerPredictionCurrentRoundPubkey, _playerPredictionCurrentRoundPubkeyBump] =
        await PublicKey.findProgramAddress(
          [
            program.programId.toBuffer(), 
            Buffer.from(program.idl.version), 
            player.publicKey.toBuffer(), 
            gamePubkey.toBuffer(), 
            currentRoundPubkey.toBuffer(), 
            currentRoundNumberBuffer.slice(0, 1), 
            currentRoundNumberBuffer.slice(1, 2), 
            currentRoundNumberBuffer.slice(2, 3), 
            currentRoundNumberBuffer.slice(3, 4),
            Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
          ],
          program.programId
        )


        const [playerPubkey, _playerPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user'))],
            program.programId
          )
        const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
          await PublicKey.findProgramAddress(
            [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
            program.programId
          )

        let settledPredictions = [], unsettledPredictions = [];
        predictions.forEach(prediction => {
          if (prediction.account.owner.toBase58() === player.publicKey.toBase58()) {
            if (prediction.account.settled) {
              settledPredictions.push(prediction);
            } else {
              unsettledPredictions.push(prediction);
            }
          }
        })

        
        await Promise.allSettled(settledPredictions.map(async settledPrediction => {
          try {
            let closeUserPredictionSignature = await program.methods.closeUserPredictionInstruction().accounts({
              signer: player.publicKey,
              game: gamePubkey,
              round: settledPrediction.account.round,
              user: playerPubkey,
              userPrediction: settledPrediction.account.address,
              userPredictionCloseReceiver: player.publicKey
            }).signers([player]).rpc();

            // let closeUserPredictionResponse = await program.provider.connection.getTransaction(closeUserPredictionSignature, { commitment: 'confirmed'});

            // console.log(closeUserPredictionResponse.meta.logMessages);

            closedSettledPredictions++;
          } catch(error) {
            console.error(error);
          }
        }));

        // console.log("closed " + closedSettledPredictions + " out of " + settledPredictions.length + " settled predictions");
        // console.log("player has " + unsettledPredictions.length + " unsettledPredictions");


        const playerATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, player, mint.publicKey, player.publicKey);
        await mintTo(program.provider.connection, player, mint.publicKey, playerATA.address, owner.publicKey, 100 * (10 ** mintDecimals), [owner]);


        let transferFundsToPlayerATA = await program.methods.transferUserTokenAccountInstruction(new anchor.BN(100 * (10 ** mintDecimals))).accounts({
          signer: player.publicKey,
          user: playerPubkey,
          toTokenAccount: playerTokenAccountPubkey,
          fromTokenAccount: playerATA.address,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        }).signers([player]).rpc();

        playerTransferFunds++;

        // console.log('player transfer funds transaction signature', transferFundsToPlayer1ATA);
        // const userATA = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log('player ata amount', userATA.amount)

        let playerPrediction = Math.random() > 0.5 ? UpOrDown.Up : UpOrDown.Down

        // console.log(playerPrediction);

        let initPlayerPredictionSignature = await program.methods.initUserPredictionInstruction(playerPrediction, new anchor.BN(((Math.random() + 1) * 50) * (10 ** mintDecimals))).accounts({

          signer: player.publicKey,
          user: playerPubkey,
          game: gamePubkey,
          vault: vaultPubkey,
          currentRound: currentRoundPubkey,
          userPrediction: playerPredictionCurrentRoundPubkey,
          toTokenAccount: getDepositAccountBasedOnPredictionDirection(playerPrediction),
          fromTokenAccount: playerTokenAccountPubkey,
          tokenMint: mint.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
    
        }).signers([player]).rpc();

        playerPredictionInit++;
        
        // console.log("initialize player prediction transaction signature", initPlayerPredictionSignature);
        // let user_token_account = await getAccount(program.provider.connection, playerTokenAccountPubkey);
        // console.log("player 1 ata amount", user_token_account.amount);
        return;
      } catch (error) {
        console.error(error);
      }
    }))

    console.log('player settled predictions closed', closedSettledPredictions, 'player funds transfered', playerTransferFunds, 'player predictions initialized', playerPredictionInit);

  })

  it("update_game_and_settle_predictions_round_3!", async () => {
    console.log('waiting 5 minutes before calling update...');


    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    
    const roundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [gameFeeVaultPubkey, _gameFeeVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );

    const vault = await program.account.vault.fetch(vaultPubkey);
    console.log(vault.upAmount.toNumber(), vault.downAmount.toNumber());
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      ); 
    
    await Promise.allSettled([new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const updateSignature = await program.methods.updateGameInstruction().accounts({
            signer: owner.publicKey,
            game: gamePubkey,
            currentRound: roundPubkey,
            vault: vaultPubkey,
            gameFeeVault: gameFeeVaultPubkey,
            gameFeeVaultAuthority: owner.publicKey,
            upTokenAccount: upVaultPubkey,
            upTokenAccountAuthority: owner.publicKey,
            downTokenAccount: downVaultPubkey,
            downTokenAccountAuthority: owner.publicKey,
            priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
            // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
            priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
            // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
            // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
            // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
          }).signers([owner]).rpc();
      
          console.log("update transaction signature", updateSignature);
      
          let game = await program.account.game.fetch(gamePubkey);
          let gameFeeVaultATA = await getAccount(program.provider.connection, game.feeVault)
          console.log("game fee vault amount", gameFeeVaultATA.amount);
          let round = await program.account.round.fetch(game.currentRound);

          if (round.finished) {
            
            let predictionChunks = chunk((await Promise.all(players.map(async player => {
              const [playerPredictionPubkey, _playerPredictionPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [
                    program.programId.toBuffer(), 
                    Buffer.from(program.idl.version), 
                    player.publicKey.toBuffer(), 
                    gamePubkey.toBuffer(), 
                    roundPubkey.toBuffer(), 
                    roundNumberBuffer.slice(0, 1), 
                    roundNumberBuffer.slice(1, 2), 
                    roundNumberBuffer.slice(2, 3), 
                    roundNumberBuffer.slice(3, 4),
                    Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
                  ],
                  program.programId
                )
  
              const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
                await PublicKey.findProgramAddress(
                  [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
                  program.programId
                )
              return [
                {
                  pubkey: playerPredictionPubkey,
                  isSigner: false,
                  isWritable: true
                },
                {
                  pubkey: playerTokenAccountPubkey,
                  isSigner: false,
                  isWritable: true
                }
              ]
            }))).flat(Infinity) as anchor.web3.AccountMeta[], 20);

            let settledTxCount = 0;
            await Promise.allSettled(predictionChunks.map(async (chunk : anchor.web3.AccountMeta[]) => {
              try {
                // let tx = 
                await program.methods.settlePredictionsInstruction().accounts({
                  signer: owner.publicKey,
                  game: gamePubkey,
                  currentRound: roundPubkey,
                  vault: vaultPubkey,
                  upTokenAccount: upVaultPubkey,
                  upTokenAccountAuthority: owner.publicKey,
                  downTokenAccount: downVaultPubkey,
                  downTokenAccountAuthority: owner.publicKey,
                  // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
                  // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
                  // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
                  systemProgram: anchor.web3.SystemProgram.programId,
                  tokenProgram: TOKEN_PROGRAM_ID
                }).remainingAccounts(chunk).signers([owner]).rpc();
                settledTxCount++;
                // setTimeout(async () => {
                //   let txResponse = await program.provider.connection.getTransaction(tx, { commitment: 'confirmed'})
                //   console.log(txResponse.meta.logMessages);
                // }, 2000)
                return;
              } catch (error) {
                console.error(error);
              }
            }))
            console.log("settled predictions tx count", settledTxCount)
          }

          let vault = await program.account.vault.fetch(game.vault);
          round = await program.account.round.fetch(roundPubkey);
          console.log("round number", round.roundNumber);
          console.log("round current time", round.roundCurrentTime.toNumber());
          console.log("round current price", round.roundCurrentPrice.toNumber());
          console.log("round time difference", round.roundTimeDifference.toNumber());
          console.log("round price difference", round.roundPriceDifference.toNumber());
          console.log("round total up amount", round.totalUpAmount.toNumber());
          console.log("round total down amount", round.totalDownAmount.toNumber());
          console.log("round winning direction", round.roundWinningDirection);
          console.log("round total settled", round.totalAmountSettled.toNumber());
          console.log("round total predictions", round.totalPredictions);
          console.log("round total predictions settled", round.totalPredictionsSettled);
          console.log("vault up amount", vault.upAmount.toNumber());
          console.log("vault down amount", vault.downAmount.toNumber());        

        } catch(error) {
          console.error(error);
        }
        resolve();
      }, 5000);
      // }, 5 * 60 * 1001);
    })]);
  })

  it("close_existing_game+user_predictions+user_token_account+user_account+round+vault_token_accounts+vault!", async () => {
    let ownerMintATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, owner, mint.publicKey, owner.publicKey);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    const [gameFeeVaultPubkey, _gameFeeVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
        program.programId
      );
    const game = await program.account.game.fetch(gamePubkey);
    
    const roundNumberBuffer = new anchor.BN(game.roundNumber).toArrayLike(Buffer, 'be', 4);
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [
          program.programId.toBuffer(), 
          Buffer.from(program.idl.version), 
          owner.publicKey.toBuffer(), 
          gamePubkey.toBuffer(),
          roundNumberBuffer.slice(0, 1),
          roundNumberBuffer.slice(1, 2),
          roundNumberBuffer.slice(2, 3),
          roundNumberBuffer.slice(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), owner.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    const predictions = await program.account.userPrediction.all();
    let closedSettledPredictions = 0, closedUserTokenAccounts = 0, closedUserAccounts = 0;
    await Promise.allSettled(players.map(async player => {

      const [playerPubkey, _playerPubkeyBump] =
        await PublicKey.findProgramAddress(
          [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user'))],
          program.programId
        )
      const [playerTokenAccountPubkey, _playerTokenAccountPubkeyBump] =
        await PublicKey.findProgramAddress(
          [program.programId.toBuffer(), Buffer.from(program.idl.version), player.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
          program.programId
        )


      const playerATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, player, mint.publicKey, player.publicKey);

      let settledPredictions = predictions.filter(prediction => {
        return prediction.account.settled && prediction.account.owner.toBase58() === player.publicKey.toBase58()
      })

      await Promise.allSettled(settledPredictions.map(async prediction => {
        try {
          await program.methods.closeUserPredictionInstruction().accounts({
            signer: player.publicKey,
            game: gamePubkey,
            round: prediction.account.round,
            user: playerPubkey,
            userPrediction: prediction.account.address,
            userPredictionCloseReceiver: player.publicKey
          }).signers([player]).rpc();
          closedSettledPredictions++;
        } catch(error) {
          console.error(error);
          process.exit();
        }
        
      }));
      try {

        let userTokenAccount = await getAccount(program.provider.connection, playerTokenAccountPubkey);

        if (userTokenAccount.amount > 0) {
          await transfer(program.provider.connection, player, playerTokenAccountPubkey, playerATA.address, player, userTokenAccount.amount, [player]);
        }

        await program.methods.closeUserTokenAccountInstruction().accounts({
          signer: player.publicKey,
          userTokenAccount: playerTokenAccountPubkey,
          receiver: player.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID
        }).signers([player]).rpc();
        closedUserTokenAccounts++;
      } catch (error) {
        console.error(error);
      }
      
      try {
        await program.methods.closeUserAccountInstruction().accounts({
          signer: player.publicKey,
          user: playerPubkey,
          receiver: player.publicKey
        }).signers([player]).rpc();
        closedUserAccounts++;
      } catch (error) {
        console.error(error);
      }
    }))
    
    console.log('closed predictions', closedSettledPredictions, 'closed user token accounts', closedUserTokenAccounts, 'close user accounts', closedUserAccounts);

    try {
      let round = await program.account.round.fetch(roundPubkey)
      if (round === undefined) {
        throw Error("Round doesn't exist");
      }
      const closeRoundSignature = await program.methods.closeRoundInstruction().accounts({
        signer: owner.publicKey,
        receiver: owner.publicKey,
        round: roundPubkey,
      }).signers([owner]).rpc();
  
      console.log("close round transaction signature", closeRoundSignature);
  
    } catch (error) {
      console.error(error);
    }

    try {
      let vault = await program.account.vault.fetch(vaultPubkey)
      if (vault === undefined) {
        throw Error("Vault doesn't exist");
      }
      if (vault.upAmount.gt(new anchor.BN(0))) {
        // withdraw from up_vault if there is anything left
        await transfer(program.provider.connection, owner, upVaultPubkey, game.feeVault, owner, (await getAccount(program.provider.connection, upVaultPubkey)).amount, [owner])
      }
      if (vault.downAmount.gt(new anchor.BN(0))) {
        // withdraw from down_vault if there is anything left
        await transfer(program.provider.connection, owner, downVaultPubkey, game.feeVault, owner, (await getAccount(program.provider.connection, downVaultPubkey)).amount, [owner])
      }
      const closeVaultSignature = await program.methods.closeVaultTokenAccountsInstruction().accounts({
        signer: owner.publicKey,
        receiver: owner.publicKey,
        upTokenAccount: upVaultPubkey,
        downTokenAccount: downVaultPubkey,
        tokenProgram: TOKEN_PROGRAM_ID
      }).signers([owner]).rpc();
  
      console.log("close vault token accounts transaction signature", closeVaultSignature);
  
    } catch (error) {
      console.error(error);
    }

    try {
      let vault = await program.account.vault.fetch(vaultPubkey)
      if (vault === undefined) {
        throw Error("Vault doesn't exist");
      }
      const closeVaultSignature = await program.methods.closeVaultInstruction().accounts({
        signer: owner.publicKey,
        receiver: owner.publicKey,
        vault: vaultPubkey,
      }).signers([owner]).rpc();
  
      console.log("close vault transaction signature", closeVaultSignature);        
  
    } catch (error) {
      console.error(error);
    }

    try {
      let game = await program.account.game.fetch(gamePubkey);
      let gameFeeVault = await getAccount(program.provider.connection, gameFeeVaultPubkey);
      if (game === undefined) {
        throw Error("Game doesn't exist");
      }
      if (gameFeeVault === undefined) {
        throw Error("gameFeeVault doesn't exist");
      }
      if (gameFeeVault.amount > 0) {
        // withdraw from game fee vault to owner
        await transfer(program.provider.connection, owner, gameFeeVaultPubkey, ownerMintATA.address, owner, gameFeeVault.amount, [owner])
      }
      const closeGameFeeVaultSignature = await program.methods.closeGameFeeVaultInstruction().accounts({
        signer: owner.publicKey,
        gameFeeVault: gameFeeVaultPubkey,
        receiver: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      }).signers([owner]).rpc();

      console.log("close game fee vault transaction signature", closeGameFeeVaultSignature);

      ownerMintATA = await getAccount(program.provider.connection, ownerMintATA.address)
      console.log("owner mint ata amount", ownerMintATA.amount);
      
    } catch(error) {
      console.error(error);
    }

    try {
      let game = await program.account.game.fetch(gamePubkey);
      if (game === undefined) {
        throw Error("Game doesn't exist");
      }
      const closeGameSignature = await program.methods.closeGameInstruction().accounts({
        signer: owner.publicKey,
        receiver: owner.publicKey,
        game: gamePubkey
      }).signers([owner]).rpc();

      console.log("close game transaction signature", closeGameSignature);
      
    } catch(error) {
      console.error(error);
    }

  })

  
});
