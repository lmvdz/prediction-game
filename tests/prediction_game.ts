import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { createAssociatedTokenAccount, createInitializeMintInstruction, createMint, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, mintTo, MINT_SIZE, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, SYSVAR_CLOCK_PUBKEY, Connection } from "@solana/web3.js";
import { PredictionGame } from "../target/types/prediction_game";

describe("prediction_game", () => {

  const connection = new Connection("https://api.devnet.solana.com");
  const payer = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")))
  const wallet = new anchor.Wallet(payer)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'finalized'})
  anchor.setProvider(provider);

  // const payer = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")))
  // anchor.setProvider(anchor.AnchorProvider.env())
  
  const program = anchor.workspace.PredictionGame as Program<PredictionGame>;

  console.log(program.programId.toBase58())


  const mint = anchor.web3.Keypair.generate();

  it("init_game!", async () => {    
    await createMint(program.provider.connection, payer, payer.publicKey, payer.publicKey, 9, mint);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('round'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );

    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );
    
    try {
      const initSignature = await program.methods.initGameInstruction(_upVaultBump, _downVaultBump).accounts({
        owner: payer.publicKey,
        game: gamePubkey,
        round: roundPubkey,
        vault: vaultPubkey,
        upTokenAccount: upVaultPubkey,
        downTokenAccount: downVaultPubkey,
        tokenMint: mint.publicKey,
        // tokenMint: new PublicKey(""),
        priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
        // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
        priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
        // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
        // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
        // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      }).signers([payer]).rpc();
  
      
  
      console.log("Your init transaction signature", initSignature);
  
      let game = await program.account.game.fetch(gamePubkey);
      let round = await program.account.round.fetch(game.currentRound);
  
      console.log("round start time", round.roundCurrentTime.toNumber());
      console.log("round start price", round.roundCurrentPrice.toNumber());
    } catch(error) {
      console.error(error);
    }
    
    
  });

  it("init_user_prediction", async () => {
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('round'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );
    
    const [userPubkey, _userPubkeyBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user'))],
        program.programId
      )
    const [userTokenAccountPubkey, _userTokenAccountPubkeyBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('token_account'))],
        program.programId
      )

    const round = await program.account.round.fetch(roundPubkey);
    
    const [userPredictionPubkey, _userPredictionPubkeyBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), roundPubkey.toBuffer(), round.roundNumber.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))],
        program.programId
      )
    
    const payerMintATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, payer, mint.publicKey, payer.publicKey);
    await mintTo(program.provider.connection, payer, mint.publicKey, payerMintATA.address, payer.publicKey, 10);
    console.log('mint amount in ATA', (await getOrCreateAssociatedTokenAccount(program.provider.connection, payer, mint.publicKey, payer.publicKey)).amount)
    
    const initUserSignature = await program.methods.initUserInstruction().accounts({

      owner: payer.publicKey,
      user: userPubkey,
      tokenAccount: userTokenAccountPubkey,
      tokenMint: mint.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId

    }).signers([payer]).rpc();

    console.log("Your init user transaction signature", initUserSignature);

    const initUserPredictionSignature = await program.methods.initUserPredictionInstruction(1, new anchor.BN(1)).accounts({

      signer: payer.publicKey,
      user: userPubkey,
      vault: vaultPubkey,
      round: roundPubkey,
      userPrediction: userPredictionPubkey,
      toTokenAccount: upVaultPubkey,
      fromTokenAccount: userTokenAccountPubkey,
      tokenMint: mint.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId

    }).signers([payer]).rpc();
    
    console.log("Your close user prediction transaction signature", initUserPredictionSignature);

  })

  it("update_game", async () => {
    console.log('waiting 10 seconds before calling update...');


    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('round'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    await Promise.allSettled([new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const updateSignature = await program.methods.updateGameInstruction().accounts({
            game: gamePubkey,
            round: roundPubkey,
            vault: vaultPubkey,
            upTokenAccount: upVaultPubkey,
            upTokenAccountAuthority: payer.publicKey,
            downTokenAccount: downVaultPubkey,
            downTokenAccountAuthority: payer.publicKey,
            priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
            // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
            priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
            // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
            // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
            // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
          }).signers([payer]).rpc();
      
          console.log("Your update transaction signature", updateSignature);
      
          let game = await program.account.game.fetch(gamePubkey);
          let round = await program.account.round.fetch(game.currentRound);
      
          console.log("round current time", round.roundCurrentTime.toNumber());
          console.log("round current price", round.roundCurrentPrice.toNumber());
          console.log("round time difference", round.roundTimeDifference.toNumber());
          console.log("round price difference", round.roundPriceDifference.toNumber());
        } catch(error) {
          console.error(error);
        }
        resolve();
      }, 10 * 1000);
    })]);
  })

  it("close_existing_game!", async () => {
    const payerMintATA = await getOrCreateAssociatedTokenAccount(program.provider.connection, payer, mint.publicKey, payer.publicKey);
    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    
    const [roundPubkey, _roundBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('round'))],
        program.programId
      );

    const [vaultPubkey, _vaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
        program.programId
      );
    
    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );


    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [program.programId.toBuffer(), Buffer.from(program.idl.version), payer.publicKey.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );
      
    try {
        let game = await program.account.game.fetch(gamePubkey);
        if (game === undefined) {
          throw Error("Game doesn't exist");
        }
        const closeGameSignature = await program.methods.closeGameInstruction().accounts({
          signer: payer.publicKey,
          receiver: payer.publicKey,
          game: gamePubkey
        }).signers([payer]).rpc();

        console.log("Your close game transaction signature", closeGameSignature);
        
      } catch(error) {
        console.error(error);
      }

      try {
        let round = await program.account.round.fetch(roundPubkey)
        if (round === undefined) {
          throw Error("Round doesn't exist");
        }
        const closeRoundSignature = await program.methods.closeRoundInstruction().accounts({
          signer: payer.publicKey,
          receiver: payer.publicKey,
          round: roundPubkey,
        }).signers([payer]).rpc();
    
        console.log("Your close round transaction signature", closeRoundSignature);
    
      } catch (error) {
        console.error(error);
      }

      try {
        const closeVaultSignature = await program.methods.closeVaultTokenAccountsInstruction().accounts({
          signer: payer.publicKey,
          recieverTokenAccount: payerMintATA.address,
          upTokenAccount: upVaultPubkey,
          downTokenAccount: downVaultPubkey,
          tokenProgram: TOKEN_PROGRAM_ID
        }).signers([payer]).rpc();
    
        console.log("Your close vault token accounts transaction signature", closeVaultSignature);
    
      } catch (error) {
        console.error(error);
      }

      try {
        let vault = await program.account.vault.fetch(vaultPubkey)
        if (vault === undefined) {
          throw Error("Vault doesn't exist");
        }
        const closeVaultSignature = await program.methods.closeVaultInstruction().accounts({
          signer: payer.publicKey,
          receiver: payer.publicKey,
          vault: vaultPubkey,
        }).signers([payer]).rpc();
    
        console.log("Your close vault transaction signature", closeVaultSignature);        
    
      } catch (error) {
        console.error(error);
      }
  })
});
