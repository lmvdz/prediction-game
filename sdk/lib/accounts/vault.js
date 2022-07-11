"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const index_1 = require("../util/index");
const spl_token_1 = require("@solana/spl-token");
class Vault {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static fromJSON(json) {
        return {
            address: new web3_js_1.PublicKey(json.address),
            owner: new web3_js_1.PublicKey(json.owner),
            tokenMint: new web3_js_1.PublicKey(json.tokenMint),
            tokenDecimals: json.tokenDecimals,
            feeVaultAta: new web3_js_1.PublicKey(json.feeVaultAta),
            feeVaultAtaAuthority: new web3_js_1.PublicKey(json.feeVaultAtaAuthority),
            feeVaultAtaAuthorityNonce: json.feeVaultAtaAuthorityNonce,
            vaultAta: new web3_js_1.PublicKey(json.vaultAta),
            vaultAtaAuthority: new web3_js_1.PublicKey(json.vaultAtaAuthority),
            vaultAtaAuthorityNonce: json.vaultAtaAuthorityNonce,
            padding01: json.padding01.map((x) => new web3_js_1.PublicKey(x))
        };
    }
    async getUpdatedVaultData(workspace) {
        return await (0, index_1.fetchAccountRetry)(workspace, 'vault', (this.account.address));
    }
    async updateVaultData(workspace) {
        await this.updateData(await this.getUpdatedVaultData(workspace));
        return this;
    }
    static async initializeVaultInstruction(workspace, tokenMint, vaultPubkey) {
        let [vaultAtaPubkey, _vaultAtaPubkeyBump] = await workspace.programAddresses.getVaultATAPubkey(vaultPubkey);
        let [vaultAtaAuthorityPubkey, vaultAtaAuthorityPubkeyBump] = await workspace.programAddresses.getVaultATAAuthorityPubkey(vaultAtaPubkey);
        let [feeVaultAtaPubkey, _feeVaultAtaPubkeyBump] = await workspace.programAddresses.getFeeVaultATAPubkey(vaultPubkey);
        let [feeVaultAtaAuthorityPubkey, feeVaultAtaAuthorityPubkeyBump] = await workspace.programAddresses.getFeeVaultATAAuthorityPubkey(feeVaultAtaPubkey);
        return await workspace.program.methods.initVaultInstruction(vaultAtaAuthorityPubkeyBump, feeVaultAtaAuthorityPubkeyBump).accounts({
            owner: workspace.owner,
            vault: vaultPubkey,
            vaultAta: vaultAtaPubkey,
            vaultAtaAuthority: vaultAtaAuthorityPubkey,
            feeVaultAta: feeVaultAtaPubkey,
            feeVaultAtaAuthority: feeVaultAtaAuthorityPubkey,
            tokenMint: tokenMint,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    static async initializeVault(workspace, tokenMint) {
        let [vaultPubkey, _vaultPubkeyBump] = await workspace.programAddresses.getVaultPubkey(tokenMint);
        let ix = await this.initializeVaultInstruction(workspace, tokenMint, vaultPubkey);
        ix.keys.forEach(key => console.log(key.pubkey.toBase58()));
        let tx = new web3_js_1.Transaction().add(ix);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx);
                    await (0, index_1.confirmTxRetry)(workspace, txSignature);
                }
                catch (error) {
                    reject(error);
                }
                // let user = await workspace.program.account.user.fetch(userPubkey) as UserAccount;
                try {
                    let vaultAccount = await (0, index_1.fetchAccountRetry)(workspace, 'vault', vaultPubkey);
                    resolve(new Vault(vaultAccount));
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async closeVaultTokenAccounts(workspace, receiverAta) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.closeFeeVaultAtaInstruction().accounts({
                signer: workspace.owner,
                vault: this.account.address,
                receiver: workspace.owner,
                receiverAta,
                feeVault: this.account.feeVaultAta,
                feeVaultAtaAuthority: this.account.feeVaultAtaAuthority,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
            }).instruction().then(closeFeeVaultAtaIX => {
                workspace.program.methods.closeVaultAtaInstruction().accounts({
                    signer: workspace.owner,
                    vault: this.account.address,
                    receiver: workspace.owner,
                    receiverAta,
                    vaultAta: this.account.vaultAta,
                    vaultAtaAuthority: this.account.vaultAtaAuthority,
                    tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
                }).instruction().then(closeVaultAtaIX => {
                    let tx = new web3_js_1.Transaction();
                    tx.add(closeFeeVaultAtaIX, closeVaultAtaIX);
                    tx.feePayer = workspace.wallet.payer.publicKey;
                    workspace.program.provider.connection.getLatestBlockhash().then(blockhash => {
                        tx.recentBlockhash = blockhash.blockhash;
                        tx.sign(workspace.wallet.payer);
                        workspace.sendTransaction(tx).then(txSignature => {
                            (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                                resolve(true);
                            }).catch(error => {
                                reject(error);
                            });
                        }).catch(error => {
                            console.error(error);
                            reject(error);
                        });
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    });
                }).catch(error => {
                    console.error(error);
                    reject(error);
                });
            }).catch(error => {
                console.error(error);
                reject(error);
            });
        });
    }
    async closeVault(workspace) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.adminCloseVaultInstruction().accounts({
                signer: workspace.owner,
                receiver: workspace.owner,
                vault: this.account.address
            }).instruction().then((closeVaultIX) => {
                let tx = new web3_js_1.Transaction();
                tx.add(closeVaultIX);
                tx.feePayer = workspace.wallet.payer.publicKey;
                workspace.program.provider.connection.getLatestBlockhash().then(blockhash => {
                    tx.recentBlockhash = blockhash.blockhash;
                    tx.sign(workspace.wallet.payer);
                    workspace.sendTransaction(tx).then(txSignature => {
                        (0, index_1.confirmTxRetry)(workspace, txSignature).then(() => {
                            resolve(true);
                        }).catch(error => {
                            reject(error);
                        });
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    });
                }).catch(error => {
                    console.error(error);
                    reject(error);
                });
            }).catch(error => {
                console.error(error);
                reject(error);
            });
        });
    }
}
exports.default = Vault;
//# sourceMappingURL=vault.js.map