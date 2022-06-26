<script setup lang="ts">

import { defineComponent, onMounted } from 'vue'

import { Program, ProgramAccount } from "@project-serum/anchor";
import { Cluster, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { confirmTxRetry, fetchAccountRetry } from "sdk/lib/util";
import { TokenInfo } from "@solana/spl-token-registry";
import { UpOrDown } from 'sdk'
import UserPrediction, { UserPredictionAccount } from "sdk/lib/accounts/userPrediction";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";
import Round, { RoundAccount } from "sdk/lib/accounts/round";
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



let games = ref([] as Array<Game>);
let vaults = ref(new Map<string, Vault>());
let userPredictions = ref([] as Array<UserPrediction>);
let frontendGameData = ref(new Map<string, FrontendGameData>());
let wallet = ref(null as WalletStore); 
let workspace = ref(null as Workspace);
let tokenList = ref(null as TokenInfo[]);
let user = ref(null as User);
let tokenAccounts = ref(new Map<string, Account>());
let updateInterval = ref(null as NodeJS.Timer);
let aggrWorkspace = ref('');

const { txStatusList } = storeToRefs(useStore());

onMounted(() => {
  ;(async () => {
    tokenList.value = useTokenList();

    console.log(tokenList.value);
      
    if (aggrWorkspace.value === '') {
      aggrWorkspace.value = window.location.host + "/workspaces/btc.json";
    }
    
    loadWallet();
    if (workspace.value === null) {
      initWorkspace(window.location.host.startsWith("localhost") || window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net", window.location.host.startsWith("localhost") ? 'devnet' : window.location.host.split('.')[0] as Cluster);
      workspace.value = useWorkspace();
      loadWorkspace();
    }
  })();
})

type FrontendGameData = {
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

type TxStatus = {
  index: number,
  signatures: Array<string>,
  color: string,
  title: string,
  subtitle: string
  loading: boolean
  show: boolean;
}


function bnToNumber(num: anchor.BN, decimals: number) : number {
  let _10to = new anchor.BN(10).pow(new anchor.BN(decimals));
  return bnDivMod(num, _10to, decimals)
}
function bnDivMod(num: anchor.BN, by: anchor.BN, decimals: number) : number {
  return (num.div(by).toNumber() + (num.mod(by).toNumber() / (10 ** decimals)))
}
function initNewTxStatus() : TxStatus {
  let index = txStatusList.value.push({
      index: -1,
      signatures: new Array<string>(),
      color: '',
      title: '',
      subtitle: '',
      loading: false,
      show: false
  });
  let txStatus = txStatusList[index-1];
  txStatus.index = index-1;
  return txStatus;
}

function deleteTxStatus(txStatus: TxStatus | number) {
  if ((txStatus as TxStatus).index !== undefined) {
    txStatusList.value.splice((txStatus as TxStatus).index, 1)
  } else {
    txStatusList.value.splice(txStatus as number, 1)
  }
}

function patchTxStatus(txStatus: TxStatus) {
  txStatusList.value[txStatus.index] = txStatus;
}

function hideTxStatus(txStatus: TxStatus | number, timeout = 0) {
  setTimeout(() => {
    if ((txStatus as TxStatus).index !== undefined) {
      txStatusList.value[(txStatus as TxStatus).index].show = false;
    } else {
      txStatusList.value[txStatus as number].show = false;
    }
  }, timeout)
  
}

function getVault(game: Game): Vault {
  return vaults.value.get(game.account.vault.toBase58())
}

async function updateVault(vault: Vault): Promise<void> {
  if (vault)
    vaults.value.set(vault.account.address.toBase58(), new Vault(await fetchAccountRetry<VaultAccount>(workspace as Workspace, 'vault', vault.account.address)))
  
}

async function updateVaults(): Promise<void> {
  await Promise.allSettled([...vaults.value.values()].map(async (vault: Vault) => {
    if (vault !== undefined) {
      await updateVault(vault);
    }
  }))
}

function getTokenMint(game: Game) : PublicKey {
  return (getVault(game)).account.tokenMint;
}

async function makePrediction(game: (Game)) {

  let txStatus = initNewTxStatus()

  let gameFrontendData = frontendGameData.get(game.account.address.toBase58())

  if (wallet.value.connected && wallet.value.publicKey !== undefined && wallet.value.publicKey !== null) {
    // update the game
    await game.updateGameData(workspace as Workspace);
    await game.updateRoundData(workspace as Workspace);

    if (!game.currentRound.account.roundPredictionsAllowed)  {
      txStatus.color = 'error';
      txStatus.title = "Round Predictions Not Allowed"
      txStatus.show = true;
      hideTxStatus(txStatus, 5000);
      return;
    }

    // setup the tx's
    // let tx = new Transaction();
    let txs = { txs: new Array<Transaction>(), info: new Array<string>() }
    let amount = (new anchor.BN(gameFrontendData.prediction.amount)).mul((new anchor.BN(10)).pow(new anchor.BN(getVault(game).account.tokenDecimals)));
    
    if (amount.gt(U64MAX) || amount.lt(USER_PREDICTION_MIN_AMOUNT(game.account.tokenDecimal))) {
      txStatus.color = 'error';
      txStatus.title = "Minimum Amount is 1 " + gameFrontendData.mint.symbol
      txStatus.show = true;
    }
    // if the user doesn't exist try and load otherwise add it as a tx
    let [userPubkey, _userPubkeyBump] = await (workspace as Workspace).programAddresses.getUserPubkey(workspace.owner);
    let tx = new Transaction();
    let txTitle = '';
    if (user === undefined || user === null) {
      if (!(await loadUser())) {
        let initUserIX = await User.initializeUserInstruction(workspace as Workspace, userPubkey);
        // let initUserTX = new Transaction().add(initUserIX);
        // initUserTX.feePayer = (workspace as Workspace).owner;
        // initUserTX.recentBlockhash = (await (workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
        tx.add(initUserIX)
        txTitle = "Initialize User & "
      }
    }

    
    let fromTokenAccount = await getTokenAccount(game);
    let vault = getVault(game);
    
    let [userPredictionPubkey, _userPredictionPubkeyBump] = await (workspace as Workspace).programAddresses.getUserPredictionPubkey(game, game.currentRound, user || workspace.owner);

    let initUserPredictionIX = await UserPrediction.initializeUserPredictionInstruction(
      workspace as Workspace,
      vault,
      game, 
      game.currentRound, 
      user.value || userPubkey, 
      fromTokenAccount,
      workspace.owner,
      userPredictionPubkey,
      gameFrontendData.prediction.direction, 
      amount
    )
    // initUserPredictionIX.keys.forEach(key => console.log(key.pubkey.toBase58()))

    tx.add(initUserPredictionIX);
    txTitle += "Initialize User Prediction"

    let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>(userPredictions.value.filter((prediction: UserPrediction) => prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
      return await UserPrediction.closeUserPredictionInstruction(workspace as Workspace, prediction)
    }));
    
    
    if (closeUserPredictionInstructions.length > 0) {
      tx.add(...closeUserPredictionInstructions)
      txTitle += " & Close " + closeUserPredictionInstructions.length + " User Prediction" + (closeUserPredictionInstructions.length > 1 ? 's' : '')
    }
      

    tx.feePayer = (workspace as Workspace).owner;
    tx.recentBlockhash = (await (workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash
    tx = await (workspace as Workspace).wallet.signTransaction(tx);
    
    txStatus.show = true;
    txStatus.loading = true;
    try {
      let simulation = await (workspace as Workspace).program.provider.connection.simulateTransaction(tx);
      console.log(simulation.value.logs);
      let signature = await (workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
    
      txStatus.signatures.push(signature);
      txStatus.color = 'success'
      txStatus.title = txTitle
      txStatus.subtitle = "Sent TX!"
      patchTxStatus(txStatus);

      try {
        txStatus.color = 'warning'
        txStatus.subtitle = "Confirming TX!"
        await confirmTxRetry(workspace as Workspace, signature);
        txStatus.loading = false;
        txStatus.color = "success"
        txStatus.subtitle = "Confirmed TX!"
        
      } catch(error) {
        txStatus.color = 'error'
        txStatus.subtitle = "Failed to Confirm!"
        txStatus.loading = false;
        patchTxStatus(txStatus);
      }
    } catch (error) {
      console.error(error);
      txStatus.color = 'error'
      txStatus.subtitle = "TX Failed!"
      txStatus.loading = false;
    }
    hideTxStatus(txStatus.index, 5000);
    await updateTokenAccountBalances();
    await updateUser();
    await loadPredictions();
  }
}

function getTokenAccount(game: Game) : Account {
  return tokenAccounts.value.get(getTokenMint(game).toBase58())
}

async function updateTokenAccount(game: Game) : Promise<void> {
  try {

    let mint = await getTokenMint(game);
    let address: PublicKey;

    if (!tokenAccounts.value.has(mint.toBase58())) {
      address = await getAssociatedTokenAddress(mint, workspace.owner); 
    } else {
      address = tokenAccounts.get(mint.toBase58()).address;
    }

    try {
      let tokenAccount = await getAccount(workspace.program.provider.connection, address);
      if (tokenAccount.owner.toBase58() === workspace.owner.toBase58()) {
        tokenAccounts.value.set(mint.toBase58(), tokenAccount);
      } else {
        tokenAccounts.value.delete(mint.toBase58());
      }
    } catch (error) {
      tokenAccounts.value.delete(mint.toBase58());
    }

  } catch(error) {
    console.error(error);
  }
}

async function initTokenAccountForGame(game: Game) {
  let tokenMint = await getTokenMint(game);
  const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
          workspace.owner,
          await getAssociatedTokenAddress(tokenMint, workspace.owner),
          workspace.owner,
          tokenMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
      )
  );
  let  txStatus = initNewTxStatus();
  try {

    txStatus.title = "Initializing Token Account";
    txStatus.subtitle = "Sending";
    txStatus.color = "warning"
    txStatus.loading = true;
    txStatus.show = true;

    let txSignature = await (workspace as Workspace).sendTransaction(transaction);
    
    txStatus.subtitle = "Sent and Confirming";
    await confirmTxRetry(workspace as Workspace, txSignature)
    txStatus.color = "success"
    txStatus.subtitle = "Sent and Confirmed";
    txStatus.loading = false;
    await updateTokenAccountBalances();

  } catch(error) {
    txStatus.title = "Initializing Token Account";
    txStatus.subtitle = "Failed";
    txStatus.color = "error"
    txStatus.loading = false;
    txStatus.show = true;
    console.error(error);
  }
  hideTxStatus(txStatus.index, 5000);
  
}

async function airdrop(game: Game) {
  if ((workspace as Workspace).cluster === 'devnet' || (workspace as Workspace).cluster === 'testnet') {
    let txStatus = initNewTxStatus();
    try {
      txStatus.color = 'warning',
      txStatus.title = 'Airdropping Funds'
      txStatus.subtitle = ''
      txStatus.loading = true
      txStatus.show = true
      let { status, data } = (await axios.get('http://localhost:8444/airdrop/'+(await getTokenAccount(game)).address.toBase58()));
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
          
    hideTxStatus(txStatus.index, 5000);
    await updateTokenAccountBalances();
  }
}

async function initUser() : Promise<boolean> {
  try {
    user.value = await User.initializeUser(workspace as Workspace)
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function loadUser() : Promise<boolean> {
  console.log(wallet.value.publicKey.toBase58())
    if (!wallet.value.connected) return false;
      try {
        user.value = new User(await (workspace as Workspace).program.account.user.fetch((await (workspace as Workspace).programAddresses.getUserPubkey(new PublicKey((wallet.value.publicKey as PublicKey || wallet.publicKey as unknown as PublicKey).toBase58())))[0]))
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
}

async function updateUser() {
  if (user.value !== null) {
    await (user.value as User).updateData(await fetchAccountRetry<UserAccount>(workspace as Workspace, 'user', user.value.account.address))
  } else {
    await loadUser();
  }
  
}

async function updateGames() {
  await Promise.allSettled(games.value.map(async (game: Game, index: number) => {
    let _frontendGameData = frontendGameData.value.get(game.account.address.toBase58())
    if (_frontendGameData === undefined) {
      await initFrontendGameData(game);
    }
    try {
      await game.updateGameData(workspace as Workspace);
      if (game.currentRound && game.previousRound) {
        await game.updateRoundData(workspace as Workspace);
      } else {
        await game.loadRoundData(workspace as Workspace);
      }
    } catch(error) {
      console.error(error);
    }
  }))
  
}

async function updateTokenAccountBalances() {
  await Promise.allSettled(games.value.map(async (game: Game) => await updateTokenAccount(game)));
}

async function initFrontendGameData (game: Game) {
  if (!frontendGameData.value.has(game.account.address.toBase58())) {
    frontendGameData.value.set(game.account.address.toBase58(), {
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
      if ((workspace.cluster !== 'mainnet-beta' && workspace.cluster !== 'devnet') || window.location.host.startsWith("localhost")) {
        mint = tokenList.value.find((token: TokenInfo) => token.symbol === "USDC");
      } else {
        mint = tokenList.value.find(async (token: TokenInfo) => token.address === getTokenMint(game).toBase58())
      }
      let priceProgram = game.account.priceProgram.toBase58()
      let priceFeed = game.account.priceFeed.toBase58()
      frontendGameData.value.set(
        game.account.address.toBase58(), 
        { 
          ...frontendGameData.value.get(game.account.address.toBase58()), 
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
  
}

async function loadGames() {
  ((await Promise.all((await (workspace as Workspace).program.account.game.all()).map(async (gameProgramAccount: ProgramAccount<GameAccount>) => (new Game(
    gameProgramAccount.account
  ))))) as Array<Game>).forEach(async newgame => {
    if (!games.value.some(game => game.account.address.toBase58() === newgame.account.address.toBase58())) {
      games.value.push(newgame);
      await initFrontendGameData(newgame);
    }
  })
}

async function loadVaults() {
    ((await Promise.all((await (workspace as Workspace).program.account.vault.all()).map(async (vaultProgramAccount: ProgramAccount<VaultAccount>) => (new Vault(
      vaultProgramAccount.account
    ))))) as Array<Vault>).forEach((vault: Vault) => {
      if (!vaults.value.has(vault.account.address.toBase58()))
        vaults.value.set(vault.account.address.toBase58(), vault);
    });
}

async function loadWorkspace() {
  if ((workspace as Workspace).program instanceof Program<PredictionGame>) {
    await loadGames();
    await loadVaults();
    if (updateInterval.value) clearInterval(updateInterval.value)
    updateInterval.value = setInterval(async () => {
      await Promise.allSettled([
        await updateGames(),
        await updateVaults(),
        await loadPredictions(),
        await updateUser(),
        await updateTokenAccountBalances()
      ]);
    }, 10000)
  }
  
}

async function loadPredictions() {
  if (wallet.value !== null && wallet.value.connected && wallet.value.publicKey !== undefined && wallet.value.publicKey !== null) {
    try {
      userPredictions.value = (await (workspace as Workspace).program.account.userPrediction.all([ { memcmp: { offset: 8, bytes: bs58.encode((wallet.value.publicKey as PublicKey || wallet.publicKey as unknown as PublicKey)?.toBuffer() as Buffer) }}])).map((programAccount: ProgramAccount<UserPredictionAccount>) => {
        return new UserPrediction(programAccount.account)
      })
    } catch (error) {
      console.error(error);
    }
  }
}

function loadWallet() {
  setTimeout(() => {
      wallet.value = useWallet() as WalletStore;
      if (!wallet.value.connected) {
        loadWallet();
      } else {
        initWorkspace(window.location.host.startsWith("localhost") ||  window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net", window.location.host.startsWith("localhost") ? 'devnet' : window.location.host.split('.')[0] as Cluster);
        workspace = useWorkspace();
        loadWorkspace();
      }
  }, 1000)

  function getHost() {
    return window.location.host;
  }
}

async function userClaim(game: Game) {

  let txStatus = initNewTxStatus()
  txStatus.title = "User Claim"
  txStatus.subtitle = "Sending"
  txStatus.color = "warning"
  txStatus.show = true;
  txStatus.loading = true;
  try {
    // console.log(game.account.feeV)

    let ix = await (user.value as User).userClaimInstruction(workspace as Workspace, getVault(game), await getTokenAccount(game), (user.value as User).account.claimable);

    ix.keys.forEach(key => console.log(key.pubkey.toBase58()));

    let tx = new Transaction().add(ix);

    let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>(userPredictions.value.filter((prediction: UserPrediction) => prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
      return await UserPrediction.closeUserPredictionInstruction(workspace as Workspace, prediction)
    }));
    
    if (closeUserPredictionInstructions.length > 0)
      tx.add(...closeUserPredictionInstructions)
    
    tx.feePayer = workspace.owner;
    tx.recentBlockhash = (await (workspace as Workspace).program.provider.connection.getLatestBlockhash()).blockhash;
    tx = await (workspace as Workspace).wallet.signTransaction(tx);
    // let simulation = await (workspace as Workspace).program.provider.connection.simulateTransaction(tx);
    // console.log(simulation.logs)
    // let simulate = await (workspace as Workspace).program.provider.connection.simulateTransaction(tx);
    // console.log(simulate.logs)
    let signature = await (workspace as Workspace).program.provider.connection.sendRawTransaction(tx.serialize());
    
    txStatus.subtitle = "Sent"
    try {
      txStatus.subtitle = "Confirming"
      await confirmTxRetry(workspace as Workspace, signature);
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
  hideTxStatus(txStatus, 5000)
  await updateUser();
  
}

</script>

<script lang="ts">

export default defineComponent({
  name: 'HelloWorld',
  components: {
    CryptoIcon
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

            <v-btn icon size="x-small" style="right: 0; bottom: 0; z-index: 1;" variant="text" @click.stop="() => { aggrWorkspace = getHost()+'/workspaces/'+game.account.baseSymbol.toLowerCase()+'.json'  }">
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
                      <v-card-title class="text-center" v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null && frontendGameData.get(game.account.address.toBase58()).mint !== undefined">
                        
                          <v-tooltip
                            top
                          >
                            <template v-slot:activator="{ props }">
                              <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.account.baseSymbol.toLowerCase()"/>
                              <v-divider vertical style="margin: 0 auto;"></v-divider>
                              <CryptoIcon v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null && frontendGameData.get(game.account.address.toBase58()).mint !== undefined" style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
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
                            $ {{  game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game).toFixed(2) }}
                          </v-col>
                        </v-row>
                        <v-row style="margin: 1px;">
                          <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                              game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) > 0 ? 'up' : game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) < 0 ? 'down' : 'tie'
                            }`">
                            <v-tooltip
                              activator="parent"
                              location="end"
                            >Price Difference</v-tooltip>
                            <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1010;">
                              <LottieAnimation :speed=".75" v-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                              <LottieAnimation :speed=".75" v-else-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                              <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                            
                            </div>
                            <span style="margin-left: 24px;">
                              $ {{ 
                                game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game).toFixed(2)
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
                  <v-card-text justify="center" class="text-center" v-if="game.currentRound && game.currentRound.account">
                    <v-row style="margin: 1px;">
                      <v-col style="margin: auto 0; padding: .5em 0;" class="start-price">
                        <v-tooltip
                          activator="parent"
                          location="end"
                        >Starting Price</v-tooltip>
                          $ {{  game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game).toFixed(2) }}                      
                      </v-col>
                    </v-row>
                    <v-row style="margin: 1px;">
                      <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                          game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) > 0 ? 'up' : game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) < 0 ? 'down' : 'tie'
                        }`">
                        <v-tooltip
                          activator="parent"
                          location="end"
                        >Price Difference</v-tooltip>
                        <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1010;">
                          <LottieAnimation :speed=".75" v-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                          <LottieAnimation :speed=".75" v-else-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                          <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                        
                        </div>
                        <span style="margin-left: 24px;">
                          $ {{ 
                            game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game).toFixed(2)
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
