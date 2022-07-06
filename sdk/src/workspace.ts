import * as anchor from "@project-serum/anchor"
import { AnchorProvider, Program } from "@project-serum/anchor";
import { PredictionGame, IDL } from "./types/prediction_game";
import { Cluster, ConfirmOptions, Connection, PublicKey, Signer, Transaction } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { ProgramAddresses } from "./programAddresses";
import { PROGRAM_ID } from "./constants";


export class Workspace {

    program: Program<PredictionGame>
    owner: PublicKey
    programAddresses: ProgramAddresses<PredictionGame>
    wallet: NodeWallet | anchor.Wallet
    cluster: Cluster

    public constructor(program: Program<PredictionGame>, wallet: NodeWallet | anchor.Wallet, cluster: Cluster) {
        this.program = program;
        this.owner = (this.program.provider as AnchorProvider).wallet.publicKey;
        this.programAddresses = new ProgramAddresses(this.program, this.owner);
        this.wallet = wallet;
        this.cluster = cluster;
    }

    public static load(connection: Connection, wallet: NodeWallet | anchor.Wallet, cluster: Cluster, opts: ConfirmOptions) : Workspace {
        return new Workspace(new Program<PredictionGame>(IDL, PROGRAM_ID(cluster), new anchor.AnchorProvider(connection, wallet, opts)), wallet, cluster)
    }

    public async sendTransaction(tx: Transaction, signers: Signer[] = []) : Promise<string> {
        if (this.wallet.payer) {
            return await this.program.provider.connection.sendTransaction(tx, [this.wallet.payer, ...signers])
        } else {
            tx.feePayer = this.wallet.publicKey;
            tx.recentBlockhash = (await this.program.provider.connection.getLatestBlockhash()).blockhash;
            tx = await this.wallet.signTransaction(tx);
            
            return await this.program.provider.connection.sendRawTransaction(tx.serialize())
        }
    }
}