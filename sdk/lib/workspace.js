"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const anchor_1 = require("@project-serum/anchor");
const prediction_game_1 = require("./types/prediction_game");
const programAddresses_1 = require("./programAddresses");
const constants_1 = require("./constants");
class Workspace {
    constructor(program, wallet, cluster) {
        this.program = program;
        this.owner = this.program.provider.wallet.publicKey;
        this.programAddresses = new programAddresses_1.ProgramAddresses(this.program, this.owner);
        this.wallet = wallet;
        this.cluster = cluster;
    }
    static load(connection, wallet, cluster, opts) {
        return new Workspace(new anchor_1.Program(prediction_game_1.IDL, (0, constants_1.PROGRAM_ID)(cluster), new anchor.AnchorProvider(connection, wallet, opts)), wallet, cluster);
    }
    async sendTransaction(tx, signers = []) {
        if (this.wallet.payer) {
            return await this.program.provider.connection.sendTransaction(tx, [this.wallet.payer, ...signers]);
        }
        else {
            tx.feePayer = this.wallet.publicKey;
            tx.recentBlockhash = (await this.program.provider.connection.getLatestBlockhash()).blockhash;
            tx = await this.wallet.signTransaction(tx);
            return await this.program.provider.connection.sendRawTransaction(tx.serialize());
        }
    }
}
exports.Workspace = Workspace;
//# sourceMappingURL=workspace.js.map