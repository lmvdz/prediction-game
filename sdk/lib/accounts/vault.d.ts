import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Workspace } from '../workspace';
import { DataUpdatable } from "../dataUpdatable";
export declare type VaultAccount = {
    address: PublicKey;
    owner: PublicKey;
    tokenMint: PublicKey;
    tokenDecimals: number;
    feeVaultAta: PublicKey;
    feeVaultAtaAuthority: PublicKey;
    feeVaultAtaAuthorityNonce: number;
    vaultAta: PublicKey;
    vaultAtaAuthority: PublicKey;
    vaultAtaAuthorityNonce: number;
    padding01: PublicKey[];
};
export default class Vault implements DataUpdatable<VaultAccount> {
    account: VaultAccount;
    constructor(account: VaultAccount);
    updateData(data: VaultAccount): Promise<boolean>;
    static fromJSON<VaultAccount>(json: any): VaultAccount;
    getUpdatedVaultData(workspace: Workspace): Promise<VaultAccount>;
    updateVaultData(workspace: Workspace): Promise<Vault>;
    static initializeVaultInstruction(workspace: Workspace, tokenMint: PublicKey, vaultPubkey: PublicKey): Promise<TransactionInstruction>;
    static initializeVault(workspace: Workspace, tokenMint: PublicKey): Promise<Vault>;
    closeVaultTokenAccounts(workspace: Workspace, receiverAta: PublicKey): Promise<unknown>;
    closeVault(workspace: Workspace): Promise<unknown>;
}
