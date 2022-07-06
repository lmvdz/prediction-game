import * as anchor from '@project-serum/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';

const LOCALNET_PROGRAM_ID = new PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const MAINNET_PROGRAM_ID = new PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const DEVNET_PROGRAM_ID = new PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");
const TESTNET_PROGRAM_ID = new PublicKey("7ZFRSUUEgeJUMMyf7DYsYKurHctSAZed8ECMazomo7x");

export const PROGRAM_ID = (cluster: Cluster | string) : PublicKey => {
    if (cluster === 'devnet') {
        return DEVNET_PROGRAM_ID
    } else if (cluster === 'mainnet-beta') {
        return MAINNET_PROGRAM_ID
    } else if (cluster === 'testnet') {
        return TESTNET_PROGRAM_ID
    } else if (cluster as string === 'localnet') {
        return LOCALNET_PROGRAM_ID
    }
    return null;
}

export const UNSIGNED_MIN = new anchor.BN(0);
export const USER_PREDICTION_MIN_AMOUNT = (mintDecimals: number) => (new anchor.BN(1)).mul((new anchor.BN(10)).pow(new anchor.BN(mintDecimals)))
export const U32MAX = new anchor.BN("4294967295")
export const U64MAX = new anchor.BN("18446744073709551615")