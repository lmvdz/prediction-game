"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAccountRetry = void 0;
function tryFetch(workspace, account, pubkey, maxRetry = 5, retryAttempt = 0) {
    return new Promise((resolve, reject) => {
        workspace.program.account[account].fetch(pubkey).then((account) => {
            resolve(account);
        }).catch((error) => {
            if (retryAttempt === maxRetry) {
                reject(error);
            }
            else {
                resolve(tryFetch(workspace, account, pubkey, maxRetry, retryAttempt + 1));
            }
        });
    });
}
function fetchAccountRetry(workspace, account, pubkey, maxRetry = 5) {
    return new Promise((resolve, reject) => {
        tryFetch(workspace, account, pubkey, maxRetry).then((account) => {
            resolve(account);
        }).catch(error => {
            reject(error);
        });
    });
}
exports.fetchAccountRetry = fetchAccountRetry;
//# sourceMappingURL=fetchAccountRetry.js.map