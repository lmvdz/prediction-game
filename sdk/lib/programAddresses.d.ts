/// <reference types="node" />
import { PublicKey } from "@solana/web3.js";
import * as anchor from '@project-serum/anchor';
import Game from "./accounts/game";
import Round from "./accounts/round";
import User from "./accounts/user";
import { Program } from "@project-serum/anchor";
import Vault from "./accounts/vault";
export declare class ProgramAddresses<T extends anchor.Idl> {
    program: Program<T>;
    owner: PublicKey;
    constructor(program: Program<T>, owner: PublicKey);
    getGamePubkey(vault: Vault, priceProgram: PublicKey, priceFeed: PublicKey): Promise<[PublicKey, number]>;
    getGameRoundHistoryPubkey(game: PublicKey): Promise<[PublicKey, number]>;
    getGameUserPredictionHistoryPubkey(game: PublicKey): Promise<[PublicKey, number]>;
    getFeeVaultATAPubkey(vaultPubkey: PublicKey): Promise<[PublicKey, number]>;
    getFeeVaultATAAuthorityPubkey(feeVaultAta: PublicKey): Promise<[PublicKey, number]>;
    getVaultATAPubkey(vaultPubkey: PublicKey): Promise<[PublicKey, number]>;
    getVaultATAAuthorityPubkey(vaultAta: PublicKey): Promise<[PublicKey, number]>;
    getVaultPubkey(tokenMint: PublicKey): Promise<[PublicKey, number]>;
    roundToBuffer(roundNumber: anchor.BN): Buffer;
    getRoundPubkey(gamePubkey: PublicKey, roundNumber: anchor.BN): Promise<[PublicKey, number]>;
    getUserPredictionPubkey(game: Game, round: Round, user: User | PublicKey): Promise<[PublicKey, number]>;
    getUserPubkey(userOwner: PublicKey): Promise<[PublicKey, number]>;
    getUserClaimablePubkey(userAccount: PublicKey): Promise<[PublicKey, number]>;
    getCrankPubkey(crankOwner: PublicKey, gamePubkey: PublicKey, userPubkey: PublicKey): Promise<[PublicKey, number]>;
}
