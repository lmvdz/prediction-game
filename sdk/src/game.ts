import * as anchor from "@project-serum/anchor"
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet'
import { PublicKey, sendAndConfirmTransaction, Signer, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js'
import { Mint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import Workspace from './workspace'
import * as ProgramAddresses from './programAddresses'

interface IGame {
    owner: PublicKey,
    address: PublicKey,
    tokenDecimal: number
    tokenMint: PublicKey
    roundNumber: number,
    currentRound: PublicKey,
    previousRound: PublicKey,
    vault: PublicKey,
    feeVault: PublicKey,
    totalVolume: anchor.BN,
    totalVolumeRollover: anchor.BN
}

export default class Game implements IGame {

  owner: PublicKey
  address: PublicKey
  tokenDecimal: number
  tokenMint: PublicKey
  roundNumber: number
  currentRound: PublicKey
  previousRound: PublicKey
  vault: PublicKey
  feeVault: PublicKey
  totalVolume: anchor.BN
  totalVolumeRollover: anchor.BN
  

  constructor(
    owner: PublicKey, address: PublicKey, tokenDecimal: number, 
    tokenMint: PublicKey, roundNumber: number, currentRound: PublicKey, previousRound: PublicKey, 
    vault: PublicKey, feeVault: PublicKey, totalVolume: anchor.BN, totalVolumeRollover: anchor.BN
  ) {

      this.owner = owner;
      this.address = address;
      this.tokenDecimal = tokenDecimal;
      this.tokenMint = tokenMint;
      this.roundNumber = roundNumber;
      this.currentRound = currentRound;
      this.previousRound = previousRound;
      this.vault = vault;
      this.feeVault = feeVault;
      this.totalVolume = totalVolume;
      this.totalVolumeRollover = totalVolumeRollover;

  }

  
  public static async initialize(workspace: Workspace, mint: Mint) : Promise<Game> {

    const [gamePubkey, _gamePubkeyBump] = await ProgramAddresses.getGamePubkey(workspace);
    const [gameFeeVaultPubkey, _gameFeeVaultPubkeyBump] = await ProgramAddresses.getGameFeeVaultPubkey(workspace, gamePubkey);
    const [vaultPubkey, _vaultPubkeyBump] = await ProgramAddresses.getVaultPubkey(workspace, gamePubkey);
    const [upVaultPubkey, upVaultPubkeyBump] = await ProgramAddresses.getUpVaultPubkey(workspace, gamePubkey, vaultPubkey);
    const [downVaultPubkey, downVaultPubkeyBump] = await ProgramAddresses.getDownVaultPubkey(workspace, gamePubkey, vaultPubkey);

    let initGameInstruction = await workspace.program.methods.initGameInstruction(upVaultPubkeyBump, downVaultPubkeyBump, mint.decimals).accounts({
      owner: workspace.owner,
      game: gamePubkey,
      gameFeeVault: gameFeeVaultPubkey,
      vault: vaultPubkey,
      upTokenAccount: upVaultPubkey,
      downTokenAccount: downVaultPubkey,
      tokenMint: mint.address,        
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    }).instruction();
  
    try {
      await sendAndConfirmTransaction(
        workspace.program.provider.connection, 
        new Transaction().add(initGameInstruction), 
        [((workspace.program.provider as anchor.AnchorProvider).wallet as NodeWallet).payer],
        { commitment: 'confirmed'}
      )
      
      let game = await workspace.program.account.game.fetch(gamePubkey);

      return new Game(game.owner, game.address, game.tokenDecimal, game.tokenMint, game.roundNumber, game.currentRound, game.previousRound, game.vault, game.feeVault, game.totalVolume, game.totalVolumeRollover)
    } catch (error) {
      throw error;
    }
  }

}