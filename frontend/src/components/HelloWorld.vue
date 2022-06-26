<script lang="ts">

import { defineComponent } from 'vue'

import { Program, ProgramAccount } from "@project-serum/anchor";
import { Cluster, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { confirmTxRetry, fetchAccountRetry } from "sdk/lib/util";
import { TokenInfo } from "@solana/spl-token-registry";
import { UpOrDown } from 'sdk'
import UserPrediction, { UserPredictionAccount } from "sdk/lib/accounts/userPrediction";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";
import { Account, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { storeToRefs } from "pinia";
import { Ref, ref } from "vue";
import { PredictionGame, USER_PREDICTION_MIN_AMOUNT, Workspace } from 'sdk'
import Game, { GameAccount } from "sdk/lib/accounts/game";
import { U64MAX } from 'sdk';
import { useWorkspace, initWorkspace } from '../plugins/anchor'
import { useWallet, WalletStore } from 'solana-wallets-vue'
import { useTokenList } from "../plugins/tokenList";
import CryptoIcon from './CryptoIcon.vue'
import * as anchor from '@project-serum/anchor'
import axios from 'axios';
import { useStore } from "../stores/store";
import bs58 from 'bs58';
import UpArrowAnimation from '../lottie/65775-arrrow-moving-upward.json'
import DownArrowAnimation from '../lottie/65777-graph-moving-downward.json'
import CrabAnimation from '../lottie/101494-rebound-rock-water-creature-by-dave-chenell.json'

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
  information: {
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
  components: {
    CryptoIcon
  },
  setup() {
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
    let updateInterval: Ref<NodeJS.Timer> = ref(null as NodeJS.Timer);
    let aggrWorkspace: Ref<string> = ref('');

    const { txStatusList } = storeToRefs(useStore());

    return {
      Workspace,
      CrabAnimation,
      UpArrowAnimation,
      DownArrowAnimation,
      U64MAX,
      anchor,
      UpOrDown,
      games,
      vaults,
      userPredictions,
      frontendGameData,
      wallet,
      workspace,
      tokenList,
      updatingGames,
      userDoesNotExist,
      txStatus,
      user,
      tokenAccounts,
      updateInterval,
      aggrWorkspace,
      txStatusList
    }
  },
  methods: {
    bnToNumber(num: anchor.BN, decimals: number) : number {
      let _10to = new anchor.BN(10).pow(new anchor.BN(decimals));
      return this.bnDivMod(num, _10to, decimals)
    },
    bnDivMod(num: anchor.BN, by: anchor.BN, decimals: number) : number {
      return (num.div(by).toNumber() + (num.mod(by).toNumber() / (10 ** decimals)))
    },
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
        
        if (amount.gt(U64MAX) || amount.lt(USER_PREDICTION_MIN_AMOUNT(game.account.tokenDecimal))) {
          txStatus.color = 'error';
          txStatus.title = "Minimum Amount is 1 " + gameFrontendData.mint.symbol
          txStatus.show = true;
        }
        // if the user doesn't exist try and load otherwise add it as a tx
        let [userPubkey, _userPubkeyBump] = await (this.workspace as Workspace).programAddresses.getUserPubkey(this.workspace.owner);
        let tx = new Transaction();
        let txTitle = '';
        if (this.user === undefined || this.user === null) {
          if (!(await this.loadUser())) {
            let initUserIX = await User.initializeUserInstruction(this.workspace, userPubkey);
            // let initUserTX = new Transaction().add(initUserIX);
            // initUserTX.feePayer = (this.workspace as Workspace).owner;
            // initUserTX.recentBlockhash = (await (this.workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
            tx.add(initUserIX)
            txTitle = "Initialize User & "
          }
        }

        
        let fromTokenAccount = await this.getTokenAccount(game);
        let vault = this.getVault(game);
        
        let [userPredictionPubkey, _userPredictionPubkeyBump] = await (this.workspace as Workspace).programAddresses.getUserPredictionPubkey(game, game.currentRound, this.user || this.workspace.owner);

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
        // initUserPredictionIX.keys.forEach(key => console.log(key.pubkey.toBase58()))

        tx.add(initUserPredictionIX);
        txTitle += "Initialize User Prediction"

        let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>(this.userPredictions.filter((prediction: UserPrediction) => prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
          return await UserPrediction.closeUserPredictionInstruction(this.workspace, prediction)
        }));
        
        
        if (closeUserPredictionInstructions.length > 0) {
          tx.add(...closeUserPredictionInstructions)
          txTitle += " & Close " + closeUserPredictionInstructions.length + " User Prediction" + (closeUserPredictionInstructions.length > 1 ? 's' : '')
        }
          

        tx.feePayer = (this.workspace as Workspace).owner;
        tx.recentBlockhash = (await (this.workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
        tx = await (this.workspace as Workspace).wallet.signTransaction(tx);
        
        txStatus.show = true;
        txStatus.loading = true;
        try {
          let simulation = await (this.workspace as Workspace).program.provider.connection.simulateTransaction(tx);
          console.log(simulation.value.logs);
          let signature = await (this.workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
        
          txStatus.signatures.push(signature);
          txStatus.color = 'success'
          txStatus.title = txTitle
          txStatus.subtitle = "Sent TX!"
          this.patchTxStatus(txStatus);

          try {
            txStatus.color = 'warning'
            txStatus.subtitle = "Confirming TX!"
            await confirmTxRetry(this.workspace, signature);
            txStatus.loading = false;
            txStatus.color = "success"
            txStatus.subtitle = "Confirmed TX!"
            
          } catch(error) {
            txStatus.color = 'error'
            txStatus.subtitle = "Failed to Confirm!"
            txStatus.loading = false;
            this.patchTxStatus(txStatus);
          }
        } catch (error) {
          console.error(error);
          txStatus.color = 'error'
          txStatus.subtitle = "TX Failed!"
          txStatus.loading = false;
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

        if (!this.tokenAccounts.has(mint.toBase58())) {
          address = await getAssociatedTokenAddress(mint, this.workspace.owner); 
        } else {
          address = this.tokenAccounts.get(mint.toBase58()).address;
        }

        try {
          let tokenAccount = await getAccount(this.workspace.program.provider.connection, address);
          if (tokenAccount.owner.toBase58() === this.workspace.owner.toBase58()) {
            this.tokenAccounts.set(mint.toBase58(), tokenAccount);
          } else {
            this.tokenAccounts.delete(mint.toBase58());
          }
        } catch (error) {
          this.tokenAccounts.delete(mint.toBase58());
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
        let txStatus = this.initNewTxStatus();
        try {
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
        this.$forceUpdate();
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
        if (!this.wallet.connected) return false;
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
          information: {
            show: false
          },
          chart: {
            show: false
          },
          prediction: {
            show: false,
            direction: 0,
            amount: "",
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

    async loadGames() {
      ((await Promise.all((await this.workspace.program.account.game.all()).map(async (gameProgramAccount: ProgramAccount<GameAccount>) => (new Game(
        gameProgramAccount.account
      ))))) as Array<Game>).forEach(async newgame => {
        if (!this.games.some(game => game.account.address.toBase58() === newgame.account.address.toBase58())) {
          this.games.push(newgame);
          await this.initFrontendGameData(newgame);
        }
      })
    },

    async loadVaults() {
        ((await Promise.all((await this.workspace.program.account.vault.all()).map(async (vaultProgramAccount: ProgramAccount<VaultAccount>) => (new Vault(
          vaultProgramAccount.account
        ))))) as Array<Vault>).forEach((vault: Vault) => {
          if (!this.vaults.has(vault.account.address.toBase58()))
            this.vaults.set(vault.account.address.toBase58(), vault);
        });
    },

    async loadWorkspace() {
      if (this.workspace.program instanceof Program<PredictionGame>) {
        await this.loadGames();
        await this.loadVaults();
        if (this.updateInterval) clearInterval(this.updateInterval)
        this.updateInterval = setInterval(async () => {
          await Promise.allSettled([
            await this.updateGames(),
            await this.updateVaults(),
            await this.loadPredictions(),
            await this.updateUser(),
            await this.updateTokenAccountBalances()
          ]);
          this.$forceUpdate()
        }, 1000 * this.games.length)
      }
      
    },

    async loadPredictions() {
      if (this.wallet !== null && this.wallet.connected && this.wallet.publicKey !== undefined && this.wallet.publicKey !== null) {
        try {
          this.userPredictions = (await (this.workspace as Workspace).program.account.userPrediction.all([ { memcmp: { offset: 8, bytes: bs58.encode((this.wallet.publicKey as PublicKey)?.toBuffer() as Buffer) }}])).map((programAccount: ProgramAccount<UserPredictionAccount>) => {
            return new UserPrediction(programAccount.account)
          })
          this.$forceUpdate();
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
            initWorkspace(window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net", window.location.host.split('.')[0] as Cluster);
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
        // let simulate = await (this.workspace as Workspace).program.provider.connection.simulateTransaction(tx);
        // console.log(simulate.value.logs)
        let signature = await (this.workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
        
        txStatus.subtitle = "Sent"
        try {
          txStatus.subtitle = "Confirming"
          await confirmTxRetry(this.workspace, signature);
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
      
    },
  },
  watch: {
    wallet: {
      handler(val: WalletStore, oldVal: WalletStore) {
        if (val !== null && val.connected && val.disconnecting) {
          console.log('wallet disconnected')
          this.tokenAccounts = new Map<string, Account>();
          this.userPredictions = new Array<UserPrediction>();
          clearInterval(this.updateInterval)
          this.loadWallet();
        }
      },
      deep: true
    }
  },
  created() {
    if (this.aggrWorkspace === '') {
      this.aggrWorkspace = window.location.host + "/workspaces/btc.json";
    }
    this.tokenList = useTokenList();
    this.loadWallet();
    if (this.workspace === null) {
     initWorkspace(window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net", window.location.host.split('.')[0] as Cluster);
      this.workspace = useWorkspace();
      this.loadWorkspace();
    }
    
  },
  mounted() {
    if (this.aggrWorkspace === '') {
      this.aggrWorkspace = window.location.host + "/workspaces/btc.json";
    }
    this.tokenList = useTokenList();
    this.loadWallet();
    if (this.workspace === null) {
      initWorkspace(window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net", window.location.host.split('.')[0] as Cluster);
      this.workspace = useWorkspace();
      this.loadWorkspace();
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
    
    <v-row justify="center" class="text-center" style="width: 100%; min-height: 75vh; margin: 0 auto;">
      <v-col-auto>
        <div v-for="game in games" :key="'game-'+game.account.address.toBase58()">
          <v-card
            flat
            :min-width="300"
            :max-width="300"
            tonal
            :class="`ma-2 ${
              wallet.connected ? 
                game.currentRound.account.roundPredictionsAllowed ? 
                  frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Up ? 
                    'game-card up' : 
                      frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Down ? 
                    'game-card down' : 
                  'game-card' : 
                  userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()) ? 
                    userPredictions.find(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ?
                      'game-card up' :
                  'game-card down' :
                'game-card' :
              'game-card' 

            }`" 
            v-if="game.currentRound && frontendGameData.get(game.account.address.toBase58()) !== undefined"
          >

            <v-btn icon size="x-small" style="right: 0; bottom: 0; z-index: 1;" :variant="!frontendGameData.get(game.account.address.toBase58()).information.show ? 'text' : 'plain'" @click.stop="() => { frontendGameData.get(game.account.address.toBase58()).information.show = !frontendGameData.get(game.account.address.toBase58()).information.show }">
              <v-tooltip
                activator="parent"
                location="top"
              >Information</v-tooltip>
              <v-icon class="information-icon">{{ !frontendGameData.get(game.account.address.toBase58()).information.show ? 'mdi-information-variant' : 'mdi-close' }}</v-icon>
            </v-btn>

            <v-btn icon size="x-small" style="right: 0; bottom: 0; z-index: 1;" variant="text" @click.stop="() => { aggrWorkspace = 'http://localhost:3000/workspaces/'+game.account.baseSymbol.toLowerCase()+'.json'  }">
              <v-tooltip
                activator="parent"
                location="top"
              >Open in Aggr</v-tooltip>
              <v-icon class="information-icon">mdi-chart-line-variant</v-icon>
            </v-btn>
            
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
              :variant="frontendGameData.get(game.account.address.toBase58()).information.show ? 'text' : 'text'" 
              style="background-color: rgba(0,0,0,0); width: 100%; height: 100%; padding: 1em; transition: all .3s;"
              @click="() => {
                if (game.currentRound.account.roundPredictionsAllowed) {
                  frontendGameData.get(game.account.address.toBase58()).prediction.show = !frontendGameData.get(game.account.address.toBase58()).prediction.show;
                } else {
                  frontendGameData.get(game.account.address.toBase58()).prediction.show = !frontendGameData.get(game.account.address.toBase58()).prediction.show;
                  frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.None; 
                }
              }">
              <v-icon 
                v-if="game.currentRound !== undefined && !frontendGameData.get(game.account.address.toBase58()).information.show" 
                :color="(!game.currentRound.account.roundPredictionsAllowed || userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) ? 'error' : 'success'"
                :style="`transition: all .3s; background-color: rgba(0, 0, 0, 0); position: absolute; left: 0; right: 0; ${!frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'top: 0; bottom: 1em; left: 0em; margin-top: auto; margin-bottom: auto;' : 'bottom: -0.5em; left: 0%;'} margin-left: auto; margin-right: auto;`">
                {{ !game.currentRound.account.roundPredictionsAllowed || userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()) ? 'mdi-lock' : 'mdi-lock-open' }}
              </v-icon>
              <v-row v-if="!frontendGameData.get(game.account.address.toBase58()).information.show" style="transition: all .3s; max-width: 300px; min-width: 300px;">
                <v-col :style="`transition: all .3s; min-width: 150px; max-width: 150px; margin: 0; ${frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'display: none;' : ''}`" v-if="game.currentRound">
                  <v-row :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                        :class="`up-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                        style="margin-right: 4px; margin-bottom: 0.25em; width: 146px;"
                        @click.stop="(e) => { 
                          e.preventDefault(); 
                          if ( wallet.connected && game.currentRound.account.roundPredictionsAllowed && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) {
                            frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Up;
                          }
                          frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                        }">
                    <v-col >
                      <v-tooltip
                        v-if="game.currentRound.account.roundPredictionsAllowed" 
                        activator="parent"
                        location="top"
                      >Predict Up</v-tooltip>
                      <v-card-title>
                        <v-btn
                          variant="plain"
                          :disabled="!wallet.connected || !game.currentRound.account.roundPredictionsAllowed || userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"
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
                        <span style="margin: 0 auto;">
                          {{ game.currentRound.account.totalUpAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalUpAmount).toNumber().toFixed(2) + 'x' : '1.00x' }}
                        </span>
                      </v-card-subtitle>
                    </v-col>
                  </v-row>
                  
                  <v-divider ></v-divider>
                  <v-row :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                      :class="`down-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                      style="margin-right: 4px; margin-top: 0.25em; width: 146px;"
                      @click.stop="(e) => { 
                        e.preventDefault(); 
                        frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                        if ( wallet.connected && game.currentRound.account.roundPredictionsAllowed && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) {
                          frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Down;
                        }
                      }">
                    <v-col >
                      <v-tooltip
                        v-if="game.currentRound.account.roundPredictionsAllowed" 
                        activator="parent"
                        location="bottom"
                      >Predict Down</v-tooltip>
                      <v-card-subtitle>
                        <span style="margin: 0 auto;">
                          {{ game.currentRound.account.totalDownAmount.gt(new anchor.BN(0)) ? (game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount)).div(game.currentRound.account.totalDownAmount).toNumber().toFixed(2) + 'x' : '1.00x'}}
                        </span>
                      </v-card-subtitle>
                      <v-card-title>
                        <v-btn 
                          variant="plain"
                          :disabled="!wallet.connected || !game.currentRound.account.roundPredictionsAllowed || userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"
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
                  </v-row>
                  
                </v-col>
                <v-col v-else-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show && frontendGameData.get(game.account.address.toBase58()).needsToLoad" style=" width: 146px; margin: auto; transition: all .3s;">
                  <v-progress-circular color="#6864b7" indeterminate/>
                </v-col>
                <v-col v-else-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show" style="width: 146px; margin: auto; transition: all .3s;">
                  <v-icon size="32px">mdi-alert</v-icon>
                </v-col>
                <v-divider v-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show" vertical></v-divider>
                <!-- COIN & QUOTE -->
                <v-col :style="`transition: all .3s; max-width: 150px; min-width: 150px; margin: 0px; height: 100%;`" justify="center" class="text-center">
                  <!-- COIN & QUOTE -->
                  <v-row >
                    <v-col >
                      <v-card-title class="text-center" v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null">
                        
                          <v-tooltip
                            top
                          >
                            <template v-slot:activator="{ props }">
                              <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.account.baseSymbol.toLowerCase()"/>
                              <v-divider vertical style="margin: 0 auto;"></v-divider>
                              <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
                            </template>
                            <span>{{game.account.baseSymbol}} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</span>
                          </v-tooltip>
                        <!-- <p style="margin: 0 auto;">{{ game.account.baseSymbol }} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</p>  -->
                      </v-card-title>
                      <div :style="`${frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'margin-top: 1em;': ''}`"></div>
                      <v-card-subtitle  v-if="frontendGameData.get(game.account.address.toBase58()).priceFeed !== null" class="text-center">
                        <span style="margin: 0 auto;">
                          Pool $ {{ 
                            bnToNumber(game.currentRound.account.totalUpAmount.add(game.currentRound.account.totalDownAmount), getVault(game).account.tokenDecimals).toFixed(2)
                          }}
                        </span>
                      </v-card-subtitle>
                    </v-col>
                    
                  </v-row>
                  <v-divider v-if="!frontendGameData.get(game.account.address.toBase58()).prediction.show" style="margin-top: 1.4em;"></v-divider>
                  <!-- START PRICE AND DIFF (NO SHOW PREDICTION)-->
                  <v-row style="margin: 0;" v-if="game.currentRound && !frontendGameData.get(game.account.address.toBase58()).prediction.show">
                    <v-col style="margin: 0; padding: 0;">
                      <v-card-text class="text-center" >
                        <v-row style="margin: 1px;">
                          <v-col style="margin: auto 0; padding: .5em 0;" class="start-price">
                          <v-tooltip
                            activator="parent"
                            location="end"
                          >Starting Price</v-tooltip>
                            $ {{  bnToNumber(game.currentRound.account.roundStartPrice, getVault(game).account.tokenDecimals).toFixed(2) }}
                          </v-col>
                        </v-row>
                        <v-row style="margin: 1px;">
                          <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                              bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) > 0 ? 'up' : bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) < 0 ? 'down' : 'tie'
                            }`">
                            <v-tooltip
                              activator="parent"
                              location="end"
                            >Price Difference</v-tooltip>
                            <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1010;">
                              <LottieAnimation :speed=".75" v-if="bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                              <LottieAnimation :speed=".75" v-else-if="bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                              <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                            
                            </div>
                            <span style="margin-left: 24px;">
                              $ {{ 
                                bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals).toFixed(2)
                              }}
                            </span>
                            
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </v-col>
                  </v-row>
                  
                </v-col>
                <v-divider v-if="frontendGameData.get(game.account.address.toBase58()).prediction.show" vertical></v-divider>
                <!-- BUTTON SHOW TOP RIGHT -->
                <v-col v-if="frontendGameData.get(game.account.address.toBase58()).prediction.show" style="transition: all .3s; width: 150px !important; margin: 0 auto;">
                  <v-card-text justify="center" class="text-center" v-if="game.currentRound">
                    <v-row style="margin: 1px;">
                      <v-col style="margin: auto 0; padding: .5em 0;" class="start-price">
                        <v-tooltip
                          activator="parent"
                          location="end"
                        >Starting Price</v-tooltip>
                          $ {{  bnToNumber(game.currentRound.account.roundStartPrice, getVault(game).account.tokenDecimals).toFixed(2) }}                      
                      </v-col>
                    </v-row>
                    <v-row style="margin: 1px;">
                      <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                          bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) > 0 ? 'up' : bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) < 0 ? 'down' : 'tie'
                        }`">
                        <v-tooltip
                          activator="parent"
                          location="end"
                        >Price Difference</v-tooltip>
                        <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1010;">
                          <LottieAnimation :speed=".75" v-if="bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                          <LottieAnimation :speed=".75" v-else-if="bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                          <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                        
                        </div>
                        <span style="margin-left: 24px;">
                          $ {{ 
                            bnToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDecimals).toFixed(2)
                          }}
                        </span>
                        
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-col>
              </v-row>
              <!-- INFORMATION -->
              <v-row v-else justify="center" class="center-text">
                <v-col style="width: 100%; margin: auto;" v-if="game && game.currentRound">
                  <v-card-title class="text-center" v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null">
                    <v-spacer></v-spacer>
                    <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.account.baseSymbol.toLowerCase()"/><v-divider vertical style="margin: 0 .5em;"></v-divider><CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
                    <v-spacer></v-spacer>
                    <!-- <p style="margin: 0 auto;">{{ game.account.baseSymbol }} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</p>  -->
                  </v-card-title>
                  <v-card-subtitle >
                    <span style="margin: 0 auto;">
                      {{ frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(0, 4) + '..' + frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(frontendGameData.get(game.account.address.toBase58()).priceFeed.length - 4)}}
                      <a style="text-decoration: none;" target="_blank" :href="`https://solscan.io/account/${frontendGameData.get(game.account.address.toBase58()).priceFeed}?cluser=${workspace.cluster}`"><v-tooltip activator="parent" location="bottom">Solscan</v-tooltip>&nbsp;<v-icon size="xsmall">mdi-open-in-new</v-icon></a>
                    </span>
                  </v-card-subtitle>
                  <v-card-text>
                    <span style="margin: 0 auto;">Time Remaining: 
                      {{ 
                        Math.max(0, Math.floor((game.currentRound.account.roundLength - game.currentRound.account.roundTimeDifference.toNumber()) / 60)) + ':' 
                        + ((game.currentRound.account.roundLength - game.currentRound.account.roundTimeDifference.toNumber()) % 60 >= 10 ? ((game.currentRound.account.roundLength - game.currentRound.account.roundTimeDifference.toNumber()) % 60) : '0' + Math.max(0, (game.currentRound.account.roundLength - game.currentRound.account.roundTimeDifference.toNumber()) % 60)) }}
                    </span>
                    <br>
                    <span style="margin: 0 auto;">Game Volume: {{ 
                      bnToNumber(game.account.totalVolume.add(U64MAX.mul(game.account.totalVolumeRollover)), getVault(game).account.tokenDecimals).toFixed(2)
                    }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}</span>
                    <br>
                    <span style="margin: 0 auto;">Current Round: {{ game.currentRound.account.roundNumber }}</span>
                    <br>
                    <span style="margin: 0 auto;">Times Cranked: {{ game.currentRound.account.totalCranks }}</span>
                    <br>
                    <span style="margin: 0 auto;">Total Crankers: {{ game.currentRound.account.totalUniqueCrankers }}</span>
                    <br>
                    <br>
                    <span style="margin: 0 auto;">
                      Staked Up: {{ 
                        bnToNumber(game.currentRound.account.totalUpAmount, getVault(game).account.tokenDecimals).toFixed(2)
                      }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                    </span>
                    <br>
                    <span style="margin: 0 auto;">
                      Staked Down: {{ 
                        bnToNumber(game.currentRound.account.totalDownAmount, getVault(game).account.tokenDecimals).toFixed(2)
                      }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                    </span>
                    <br>
                    <br>
                    <span style="margin: 0 auto;">
                      Fee Collected: {{ 
                        bnToNumber(game.currentRound.account.totalFeeCollected, getVault(game).account.tokenDecimals).toFixed(2)
                      }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                    </span>
                    <br>
                    <span style="margin: 0 auto;">
                      Paid to Cranks: {{ 
                        bnToNumber(game.currentRound.account.totalAmountPaidToCranks, getVault(game).account.tokenDecimals).toFixed(2)
                      }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                    </span>
                  </v-card-text>
                </v-col>
              </v-row>
            </v-btn>
            <v-expand-transition>
              <div style="max-width: 300px; transition: all .3s;" v-if="frontendGameData.get(game.account.address.toBase58()).prediction.show">
                <v-divider></v-divider>
                <v-card-text v-if="game.currentRound && wallet.connected && (getTokenAccount(game)) !== undefined">
                  <v-row :style="`padding-bottom: .5em; padding-top: .5em; ${game.currentRound.account.roundPredictionsAllowed ? '' : ''}`">
                    <v-col 
                      :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                      v-if="!userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" 
                      style="margin-right: 0.3em;"
                      :class="`up-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                      @click.stop="(e) => { 
                        if ( game.currentRound.account.roundPredictionsAllowed ) {
                          e.preventDefault(); 
                          frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                          frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Up; 
                        }
                        
                      }"
                    >
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
                      <v-card-subtitle >
                        <span style="margin: 0 auto;">
                        {{ game.currentRound.account.totalUpAmount.gt(new anchor.BN(0)) ? 
                          ( 
                            bnDivMod(game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount), game.currentRound.account.totalUpAmount, 0)
                          ).toFixed(2) + 'x' : '1.00x' 
                        }}
                        </span>
                      </v-card-subtitle>
                    </v-col>
                    <v-divider vertical v-if="!userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                    <v-col v-if="userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())">
                      <v-row>
                        <v-spacer></v-spacer>
                          <v-card-title>
                            Prediction
                          </v-card-title>
                          <v-spacer></v-spacer>
                          <v-icon style="margin: auto 0; top: 0; bottom: 0;" :color="`${userPredictions.find(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ? 'success' : 'error'}`">
                            {{ userPredictions.find(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold' }} 
                          </v-icon> 
                          <v-spacer></v-spacer>
                          <v-card-title>
                            
                            {{ userPredictions.find(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.amount.div(new anchor.BN(10).pow(new anchor.BN(getVault(game).account.tokenDecimals))) }} {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
                          </v-card-title>
                        
                        <v-spacer></v-spacer>
                      </v-row>
                    </v-col>
                    <v-col 
                      :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                      v-if="!userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" 
                      style="margin-left: 0.3em;"
                      :class="`down-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                      @click.stop="(e) => { 
                        if ( game.currentRound.account.roundPredictionsAllowed ) {
                          e.preventDefault(); 
                          frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                          frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Down; 
                        }
                      }"
                    >
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
                      <v-card-subtitle style="margin: 0 auto;">
                        <span style="margin: 0 auto;">
                          {{ 
                            game.currentRound.account.totalDownAmount.gt(new anchor.BN(0)) ? 
                              bnDivMod(game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount), game.currentRound.account.totalDownAmount, 0)
                            + 'x' : '1.00x'
                          }}
                        </span>
                      </v-card-subtitle>
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-divider v-if="game.currentRound.account.roundPredictionsAllowed && getTokenAccount(game) !== undefined && new anchor.BN(getTokenAccount(game).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)).div((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals))).gte(new anchor.BN(1)) && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                <v-card-text v-if="game.currentRound.account.roundPredictionsAllowed && getTokenAccount(game) !== undefined && new anchor.BN(getTokenAccount(game).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)).div((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals))).gte(new anchor.BN(1)) && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" style="margin-top: 1em;">
                  <v-row >
                    <v-text-field 
                      hide-details
                      style="width: calc(100%);" 
                      variant="outlined" 
                      type="number" 
                      :persistent-placeholder="true"
                      :placeholder="'Balance: '+(((new anchor.BN((getTokenAccount(game)).amount.toString())).add(user !== null && user.account.claimable !== undefined ? user.account.claimable : new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals)))).toNumber() + ' ' + frontendGameData.get(game.account.address.toBase58()).mint.symbol"
                      :step="0.01" 
                      :label="`Prediction Amount ${frontendGameData.get(game.account.address.toBase58()).mint !== null ? '(' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + ')' : ''}`" 
                      v-model="frontendGameData.get(game.account.address.toBase58()).prediction.amount"
                      @update:model-value="(value: any) => {
                        if (
                            bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < parseFloat(value)
                          ) {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
                        } else if (parseFloat(value) < 0) {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = 0
                          frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 0
                          return;
                        }
                        frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = ( parseFloat(value) / bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) ) * 100
                      }"
                    >
                      <template v-slot:append>
                        <v-btn size="small" variant="outlined" @click="() => {
                          frontendGameData.get(game.account.address.toBase58()).prediction.amount = bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
                          frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 100;
                        }">Max</v-btn>
                      </template>
                    </v-text-field>
                    <v-slider
                      hide-details
                      v-model="frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount"
                      @update:model-value="(value: number) => {
                        frontendGameData.get(game.account.address.toBase58()).prediction.amount = new Number(
                          (
                            (
                              bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
                            )
                            * (value / 100)
                          ).toFixed(2)
                        ).valueOf()
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
                <v-divider v-if="wallet.connected && (getTokenAccount(game)) !== undefined && bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) >= 1 && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                <v-card-actions v-if="wallet.connected && (getTokenAccount(game)) !== undefined && bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) >= 1 && !userPredictions.some(prediction => prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())">
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
                <v-divider v-if="wallet.connected && ( getTokenAccount(game) === undefined || bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 )"></v-divider>
                <v-card-actions style="margin-top: .5em;" v-if="wallet.connected && ( getTokenAccount(game) === undefined || bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 )">
                  <v-spacer></v-spacer>
                    <v-btn variant="outlined" v-if="getTokenAccount(game) === undefined" @click="async () => { initTokenAccountForGame(game); }">
                      Initialize Token Account
                    </v-btn>
                    <v-btn variant="outlined" v-else-if="bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 && (workspace.cluster === 'devnet' || workspace.cluster === 'testnet')" @click="async () => { await airdrop(game) }">Airdrop</v-btn>
                    <v-btn variant="outlined" v-else-if="bnToNumber(new anchor.BN((getTokenAccount(game)).amount.toString()).add(user !== null ? user.account.claimable : new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 && workspace.cluster === 'mainnet-beta'" href="https://jup.ag/swap/SOL-USDC">SWAP</v-btn>
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
                    Claim {{ 
                      bnToNumber(user.account.claimable, frontendGameData.get(game.account.address.toBase58()).mint.decimals).toFixed(2)
                    }} {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
                  </v-btn>
                  <v-spacer></v-spacer>
                </v-card-actions>
              </div>
            </v-expand-transition>
          </v-card>
        </div>
        
      </v-col-auto>
      <v-col style="padding: 8px;" class="d-none d-lg-flex">
        <iframe id="aggr" :src="`https://aggr.solpredict.io?workspace-url=${aggrWorkspace}`" frameborder="0" style="width: 100%; height: 100%; min-height: 75vh; max-height: 75vh;"></iframe>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>

.price-difference {
  border-radius: 1em;
  color: white;
}


.start-price {
  border-radius: 1em;
  background-color: rgba(172, 161, 18, 0.187);
  color: white;
}


.price-difference.up {
  border-radius: 1em;
  background-color: rgba(76,175,80,0.1);
  color: white;
}

.price-difference.down {
  border-radius: 1em;
  background-color: rgba(207,102,121,0.1);
  color: white;
}

.price-difference.tie {
  border-radius: 1em;
  background-color: rgba(38, 99, 128, 0.1);
  color: white;
}

.down-area.hover:hover {
  border-radius: 1em;
  background-color: rgba(207,102,121,0.1);
  cursor: pointer;
  transition: all .3s;
}

.up-area.hover:hover {
  border-radius: 1em;
  background-color: rgba(76,175,80,0.1);
  cursor: pointer;
  transition: all .3s;
}

.information-icon:hover {
  color: white;
}

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
