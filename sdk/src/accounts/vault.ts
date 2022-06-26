import { PublicKey, PublicKeyData, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
import Game from './game';
import User from './user';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';


export type VaultAccount = {

    address: PublicKey
    owner: PublicKey

    tokenMint: PublicKey
    tokenDecimals: number

    feeVaultAta: PublicKey
    feeVaultAtaAuthority: PublicKey
    feeVaultAtaAuthorityNonce: number

    vaultAta: PublicKey
    vaultAtaAuthority: PublicKey
    vaultAtaAuthorityNonce: number

}


export default class Vault implements DataUpdatable<VaultAccount> {
    account: VaultAccount

    constructor(account: VaultAccount) {
        this.account = account;
    }

    public async updateData(data: VaultAccount): Promise<boolean> {
        this.account = data;
        return true;
    }

    public async getUpdatedVaultData(workspace: Workspace) : Promise<VaultAccount> {
        return await fetchAccountRetry<VaultAccount>(workspace, 'vault', (this.account.address));
    }

    public async updateVaultData(workspace: Workspace) : Promise<Vault> {
        await this.updateData(await this.getUpdatedVaultData(workspace));
        return this;
    }

    public static async initializeVaultInstruction(workspace: Workspace, tokenMint: PublicKey, vaultPubkey: PublicKey): Promise<TransactionInstruction> {

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
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        }).instruction();
    }


    public static async initializeVault(workspace: Workspace, tokenMint: PublicKey): Promise<Vault> {
        let [vaultPubkey, _vaultPubkeyBump] = await workspace.programAddresses.getVaultPubkey(tokenMint);

        let ix = await this.initializeVaultInstruction(workspace, tokenMint, vaultPubkey);
        let tx = new Transaction().add(ix);
        

        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    let txSignature = await workspace.sendTransaction(tx)
                    await confirmTxRetry(workspace, txSignature);
                } catch (error) {
                    reject(error);
                }
                // let user = await workspace.program.account.user.fetch(userPubkey) as UserAccount;
                try {
                    let vaultAccount = await fetchAccountRetry<VaultAccount>(workspace, 'vault', vaultPubkey)
                    resolve(new Vault(vaultAccount));
                } catch(error) {
                    reject(error);
                }
            }, 500)
        })
    }
}