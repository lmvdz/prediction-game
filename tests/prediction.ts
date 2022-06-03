import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { createAssociatedTokenAccount, createInitializeMintInstruction, createMint, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { Prediction } from "../target/types/prediction";

describe("prediction", () => {

  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Prediction as Program<Prediction>;

  const payer = Keypair.fromSecretKey(Uint8Array.from(require("/home/lars/validator-keypair.json")))

  it("create_game_pda!", async () => {

    const mint = anchor.web3.Keypair.generate();

    const token_mint_signature = await createMint(program.provider.connection, payer, payer.publicKey, payer.publicKey, 9, mint);


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

    const signature = await program.methods.initGamePda().accounts({
      owner: payer.publicKey,
      game: gamePubkey,
      upVault: upVaultPubkey,
      upVaultAuthority: upVaultAuthority,
      downVault: downVaultPubkey,
      downVaultAuthority: downVaultAuthority,
      tokenMint: mint.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([payer]).rpc();


    console.log("Your transaction signature", signature);

  });
});
