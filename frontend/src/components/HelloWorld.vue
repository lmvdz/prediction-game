<script setup lang="ts">
import { inject, Ref, ref } from "vue";
import { PredictionGame, Workspace } from 'sdk'
import Game, { GameAccount } from "sdk/lib/accounts/game";
import Logo from "./Logo.vue"
import { useWorkspace, initWorkspace } from '../plugins/anchor'
import { useWallet, WalletStore } from 'solana-wallets-vue'
import { useTokenList } from "../plugins/tokenList";
import CryptoIcon from './CryptoIcon.vue'
import * as anchor from '@project-serum/anchor'
import { WalletMultiButton } from 'solana-wallets-vue'
import axios from 'axios';
// import { request as undiciRequest } from 'undici';
// import { createChart } from 'lightweight-charts';
import { useStore } from "../stores/store";
import bs58 from 'bs58';
import { AccountsCoder } from '@project-serum/anchor';


let round = ref({
   roundNumber: 0,
   mint: "SOL",
   currentPrice: 32.68,
   startPrice: 31.71,
   totalVolume: 10000,
   startTime: 0,
   currentTime: 0,
   interval: null,
   finished: false
})

let games: Ref<Array<Game>> = ref([] as Array<Game>);
let vaults: Ref<Map<string, Vault>> = ref(new Map<string, Vault>());
let userPredictions: Ref<Array<UserPrediction>> = ref([] as Array<UserPrediction>);
let frontendGameData: Ref<Map<string, FrontendGameData>> = ref(new Map<string, FrontendGameData>())
let wallet = ref(null as WalletStore);
let workspace = ref(null as Workspace);
let tokenList: Ref<Array<TokenInfo>> = ref(null as TokenInfo[]);
let updatingGames = ref(false);
let userDoesNotExist = ref(false);
let txStatus = ref(null as TxStatus)
let user = ref(null as User);
let tokenAccounts: Ref<Map<string, Account>> = ref(new Map<string, Account>());
const { txStatusList } = storeToRefs(useStore());

</script>

<script lang="ts">

import { defineComponent } from 'vue'
import { reactive, computed } from 'vue'

import { Program, ProgramAccount } from "@project-serum/anchor";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { confirmTxRetry, fetchAccountRetry } from "sdk/lib/util";
import { TokenInfo } from "@solana/spl-token-registry";
import { UpOrDown } from 'sdk'
import UserPrediction from "sdk/lib/accounts/userPrediction";
import { RoundAccount } from "sdk/lib/accounts";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";
import { Account, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { request } from "http";
import { storeToRefs } from "pinia";

export type TxStatus = {
  index: number,
  signatures: Array<string>,
  color: string,
  title: string,
  subtitle: string
  loading: boolean
  show: boolean;
}

export type FrontendGameData = {
  img: any,
  mint: TokenInfo,
  priceProgram: string,
  priceFeed: string,
  stats: {
    show: boolean
  },
  chart: {
    show: boolean
  },
  prediction: {
    show: boolean,
    direction: UpOrDown,
    amount: number,
    sliderAmount: number
  },
  updating: boolean,
  updateError: boolean,
  needsToLoad: boolean
}

export default defineComponent({
  name: 'HelloWorld',
  methods: {
    initNewTxStatus() : TxStatus {
      let index = this.txStatusList.push({
          index: -1,
          signatures: new Array<string>(),
          color: '',
          title: '',
          subtitle: '',
          loading: false,
          show: false
      });
      let txStatus = this.txStatusList[index-1];
      txStatus.index = index-1;
      return txStatus;
    },

    deleteTxStatus(txStatus: TxStatus | number) {
      if ((txStatus as TxStatus).index !== undefined) {
        this.txStatusList.splice((txStatus as TxStatus).index, 1)
      } else {
        this.txStatusList.splice(txStatus as number, 1)
      }
    },

    patchTxStatus(txStatus: TxStatus) {
      this.txStatusList[txStatus.index] = txStatus;
    },

    hideTxStatus(txStatus: TxStatus | number, timeout = 0) {
      setTimeout(() => {
        if ((txStatus as TxStatus).index !== undefined) {
          this.txStatusList[(txStatus as TxStatus).index].show = false;
        } else {
          this.txStatusList[txStatus as number].show = false;
        }
      }, timeout)
      
    },

    getVault(game: Game): Vault {
      return this.vaults.get(game.account.vault.toBase58())
    },

    async updateVault(vault: Vault): Promise<void> {
      if (vault)
        this.vaults.set(vault.account.address.toBase58(), new Vault(await fetchAccountRetry<VaultAccount>(this.workspace, 'vault', vault.account.address)))
      
    },

    async updateVaults(): Promise<void> {
      await Promise.allSettled([...this.vaults.values()].map(async (vault: Vault) => {
        if (vault !== undefined) {
          await this.updateVault(vault);
        }
      }))
    },

    getTokenMint(game: Game) : PublicKey {
      return (this.getVault(game)).account.tokenMint;
    },

    async makePrediction(game: (Game)) {

      let txStatus = this.initNewTxStatus()

      let gameFrontendData = this.frontendGameData.get(game.account.address.toBase58())

      if (this.wallet.connected && this.wallet.publicKey !== undefined && this.wallet.publicKey !== null) {
        // update the game
        await game.updateGameData(this.workspace);
        await game.updateRoundData(this.workspace);

        if (!game.currentRound.account.roundPredictionsAllowed)  {
          txStatus.color = 'error';
          txStatus.title = "Round Predictions Not Allowed"
          txStatus.show = true;
          this.hideTxStatus(txStatus, 5000);
          return;
        }

        // setup the tx's
        // let tx = new Transaction();
        let txs = { txs: new Array<Transaction>(), info: new Array<string>() }
        let amount = (new anchor.BN(gameFrontendData.prediction.amount)).mul((new anchor.BN(10)).pow(new anchor.BN(this.getVault(game).account.tokenDecimals)));
        // if the user doesn't exist try and load otherwise add it as a tx
        let [userPubkey, _userPubkeyBump] = await (this.workspace as Workspace).programAddresses.getUserPubkey(this.workspace.owner);
        console.log(this.user);
        if (this.user === undefined || this.user === null) {
          if (!(await this.loadUser())) {
            console.log('user null');
            let initUserIX = await User.initializeUserInstruction(this.workspace, userPubkey);
            let initUserTX = new Transaction().add(initUserIX);
            initUserTX.feePayer = (this.workspace as Workspace).owner;
            initUserTX.recentBlockhash = (await (this.workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
            txs.txs.push(initUserTX)
            txs.info.push("Initialize User")
          }
        }

        
        let fromTokenAccount = await this.getTokenAccount(game);
        let vault = this.getVault(game);
        
        let [userPredictionPubkey, _userPredictionPubkeyBump] = await (this.workspace as Workspace).programAddresses.getUserPredictionPubkey(game, game.currentRound, this.user || userPubkey);

        let initUserPredictionIX = await UserPrediction.initializeUserPredictionInstruction(
          this.workspace,
          vault,
          game, 
          game.currentRound, 
          this.user || userPubkey, 
          fromTokenAccount,
          this.workspace.owner,
          userPredictionPubkey,
          gameFrontendData.prediction.direction, 
          amount
        )

        let initUserPredictionTX = new Transaction().add(initUserPredictionIX);

        let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>(this.userPredictions.filter((prediction: UserPrediction) => prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
          return await UserPrediction.closeUserPredictionInstruction(this.workspace, prediction)
        }));
        
        
        if (closeUserPredictionInstructions.length > 0)
          initUserPredictionTX.add(...closeUserPredictionInstructions)

        initUserPredictionTX.feePayer = (this.workspace as Workspace).owner;
        initUserPredictionTX.recentBlockhash = (await (this.workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
        txs.txs.push(initUserPredictionTX);
        txs.info.push("Initialize User Prediction");      



        txs.txs = await (this.workspace as Workspace).wallet.signAllTransactions(txs.txs);
        
        for(let x = 0; x < txs.txs.length; x++) {
          let tx = txs.txs[x];
          txStatus.show = true;
          txStatus.loading = true;
          try {
            let simulation = await (this.workspace as Workspace).program.provider.connection.simulateTransaction(tx);
            console.log(simulation.value.logs);
            let signature = await (this.workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
          
            txStatus.signatures.push(signature);
            txStatus.color = 'success'
            txStatus.title = "Sent " + (x+1) + '/' + txs.txs.length + ' TX'
            txStatus.subtitle = txs.info[x]
            this.patchTxStatus(txStatus);

            try {
              txStatus.color = 'warning'
              txStatus.title = "Confirming " + (x+1) + '/' + txs.txs.length + ' TX'
              await confirmTxRetry(this.workspace, signature);
              txStatus.loading = false;
              txStatus.color = "success"
              txStatus.title = "Confirmed " + (x+1) + '/' + txs.txs.length + ' TX'
              
            } catch(error) {
              txStatus.color = 'error'
              txStatus.title = "Failed to Confirm!"
              txStatus.subtitle = "Check status on Solscan.io"
              txStatus.loading = false;
              this.patchTxStatus(txStatus);
            }
          } catch (error) {
            console.error(error);
            txStatus.color = 'error'
            txStatus.title = "TX Failed!"
            txStatus.subtitle = "Please retry."
            txStatus.loading = false;
          }
        }
        this.hideTxStatus(txStatus.index, 5000);
        await this.updateTokenAccountBalances();
        await this.updateUser();
        await this.loadPredictions();
      }
    },

    getTokenAccount(game: Game) : Account {
      return this.tokenAccounts.get(this.getTokenMint(game).toBase58())
    },

    async updateTokenAccount(game: Game) : Promise<void> {
      try {

        let mint = await this.getTokenMint(game);
        let address: PublicKey;

        if (this.tokenAccounts.get(mint.toBase58()) === undefined || this.tokenAccounts.get(mint.toBase58()) === null) {
          address = await getAssociatedTokenAddress(mint, this.workspace.owner); 
        } else {
          address = this.tokenAccounts.get(mint.toBase58()).address;
        }

        try {
          this.tokenAccounts.set(mint.toBase58(), await getAccount(this.workspace.program.provider.connection, address));
        } catch (error) {
          this.tokenAccounts.set(mint.toBase58(), null);
        }

      } catch(error) {
        console.error(error);
      }
    },

    async initTokenAccountForGame(game: Game) {
      let tokenMint = await this.getTokenMint(game);
      const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
              this.workspace.owner,
              await getAssociatedTokenAddress(tokenMint, this.workspace.owner),
              this.workspace.owner,
              tokenMint,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
          )
      );
      let  txStatus = this.initNewTxStatus();
      try {

        txStatus.title = "Initializing Token Account";
        txStatus.subtitle = "Sending";
        txStatus.color = "warning"
        txStatus.loading = true;
        txStatus.show = true;

        let txSignature = await (this.workspace as Workspace).sendTransaction(transaction);
        
        txStatus.subtitle = "Sent and Confirming";
        await confirmTxRetry(this.workspace, txSignature)
        txStatus.color = "success"
        txStatus.subtitle = "Sent and Confirmed";
        txStatus.loading = false;
        await this.updateTokenAccountBalances();

      } catch(error) {
        txStatus.title = "Initializing Token Account";
        txStatus.subtitle = "Failed";
        txStatus.color = "error"
        txStatus.loading = false;
        txStatus.show = true;
        console.error(error);
      }
      this.hideTxStatus(txStatus.index, 5000);
      
    },

    async airdrop(game: Game) {
      if ((this.workspace as Workspace).cluster === 'devnet' || (this.workspace as Workspace).cluster === 'testnet') {

        try {
          let txStatus = this.initNewTxStatus();
          txStatus.color = 'warning',
          txStatus.title = 'Airdropping Funds'
          txStatus.subtitle = ''
          txStatus.loading = true
          txStatus.show = true
          let { status, data } = (await axios.get('http://localhost:8444/airdrop/'+(await this.getTokenAccount(game)).address.toBase58()));
          if (status === 200) {
            txStatus.loading = false;
            txStatus.signatures.push(data)
            txStatus.color = 'success'
            txStatus.title = "Airdropped Funds"
          } else {
            txStatus.loading = false;
            txStatus.color = "error"
            txStatus.title = "Airdrop Failed"
            console.error(data);
          }

        } catch (error) {
          console.error(error);
          txStatus.loading = false;
          txStatus.color = "error"
          txStatus.title = "Airdrop Failed"
        }
              
        this.hideTxStatus(txStatus.index, 5000);
        await this.updateTokenAccountBalances();
      }
    },

    async initUser() : Promise<boolean> {
      try {
        this.user = await User.initializeUser(this.workspace)
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },

    async loadUser() : Promise<boolean> {
        try {
          this.user = new User(await this.workspace.program.account.user.fetch((await this.workspace.programAddresses.getUserPubkey(new PublicKey((this.wallet.publicKey as PublicKey).toBase58())))[0]))
          return true;
        } catch (error) {
          console.error(error);
          return false;
        }
    },

    async updateUser() {
      if (this.user !== null) {
        await (this.user as User).updateData(await fetchAccountRetry<UserAccount>(this.workspace, 'user', this.user.account.address))
      } else {
        await this.loadUser();
      }
      
    },

    async updateGames() {
      await Promise.allSettled(this.games.map(async (game: Game, index: number) => {
        let frontendGameData = this.frontendGameData.get(game.account.address.toBase58())
        if (frontendGameData === undefined) {
          await this.initFrontendGameData(game);
        }
        frontendGameData = this.frontendGameData.get(game.account.address.toBase58())
        frontendGameData.updating = true;
        frontendGameData.updateError = false;
        try {
          await game.updateGameData(this.workspace);
          if (game.currentRound && game.previousRound) {
            await game.updateRoundData(this.workspace);
          } else {
            await game.loadRoundData(this.workspace);
          }
          setTimeout(() => {
            frontendGameData.updateError = false;
            frontendGameData.updating = false;
            this.frontendGameData.set(game.account.address.toBase58(), frontendGameData)
          }, 1000)
        } catch(error) {
          console.error(error);
          frontendGameData.updateError = true;
          frontendGameData.updating = false;
          this.frontendGameData.set(game.account.address.toBase58(), frontendGameData)
        }
        
      }))
      
    },

    async updateTokenAccountBalances() {
      await Promise.allSettled(this.games.map(async (game: Game) => await this.updateTokenAccount(game)));
    },

    async initFrontendGameData (game: Game) {
      if (!this.frontendGameData.has(game.account.address.toBase58())) {
        this.frontendGameData.set(game.account.address.toBase58(), {
          img: null,
          mint: null,
          priceProgram: null,
          priceFeed: null,
          stats: {
            show: false
          },
          chart: {
            show: false
          },
          prediction: {
            show: false,
            direction: 0,
            amount: 0,
            sliderAmount: 0
          },
          updating: false,
          updateError: false,
          needsToLoad: true
        })
        try {
          let img = ((await import( /* @vite-ignore */ `../../node_modules/cryptocurrency-icons/32/color/${game.account.baseSymbol.toLowerCase()}.png`)));
          let mint;
          if (this.workspace.cluster !== 'mainnet-beta' || this.workspace.cluster !== 'devnet') {
            mint = this.tokenList.find((token: TokenInfo) => token.symbol === "USDC");
          } else {
            mint = this.tokenList.find(async (token: TokenInfo) => token.address === this.getTokenMint(game).toBase58());
          }
          let priceProgram = game.account.priceProgram.toBase58()
          let priceFeed = game.account.priceFeed.toBase58()
          this.frontendGameData.set(
            game.account.address.toBase58(), 
            { 
              ...this.frontendGameData.get(game.account.address.toBase58()), 
              mint,
              priceProgram,
              priceFeed,
              img
            }
          )
        } catch (error) {
          console.error(error);
        }
      }
      
    },

    async loadWorkspace() {
      if (this.workspace.program instanceof Program<PredictionGame>) {
        
        ((await Promise.all((await this.workspace.program.account.vault.all()).map(async (gameProgramAccount: ProgramAccount<VaultAccount>) => (new Vault(
          (await fetchAccountRetry<VaultAccount>(this.workspace, 'vault', gameProgramAccount.account.address))
        ))))) as Array<Vault>).forEach((vault: Vault) => {
          this.vaults.set(vault.account.address.toBase58(), vault);
        });

        this.games = (await Promise.all((await this.workspace.program.account.game.all()).map(async (gameProgramAccount: ProgramAccount<GameAccount>) => (new Game(
          (await fetchAccountRetry<GameAccount>(this.workspace, 'game', gameProgramAccount.account.address))
        ))))) as Array<Game>;

        if (this.games.length > 0) {
          await this.updateVaults();
          await this.updateTokenAccountBalances();
          this.$forceUpdate();
          setInterval(async () => {
            await Promise.allSettled([await this.updateGames(),
              await this.updateVaults(),
              await this.loadPredictions(),
              await this.updateUser(),
              await this.updateTokenAccountBalances()
            ]);
            this.$forceUpdate()
          }, 1000 * this.games.length)

          await Promise.all((this.games as Array<Game>).map(async game => {
            await this.initFrontendGameData(game);
          }))
        }
      }
      
    },

    async loadPredictions() {
      if (this.wallet !== null && this.wallet.connected && this.wallet.publicKey !== undefined && this.wallet.publicKey !== null) {
        try {
          this.userPredictions = await this.workspace.program.account.userPrediction.all([ { memcmp: { offset: 8, bytes: bs58.encode((this.wallet.publicKey as PublicKey)?.toBuffer() as Buffer) }}])
        } catch (error) {
          console.error(error);
        }
      }
    },

    loadWallet() {
      setTimeout(() => {
          this.wallet = useWallet();
          if (!this.wallet.connected) {
            this.loadWallet();
          } else {
            initWorkspace("http://localhost:8899", 'testnet');
            this.workspace = useWorkspace();
            this.loadWorkspace();
          }
      }, 1000)
    },

    async userClaim(game: Game) {

      let txStatus = this.initNewTxStatus()
      txStatus.title = "User Claim"
      txStatus.subtitle = "Sending"
      txStatus.color = "warning"
      txStatus.show = true;
      txStatus.loading = true;
      try {
        // console.log(game.account.feeV)

        let ix = await (this.user as User).userClaimInstruction(this.workspace, this.getVault(game), await this.getTokenAccount(game), (this.user as User).account.claimable);

        ix.keys.forEach(key => console.log(key.pubkey.toBase58()));

        let tx = new Transaction().add(ix);

        let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>(this.userPredictions.filter((prediction: UserPrediction) => prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
          return await UserPrediction.closeUserPredictionInstruction(this.workspace, prediction)
        }));
        
        if (closeUserPredictionInstructions.length > 0)
          tx.add(...closeUserPredictionInstructions)
        
        tx.feePayer = this.workspace.owner;
        tx.recentBlockhash = (await (this.workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash;
        tx = await (this.workspace as Workspace).wallet.signTransaction(tx);
        // let simulation = await (this.workspace as Workspace).program.provider.connection.simulateTransaction(tx);
        // console.log(simulation.value.logs)
        let simulate = await (this.workspace as Workspace).program.provider.connection.simulateTransaction(tx);
        console.log(simulate.value.logs)
        let signature = await (this.workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
        
        txStatus.subtitle = "Sent"
        try {
          txStatus.subtitle = "Confirming"
          await confirmTxRetry(workspace, signature);
          txStatus.subtitle = "Confirmed"
          txStatus.color = "success"
          txStatus.loading = false;
        } catch (error) {
          console.error(error);
          txStatus.subtitle = "Unconfirmed"
          txStatus.color = "warning"
          txStatus.loading = false;
        }
      } catch (error) {
        console.error(error);
        txStatus.title = "User Claim"
        txStatus.subtitle = "Failed"
        txStatus.color = "error"
        txStatus.loading = false;
      }
      this.hideTxStatus(txStatus, 5000)
      await this.updateUser();
      this.$forceUpdate();
      
    }
  },
  created() {
    this.tokenList = useTokenList();
    this.loadWallet();
    if (this.workspace === null) {
      initWorkspace("http://localhost:8899", 'testnet');
      this.workspace = useWorkspace();
      this.loadWorkspace();
    }
  },
  mounted() {
    this.tokenList = useTokenList();
    this.loadWallet();
    if (this.workspace === null) {
      initWorkspace("http://localhost:8899", 'testnet');
      this.workspace = useWorkspace();
      this.loadWorkspace();
    }
    
    if (this.round.interval === null) {
      this.round.interval = setInterval(() => {
        if (this.round.startTime+(60*10)-this.round.currentTime <= 0) {
          this.round.finished = true;
        } else {
          this.round.currentTime++;
        }
      }, 1000)
    }
  }
})
</script>

<template>
  <v-container>

    <div style="position: fixed; top: 0em; left: 0; margin: 0 auto; z-index: 1008;">
        
        <v-card tonal :class="`txStatus ${txStatus.color}`" v-for="txStatus in txStatusList.filter(txStatus => txStatus.show)" >
          <v-progress-linear :indeterminate="txStatus.loading" :color="txStatus.color"></v-progress-linear>
          <v-btn variant="plain" @click="hideTxStatus(txStatus.index, 0)" size="16px" style="position: absolute; top: 1em; right: 1em;"><v-icon>mdi-close</v-icon></v-btn>
          <v-card-title v-if="txStatus.title">{{ txStatus.title }}</v-card-title>
          <v-card-subtitle v-if="txStatus.subtitle">{{ txStatus.subtitle }}</v-card-subtitle>
          <v-card-text v-if="txStatus.signatures.length > 0">
            <ul>
              <li style="list-style: none;" v-for="(signature, index) in txStatus.signatures" :key="'tx-signature-'+index">
                <a target="_blank" :href="`https://solscan.io/tx/${signature}?cluster=${workspace.cluster}`"> {{ index+1 }} / {{ txStatus.signatures.length }} View on Solscan.io</a>
              </li>
            </ul>
          </v-card-text>
        </v-card>

    </div>
    
    <v-row justify="left" class="text-center" style="width: 100%; min-height: 75vh;">
      <v-col-auto>
        <div v-for="game in games" :key="'game-'+game.account.address.toBase58()">
          <v-card
            flat
            :min-width="300"
            tonal 
            :class="`ma-2 ${
              game.currentRound.account.roundPredictionsAllowed ? 
                frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Up ? 
                  'game-card up' : 
                    frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Down ? 
                  'game-card down' : 
                'game-card' : 
              'game-card'
            }`" 
            v-if="game.currentRound && frontendGameData.get(game.account.address.toBase58()) !== undefined"
          >
            <v-progress-linear 
              v-if="game.currentRound !== undefined"
              width="3" 
              :color="(() => {
                if (!game.currentRound.account.finished) {
                  return Math.floor(game.currentRound.account.roundTimeDifference.toNumber() / 6) >= 100 ? 'success' : Math.floor(game.currentRound.account.roundTimeDifference.toNumber() / 6) < 50 ? 'warning' : '#6864b7'
                } else {
                  return 'blue'
                }
              })()" 
                
              :stream="!game.currentRound.account.finished"
              :striped="game.currentRound.account.finished"
              rounded 
              :model-value="Math.floor((game.currentRound.account.roundTimeDifference.toNumber() / game.currentRound.account.roundLength) * 100)" 
              :buffer-value="Math.floor((game.currentRound.account.roundTimeDifference.toNumber() / game.currentRound.account.roundLength) * 100) < 50 ? 50 : 100"
            ></v-progress-linear>
            <v-btn 
              v-if="game.currentRound !== undefined"
              flat 
              style="background-color: rgba(0,0,0,0); width: 100%; height: 100%; padding: 1em;"
              @click="() => {
                if (game.currentRound.account.roundPredictionsAllowed) {
                  frontendGameData.get(game.account.address.toBase58()).prediction.show = !frontendGameData.get(game.account.address.toBase58()).prediction.show;
                } else {
                  frontendGameData.get(game.account.address.toBase58()).prediction.show = !frontendGameData.get(game.account.address.toBase58()).prediction.show;
                  frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.None; 
                }
              }">
              <v-icon 
                v-if="game.currentRound !== undefined" 
                :color="!game.currentRound.account.roundPredictionsAllowed ? 'error' : 'success'"
                :style="`background-color: rgba(0, 0, 0, 0); position: absolute; left: 0; right: 0; ${!frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'top: 0; bottom: 0; margin-top: auto; margin-bottom: auto;' : 'bottom: 5%; left: -1%;'} margin-left: auto; margin-right: auto;`">
                {{ !game.currentRound.account.roundPredictionsAllowed ? 'mdi-lock' : 'mdi-lock-open' }}
              </v-icon>
              <v-row>
                <v-col style="width: 150px; margin: auto;" v-if="game.currentRound && !frontendGameData.get(game.account.address.toBase58()).prediction.show">
                  <v-card-title >
                    <v-btn
                      variant="plain"
                      :disabled="!game.currentRound.account.roundPredictionsAllowed"
                      @click.stop="(e) => { 
                        e.preventDefault(); 
                        frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                        frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Up; 
                      }"
                      class="icon-hover"
                      style="margin: auto;"
                    > <v-icon color="success" :class="`icon-hover success`">mdi-arrow-up-bold</v-icon>  </v-btn>
                  </v-card-title>
                  <v-card-subtitle>
                    {{ game.currentRound.account.totalUpAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalUpAmount).toNumber().toFixed(2) + 'x' : '1.00x' }} Payout
                  </v-card-subtitle>
                  <v-divider style="margin-top: .25em; margin-bottom: .25em;"></v-divider>
                  <v-card-subtitle>
                    {{ game.currentRound.account.totalDownAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalDownAmount).toNumber().toFixed(2) + 'x' : '1.00x'}} Payout
                  </v-card-subtitle>
                  <v-card-title>
                    <v-btn 
                      variant="plain"
                      :disabled="!game.currentRound.account.roundPredictionsAllowed"
                      @click.stop="(e) => { 
                        e.preventDefault(); 
                        frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                        frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Down; 
                      }"
                      class="icon-hover"
                      style="margin: auto;"
                    > <v-icon color="error" class="icon-hover down">mdi-arrow-down-bold</v-icon>
                    </v-btn>
                    
                  </v-card-title>
                </v-col>
                <v-col v-else-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show && frontendGameData.get(game.account.address.toBase58()).needsToLoad" style=" width: 150px; margin: auto;">
                  <v-progress-circular color="#6864b7" indeterminate/>
                </v-col>
                <v-col v-else-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show" style=" width: 150px; margin: auto;">
                  <v-icon size="32px">mdi-alert</v-icon>
                </v-col>
                <v-divider v-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show" vertical></v-divider>
                <v-col style="width: 150px; margin: auto;" justify="center" class="text-center">
                  <v-card-title class="text-center" v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null">
                    <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.account.baseSymbol.toLowerCase()"/><v-divider vertical></v-divider><CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
                    <!-- <p style="margin: 0 auto;">{{ game.account.baseSymbol }} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</p>  -->
                  </v-card-title>
                  <v-card-subtitle v-if="frontendGameData.get(game.account.address.toBase58()).priceFeed !== null" class="text-center">
                    {{ frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(0, 4) + '..' + frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(frontendGameData.get(game.account.address.toBase58()).priceFeed.length - 4)}}
                    <a style="text-decoration: none;" target="_blank" :href="`https://solscan.io/account/${frontendGameData.get(game.account.address.toBase58()).priceFeed}?cluser=${workspace.cluster}`"><v-tooltip activator="parent" location="bottom">Solscan</v-tooltip>&nbsp;<v-icon size="xsmall">mdi-open-in-new</v-icon></a>
                  </v-card-subtitle>
                  <v-card-text class="text-center" v-if="game.currentRound">
                    Pool: {{ (game.currentRound.account.totalUpAmount.add(game.currentRound.account.totalDownAmount)).div((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals))).toNumber() }}
                    <span v-if="user && game && getVault(game) && getTokenAccount(game)"><br>Balance: {{ (((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user.account.claimable)).div((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals)))).toNumber() }} </span> 
                  </v-card-text>
                </v-col>
              </v-row>
            </v-btn>
            <v-expand-transition>
              <div style="max-width: 300px;" v-if="frontendGameData.get(game.account.address.toBase58()).prediction.show">
                <v-divider></v-divider>
                <v-card-text v-if="game.currentRound && wallet.connected && (getTokenAccount(game)) !== null">
                  <v-row :style="`padding-bottom: .5em; padding-top: .5em; ${game.currentRound.account.roundPredictionsAllowed ? '' : ''}`">
                    <v-col>
                      <v-card-title>
                        <v-btn
                          variant="plain"
                          :disabled="!game.currentRound.account.roundPredictionsAllowed"
                           @click.stop="(e) => { 
                            e.preventDefault(); 
                            frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                            frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Up; 
                          }"
                          class="icon-hover"
                          style="margin: auto;"
                        > <v-icon color="success" :class="`icon-hover success`">mdi-arrow-up-bold</v-icon>  </v-btn>
                      </v-card-title>
                      <v-card-subtitle>
                        {{ game.currentRound.account.totalUpAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalUpAmount).toNumber().toFixed(2) + 'x' : '1.00x' }} Payout
                      </v-card-subtitle>
                    </v-col>
                    <v-divider vertical></v-divider>
                    <v-col>
                      <v-card-title >
                        <v-btn 
                          variant="plain"
                          :disabled="!game.currentRound.account.roundPredictionsAllowed"
                          @click.stop="(e) => { 
                            e.preventDefault(); 
                            frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                            frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Down; 
                          }"
                          class="icon-hover"
                          style="margin: auto;"
                        > <v-icon color="error" class="icon-hover down">mdi-arrow-down-bold</v-icon>
                        </v-btn>
                        
                      </v-card-title>
                      <v-card-subtitle>
                        {{ game.currentRound.account.totalDownAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalDownAmount).toNumber().toFixed(2) + 'x' : '1.00x'}} Payout
                      </v-card-subtitle>
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-text v-if="game.currentRound.account.roundPredictionsAllowed && getTokenAccount(game) !== null && getTokenAccount(game).amount > 0" style="margin-top: 1em;">
                  <v-row >
                    <v-text-field 
                      hide-details
                      style="width: calc(100%);" 
                      variant="outlined" 
                      type="number" 
                      :step="0.01" 
                      :label="`Prediction Amount ${frontendGameData.get(game.account.address.toBase58()).mint !== null ? '(' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + ')' : ''}`" 
                      v-model="frontendGameData.get(game.account.address.toBase58()).prediction.amount"
                      @update:model-value="(value: any) => {
                        if ((((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber() < parseFloat(value)) {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = (((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber()
                        } else if (parseFloat(value) < 0) {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = 0
                          frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 0
                          return;
                        }
                        frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = ( parseFloat(value) / (((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber()) * 100

                      }"
                    >
                      <template v-slot:append>
                        <v-btn variant="outlined" @click="() => {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = (((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber()
                          frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 100;
                        }">Max</v-btn>
                      </template>
                    </v-text-field>
                    <v-slider
                      hide-details
                      v-model="frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount"
                      @update:model-value="(value: number) => {
                        frontendGameData.get(game.account.address.toBase58()).prediction.amount = (((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber() * (value / 100)
                      }"
                      thumb-label
                      :max="100"
                      step="10"
                      show-ticks="always"
                      :track-size="5"
                      :thumb-size="10"
                    />
                  </v-row>
                </v-card-text>
                <v-card-text v-if="!wallet.connected">
                  <div class="game-wallet-button">
                    <wallet-multi-button style="margin: 0 auto;" dark/>
                  </div>
                </v-card-text>
                <v-card-actions v-if="wallet.connected && (getTokenAccount(game)) !== null && getTokenAccount(game).amount > 0">
                  <v-spacer></v-spacer>
                  <v-btn 
                    v-if="game.currentRound.account.roundPredictionsAllowed"
                    variant="outlined"
                    :disabled="frontendGameData.get(game.account.address.toBase58()).prediction.amount === 0 || frontendGameData.get(game.account.address.toBase58()).prediction.direction === 0"
                    @click="async () => {
                      await makePrediction(game)
                    }" 
                    
                  >
                    Make Prediction
                  </v-btn>
                  <h3 v-else>Predictions Locked</h3>
                  <v-spacer></v-spacer>
                </v-card-actions>
                
                <v-card-actions v-else-if="wallet.connected">
                  <v-spacer></v-spacer>
                    <v-btn variant="outlined" v-if="getTokenAccount(game) === null" @click="async () => { initTokenAccountForGame(game); }">
                      Initialize Token Account
                    </v-btn>
                    <v-btn variant="outlined" v-else-if="getTokenAccount(game).amount <= BigInt(0) && ((workspace as Workspace).cluster === 'devnet' || (workspace as Workspace).cluster === 'testnet')" @click="async () => { await airdrop(game) }">Airdrop</v-btn>
                    <v-btn variant="outlined" v-else-if="getTokenAccount(game).amount <= BigInt(0) && (workspace as Workspace).cluster === 'mainnet-beta'" href="https://jup.ag/swap/SOL-USDC">SWAP</v-btn>
                  <v-spacer></v-spacer>
                </v-card-actions>
                <v-divider v-if="user !== null && user.account.claimable.gt(new anchor.BN(0))"></v-divider>
                <v-card-actions v-if="user !== null && user.account.claimable.gt(new anchor.BN(0))">
                  <v-spacer></v-spacer>
                  <v-btn 
                    variant="outlined"
                    color="success"
                    @click="async () => {
                      await userClaim(game)
                    }"
                  >
                    Claim {{ (user.account.claimable.div((new anchor.BN(10)).pow(new anchor.BN(frontendGameData.get(game.account.address.toBase58()).mint.decimals)))).toNumber() }} {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
                  </v-btn>
                  <v-spacer></v-spacer>
                </v-card-actions>
              </div>
            </v-expand-transition>
          </v-card>
        </div>
        
      </v-col-auto>
      <v-col style="padding: 8px;">
        <iframe :src="`https://v3.aggr.trade`" frameborder="0" style="width: 100%; height: 100%; min-height: 75vh; max-height: 75vh;"></iframe>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.txStatus {
  width: calc(100% + 50%);
  border-radius: 0px;
}

.txStatus.success {
  border: 1px solid greenyellow;
}

.icon-hover {
  border-radius: 3em;
  transition: all .3s;
}

.icon-hover:hover {
  border-radius: 3em;
  background-color: rgba(33, 33, 33, 1) !important;
  transition: all .3s;
}

.game-wallet-button > .swv-dark > .swv-button {
  margin: 0 auto;
  border: 1px solid #6864b7;
  border-radius: 1px;
  background-color: rgba(0, 0, 0, 0);
  transition: all .2s;
}

.game-wallet-button > .swv-dark > .swv-button:hover {
  border: 1.5px solid #6864b7;
  font-size: 1.01rem;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, .025);
  color: #6864b7;
  transition: all .2s;
}

.round {
  width: 20%;
}

.game-card {
  border-radius: 0px;
}

.game-card.up {
  background: rgb(0,26,36);
  background: linear-gradient(0deg, rgba(0,26,36,1) 0%, rgba(9,121,18,0.5) 100%) !important;
}
.game-card.down {
  background: rgb(0,26,36);
  background: linear-gradient(180deg, rgba(0,26,36,1) 0%, rgba(121,9,9,0.5) 100%) !important;
}
.game-card.tie {
  background: rgb(0,26,36);
  background: linear-gradient(180deg, rgba(0,26,36,0.5) 0%, rgba(121,114,9,0.75) 50%) !important;
}
</style>
