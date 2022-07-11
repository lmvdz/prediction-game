import { PublicKey, PublicKeyData, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Workspace } from '../workspace'
import { DataUpdatable } from "../dataUpdatable"
import { fetchAccountRetry, confirmTxRetry } from "../util/index"
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
    vaultAtaAuthorityNonce: number,

    padding01: PublicKey[]

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

    public static fromJSON<VaultAccount>(json: any): VaultAccount {
        return {
            address: new PublicKey(json.address),
            owner: new PublicKey(json.owner),

            tokenMint: new PublicKey(json.tokenMint),
            tokenDecimals: json.tokenDecimals,

            feeVaultAta: new PublicKey(json.feeVaultAta),
            feeVaultAtaAuthority: new PublicKey(json.feeVaultAtaAuthority),
            feeVaultAtaAuthorityNonce: json.feeVaultAtaAuthorityNonce,

            vaultAta: new PublicKey(json.vaultAta),
            vaultAtaAuthority: new PublicKey(json.vaultAtaAuthority),
            vaultAtaAuthorityNonce: json.vaultAtaAuthorityNonce,

            padding01: json.padding01.map((x: string) => new PublicKey(x)) as PublicKey[]
        } as unknown as VaultAccount
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
        ix.keys.forEach(key => console.log(key.pubkey.toBase58()))
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

    public async closeVaultTokenAccounts(workspace: Workspace, receiverAta: PublicKey) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.closeFeeVaultAtaInstruction().accounts({
                signer: workspace.owner,
                vault: this.account.address,
                receiver: workspace.owner,
                receiverAta,
                feeVault: this.account.feeVaultAta,
                feeVaultAtaAuthority: this.account.feeVaultAtaAuthority,
                tokenProgram: TOKEN_PROGRAM_ID
            }).instruction().then(closeFeeVaultAtaIX => {
                workspace.program.methods.closeVaultAtaInstruction().accounts({
                    signer: workspace.owner,
                    vault: this.account.address,
                    receiver: workspace.owner,
                    receiverAta,
                    vaultAta: this.account.vaultAta,
                    vaultAtaAuthority: this.account.vaultAtaAuthority,
                    tokenProgram: TOKEN_PROGRAM_ID
                }).instruction().then(closeVaultAtaIX => {
                    let tx = new Transaction()
                    tx.add(closeFeeVaultAtaIX, closeVaultAtaIX);
                    tx.feePayer = workspace.wallet.payer.publicKey;
                    workspace.program.provider.connection.getLatestBlockhash().then(blockhash => {
                        tx.recentBlockhash = blockhash.blockhash;
                        tx.sign(workspace.wallet.payer)
                        workspace.sendTransaction(tx).then(txSignature => {
                            confirmTxRetry(workspace, txSignature).then(() => {
                                resolve(true);
                            }).catch(error => {
                                reject(error);
                            })
                        }).catch(error => {
                            console.error(error);
                            reject(error);
                        })
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    })
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        })
    }

    public async closeVault(workspace: Workspace) {
        return new Promise((resolve, reject) => {
            workspace.program.methods.adminCloseVaultInstruction().accounts({
                signer: workspace.owner,
                receiver: workspace.owner,
                vault: this.account.address
            }).instruction().then((closeVaultIX) => {
                let tx = new Transaction()
                tx.add(closeVaultIX);
                tx.feePayer = workspace.wallet.payer.publicKey;
                workspace.program.provider.connection.getLatestBlockhash().then(blockhash => {
                    tx.recentBlockhash = blockhash.blockhash;
                    tx.sign(workspace.wallet.payer)
                    workspace.sendTransaction(tx).then(txSignature => {
                        confirmTxRetry(workspace, txSignature).then(() => {
                            resolve(true);
                        }).catch(error => {
                            reject(error);
                        })
                    }).catch(error => {
                        console.error(error);
                        reject(error);
                    })
                }).catch(error => {
                    console.error(error);
                    reject(error);
                })
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        })
    }
}