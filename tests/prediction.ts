import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import * as spl from "@solana/spl-token";
import { createAssociatedTokenAccount } from "@solana/spl-token";
import { Prediction } from "../target/types/prediction";

describe("prediction", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.local());
  
  const program = anchor.workspace.Prediction as Program<Prediction>;


  it("Creates Prediction PDA!", async () => {


    const owner = anchor.web3.Keypair.generate();

    // Add your test here.
    const tx = await program.methods.initPredictionPda().accounts({
      owner: owner.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId
    }).signers([owner]).rpc();

    console.log("Your transaction signature", tx);

  });

  it("Creates Game PDA!", async () => {

    const owner = anchor.web3.Keypair.generate();

    const [upPDA, upBump] = await anchor.web3.PublicKey.findProgramAddress(
      [owner.publicKey.toBuffer(), Buffer.from("up")],
      program.programId
    );

    const [downPDA, downBump] = await anchor.web3.PublicKey.findProgramAddress(
      [owner.publicKey.toBuffer(), Buffer.from("down")],
      program.programId
    );

    const signature = await program.methods.initGamePda(upBump, downBump).accounts({
      owner: owner.publicKey,
      up: upPDA,
      down: downPDA,
      systemProgram: anchor.web3.SystemProgram.programId
    }).signers([owner]).rpc();


    console.log("Your transaction signature", signature);

  });
});
