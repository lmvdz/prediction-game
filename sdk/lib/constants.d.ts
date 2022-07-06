import * as anchor from '@project-serum/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
export declare const PROGRAM_ID: (cluster: Cluster | string) => PublicKey;
export declare const UNSIGNED_MIN: anchor.BN;
export declare const USER_PREDICTION_MIN_AMOUNT: (mintDecimals: number) => anchor.BN;
export declare const U32MAX: anchor.BN;
export declare const U64MAX: anchor.BN;
