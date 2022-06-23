"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmTxRetry = void 0;
function tryConfirm(workspace, txSignature, maxRetry = 5, retryAttempt = 0) {
    return new Promise((resolve, reject) => {
        workspace.program.provider.connection.confirmTransaction(txSignature, 'confirmed').then((response) => {
            if (response.value.err === null) {
                resolve();
            }
            else {
                reject(response.value.err);
            }
        }).catch(error => {
            if (retryAttempt === maxRetry) {
                reject(error);
            }
            else {
                resolve(tryConfirm(workspace, txSignature, maxRetry, retryAttempt + 1));
            }
        });
    });
}
function confirmTxRetry(workspace, txSignature, maxRetry = 5) {
    return new Promise((resolve, reject) => {
        tryConfirm(workspace, txSignature, maxRetry).then(() => {
            resolve();
        }).catch(error => {
            reject(error);
        });
    });
}
exports.confirmTxRetry = confirmTxRetry;
//# sourceMappingURL=confirmTxRetry.js.map