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
}
exports.default = Vault;
//# sourceMappingURL=vault.js.map