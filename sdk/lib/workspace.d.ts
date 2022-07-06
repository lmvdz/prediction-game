import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PredictionGame } from "./types/prediction_game";
import { Cluster, ConfirmOptions, Connection, PublicKey, Signer, Transaction } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ProgramAddresses } from "./programAddresses";
export declare class Workspace {
    program: Program<PredictionGame>;
    owner: PublicKey;
    programAddresses: ProgramAddresses<PredictionGame>;
    wallet: NodeWallet | anchor.Wallet;
    cluster: Cluster;
    constructor(program: Program<PredictionGame>, wallet: NodeWallet | anchor.Wallet, cluster: Cluster);
    static load(connection: Connection, wallet: NodeWallet | anchor.Wallet, cluster: Cluster, opts: ConfirmOptions): Workspace;
    sendTransaction(tx: Transaction, signers?: Signer[]): Promise<string>;
}
