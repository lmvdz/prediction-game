import type { Cluster, PublicKey, Transaction } from '@solana/web3.js';

import { computed, Ref, ref } from 'vue'
import { AnchorWallet, useAnchorWallet } from 'solana-wallets-vue'
import { Connection, Keypair } from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'
import { IDL, PROGRAM_ID, Workspace } from 'sdk';
import type { PredictionGame } from 'sdk'
import { BorshCoder } from '@project-serum/anchor';

class TempWallet implements AnchorWallet {
  payer: Keypair
  publicKey: PublicKey
  constructor(payer: Keypair) {
    this.payer = payer;
    this.publicKey = payer.publicKey;
    this.signTransaction = function(tx: Transaction): Promise<Transaction> {
      throw new Error('Method not implemented.');
    } 
    this.signAllTransactions = function(txs: Transaction[]): Promise<Transaction[]> {
      throw new Error('Method not implemented.');
    }
  }
  signTransaction(transaction: Transaction): Promise<Transaction> {
    throw new Error('Method not implemented.');
  }
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
}

let workspace: any = null
export const useWorkspace = () => workspace

export const initWorkspace = (rpcUrl: string, cluster: Cluster) => {
  // console.log(cluster);
  let wallet : Ref<AnchorWallet | undefined> = useAnchorWallet();
  if (wallet.value === undefined) {
    wallet = ref(new TempWallet(Keypair.generate()));
  }
  let connection = new Connection(rpcUrl, { commitment: 'confirmed'});
  let provider = computed(() => new anchor.AnchorProvider(connection, wallet.value, { commitment: 'confirmed'}))
  let program = computed(() => new anchor.Program<PredictionGame>(IDL, PROGRAM_ID(cluster), provider.value, new BorshCoder(IDL)))

  //@ts-ignore
  workspace = new Workspace(program.value, wallet.value as anchor.Wallet, cluster)
}