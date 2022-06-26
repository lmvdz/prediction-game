import { PublicKey } from "@solana/web3.js";
import { Workspace } from "../workspace";

function tryFetch<T>(workspace: Workspace, account: string, pubkey: PublicKey, maxRetry=5, retryAttempt=0) : Promise<T> {
    return new Promise((resolve, reject) => {
        workspace.program.account[account].fetch(pubkey).then((account: T) => {
            resolve(account);
        }).catch((error: any) => {
            if (retryAttempt === maxRetry) {
                reject(error);
            } else {
                resolve(tryFetch<T>(workspace, account, pubkey, maxRetry, retryAttempt+1))
            }
        })
    })
}

export function fetchAccountRetry<T>(workspace: Workspace, account: string, pubkey: PublicKey, maxRetry = 5) : Promise<T> {
    return new Promise((resolve, reject) => {
        tryFetch<T>(workspace, account, pubkey, maxRetry).then((account: T) => {
            resolve(account);
        }).catch(error => {
            reject(error);
        })
    })
    
}