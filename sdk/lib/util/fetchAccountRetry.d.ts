import { PublicKey } from "@solana/web3.js";
import { Workspace } from "src/workspace";
export declare function fetchAccountRetry<T>(workspace: Workspace, account: string, pubkey: PublicKey, maxRetry?: number): Promise<T>;
