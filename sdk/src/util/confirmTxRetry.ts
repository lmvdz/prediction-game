import { Workspace } from "../workspace";

function tryConfirm(workspace: Workspace, txSignature: string, maxRetry=5, retryAttempt=0) : Promise<void> {
    return new Promise((resolve, reject) => {
        
        workspace.program.provider.connection.confirmTransaction(txSignature, 'confirmed').then((response) => {
            if (response.value.err === null) {
                resolve()
            } else {
                reject(response.value.err)
            }
        }).catch(error => {
            if (retryAttempt === maxRetry) {
                reject(error)
            } else {
                resolve(tryConfirm(workspace, txSignature, maxRetry, retryAttempt+1))
            }
        })
    })
}

export function confirmTxRetry(workspace: Workspace, txSignature: string, maxRetry = 5) : Promise<void> {
    return new Promise((resolve, reject) => {
        tryConfirm(workspace, txSignature, maxRetry).then(() => {
            resolve();
        }).catch(error => {
            reject(error);
        })
    })
    
}