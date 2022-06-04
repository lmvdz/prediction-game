import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { createAssociatedTokenAccount, createInitializeMintInstruction, createMint, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, SYSVAR_CLOCK_PUBKEY, Connection } from "@solana/web3.js";
import { Prediction } from "../target/types/prediction";

describe("prediction", () => {

  // const connection = new Connection("https://api.devnet.solana.com");
  const payer = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")))
  // const wallet = new anchor.Wallet(payer)
  // const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'finalized'})
  // anchor.setProvider(provider);


  anchor.setProvider(anchor.AnchorProvider.local())
  
  const program = anchor.workspace.Prediction as Program<Prediction>;


  const mint = anchor.web3.Keypair.generate();


  it("init_game!", async () => {

    await createMint(program.provider.connection, payer, payer.publicKey, payer.publicKey, 9, mint);

    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );

    const [upVaultPubkey, _upVaultBump] =
      await PublicKey.findProgramAddress(
        [payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
        program.programId
      );

    const [upVaultAuthority, _upVaultAuthorityNonce] =
      await PublicKey.findProgramAddress(
        [upVaultPubkey.toBuffer()],
        program.programId
      );

    const [downVaultPubkey, _downVaultBump] =
      await PublicKey.findProgramAddress(
        [payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
        program.programId
      );

    const [downVaultAuthority, _downVaultAuthorityNonce] =
      await PublicKey.findProgramAddress(
        [downVaultPubkey.toBuffer()],
        program.programId
      );

    const initSignature = await program.methods.initGame().accounts({
      owner: payer.publicKey,
      game: gamePubkey,
      upVault: upVaultPubkey,
      upVaultAuthority: upVaultAuthority,
      downVault: downVaultPubkey,
      downVaultAuthority: downVaultAuthority,
      tokenMint: mint.publicKey,
      priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
      // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
      priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
      // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
      // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
      // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
      clock: SYSVAR_CLOCK_PUBKEY,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    }).signers([payer]).rpc();

    

    console.log("Your init transaction signature", initSignature);

    let game = await program.account.game.fetch(gamePubkey);

    console.log("round start time", game.roundStartTime.toNumber());
    console.log("round start price", game.roundStartPrice.toNumber());
    
  });

  it("update_game", async () => {
    console.log('waiting 10 seconds before calling update...');


    const [gamePubkey, _gameBump] =
      await PublicKey.findProgramAddress(
        [payer.publicKey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
        program.programId
      );
    await Promise.allSettled([new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        const updateSignature = await program.methods.updateGame().accounts({
          game: gamePubkey,
          priceProgram: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"), // chainlink
          // priceFeed: new PublicKey("CcPVS9bqyXbD9cLnTbhhHazLsrua8QMFUHTutPtjyDzq"), // SOL - mainnet - chainlink
          priceFeed: new PublicKey("HgTtcbcmp5BeThax5AU8vg4VwK79qAvAKKFMs8txMLW6"), // SOL - devnet - chainlink
          // priceProgram: new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), // pyth program
          // priceFeed: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"), // SOL - mainnet - pyth
          // priceFeed: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL - devnet - pyth
          clock: SYSVAR_CLOCK_PUBKEY 
        }).signers([payer]).rpc();
    
        console.log("Your update transaction signature", updateSignature);
    
        let game = await program.account.game.fetch(gamePubkey);
    
        console.log("round current time", game.roundCurrentTime.toNumber());
        console.log("round current price", game.roundCurrentPrice.toNumber());
        console.log("round time difference", game.roundTimeDifference.toNumber());
        console.log("round price difference", game.roundPriceDifference.toNumber());
        resolve();
      }, 10 * 1000);
    })]);
  })
});
