"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const anchor = __importStar(require("@project-serum/anchor"));
const index_1 = require("../util/index");
const chunk_1 = __importDefault(require("../util/chunk"));
class User {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
    static async initializeUserInstruction(workspace, userPubkey, userClaimablePubkey) {
        return await workspace.program.methods.initUserInstruction().accounts({
            owner: workspace.owner,
            user: userPubkey,
            userClaimable: userClaimablePubkey,
            systemProgram: web3_js_1.SystemProgram.programId
        }).instruction();
    }
    static async initializeUser(workspace) {
        let [userPubkey, _userPubkeyBump] = await workspace.programAddresses.getUserPubkey(workspace.owner);
        let [userClaimablePubkey, _userClaimablePubkeyBump] = await workspace.programAddresses.getUserClaimablePubkey(userPubkey);
        let ix = await this.initializeUserInstruction(workspace, userPubkey, userClaimablePubkey);
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
                    let userAccount = await (0, index_1.fetchAccountRetry)(workspace, 'user', userPubkey);
                    resolve(new User(userAccount));
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async userClaimInstruction(workspace, vault, toTokenAccount, amount) {
        if (workspace.owner.toBase58() !== this.account.owner.toBase58())
            throw Error("Signer not Owner");
        if (toTokenAccount.owner.toBase58() !== this.account.owner.toBase58())
            throw Error("To Token Account Owner not the same as User Owner");
        return await workspace.program.methods.userClaimInstruction(amount).accounts({
            signer: workspace.owner,
            user: this.account.address,
            userClaimable: this.account.userClaimable,
            toTokenAccount: toTokenAccount.address,
            vault: vault.account.address,
            vaultAta: vault.account.vaultAta,
            vaultAtaAuthority: vault.account.vaultAtaAuthority,
            tokenMint: toTokenAccount.mint,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
        }).instruction();
    }
    async userClaim(workspace, vault, toTokenAccount, amount) {
        let ix = await this.userClaimInstruction(workspace, vault, toTokenAccount, amount);
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
                    await this.updateData(await (0, index_1.fetchAccountRetry)(workspace, 'user', this.account.address));
                    resolve(this);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async userClaimAllInstruction(workspace, userClaimable, vaults, tokenAccounts, filterMint) {
        let accountMetas = (0, chunk_1.default)(userClaimable.account.claims.filter(claim => claim.amount.gt(new anchor.BN(0)) && claim.mint.toBase58() !== web3_js_1.PublicKey.default.toBase58() && (filterMint.toBase58() !== web3_js_1.PublicKey.default.toBase58() ? claim.mint.toBase58() === filterMint.toBase58() : true)).map(claim => {
            let vault = vaults.find(v => v.account.address.toBase58() === claim.vault.toBase58());
            let tokenAccount = tokenAccounts.find(t => t.mint.toBase58() === vault.account.tokenMint.toBase58());
            return [
                {
                    pubkey: vault.account.address,
                    isSigner: false,
                    isWritable: false
                },
                {
                    pubkey: vault.account.vaultAta,
                    isSigner: false,
                    isWritable: true
                },
                {
                    pubkey: vault.account.vaultAtaAuthority,
                    isSigner: false,
                    isWritable: false
                },
                {
                    pubkey: tokenAccount.address,
                    isSigner: false,
                    isWritable: true
                }
            ];
        }).flat(Infinity), 20);
        return await Promise.all(accountMetas.map(async (accountMeta) => {
            return await workspace.program.methods.userClaimAllInstruction().accounts({
                signer: workspace.owner,
                user: this.account.address,
                userClaimable: this.account.userClaimable,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
            }).remainingAccounts(accountMeta).instruction();
        }));
    }
    async userClaimAll(workspace, userClaimable, vaults, tokenAccounts, filterMint) {
        if (workspace.owner.toBase58() !== this.account.owner.toBase58())
            throw Error("Signer not Owner");
        let instructions = await this.userClaimAllInstruction(workspace, userClaimable, vaults, tokenAccounts, filterMint);
        if (instructions.length > 0) {
            await Promise.allSettled(instructions.map(async (instruction) => {
                let tx = new web3_js_1.Transaction().add(instruction);
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
                            await this.updateData(await (0, index_1.fetchAccountRetry)(workspace, 'user', this.account.address));
                            resolve(this);
                        }
                        catch (error) {
                            reject(error);
                        }
                    }, 500);
                });
            }));
            return this;
        }
        else {
            throw Error("User has no valid claimables");
        }
    }
    async closeUserAccountInstruction(workspace) {
        return await workspace.program.methods.closeUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            userClaimable: this.account.userClaimable,
            receiver: workspace.owner
        }).instruction();
    }
    async closeUserAccount(workspace) {
        let ix = await this.closeUserAccountInstruction(workspace);
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
                try {
                    this.account = null;
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
    async adminCloseUserAccountInstruction(workspace) {
        return await workspace.program.methods.adminCloseUserAccountInstruction().accounts({
            signer: workspace.owner,
            user: this.account.address,
            receiver: this.account.owner
        }).instruction();
    }
    async adminCloseUserAccount(workspace) {
        let ix = await this.adminCloseUserAccountInstruction(workspace);
        ix.keys.forEach(k => console.log(k.pubkey.toBase58()));
        console.log('\n');
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
                try {
                    this.account = null;
                    resolve(true);
                }
                catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }
}
exports.default = User;
//# sourceMappingURL=user.js.map