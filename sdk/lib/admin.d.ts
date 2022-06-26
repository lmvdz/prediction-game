import { Cluster, PublicKey } from "@solana/web3.js";
import { Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Oracle } from "./accounts/game";
import { Mint } from "@solana/spl-token";
export declare const gameSeeds: Array<GameSeed>;
export declare type GameSeed = {
    baseSymbol: string;
    priceProgram: PublicKey;
    priceFeed: PublicKey;
    roundLength: anchor.BN;
    oracle: Oracle;
};
export declare function init(owner: Keypair, connection: Connection, cluster: Cluster, mint: Mint): Promise<void>;
