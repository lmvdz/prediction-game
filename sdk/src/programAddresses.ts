import { PublicKey } from "@solana/web3.js"
import { Workspace } from "./workspace"
import * as anchor from '@project-serum/anchor'
import Game from "./accounts/game"
import Round from "./accounts/round"
import User from "./accounts/user"
import { Program } from "@project-serum/anchor"
import Vault from "./accounts/vault"

export class ProgramAddresses<T extends anchor.Idl> {
  program: Program<T>
  owner: PublicKey

  constructor(program: Program<T>, owner: PublicKey) {
    this.program = program;
    this.owner = owner;
  }

 async getGamePubkey(vault: Vault, priceProgram: PublicKey, priceFeed: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        this.owner.toBuffer(), 
        vault.account.address.toBuffer(), 
        priceProgram.toBuffer(), 
        priceFeed.toBuffer(), 
        Buffer.from(anchor.utils.bytes.utf8.encode('game')), 
      ],
      this.program.programId
    )
  }

 async getFeeVaultATAPubkey(vaultPubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('fee_vault_ata'))],
      this.program.programId
    )
  }
  
  async getVaultATAPubkey(vaultPubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault_ata'))],
      this.program.programId
    )
  }
  async getVaultATAAuthorityPubkey(vaultAta: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [vaultAta.toBuffer()],
      this.program.programId
    )
  }

  async getFeeVaultATAAuthorityPubkey(feeVaultAta: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [feeVaultAta.toBuffer()],
      this.program.programId
    )
  }

  


 async getVaultPubkey(tokenMint: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [this.owner.toBuffer(), tokenMint.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
      this.program.programId
    )
  }

 async getRoundPubkey(gamePubkey: PublicKey, roundNumber: anchor.BN) : Promise<[PublicKey, number]> {
    const roundNumberBuffer = new anchor.BN(roundNumber).toArrayLike(Buffer, 'be', 4);
    return  await PublicKey.findProgramAddress(
        [
          gamePubkey.toBuffer(),
          roundNumberBuffer.subarray(0, 1),
          roundNumberBuffer.subarray(1, 2),
          roundNumberBuffer.subarray(2, 3),
          roundNumberBuffer.subarray(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('round'))
        ],
        this.program.programId
      );
  }

 async getUserPredictionPubkey( game: Game, round: Round, user: User | PublicKey) : Promise<[PublicKey, number]> {
    const roundNumberBuffer = new anchor.BN(round.account.roundNumber).toArrayLike(Buffer, 'be', 4);
    return  await PublicKey.findProgramAddress(
        [
          (user as User).account !== undefined ? (user as User).account.owner.toBuffer() : (user as PublicKey).toBuffer(), 
          game.account.address.toBuffer(),
          round.account.address.toBuffer(),
          roundNumberBuffer.subarray(0, 1),
          roundNumberBuffer.subarray(1, 2),
          roundNumberBuffer.subarray(2, 3),
          roundNumberBuffer.subarray(3, 4),
          Buffer.from(anchor.utils.bytes.utf8.encode('user_prediction'))
        ],
        this.program.programId
      );
  }

 async getUserPubkey(userOwner: PublicKey) : Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        userOwner.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode('user'))
      ],
      this.program.programId
    )
  }

  async getCrankPubkey(crankOwner: PublicKey, gamePubkey: PublicKey, userPubkey: PublicKey) : Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        crankOwner.toBuffer(),
        userPubkey.toBuffer(),
        gamePubkey.toBuffer(),
        Buffer.from(anchor.utils.bytes.utf8.encode('crank'))
      ],
      this.program.programId
    )
  }
}