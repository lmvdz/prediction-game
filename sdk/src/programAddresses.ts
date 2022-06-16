import { PublicKey } from "@solana/web3.js"
import Workspace from "./workspace"
import * as anchor from '@project-serum/anchor'

export async function getGamePubkey(workspace: Workspace): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game'))],
      workspace.program.programId
    )
  }

  export async function getGameFeeVaultPubkey(workspace: Workspace, gamePubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('game_fee_vault'))],
      workspace.program.programId
    )
  }

  export async function getVaultPubkey(workspace: Workspace, gamePubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('vault'))],
      workspace.program.programId
    )
  }

  export async function getUpVaultPubkey(workspace: Workspace, gamePubkey: PublicKey, vaultPubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(), gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('up'))],
      workspace.program.programId
    )
  }

  export async function getDownVaultPubkey(workspace: Workspace, gamePubkey: PublicKey, vaultPubkey: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [workspace.program.programId.toBuffer(), Buffer.from(workspace.program.idl.version), workspace.owner.toBuffer(),  gamePubkey.toBuffer(), vaultPubkey.toBuffer(), Buffer.from(anchor.utils.bytes.utf8.encode('down'))],
      workspace.program.programId
    )
  }