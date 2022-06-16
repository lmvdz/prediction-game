import * as anchor from "@project-serum/anchor"
import { AnchorProvider, Program, } from "@project-serum/anchor";
import { PredictionGame, IDL} from "./types";
import { default as jsonIDL } from './idl/prediction_game.json'
import { ConfirmOptions, Connection, PublicKey } from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";



export default class Workspace {

    program: Program<PredictionGame>
    owner: PublicKey

    constructor(program: Program<PredictionGame>) {
        this.program = program;
        this.owner = (this.program.provider as AnchorProvider).wallet.publicKey
    }

    public static load(connection: Connection, wallet: NodeWallet, opts: ConfirmOptions) : Workspace {
        return new Workspace(new Program<PredictionGame>(IDL, new anchor.web3.PublicKey(jsonIDL.metadata.address), new anchor.AnchorProvider(connection, wallet, opts)))
    }
}