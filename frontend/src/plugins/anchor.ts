import type { Cluster, PublicKey, Transaction } from '@solana/web3.js';

import { computed } from 'vue'
import { useAnchorWallet } from 'solana-wallets-vue'
import { Connection, Keypair } from '@solana/web3.js'
import { Wallet, Program, AnchorProvider } from '@project-serum/anchor'
import { IDL, PROGRAM_ID, Workspace } from 'sdk';
import type { PredictionGame } from 'sdk'

class TempWallet implements Wallet {
  payer: Keypair;
  constructor(payer: Keypair) {
    this.payer = payer;
  }
  signTransaction(tx: Transaction): Promise<Transaction> {
    throw new Error('Method not implemented.');
  }
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }

}

let workspace: any = null
export const useWorkspace = () => workspace

export const initWorkspace = (rpcUrl: string, cluster: Cluster) => {
  const wallet = useAnchorWallet()
  let connection = new Connection(rpcUrl, { commitment: 'confirmed'});
  let provider = computed(() => new AnchorProvider(connection, wallet.value! as Wallet || new TempWallet(Keypair.generate()), { commitment: 'confirmed'}))
  let program = computed(() => new Program<PredictionGame>(IDL, PROGRAM_ID(cluster), provider.value))
  workspace = new Workspace(program.value, wallet.value! as Wallet, cluster)
}