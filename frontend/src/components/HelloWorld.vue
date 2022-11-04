<script setup lang="ts">

import { computed, defineComponent, onMounted } from 'vue'


import { useDisplay } from 'vuetify'
import { WalletMultiButton, useWallet, WalletStore } from 'solana-wallets-vue'
import { ProgramAccount } from "@project-serum/anchor";
import { Cluster, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { confirmTxRetry } from "sdk/lib/util";
import { TokenInfo } from "@solana/spl-token-registry";
import { UpOrDown, Oracle } from 'sdk'
import UserPrediction, { UserPredictionAccount } from "sdk/lib/accounts/userPrediction";
import User, { UserAccount } from "sdk/lib/accounts/user";
import Vault, { VaultAccount } from "sdk/lib/accounts/vault";
import Round, { RoundAccount } from "sdk/lib/accounts/round";
import { Account, AccountLayout, AccountState, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { storeToRefs } from "pinia";
import { ref, watch, shallowRef } from "vue";
import { PredictionGame, USER_PREDICTION_MIN_AMOUNT, Workspace } from 'sdk'
import Game, { GameAccount } from "sdk/lib/accounts/game";
import { U64MAX } from 'sdk';
import { useWorkspace, initWorkspace } from '../plugins/anchor'
import { initPAF, usePAF } from '../plugins/polling-account-fetcher'
import { useTokenList } from "../plugins/tokenList";
import CryptoIcon from './CryptoIcon.vue'
import * as anchor from '@project-serum/anchor'
import axios from 'axios';
import { useStore } from "../stores/store";
import bs58 from 'bs58';
import UpArrowAnimation from '../lottie/65775-arrrow-moving-upward.json'
import DownArrowAnimation from '../lottie/65777-graph-moving-downward.json'
import CrabAnimation from '../lottie/101494-rebound-rock-water-creature-by-dave-chenell.json'
import { PollingAccountsFetcher } from 'polling-account-fetcher';
import UserClaimable, { Claim, UserClaimableAccount } from 'sdk/lib/accounts/userClaimable';
import RoundHistory, { RoundHistoryAccount, RoundHistoryItem } from 'sdk/lib/accounts/roundHistory';
import UserPredictionHistory, { UserPredictionHistoryAccount, UserPredictionHistoryItem } from 'sdk/lib/accounts/userPredictionHistory';


import { useRouter } from 'vue-router';

const router = useRouter();

type TxStatus = {
    index: number,
    signatures: Array<string>,
    color: string,
    title: string,
    subtitle: string
    loading: boolean
    show: boolean;
}


// user specific
let userAddress = ref(null as PublicKey);
let computedUser = computed(() => getUser());
let userClaimableAddress = ref(null as PublicKey);
let computedClaimable = computed(() => getUserClaimable());
let userPredictions = ref(new Set<string>());
let computedUserPredictions = computed(() => [...userPredictions.value.values()].map(userPredictionPubkey => getUserPrediction(userPredictionPubkey) || null))
let tokenAccounts = ref(new Set<string>());
let associateTokenAccountAddresses = ref(new Map<string, string>());
let computedTokenAccounts = computed(() => [...tokenAccounts.value.values()].map(tokenAccountPubkey => getTokenAccount(tokenAccountPubkey) || null))
let frontendGameData = ref(new Map<string, FrontendGameData>());

// generic
let games = ref(new Map<string, Game>());
let computedGames = computed(() => [...games.value.values()]);
let rounds = ref(new Map<string, Round>());
let computedRounds = computed(() => [...rounds.value.values()]);
let histories = shallowRef(new Map<string, { roundHistory: RoundHistory, userPredictionHistory: UserPredictionHistory }>);

let computedUserPredictionHistoryItems = computed(() => {
  return histories.value.get(selectedGameHistory.value).userPredictionHistory.account.userPredictions.filter(userPrediction => !userPrediction.recordId.eq(new anchor.BN(0))).sort((a: UserPredictionHistoryItem, b: UserPredictionHistoryItem) => (a.recordId.sub(b.recordId)).toNumber())
});

let computedRoundHistoryItems = computed(() => {
  if (selectedGameHistory.value === null) return []
  return histories.value.get(selectedGameHistory.value).roundHistory.account.rounds.filter(round => {
    return !round.recordId.eq(new anchor.BN(0)) && (roundHistorySelectedRound !== null ? (round.address !== undefined ? round.address!.toBase58() === roundHistorySelectedRound.value : true) : true) 
  }).sort((a: RoundHistoryItem, b: RoundHistoryItem) => (b.recordId.sub(a.recordId)).toNumber())
});


let vaults = ref(new Map<string, Vault>());
let computedVaults = computed(() => [...vaults.value.values()])


let wallet = ref(null as WalletStore); 
let walletBalance = ref(null as number);
let tps = ref(null as number);

let workspace = ref(null as Workspace);
let paf = ref(null as PollingAccountsFetcher);
let tokenList = ref(null as TokenInfo[]);

let updateInterval = ref(null as NodeJS.Timer);
let loading = ref(false);
let aggrWorkspace = ref('');

let selectedGameHistory = ref(null as string);
let roundHistorySelectedRound = ref(null as string);

let { gstring, v2, showHistory, showHelp, showChart, showAccountInfo } = defineProps({
  showHistory: Boolean,
  showAccountInfo: Boolean,
  showChart: Boolean,
  showHelp: Boolean,
  v2: Boolean,
  gstring: String
})


let tab = ref(gstring);
let game  = ref(null as Game)

const { txStatusList } = storeToRefs(useStore());

watch(tab, (newValue, oldValue) => {
  if (newValue && newValue !== oldValue) {
    router.push({ path: (v2 ? '/v2/' : '/') + newValue})
    game.value = computedGames.value.find(g => g.account.address.toBase58() === newValue) || null
  } 
});

watch(computedGames, (newValue, oldValue) => {
  if (oldValue.length === 0 && newValue.length > 0 && tab.value !== '') {
    game.value = computedGames.value.find(g => g.account.address.toBase58() === tab.value) || null
  }
}, { deep: true })

watch(wallet, (newVal, oldVal) => {
  if (newVal !== null && newVal.connected && newVal.disconnecting) {
    console.log('wallet disconnected');
    clearInterval(updateInterval.value)
    unloadUserPredictions()
    unloadUser()
    unloadTokenAccounts()
    unloadUserClaimable()
  } else if (newVal !== null && !newVal.connected && newVal.connecting) {
    console.log('wallet connecting')
  } else if (newVal !== null && newVal.connected && !newVal.connecting && !newVal.disconnecting) {
    console.log('wallet conected');
    loadWallet();
  }
}, { deep: true })


onMounted(() => {
  ;(async () => {
    tokenList.value = useTokenList();

    // console.log(tokenList.value);
      
    if (aggrWorkspace.value === '') {
      aggrWorkspace.value = getProtocol() + "//" + getHost() + "/workspaces/btc.json";
    }
    loadPAF();
    await loadWorkspace();
    loadWallet();
    
    // if (workspace.value === null) {
    //   initWorkspace(getRpcUrl(), getCluster());
    //   workspace.value = useWorkspace();
    //   await loadWorkspace();
    // }
  })();
})

function loadPAF() {
  initPAF(getRpcUrl())
  paf.value = usePAF();
  if (paf.value === null) {
    setTimeout(() => {
      loadPAF();
    }, 1000);
  }
}

function getRpcUrl() {
  return window.location.host.startsWith("localhost") || window.location.host.startsWith("devnet") ? "https://api.devnet.solana.com" : "https://ssc-dao.genesysgo.net";
}

function getCluster() {
  return window.location.host.startsWith("localhost") ? 'devnet' : window.location.host.split('.')[0] as Cluster;
}

type FrontendGameData = {
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
  history: {
    show: {
      rounds: boolean,
      userPredictions: boolean
    }
  },
  prediction: {
    show: boolean,
    direction: UpOrDown,
    amount: number,
    sliderAmount: number
  },
  updating: boolean,
  updateError: boolean,
  noUpdateReceieved: boolean,
  noUpdateReceievedTimeout: NodeJS.Timer,
  needsToLoad: boolean,
  roundTimeUpdateInterval: NodeJS.Timer,
  timeRemaining: number
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
  let txStatus = txStatusList.value[index-1];
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

function getVaultFromGame(game: Game): Vault {
  if (game !== undefined)
  return getVault(game.account.vault.toBase58());
}

function getVault(vault: string): Vault {
  if (vaults.value.has(vault))
  return vaults.value.get(vault);
}

function getGame(address: string): Game {
  if (!games.value.has(address)) return null;
  let game = games.value.get(address);
  if (game === null) return null;
  
  
  if (game.currentRound === null) {
    let currentRound = getRound(game.account.currentRound.toBase58());
    if(game.currentRound)
      game.currentRound = currentRound;
  }
    
  
  
  if (game.previousRound === null) {
    let previousRound = getRound(game.account.previousRound.toBase58());
    if (game.previousRound)
      game.previousRound = previousRound;
  }
    
  
  return game;
}

function unloadUserPredictions() {
  computedUserPredictions.value.forEach((userPrediction: UserPrediction) => {
    if (userPrediction !== undefined && userPrediction !== null && paf.value.accounts.has(userPrediction.account.address.toBase58())) {
      paf.value.accounts.delete(userPrediction.account.address.toBase58())
    }
  })
}

function getUserPrediction(address: string) : UserPrediction {
  if (!paf.value.accounts.has(address)) return null;
  let userPrediction = paf.value.accounts.get(address)!.data || null;
  if (userPrediction === null) return null;
  return new UserPrediction(userPrediction);
}

function getRound(address: string) : Round {
  if (!rounds.value.has(address)) return null;
  let round = rounds.value.get(address) || null;
  if (round === null) return null;
  return round;
}

function unloadUser() {
  if (userAddress.value !== null)
  paf.value.accounts.delete(userAddress.value.toBase58())
  userAddress.value = null;
}

function getUser() : User {
  if (userAddress.value === null) return null;
  if (!paf.value.accounts.has(userAddress.value.toBase58())) return null;
  let userAccount = paf.value.accounts.get(userAddress.value.toBase58());
  if (userAccount === undefined) return null;
  return new User(userAccount.data);
}

function getUserClaimable() : UserClaimable {
  if (userClaimableAddress.value === null) return null;
  if (!paf.value.accounts.has(userClaimableAddress.value.toBase58())) return null;
  let userClaimable = paf.value.accounts.get(userClaimableAddress.value.toBase58())
  if (userClaimable === undefined || userClaimable === null) return null;
  return new UserClaimable(userClaimable.data);
}


function getTokenAccountFromMint(mint: PublicKey): Account {
  return getTokenAccount(getAssociatedTokenAccountAddress(mint.toBase58()))
}

function getTokenAccountFromGame(game: Game): Account {
  return getTokenAccountFromMint(getTokenMint(game))
}

function getTokenAccount(address: string) : Account {
  if (!paf.value.accounts.has(address)) return null;
  let tokenAccount = paf.value.accounts.get(address)!.data || null;
  if (tokenAccount === null) return null;
  return tokenAccount as Account
}

function unloadTokenAccounts() {
  [...tokenAccounts.value.values()].forEach(tokenAccount => {
    paf.value.accounts.delete(tokenAccount)
  });
  tokenAccounts.value.clear();
  associateTokenAccountAddresses.value.clear();
}

function getAssociatedTokenAccountAddress(mint: string) : string {
  return associateTokenAccountAddresses.value.get(mint);
}

function getTokenMint(game: Game) : PublicKey {
  let vault = (getVaultFromGame(game));
  // console.log(vault);
  if (vault) {
    return vault.account.tokenMint;
  }
  
}

async function makePrediction(game: (Game)) {

  let txStatus = initNewTxStatus()

  let gameFrontendData = frontendGameData.value.get(game.account.address.toBase58())

  if (wallet.value.connected && wallet.value.publicKey !== undefined && wallet.value.publicKey !== null) {
    // update the game
    // await game.updateGameData(getWorkspace());
    // await game.updateRoundData(getWorkspace());

    if (!game.currentRound.account.roundPredictionsAllowed)  {
      txStatus.color = 'error';
      txStatus.title = "Round Predictions Not Allowed"
      txStatus.show = true;
      hideTxStatus(txStatus, 5000);
      return;
    }

    // setup the tx's
    // let tx = new Transaction();
    let amount = (new anchor.BN(gameFrontendData.prediction.amount)).mul((new anchor.BN(10)).pow(new anchor.BN(getVaultFromGame(game).account.tokenDecimals)));
    
    if (amount.gt(U64MAX) || amount.lt(USER_PREDICTION_MIN_AMOUNT(game.account.tokenDecimal))) {
      txStatus.color = 'error';
      txStatus.title = "Minimum Amount is 1 " + gameFrontendData.mint.symbol
      txStatus.show = true;
    }
    // if the user doesn't exist try and load otherwise add it as a tx
    // let [userPubkey, _userPubkeyBump] = await (getWorkspace()).programAddresses.getUserPubkey((getWorkspace()).owner);
    let tx = new Transaction();
    let txTitle = '';
    if ((computedUser.value === null || computedUser.value === undefined)) {
      let initUserIX = await User.initializeUserInstruction(getWorkspace(), userAddress.value, userClaimableAddress.value);
      // let initUserTX = new Transaction().add(initUserIX);
      // initUserTX.feePayer = (getWorkspace()).owner;
      // initUserTX.recentBlockhash = (await (getWorkspace()).program.provider.connection.getLatestBlockhash()).blockhash
      tx.add(initUserIX)
      txTitle = "Initialize User & "
    }

    
    let fromTokenAccount = getTokenAccountFromGame(game);
    let vault = getVaultFromGame(game);
    
    let [userPredictionPubkey, _userPredictionPubkeyBump] = await (getWorkspace()).programAddresses.getUserPredictionPubkey(game, game.currentRound, computedUser.value || (getWorkspace()).owner);

    let initUserPredictionIX = await UserPrediction.initializeUserPredictionInstruction(
      getWorkspace(),
      vault,
      game, 
      game.currentRound, 
      computedUser.value || userAddress.value, 
      userClaimableAddress.value,
      fromTokenAccount,
      (getWorkspace()).owner,
      userPredictionPubkey,
      gameFrontendData.prediction.direction, 
      amount
    )
    // initUserPredictionIX.keys.forEach(key => console.log(key.pubkey.toBase58()))

    tx.add(initUserPredictionIX);
    txTitle += "Initialize User Prediction"

    let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>([...computedUserPredictions.value.values()].filter((prediction: UserPrediction) => prediction !== undefined && prediction !== null && prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
      return await UserPrediction.closeUserPredictionInstruction(getWorkspace(), prediction)
    }));
    
    
    if (closeUserPredictionInstructions.length > 0) {
      tx.add(...closeUserPredictionInstructions)
      txTitle += " & Close " + closeUserPredictionInstructions.length + " User Prediction" + (closeUserPredictionInstructions.length > 1 ? 's' : '')
    }
      

    tx.feePayer = (getWorkspace()).owner;
    tx.recentBlockhash = (await (getWorkspace()).program.provider.connection.getLatestBlockhash()).blockhash
    tx = await (getWorkspace()).wallet.signTransaction(tx);
    
    txStatus.show = true;
    txStatus.loading = true;
    try {
      let simulation = await (getWorkspace()).program.provider.connection.simulateTransaction(tx);
      console.log(simulation.value.logs);
      let signature = await (getWorkspace()).program.provider.connection.sendRawTransaction(tx.serialize());
    
      txStatus.signatures.push(signature);
      txStatus.color = 'success'
      txStatus.title = txTitle
      txStatus.subtitle = "Sent TX!"
      patchTxStatus(txStatus);

      try {
        txStatus.color = 'warning'
        txStatus.subtitle = "Confirming TX!"
        await confirmTxRetry(getWorkspace(), signature);
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
    await loadPredictions()
  }
}

async function initTokenAccountForGame(game: Game) {
  let tokenMint = await getTokenMint(game);
  const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
          (getWorkspace()).owner,
          await getAssociatedTokenAddress(tokenMint, (getWorkspace()).owner),
          (getWorkspace()).owner,
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

    let txSignature = await (getWorkspace()).sendTransaction(transaction);
    
    txStatus.subtitle = "Sent and Confirming";
    await confirmTxRetry(getWorkspace(), txSignature)
    txStatus.color = "success"
    txStatus.subtitle = "Sent and Confirmed. Airdropping funds might fail until account is confirmed.";
    txStatus.loading = false;

  } catch(error) {
    txStatus.title = "Initializing Token Account";
    txStatus.subtitle = "Failed";
    txStatus.color = "error"
    txStatus.loading = false;
    txStatus.show = true;
    console.error(error);
  }
  hideTxStatus(txStatus.index, 5000);
  await loadTokenAccounts();
  
}

async function airdrop(game: Game) {
  if (getWorkspace() !== null && (getWorkspace()).cluster === 'devnet' || (getWorkspace()).cluster === 'testnet') {
    let txStatus = initNewTxStatus();
    try {
      txStatus.color = 'warning',
      txStatus.title = 'Airdropping Devnet Funds'
      txStatus.subtitle = ''
      txStatus.loading = true
      txStatus.show = true
      let { status, data } = (await axios.get('https://faucet.solpredict.io/airdrop/'+ (getTokenAccountFromGame(game)).address.toBase58()));
      if (status === 200) {
        txStatus.loading = false;
        txStatus.signatures.push(data)
        txStatus.color = 'success'
        txStatus.title = "Airdropped Devnet Funds"
      } else {
        txStatus.loading = false;
        txStatus.color = "error"
        txStatus.title = "Airdrop Devnet Funds Failed"
        txStatus.subtitle = 'Please try again in a few seconds.'
        console.error(data);
      }
    } catch (error) {
      console.error(error);
      txStatus.loading = false;
      txStatus.color = "error"
      txStatus.title = "Airdrop Devnet Funds Failed"
      txStatus.subtitle = 'Please try again in a few seconds.'
    }
          
    hideTxStatus(txStatus.index, 5000);
  }
}


function getWorkspace() : Workspace {
  //@ts-ignore
  return workspace.value;
}

async function initFrontendGameData (game: Game) {
  if (!frontendGameData.value.has(game.account.address.toBase58())) {
    frontendGameData.value.set(game.account.address.toBase58(), {
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
      history: {
        show: {
          rounds: true,
          userPredictions: false
        }
      },
      prediction: {
        show: false,
        direction: 0,
        amount: 0,
        sliderAmount: 0
      },
      updating: false,
      updateError: false,
      needsToLoad: true,
      noUpdateReceieved: false,
      noUpdateReceievedTimeout: null,
      timeRemaining: game.account.roundLength.toNumber(),
      roundTimeUpdateInterval: null
    })
    try {
      let mint;
      if (getWorkspace() !== null && (getWorkspace()).cluster === 'devnet' || (getWorkspace()).cluster === 'testnet' || window.location.host.startsWith("localhost")) {
        mint = tokenList.value.find((token: TokenInfo) => token.symbol === "USDC");
      } else if (getWorkspace() !== null && (getWorkspace()).cluster !== 'mainnet-beta') {
        mint = tokenList.value.find(async (token: TokenInfo) => token.address === getTokenMint(game).toBase58()) || tokenList.value.find((token: TokenInfo) => token.symbol === "USDC")
      }
      let priceProgram = game.account.priceProgram.toBase58()
      let priceFeed = game.account.priceFeed.toBase58()
      frontendGameData.value.set(
        game.account.address.toBase58(), 
        { 
          ...frontendGameData.value.get(game.account.address.toBase58()), 
          mint,
          priceProgram,
          priceFeed
        }
      )
    } catch (error) {
      console.error(error);
    }
  }
  
}

async function loadTokenAccounts() : Promise<void> {

  await Promise.all(computedVaults.value.map(async vault => {
    if (!associateTokenAccountAddresses.value.has(vault.account.tokenMint.toBase58())) {
      associateTokenAccountAddresses.value.set(vault.account.tokenMint.toBase58(), (await getAssociatedTokenAddress(vault.account.tokenMint, getWorkspace().owner)).toBase58())
    }
  }))

  await Promise.allSettled(computedGames.value.map(async game => {
    let mint = getTokenMint(game);
    let address = new PublicKey(associateTokenAccountAddresses.value.get(mint.toBase58())); 
    // console.log(address.toBase58());
    if (!tokenAccounts.value.has(address.toBase58())) {
      tokenAccounts.value.add(address.toBase58());
    }
    if (!paf.value.accounts.has(address.toBase58())) {
      paf.value.addConstructAccount(address.toBase58(), (data: any) => {
        let rawAccount = AccountLayout.decode(data);
        return {
            address,
            mint: rawAccount.mint,
            owner: rawAccount.owner,
            amount: rawAccount.amount,
            delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
            delegatedAmount: rawAccount.delegatedAmount,
            isInitialized: rawAccount.state !== AccountState.Uninitialized,
            isFrozen: rawAccount.state === AccountState.Frozen,
            isNative: !!rawAccount.isNativeOption,
            rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
            closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
        } as Account
      }, (data: Account) => {
        // console.log("updated tokenAccount " + data.address.toBase58())
      }, (error: any) => { paf.value.accounts.delete(address.toBase58()) })
    }
  }))
}

async function loadUser() : Promise<void> {
  // console.log(wallet.value.publicKey.value.toBase58())
  if (wallet.value.connected) {
    try {
      // let userPubkey = (await (getWorkspace()).programAddresses.getUserPubkey(new PublicKey((wallet.value.publicKey as PublicKey).toBase58())))[0];
      if (!paf.value.accounts.has(userAddress.value.toBase58())) {
        //@ts-ignore
        paf.value.addProgram<PredictionGame>('user', userAddress.value.toBase58(), getWorkspace().program, async (data: UserAccount) => {
          // console.log("updated user " + data.address.toBase58())
        }, (error) => {
          console.error(error);
          paf.value.accounts.delete(userAddress.value.toBase58())
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

async function loadUserClaimable() : Promise<void> {
  // console.log(wallet.value.publicKey.value.toBase58())
  if (wallet.value.connected) {
    try {
      if (userClaimableAddress.value !== null) {
        if (!paf.value.accounts.has(userClaimableAddress.value.toBase58())) {
          //@ts-ignore
          paf.value.addProgram<PredictionGame>('userClaimable', userClaimableAddress.value.toBase58(), getWorkspace().program, async (data: UserClaimableAccount) => {
            data.claims.forEach(claim => {
              console.log(claim.mint.toBase58(), claim.vault.toBase58(), claim.amount.toNumber());
            })
            // console.log("updated user " + data.address.toBase58())
          }, (error) => {
            console.error(error);
            paf.value.accounts.delete(userClaimableAddress.value.toBase58())
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

function unloadUserClaimable() {
  if (userClaimableAddress.value !== null)
  paf.value.accounts.delete(userClaimableAddress.value.toBase58())
  userClaimableAddress.value = null;
}


// load history data from api
async function loadGameHistoriesFromDB() {
  let res = await fetch(`https://api.solpredict.io/history`);
  let json = await res.json();
  if (Array.isArray(json))
  json.filter(j => j !== undefined).forEach(async ({ roundHistory, userPredictionHistory }) => {
    let roundHistoryAccount = RoundHistory.fromJSON<RoundHistoryAccount>(roundHistory);
    let userPredictionHistoryAccount = UserPredictionHistory.fromJSON<UserPredictionHistoryAccount>(userPredictionHistory);
    histories.value.set(roundHistoryAccount.game.toBase58(), { roundHistory: new RoundHistory(roundHistoryAccount), userPredictionHistory: new UserPredictionHistory(userPredictionHistoryAccount) })
  });
}


// loads round data from api
async function loadRoundsFromDB() {
  let res = await fetch(`https://api.solpredict.io/round`);
  let data = await res.json();
  let roundAccountKeys = new Set<string>();
  data.forEach(async (vJSON: string) => {
    let roundAccount = Round.fromJSON<RoundAccount>(JSON.parse(vJSON));
    let roundAccountAddress = roundAccount.address.toBase58();
    if (!rounds.value.has(roundAccountAddress)) {
      rounds.value.set(roundAccountAddress, new Round(roundAccount));
    } else {
      await rounds.value.get(roundAccountAddress).updateData(roundAccount);
    }
    let game = computedGames.value.find(g => g.account.address.toBase58() === roundAccount.game.toBase58())
    if (game) {
      if (game.account.currentRound.toBase58() === roundAccount.address.toBase58()) {
        game.currentRound = rounds.value.get(roundAccountAddress);
        if (!frontendGameData.value.has(game.account.address.toBase58())) {
          await initFrontendGameData(game);
        }
        let fgd = frontendGameData.value.get(game.account.address.toBase58())
        if (fgd.roundTimeUpdateInterval === null || fgd.roundTimeUpdateInterval === undefined) {
          fgd.roundTimeUpdateInterval = setInterval(() => {
            fgd = frontendGameData.value.get(game.account.address.toBase58())
            fgd.timeRemaining = Math.min(game.currentRound.account.roundLength.toNumber(), Math.max(0, (game.currentRound.account.roundStartTime.add(game.currentRound.account.roundLength)).sub(new anchor.BN(Math.round((new Date()).getTime() / 1000))).toNumber()))
            frontendGameData.value.set(game.account.address.toBase58(), fgd)
          }, 1000)
        }
      } else if (game.account.previousRound.toBase58() === roundAccount.address.toBase58()) {
        game.previousRound = rounds.value.get(roundAccountAddress);
      }
    }
  });
  [...rounds.value.keys()].forEach(key => {
    if (!roundAccountKeys.has(key)) {
      rounds.value.delete(key);
    }
  })
}

// load games data from api
async function loadGamesFromDB() {
  let res = await fetch(`https://api.solpredict.io/game`);
  let data = await res.json();
  let gameAccountKeys = new Set<string>();
  data.forEach(async (vJSON: string) => {
    let gameAccount = Game.fromJSON<GameAccount>(JSON.parse(vJSON))
    let gameAccountAddress = gameAccount.address.toBase58();
    gameAccountKeys.add(gameAccountAddress)
    if (!games.value.has(gameAccountAddress)) {
      games.value.set(gameAccountAddress, new Game(gameAccount));
    } else {
      await games.value.get(gameAccountAddress).updateData(gameAccount);
    }
    if (!frontendGameData.value.has(gameAccountAddress)) {
      await initFrontendGameData(games.value.get(gameAccountAddress))
    }
  });
  [...games.value.keys()].forEach(key => {
    if (!gameAccountKeys.has(key)) {
      games.value.delete(key);
    }
  })
}

// load vaults data from api
async function loadVaultsFromDB() {
  let res = await fetch(`https://api.solpredict.io/vault`);
  let data = await res.json();
  let vaultAccountKeys = new Set<string>();
  data.forEach(async (vJSON: string) => {
    let vaultAccount = Vault.fromJSON<VaultAccount>(JSON.parse(vJSON))
    let vaultAccountAddress = vaultAccount.address.toBase58();
    vaultAccountKeys.add(vaultAccountAddress)
    if (!vaults.value.has(vaultAccountAddress)) {
      vaults.value.set(vaultAccountAddress, new Vault(vaultAccount));
    } else {
      await vaults.value.get(vaultAccountAddress).updateData(vaultAccount);
    }
  });
  [...vaults.value.keys()].forEach(key => {
    if (!vaultAccountKeys.has(key)) {
      vaults.value.delete(key);
    }
  })
}

// loads user predictions associated with the current connected wallet
// using memcmp to target only user predictions owned by the wallet address
async function loadPredictions() {
  if (wallet.value !== null && wallet.value.connected && wallet.value.publicKey !== undefined && wallet.value.publicKey !== null) {
    try {
      Promise.allSettled((await (getWorkspace()).program.account.userPrediction.all([ { memcmp: { offset: 8, bytes: bs58.encode((wallet.value.publicKey as PublicKey)?.toBuffer() as Buffer) }}])).map((programAccount: ProgramAccount<UserPredictionAccount>) => {
        let userPredictionProgramAccountAddress = programAccount.account.address.toBase58();
        if (!userPredictions.value.has(userPredictionProgramAccountAddress)) {
          userPredictions.value.add(userPredictionProgramAccountAddress)
        }
        if (!paf.value.accounts.has(userPredictionProgramAccountAddress)) {
          //@ts-ignore
          paf.value.addProgram<PredictionGame>('userPrediction', userPredictionProgramAccountAddress, getWorkspace().program, async (data: UserPredictionAccount) => {
          }, (error) => {
            paf.value.accounts.delete(userPredictionProgramAccountAddress)
            userPredictions.value.delete(userPredictionProgramAccountAddress)
          }, programAccount.account)
        }
      }))
    } catch (error) {
      console.error(error);
    }
  }
}

async function loadGeneric() {
  await Promise.allSettled([
    loadVaultsFromDB(),
    loadRoundsFromDB(),
    loadGamesFromDB(),
    // loadGameHistoriesFromDB(),
    loadTPS()
  ])
}

async function loadUserSpecific() {
  await Promise.allSettled([
    loadSOLBalance(),
    loadUser(),
    loadTokenAccounts(),
    loadUserClaimable(),
    loadPredictions()
  ])
}

async function loadAll() {
  Promise.allSettled([
    loadUserSpecific(),
    loadGeneric()
  ])
}

async function loadWorkspace() {

  initWorkspace(getRpcUrl(), getCluster());
  workspace.value = useWorkspace();
  loading.value = true;

  if (paf.value.interval === undefined || paf.value.interval === null)
    paf.value.start();

  if (wallet.value !== null && wallet.value.connected) {
    if (userAddress.value === null)
    userAddress.value = (await getWorkspace().programAddresses.getUserPubkey(wallet.value.publicKey))[0];
    if (userClaimableAddress.value === null)
    userClaimableAddress.value = (await getWorkspace().programAddresses.getUserClaimablePubkey(userAddress.value))[0];
    await loadUserSpecific();
  }
  await loadGeneric();
  loading.value = false;

  if (updateInterval.value) clearInterval(updateInterval.value)
  let count = 0
  updateInterval.value = setInterval(async () => {
    loading.value = true;
    if (wallet.value !== null && wallet.value.connected) {
      if (userAddress.value === null)
      userAddress.value = (await getWorkspace().programAddresses.getUserPubkey(wallet.value.publicKey))[0];
      if (userClaimableAddress.value === null)
      userClaimableAddress.value = (await getWorkspace().programAddresses.getUserClaimablePubkey(userAddress.value))[0];
      await loadUserSpecific();
    }
    await loadGeneric();
    count++;
    if (count % 6 === 0) {
      // dont load history
      await loadGameHistoriesFromDB();
      count = 0;
    }
    loading.value = false;
  }, 10 * 1000)
}

function loadWallet() {
  setTimeout(async () => {
      //@ts-ignore
      wallet.value = useWallet();
      if (!wallet.value.connected) {
        loadWallet();
      } else if (wallet.value.connected) {
        await loadWorkspace();
      }
  }, 1000)
}

function getProtocol() {
  return window.location.protocol;
}

function getHost() {
  return window.location.host;
}

function hasSomeClaimable() : boolean {
  if (computedClaimable.value !== null && computedClaimable.value.account !== undefined && computedClaimable.value.account.claims.length > 0) {
    let claim = computedClaimable.value.account.claims.find(claim => claim !== undefined && claim.amount.gt(new anchor.BN(0)) && claim.mint.toBase58() !== PublicKey.default.toBase58() && computedVaults.value.some(v => v.account.address.toBase58() === claim.vault.toBase58()));
    if (claim !== undefined) {
      return true;
    }
    return false
  }
  return false;
  
}

function getClaimableForGame(game: Game) : Claim {
  if (computedClaimable.value !== null && computedClaimable.value.account !== undefined) {
    // console.log(computedClaimable.value)
    if (computedVaults !== null && computedVaults !== undefined) {
      // console.log(computedVaults)
      let vault = computedVaults.value.find(v => v.account.address.toBase58() === game.account.vault.toBase58());
      if (vault !== undefined) {
        return computedClaimable.value.account.claims.find(claim => claim !== undefined && claim.mint.toBase58() === vault.account.tokenMint.toBase58() && claim.vault.toBase58() === vault.account.address.toBase58());
      }
    }
    
  }
  return null;
  
}

function getWalletBalanceForGame(game: Game) : anchor.BN {
  let amount = new anchor.BN(0);
  let tokenAccount = getTokenAccountFromGame(game);
  if (tokenAccount !== undefined && tokenAccount !== null) {
    amount = amount.add(new anchor.BN(tokenAccount.amount.toString()));
  }
  return amount
}

function getWalletBalanceForGameAsNumber(game: Game) : number {
  return bnToNumber(getWalletBalanceForGame(game), getTokenMinDecimalsForGame(game))
}

function getTokenInfoForGame(game: Game) : TokenInfo {
  if (computedVaults !== null && computedVaults !== undefined) {
    let vault = computedVaults.value.find(v => v.account.address.toBase58() === game.account.vault.toBase58());
    if (vault !== null && vault !== undefined) {
      return tokenList.value.find(t => t.address === vault.account.tokenMint.toBase58())
    }
  }
  return null;
  
}

function getTokenMinDecimalsForGame(game: Game) : number {
  let decimals = 0;
  let fgd = frontendGameData.value.get(game.account.address.toBase58());
  if (fgd !== undefined && fgd.mint !== null) {
    decimals = fgd.mint.decimals;
  }
  return decimals;
}

function getGameQuoteSymbol(game: Game) : string {
  let symbol = "";
  let fgd = frontendGameData.value.get(game.account.address.toBase58());
  if (fgd !== undefined && fgd.mint !== null) {
    symbol = fgd.mint.symbol;
  }
  return symbol;
}

function getGameQuoteMintAddress(game: Game) : PublicKey {
  let address = null;
  let fgd = frontendGameData.value.get(game.account.address.toBase58());
  if (fgd !== undefined && fgd.mint !== null) {
    address = fgd.mint.address;
  }
  return address;
}

function getClaimableAmountForGame(game: Game) : anchor.BN {
  let amount = new anchor.BN(0);
  let claim = getClaimableForGame(game);
  // console.log(claim);
  if (claim !== undefined && claim !== null) {
    amount = amount.add(claim.amount)
  }
  return amount;
}

async function getTPS() {
  if (workspace.value !== null) {
    let performance = (await workspace.value.program.provider.connection.getRecentPerformanceSamples(1));
    return performance[0].numTransactions / performance[0].samplePeriodSecs
  }
  return 0;
}

async function loadTPS() {
  tps.value = await getTPS();
}

async function loadSOLBalance() {
  walletBalance.value = await getSOLWalletBalance();
}

async function getSOLWalletBalance() {
  if (wallet.value !== null && wallet.value !== undefined && wallet.value.publicKey !== null && wallet.value.publicKey !== undefined) {
    if (workspace.value !== null) {
      let accountInfo = (await workspace.value.program.provider.connection.getAccountInfo(wallet.value.publicKey));
      if (accountInfo !== null) {
        return ((await workspace.value.program.provider.connection.getAccountInfo(wallet.value.publicKey)).lamports / LAMPORTS_PER_SOL)
      }
      return 0
      
    }
  }
  return null;
}

function getClaimableAmountForGameAsNumber(game: Game) : number {
  return bnQuoteAssetToNumberFromGame(getClaimableAmountForGame(game), game);
}

function bnQuoteAssetToNumberFromGame(amount: anchor.BN, game: Game): number {
  return bnQuoteAssetToNumber(amount, getTokenMinDecimalsForGame(game))
}

function bnQuoteAssetToNumberFromVault(amount: anchor.BN, vault: Vault): number {
  return bnQuoteAssetToNumber(amount, vault.account.tokenDecimals)
}

function bnQuoteAssetToNumber(amount: anchor.BN, decmals: number): number {
  return bnToNumber(amount, decmals)
}


function getTotalAvailableBalanceForGame(game: Game)  : anchor.BN {
  let claimableBalance = getClaimableAmountForGame(game);
  let walletBalance = getWalletBalanceForGame(game);
  return claimableBalance.add(walletBalance);
}

function getTotalAvailableBalanceForGameAsNumber(game: Game)  : number {
  return bnQuoteAssetToNumberFromGame(getTotalAvailableBalanceForGame(game), game)
}

let getTotalAvailableBalancesByToken = computed(() : Map<string, { total: anchor.BN, claimable: anchor.BN, wallet: anchor.BN }> => {
  let gameTokenSet = new Set<string>();
  let map = new Map<string, { total: anchor.BN, claimable: anchor.BN, wallet: anchor.BN }>();
  if (computedGames.value === null) return map;
  computedGames.value.map(game => {
    let tokenMint = getTokenMint(game);
    gameTokenSet.add(tokenMint.toBase58())
    // return computedVaults.find(v => v.account.address.toBase58() === game.account.vault.toBase58())
  })
  gameTokenSet.forEach(token => {
    let tokenAccountAmount = new anchor.BN(0)
    // let tokenAccount = getTokenAccountFromMint(new PublicKey(token))
    if (computedTokenAccounts.value !== null) {
      let tokenAccount = computedTokenAccounts.value.find(t => t !== null && t.mint.toBase58() === token)
      if (tokenAccount !== undefined && tokenAccount !== null) {
        tokenAccountAmount = tokenAccountAmount.add(new anchor.BN(tokenAccount.amount.toString()))
      }
    }
    
    map.set(token, { total: tokenAccountAmount, wallet: tokenAccountAmount, claimable: new anchor.BN(0) })
  })
  if (computedClaimable.value !== null && computedClaimable.value.account !== undefined) {
    computedClaimable.value.account.claims.forEach(claim => {
      if (claim.mint.toBase58() !== PublicKey.default.toBase58() && computedVaults.value.some(v => v.account.address.toBase58() === claim.vault.toBase58())) {
        let mapValue = map.get(claim.mint.toBase58());
        let total = mapValue.total;
        total = total.add(claim.amount)
        map.set(claim.mint.toBase58(), { total, claimable: mapValue.claimable.add(claim.amount), wallet: mapValue.wallet } )
      }
    })
  }
  
  return map;
})

function getTokenSymbolFromMintAddress(address: string) : string {
  if (workspace.value.cluster === 'devnet' || workspace.value.cluster === 'testnet') {
    return 'USDC'
  }
  let tokenInfo = tokenList.value.find(t => t.address === address);
  if (tokenInfo === undefined) return 'Uknown Token'
  return tokenInfo.symbol
}

let getTotalAvailableBalancesByTokenAsNumbers = computed(() : Map<string, { mint: string, total: number, claimable: number, wallet: number }>  => {
  let map = new Map<string, { mint: string, total: number, claimable: number, wallet: number }>();
  if (computedVaults === null) return map;
  [...getTotalAvailableBalancesByToken.value.entries()].forEach(([key, value]) => {
    let vault = computedVaults.value.find(v => v.account.tokenMint.toBase58() === key)
    map.set(getTokenSymbolFromMintAddress(key), 
      { 
        mint: key,
        total: bnQuoteAssetToNumberFromVault(value.total, vault), 
        claimable: bnQuoteAssetToNumberFromVault(value.claimable, vault), 
        wallet: bnQuoteAssetToNumberFromVault(value.wallet, vault) 
      }
    )
  })
  return map;
})

async function airdropDevnetSOL() {
  if (workspace.value !== null && wallet.value !== null && wallet.value.publicKey !== undefined) {
    let txStatus = initNewTxStatus();
    txStatus.title = "Requesting Devnet SOL Airdrop"
    txStatus.subtitle = "Sending"
    txStatus.color = "warning"
    txStatus.show = true;
    txStatus.loading = true;
    let signature = await getWorkspace().program.provider.connection.requestAirdrop(wallet.value.publicKey, 1 * LAMPORTS_PER_SOL);
    try {
      txStatus.subtitle = "Sent"
      await confirmTxRetry(getWorkspace(), signature)
      txStatus.subtitle = "Sent and Confirmed"
      txStatus.color = "success"
      txStatus.loading = false;
    } catch (error) {
      txStatus.subtitle = "Failed to Confirm"
      txStatus.color = "error"
      txStatus.loading = false;
    }
    hideTxStatus(txStatus.index, 5000)
  }
}

async function userClaimAll(mint = null) {
  let txStatus = initNewTxStatus()
  txStatus.title = "User Claim All"
  txStatus.subtitle = "Sending"
  txStatus.color = "warning"
  txStatus.show = true;
  txStatus.loading = true;
  try {
    // if (mint.toBase58() !== PublicKey.default.toBase58()) {
    //   let totalClaimableForMint = computedClaimable.value.account.claims.reduce((a, b) => {
    //     if (b.mint.toBase58() === mint.toBase58()) {
    //       return a.add(b.amount)
    //     }
    //     return a;
    //   }, new anchor.BN(0))
    //   console.log(totalClaimableForMint.toNumber())
    // }    

    if (mint === null) {
      mint = PublicKey.default;
    } else {
      try {
        mint = new PublicKey(mint)
      } catch(error) {
      
      }
    }

    let ixs = await (computedUser.value as User).userClaimAllInstruction(getWorkspace(), computedClaimable.value, computedVaults.value.filter(v => computedGames.value.some(g => g.account.vault.toBase58() === v.account.address.toBase58())), computedTokenAccounts.value, mint);
    let tx = new Transaction().add(...ixs);

    let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>([...computedUserPredictions.value.values()].filter((prediction: UserPrediction) => prediction !== undefined && prediction !== null && prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
      return await UserPrediction.closeUserPredictionInstruction(getWorkspace(), prediction)
    }));

    if (closeUserPredictionInstructions.length > 0)
        tx.add(...closeUserPredictionInstructions)

    tx.feePayer = (getWorkspace()).owner;
    tx.recentBlockhash = (await (getWorkspace()).program.provider.connection.getLatestBlockhash()).blockhash;
    tx = await (getWorkspace()).wallet.signTransaction(tx);
    let simulation = await (getWorkspace()).program.provider.connection.simulateTransaction(tx.compileMessage());
    console.log(simulation.value.logs);

    let signature = await (getWorkspace()).program.provider.connection.sendRawTransaction(tx.serialize());

    txStatus.subtitle = "Sent"
    try {
      txStatus.subtitle = "Confirming"
      await confirmTxRetry(getWorkspace(), signature);
      txStatus.subtitle = "Confirmed"
      txStatus.color = "success"
      txStatus.loading = false;
    } catch (error) {
      console.error(error);
      txStatus.subtitle = "Unconfirmed"
      txStatus.color = "warning"
      txStatus.loading = false;
    }
  } catch(error) {
    console.error(error);
    txStatus.subtitle = "Failed"
    txStatus.color = "error"
    txStatus.loading = false;
  }
  hideTxStatus(txStatus, 5000)

}

async function userClaim(game: Game, amount = null) {

  let txStatus = initNewTxStatus()
  txStatus.title = "User Claim"
  txStatus.subtitle = "Sending"
  txStatus.color = "warning"
  txStatus.show = true;
  txStatus.loading = true;
  try {
    // console.log(game.account.feeV)
    
    let claim = getClaimableForGame(game);
    if (claim === undefined) throw Error("No Claim Available");
    let claimAmount: anchor.BN = new anchor.BN(claim.amount);
    if (amount !== null && amount.lt(claimAmount)) {
      claimAmount = amount;
    }

    let ix = await (computedUser.value as User).userClaimInstruction(getWorkspace(), getVaultFromGame(game), getTokenAccountFromGame(game), claimAmount);

    // ix.keys.forEach(key => console.log(key.pubkey.toBase58()));

    let tx = new Transaction().add(ix);

    let closeUserPredictionInstructions = await Promise.all<TransactionInstruction>([...computedUserPredictions.value.values()].filter((prediction: UserPrediction) => prediction !== undefined && prediction !== null && prediction.account.settled).map(async (prediction: UserPrediction) : Promise<TransactionInstruction> => {
      return await UserPrediction.closeUserPredictionInstruction(getWorkspace(), prediction)
    }));
    
    if (closeUserPredictionInstructions.length > 0)
      tx.add(...closeUserPredictionInstructions)
    
    tx.feePayer = (getWorkspace()).owner;
    tx.recentBlockhash = (await (getWorkspace()).program.provider.connection.getLatestBlockhash()).blockhash;
    tx = await (getWorkspace()).wallet.signTransaction(tx);
    // let simulation = await (getWorkspace()).program.provider.connection.simulateTransaction(tx);
    // console.log(simulation.logs)
    // let simulate = await (getWorkspace()).program.provider.connection.simulateTransaction(tx);
    // console.log(simulate.logs)
    let signature = await (getWorkspace()).program.provider.connection.sendRawTransaction(tx.serialize());
    
    txStatus.subtitle = "Sent"
    try {
      txStatus.subtitle = "Confirming"
      await confirmTxRetry(getWorkspace(), signature);
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
    txStatus.subtitle = "Failed"
    txStatus.color = "error"
    txStatus.loading = false;
  }
  hideTxStatus(txStatus, 5000)
}



let helpUrl = new URL(`../assets/SolPredictHelp.png`, import.meta.url).href;
let pythUrl = new URL(`../assets/pyth.svg`, import.meta.url).href;
let switchboardUrl = new URL(`../assets/switchboard.svg`, import.meta.url).href;
let chainlinkUrl = new URL(`../assets/chainlink.svg`, import.meta.url).href;

</script>

<script lang="ts">

export default defineComponent({
  name: 'HelloWorld',
  components: {
    CryptoIcon
  }
})
</script>

<template>
  <v-container>
    <v-progress-linear
      v-if="loading"
      indeterminate
      rounded
      color="cyan"
    />
    <br/>
    <!-- TX Status Notification -->
    <div style="position: fixed; top: 0em; left: 0; margin: 0 auto; z-index: 1030;" v-if="getWorkspace() !== null">
        
        <v-card tonal :class="`txStatus ${txStatus.color}`" v-for="(txStatus, txindex) in txStatusList.filter(txStatus => txStatus.show)" :key="`txStatus-`+txindex" >
          <v-progress-linear :indeterminate="txStatus.loading" :color="txStatus.color"></v-progress-linear>
          <v-btn variant="plain" @click="hideTxStatus(txStatus.index, 0)" size="16px" style="position: absolute; top: 1em; right: 1em;"><v-icon>mdi-close</v-icon></v-btn>
          <v-card-title v-if="txStatus.title">{{ txStatus.title }}</v-card-title>
          <v-card-subtitle v-if="txStatus.subtitle">{{ txStatus.subtitle }}</v-card-subtitle>
          <v-card-text v-if="txStatus.signatures.length > 0">
            <ul>
              <li style="list-style: none;" v-for="(signature, index) in txStatus.signatures" :key="'tx-signature-'+txindex+'-'+index">
                <a target="_blank" :href="`https://solscan.io/tx/${signature}?cluster=${getWorkspace() !== null ? getWorkspace().cluster : ''}`"> {{ index+1 }} / {{ txStatus.signatures.length }} View on Solscan.io</a>
              </li>
            </ul>
          </v-card-text>
        </v-card>

    </div>
    <!-- V2 -->
    <div v-if="v2">
      <v-tabs 
        v-model="tab"
        color="primary"
        :centered="true"
        background-color="rgba(255, 255, 255, 0.01)"
        show-arrows
      >
        <v-tab v-for="(game, gameIndex) in computedGames" :key="'game-'+game.account.address.toBase58()" :value="game.account.address.toBase58()">
          <v-row class="align-center justify-center" v-if="useDisplay().width.value >= 820">
            <v-col>
              {{game.baseSymbolAsString()}} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
            </v-col>
          </v-row>
          <CryptoIcon v-else style="margin: 0 auto;" max-width="32px" :icon="game.baseSymbolAsString().toLowerCase()"/>
          <v-row v-if="game.currentRound && useDisplay().width.value >= 820" class="align-center justify-center">
            &nbsp;
            <v-col >
              <div :style="`color: ${game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0 ? 'green' : 'red'}`">
                $ {{ 
                  game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game).toFixed(2)
                }}
              </div>
            </v-col>
            <v-col>
              <div>
                <LottieAnimation :speed=".75" v-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                <LottieAnimation :speed=".75" v-else-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
              </div>
            </v-col>
          </v-row>
        </v-tab>
      </v-tabs>
      <!-- <v-select v-else :items="computedGames.filter(g => g !== undefined).map(g => {
        return {
          value: g.account.address.toBase58(),
          title: g.baseSymbolAsString() + ' / ' + frontendGameData.get(g.account.address.toBase58()).mint.symbol
        }
      })" @update:model-value="(val) => {
        tab = val
      }"></v-select> -->
      <v-container v-if="game !== null">
        <v-row v-if="useDisplay().width.value >= 820">
          <!-- {{game}} -->
          {{game.account.address.toBase58()}}
        </v-row>
        <v-row v-else>
          <!-- {{game}} -->
          <v-col :style="`height: ${useDisplay().height.value > 720 ? useDisplay().height.value * .75 : useDisplay().height.value * .66}px;`">
            <div style="width: 100%; background-color: green; height: 50%;">
              up
            </div>
            <div style="width: 100%; background-color: red; height: 50%;">
              down
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <!-- V1 -->
    <div v-else>
      <v-btn-group :style="`position: fixed; top: 0px; left: 0px; margin-left: ${useDisplay().width.value < 1000 ? '1em' : 'auto'}; right: 0px; width: 10em; margin-right: auto; margin-top: .5em; z-index: 1020;`">
        <v-btn icon="mdi-help" variant="plain"  :color="showHelp ? 'success' : 'grey'" @click="() => { showHelp = !showHelp; }"></v-btn>
        <v-btn icon="mdi-chart-box" variant="plain"  :color="showChart ? 'success' : 'grey'" @click="() => { showChart = !showChart; }"></v-btn>
        <v-btn icon="mdi-history" variant="plain" :color="showHistory ? 'success' : 'grey'" @click="() => { showHistory = !showHistory; }"></v-btn>
        <v-btn icon="mdi-account" variant="plain" v-if="wallet !== null && wallet.connected && !wallet.connecting && useDisplay().width.value < 1000"  :color="showAccountInfo ? 'success' : 'grey'" @click="() => { showAccountInfo = !showAccountInfo; }"></v-btn>
      </v-btn-group>
      <!-- HELP -->
      <v-dialog v-model="showHelp" class="align-center justify-center" style="background-color: rgba(0,0, 0, 1)">
        <v-sheet color="rgb(18, 18, 18)" style="padding: 1em; margin: 0 auto;">
          <v-btn variant="plain" style="position: absolute; top: 0; right: 0;" icon="mdi-close" @click="showHelp = false"></v-btn>
          <p>SolPredict is a collection of asset prediction games.</p>
          <p>Users can speculate which direction the price of the tracked asset will go.</p>
          <p>Support for Pyth/Switchboard/Chainlink oracles. (Devnet using Chainlink)</p>
          <br>
          <v-img :width="useDisplay().width.value < 1000 ? '100vw' :'50vw'" style="margin: 0 auto;" :src="helpUrl"></v-img>
        </v-sheet>
      </v-dialog>

      <v-fade-transition leave-absolute hide-on-leave>
        <v-row v-show="((!showChart && !showAccountInfo) || (useDisplay().width.value <= 1000 && showAccountInfo))" :justify="`${useDisplay().width.value > 1000 ? 'start' : 'center' }`" class="text-center">
          <v-fade-transition leave-absolute hide-on-leave>
            <v-col v-if="!showAccountInfo" :cols="wallet !== null && wallet.connected && useDisplay().width.value > 1000 ? 7 : 12">
              <v-row justify="center" class="text-center">
                <v-col align-self="center" class="text-center v-col-auto" v-for="(game, gameIndex) in computedGames" :key="'game-'+game.account.address.toBase58()">
                  <v-card
                    flat
                    :min-width="300"
                    :max-width="300"
                    tonal
                    :class="` ${
                      wallet !== null && wallet.connected ? 

                        game.currentRound.account.roundPredictionsAllowed ? 
                          frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Up ? 
                            'game-card up' : 
                              frontendGameData.get(game.account.address.toBase58()).prediction.direction === UpOrDown.Down ? 
                            'game-card down' : 
                          'game-card' : 

                        computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()) ? 
                            computedUserPredictions.find(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ?
                              'game-card up' :
                          'game-card down' :
                        'game-card' :
                      'game-card' 

                    }`" 
                    
                    v-if="game.currentRound && frontendGameData.get(game.account.address.toBase58()) !== undefined"
                  >
                  <v-img
                      :src="game.account.oracle === Oracle.Pyth ? pythUrl : game.account.oracle === Oracle.Switchboard ? switchboardUrl : game.account.oracle === Oracle.Chainlink ? chainlinkUrl : ''"
                      width="300px"
                      :aspectRatio="1"
                      style="position: absolute; z-index: -1;"

                    >
                  </v-img>
                  <!-- <v-img
                      :src="gameIndex === 0 ? pythUrl : gameIndex === 1 ? switchboardUrl : gameIndex === 2 ? chainlinkUrl : ''"
                      width="300px"
                      :aspectRatio="1"
                      style="position: absolute; z-index: -1;"

                    >
                  </v-img> -->
                    <v-btn-group>

                        <v-btn 
                          icon size="x-small"
                          style="z-index: 1; margin: 0px !important;"
                          v-if="wallet !== null && wallet.connected && getClaimableAmountForGame(game).gt(new anchor.BN(0)) && frontendGameData.get(game.account.address.toBase58()) !== undefined && frontendGameData.get(game.account.address.toBase58()).mint !== null"
                          variant="text"
                          color="success"
                          @click="async () => {
                            await userClaim(game, getClaimableForGame(game).amount)
                          }"
                        >
                          <v-tooltip
                            activator="parent"
                            location="top"
                          >
                            Claim {{ getClaimableAmountForGameAsNumber(game) }} {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
                          </v-tooltip>
                          <v-icon>mdi-currency-usd</v-icon>
                        </v-btn>

                        <v-btn icon size="x-small" style="z-index: 1; margin: 0px !important;" :variant="!frontendGameData.get(game.account.address.toBase58()).information.show ? 'text' : 'plain'" @click.stop="() => { frontendGameData.get(game.account.address.toBase58()).information.show = !frontendGameData.get(game.account.address.toBase58()).information.show }">
                          <v-tooltip
                            activator="parent"
                            location="top"
                          >Information</v-tooltip>
                          <v-icon class="information-icon">{{ !frontendGameData.get(game.account.address.toBase58()).information.show ? 'mdi-information-variant' : 'mdi-close' }}</v-icon>
                        </v-btn>

                        <v-btn icon size="x-small" style="z-index: 1; margin: 0px !important;" color="warning" v-if="frontendGameData.get(game.account.address.toBase58()).noUpdateReceieved" :variant="'plain'">
                          <v-tooltip
                            activator="parent"
                            location="top"
                          >No Round Updates Recieved</v-tooltip>
                          <v-icon color="white" class="information-icon">{{ 'mdi-alert' }}</v-icon>
                        </v-btn>

                        <v-btn icon size="x-small" style="z-index: 1; margin: 0px !important;" variant="text" @click.stop="() => { aggrWorkspace = getProtocol()+'//'+getHost()+'/workspaces/'+game.baseSymbolAsString().toLowerCase()+'.json'  }">
                          <v-tooltip
                            activator="parent"
                            location="top"
                          >Open in Aggr</v-tooltip>
                          <v-icon class="information-icon">mdi-chart-line-variant</v-icon>
                        </v-btn>
                    </v-btn-group>
                    <v-progress-linear 
                      v-if="game.account !== undefined && game.currentRound !== undefined && game.currentRound !== null"
                      width="3" 
                      :color="(() => {
                        if (!game.currentRound.account.finished) {
                          return frontendGameData.get(game.account.address.toBase58()).timeRemaining <= 0 ? 'success' : frontendGameData.get(game.account.address.toBase58()).timeRemaining >= 150 ? 'warning' : '#6864b7'
                        } else {
                          return 'blue'
                        }
                      })()" 
                      :max="game.account.roundLength.toNumber()"
                      :stream="!game.currentRound.account.finished"
                      :striped="game.currentRound.account.finished"
                      rounded 
                      :model-value="game.account.roundLength.toNumber() - frontendGameData.get(game.account.address.toBase58()).timeRemaining" 
                      :buffer-value="Math.floor((frontendGameData.get(game.account.address.toBase58()).timeRemaining / game.currentRound.account.roundLength.toNumber()) * 100) < game.currentRound.account.roundLength.toNumber()/2 ? game.currentRound.account.roundLength.toNumber()/2 : game.currentRound.account.roundLength.toNumber()"
                    ></v-progress-linear>
                    <v-btn 
                        v-if="game.account !== undefined && game.currentRound !== undefined && game.currentRound !== null"
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
                          v-if="game.currentRound !== undefined && game.currentRound !== null && !frontendGameData.get(game.account.address.toBase58()).information.show" 
                          :color="(!game.currentRound.account.roundPredictionsAllowed || computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) ? 'error' : 'success'"
                          :style="`transition: all .3s; background-color: rgba(0, 0, 0, 0); position: absolute; left: 0; right: 0; ${!frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'top: 0; bottom: 0em; left: 0em; margin-top: auto; margin-bottom: auto;' : 'bottom: -0.5em; left: 0%;'} margin-left: auto; margin-right: auto;`">
                          {{ !game.currentRound.account.roundPredictionsAllowed || computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()) ? 'mdi-lock' : 'mdi-lock-open' }}
                        </v-icon>
                        <v-row v-if="!frontendGameData.get(game.account.address.toBase58()).information.show" style="transition: all .3s; max-width: 300px; min-width: 300px;">
                          <v-col :style="`transition: all .3s; min-width: 150px; max-width: 150px; margin: 0; ${frontendGameData.get(game.account.address.toBase58()).prediction.show ? 'display: none;' : ''}`" v-if="game.currentRound">
                            <v-row :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                                  :class="`up-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                                  style="margin-right: 4px; margin-bottom: 1em; width: 146px;"
                                  @click.stop="(e) => { 
                                    e.preventDefault(); 
                                    if ( wallet !== null && wallet.connected && game.currentRound.account.roundPredictionsAllowed && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) {
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
                                    :disabled="wallet === null || !wallet.connected || !game.currentRound.account.roundPredictionsAllowed || computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"
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
                                style="margin-right: 4px; margin-top: 1em; width: 146px;"
                                @click.stop="(e) => { 
                                  e.preventDefault(); 
                                  frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                                  if ( wallet !== null && wallet.connected && game.currentRound.account.roundPredictionsAllowed && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())) {
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
                                    :disabled="wallet === null || !wallet.connected || !game.currentRound.account.roundPredictionsAllowed || computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"
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
                                      <template v-slot:activator="{ props  }">
                                        <v-row>
                                          <v-col>
                                            <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.baseSymbolAsString().toLowerCase()"/>
                                          </v-col>
                                          <v-divider vertical></v-divider>
                                          <v-col>
                                            <CryptoIcon v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null && frontendGameData.get(game.account.address.toBase58()).mint !== undefined" style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
                                          </v-col>
                                        </v-row>
                                      </template>
                                      <span>{{game.baseSymbolAsString()}} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</span>
                                    </v-tooltip>
                                  <!-- <p style="margin: 0 auto;">{{ game.baseSymbolAsString() }} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</p>  -->
                                </v-card-title>
                                <div style="margin-top: 1.05em;"></div>
                                <v-card-subtitle  v-if="frontendGameData.get(game.account.address.toBase58()).priceFeed !== null" class="text-center">
                                  
                                  <span style="margin: 0 auto;">
                                    $ {{ 
                                      bnToNumber(game.currentRound.account.totalUpAmount.add(game.currentRound.account.totalDownAmount), getVaultFromGame(game).account.tokenDecimals).toFixed(2)
                                    }}
                                    <v-tooltip activator="parent" location="bottom">
                                      Pool Balance
                                    </v-tooltip>
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
                                      $ {{  game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game.currentRound.account.roundStartPriceDecimals, game).toFixed(2) }}
                                    </v-col>
                                  </v-row>
                                  <v-row style="margin: 1px;">
                                    <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                                        game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0 ? 'up' : game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) < 0 ? 'down' : 'tie'
                                      }`">
                                      <v-tooltip
                                        activator="parent"
                                        location="end"
                                      >Price Difference</v-tooltip>
                                      <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1005;">
                                        <LottieAnimation :speed=".75" v-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                                        <LottieAnimation :speed=".75" v-else-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                                        <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                                      
                                      </div>
                                      <span style="margin-left: 24px;">
                                        $ {{ 
                                          game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game).toFixed(2)
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
                                    $ {{  game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundStartPrice, game.currentRound.account.roundStartPriceDecimals, game).toFixed(2) }}                      
                                </v-col>
                              </v-row>
                              <v-row style="margin: 1px;">
                                <v-col style="margin: 0; padding: .5em 0; position: relative;" :class="`price-difference ${
                                    game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0 ? 'up' : game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) < 0 ? 'down' : 'tie'
                                  }`">
                                  <v-tooltip
                                    activator="parent"
                                    location="end"
                                  >Price Difference</v-tooltip>
                                  <div style="pointer-events: all !important; opacity: 50%; height: 32px; width: 32px; position: absolute; top: 0; left: -56px; bottom: 0; right: 0; margin: auto; z-index: 1005;">
                                    <LottieAnimation :speed=".75" v-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) > 0" :animationData="UpArrowAnimation" :height="32" :width="32" />
                                    <LottieAnimation :speed=".75" v-else-if="game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game) < 0" :animationData="DownArrowAnimation" :height="32" :width="32" />
                                    <LottieAnimation v-else :animation-data="CrabAnimation" :height="32" :width="32"/>
                                  
                                  </div>
                                  <span style="margin-left: 24px;">
                                    $ {{ 
                                      game.currentRound.convertOraclePriceToNumber(game.currentRound.account.roundPriceDifference, game.currentRound.account.roundPriceDifferenceDecimals, game).toFixed(2)
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
                              <v-row justify="center">
                                <v-col cols="4">
                                  <CryptoIcon style="margin: 0 auto;" max-width="32px" :icon="game.baseSymbolAsString().toLowerCase()"/>
                                </v-col>
                                <v-divider vertical></v-divider>
                                <v-col cols="4">
                                  <CryptoIcon v-if="frontendGameData.get(game.account.address.toBase58()).mint !== null && frontendGameData.get(game.account.address.toBase58()).mint !== undefined" style="margin: 0 auto;" max-width="32px" :icon="frontendGameData.get(game.account.address.toBase58()).mint.symbol.toLowerCase()"/>
                                </v-col>
                              </v-row>
                              <v-spacer></v-spacer>
                              <!-- <p style="margin: 0 auto;">{{ game.baseSymbolAsString() }} / {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}</p>  -->
                            </v-card-title>
                            <v-card-subtitle>
                              <span style="margin: 0 auto;">
                                {{ frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(0, 4) + '..' + frontendGameData.get(game.account.address.toBase58()).priceFeed.substr(frontendGameData.get(game.account.address.toBase58()).priceFeed.length - 4)}}
                                <a style="text-decoration: none;" target="_blank" :href="`https://solscan.io/account/${frontendGameData.get(game.account.address.toBase58()).priceFeed}?cluser=${getWorkspace() !== null ? getWorkspace().cluster : ''}`"><v-tooltip activator="parent" location="bottom">Solscan</v-tooltip>&nbsp;<v-icon size="xsmall">mdi-open-in-new</v-icon></a>
                              </span>
                            </v-card-subtitle>
                            <v-card-text>
                              <span style="margin: 0 auto;">Time Remaining: 
                                {{ 
                                  Math.max(0, Math.floor((frontendGameData.get(game.account.address.toBase58()).timeRemaining) / 60)) + ':' 
                                  + ((frontendGameData.get(game.account.address.toBase58()).timeRemaining) % 60 >= 10 ? ((frontendGameData.get(game.account.address.toBase58()).timeRemaining) % 60) : '0' + Math.max(0, (frontendGameData.get(game.account.address.toBase58()).timeRemaining) % 60)) }}
                              </span>
                              <br>
                              <span style="margin: 0 auto;">Game Volume: {{ 
                                bnToNumber(game.account.totalVolume.add(U64MAX.mul(game.account.totalVolumeRollover)), getVaultFromGame(game).account.tokenDecimals).toFixed(2)
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
                                  bnToNumber(game.currentRound.account.totalUpAmount, getVaultFromGame(game).account.tokenDecimals).toFixed(2)
                                }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                              </span>
                              <br>
                              <span style="margin: 0 auto;">
                                Staked Down: {{ 
                                  bnToNumber(game.currentRound.account.totalDownAmount, getVaultFromGame(game).account.tokenDecimals).toFixed(2)
                                }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                              </span>
                              <br>
                              <br>
                              <span style="margin: 0 auto;">
                                Fee Collected: {{ 
                                  bnToNumber(game.currentRound.account.totalFeeCollected, getVaultFromGame(game).account.tokenDecimals).toFixed(2)
                                }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                              </span>
                              <br>
                              <span style="margin: 0 auto;">
                                Paid to Cranks: {{ 
                                  bnToNumber(game.currentRound.account.totalAmountPaidToCranks, getVaultFromGame(game).account.tokenDecimals).toFixed(2)
                                }} {{ frontendGameData.get(game.account.address.toBase58()).mint !== null ? '' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + '' : '' }}
                              </span>
                            </v-card-text>
                          </v-col>
                        </v-row>
                    </v-btn>
                    <v-expand-transition>
                      <div style="max-width: 300px; transition: all .3s;" v-if="game !== undefined && game.currentRound !== undefined && game.currentRound !== null && frontendGameData.get(game.account.address.toBase58()).prediction.show">
                        <v-divider></v-divider>
                        <v-card-text v-if="game.currentRound !== undefined && game.currentRound !== null">
                          <v-row :style="`padding-bottom: .5em; padding-top: .5em; ${game.currentRound.account.roundPredictionsAllowed ? '' : ''}`">
                            <v-col 
                              :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                              v-if="wallet !== null && wallet.connected && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" 
                              style="margin-right: 0.3em;"
                              :class="`up-area ${game.currentRound.account.roundPredictionsAllowed ? 'hover' : ''}`"
                              @click.stop="(e) => { 
                                if ( game.currentRound.account.roundPredictionsAllowed && wallet !== null && wallet.connected ) {
                                  e.preventDefault(); 
                                  frontendGameData.get(game.account.address.toBase58()).prediction.show = true; 
                                  frontendGameData.get(game.account.address.toBase58()).prediction.direction = UpOrDown.Up; 
                                }
                                
                              }"
                            >
                              <v-card-title>
                                <v-btn
                                  variant="plain"
                                  :disabled="!game.currentRound.account.roundPredictionsAllowed || wallet === null || !wallet.connected"
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
                                  game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount).div(game.currentRound.account.totalUpAmount).toNumber().toFixed(2) + 'x' : '1.00x' 
                                }}
                                </span>
                              </v-card-subtitle>
                            </v-col>
                            <v-divider vertical v-if="wallet !== null && wallet.connected && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                            <v-col v-if="wallet !== null && wallet.connected && computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())">
                              <v-row>
                                <v-spacer></v-spacer>
                                  <v-card-title>
                                    Prediction
                                  </v-card-title>
                                  <v-spacer></v-spacer>
                                  <v-icon style="margin: auto 0; top: 0; bottom: 0;" :color="`${computedUserPredictions.find(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ? 'success' : 'error'}`">
                                    {{ computedUserPredictions.find(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.upOrDown === 1 ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold' }} 
                                  </v-icon> 
                                  <v-spacer></v-spacer>
                                  <v-card-title>
                                    
                                    {{ computedUserPredictions.find(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58()).account.amount.div(new anchor.BN(10).pow(new anchor.BN(getVaultFromGame(game).account.tokenDecimals))) }} {{ frontendGameData.get(game.account.address.toBase58()).mint.symbol }}
                                  </v-card-title>
                                
                                <v-spacer></v-spacer>
                              </v-row>
                            </v-col>
                            <v-col 
                              :v-ripple="game.currentRound.account.roundPredictionsAllowed"
                              v-if="wallet !== null && wallet.connected && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" 
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
                                      game.currentRound.account.totalDownAmount.add(game.currentRound.account.totalUpAmount).div(game.currentRound.account.totalDownAmount).toNumber().toFixed(2)
                                    + 'x' : '1.00x'
                                  }}
                                </span>
                              </v-card-subtitle>
                            </v-col>
                          </v-row>
                        </v-card-text>
                        <v-divider v-if="wallet !== null && wallet.connected && game.currentRound.account.roundPredictionsAllowed && getTokenAccountFromGame(game) !== null && new anchor.BN(getTokenAccountFromGame(game).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)).div((new anchor.BN(10)).pow(new anchor.BN(getVaultFromGame(game).account.tokenDecimals))).gte(new anchor.BN(1)) && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                        <v-card-text v-if="wallet !== null && wallet.connected && game.currentRound.account.roundPredictionsAllowed && getTokenAccountFromGame(game) !== null && new anchor.BN(getTokenAccountFromGame(game).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)).div((new anchor.BN(10)).pow(new anchor.BN(getVaultFromGame(game).account.tokenDecimals))).gte(new anchor.BN(1)) && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())" style="margin-top: 1em;">
                          <v-row >
                            <v-text-field 
                              hide-details
                              style="width: calc(100%);" 
                              variant="outlined" 
                              type="number" 
                              :persistent-placeholder="true"
                              :placeholder="'Balance: '+(((new anchor.BN((getTokenAccountFromGame(game)).amount.toString())).add(getClaimableForGame(game)?.amount || new anchor.BN(0))).div((new anchor.BN(10)).pow(new anchor.BN(getVaultFromGame(game).account.tokenDecimals)))).toNumber() + ' ' + frontendGameData.get(game.account.address.toBase58()).mint.symbol"
                              :step="0.01" 
                              :label="`Prediction Amount ${frontendGameData.get(game.account.address.toBase58()).mint !== null ? '(' + frontendGameData.get(game.account.address.toBase58()).mint.symbol + ')' : ''}`" 
                              v-model="frontendGameData.get(game.account.address.toBase58()).prediction.amount"
                              @update:model-value="(value) => {
                                if (
                                    bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < parseFloat(value)
                                  ) {
                                  frontendGameData.get(game.account.address.toBase58()).prediction.amount = bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
                                } else if (parseFloat(value) < 0) {
                                  frontendGameData.get(game.account.address.toBase58()).prediction.amount = 0
                                  frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 0
                                  return;
                                }
                                frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = ( parseFloat(value) / bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) ) * 100
                              }"
                            >
                              <template v-slot:append>
                                <v-btn size="small" variant="outlined" @click="() => {
                                  frontendGameData.get(game.account.address.toBase58()).prediction.amount = bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
                                  frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount = 100;
                                }">Max</v-btn>
                              </template>
                            </v-text-field>
                            <v-slider
                              hide-details
                              v-model="frontendGameData.get(game.account.address.toBase58()).prediction.sliderAmount"
                              @update:model-value="(value) => {
                                frontendGameData.get(game.account.address.toBase58()).prediction.amount = new Number(
                                  (
                                    (
                                      bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals)
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
                        <v-card-text v-if="wallet === null || !wallet.connected">
                          <div class="game-wallet-button">
                            <wallet-multi-button dark/>
                          </div>
                        </v-card-text>
                        <v-divider v-if="wallet !== null && wallet.connected && (getTokenAccountFromGame(game)) !== null && bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) >= 1 && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())"></v-divider>
                        <v-card-actions v-if="wallet !== null && wallet.connected && (getTokenAccountFromGame(game)) !== null && bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) >= 1 && !computedUserPredictions.some(prediction => prediction !== undefined && prediction !== null && prediction.account.round.toBase58() === game.currentRound.account.address.toBase58())">
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
                          <h3 v-else>
                            <v-tooltip activator="parent" bottom>
                              {{Math.max(0, frontendGameData.get(game.account.address.toBase58()).timeRemaining)  === 0 ? `Next Round Starting` : `Next Round Starts In ${Math.max(0, frontendGameData.get(game.account.address.toBase58()).timeRemaining)} Seconds`}} 
                            </v-tooltip>
                            Predictions Locked
                          </h3>
                          <v-spacer></v-spacer>
                        </v-card-actions>
                        <v-divider v-if="wallet !== null && wallet.connected && ( getTokenAccountFromGame(game) === null || bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 )"></v-divider>
                        <v-card-actions style="margin-top: .5em;" v-if="wallet.connected && ( getTokenAccountFromGame(game) === null || bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 )">
                          <v-spacer></v-spacer>
                            <v-btn variant="outlined" v-if="getTokenAccountFromGame(game) === null" @click="async () => { initTokenAccountForGame(game); }">
                              Initialize Token Account
                            </v-btn>
                            <v-btn variant="outlined" v-else-if="bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 && getWorkspace() !== null && (getWorkspace().cluster === 'devnet' || getWorkspace().cluster === 'testnet')" @click="async () => { await airdrop(game) }">Airdrop</v-btn>
                            <v-btn variant="outlined" v-else-if="bnToNumber(new anchor.BN((getTokenAccountFromGame(game)).amount.toString()).add(getClaimableForGame(game)?.amount || new anchor.BN(0)), frontendGameData.get(game.account.address.toBase58()).mint.decimals) < 1 && getWorkspace() !== null && getWorkspace().cluster === 'mainnet-beta'" href="https://jup.ag/swap/SOL-USDC">SWAP</v-btn>
                          <v-spacer></v-spacer>
                        </v-card-actions>
                      </div>
                    </v-expand-transition>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>
          </v-fade-transition>
          <v-fade-transition leave-absolute hide-on-leave>
            <v-col v-if="wallet !== null && wallet.connected && !wallet.connecting && (useDisplay().width.value > 1000 || showAccountInfo)" :cols="useDisplay().width.value > 1000 ? 5 : 12" align-self="center" class="text-center" >
              <v-row justify="center" class="text-center">
                <v-card variant="outlined" >
                  <v-card-title>
                    Account Info
                  </v-card-title>
                  <v-card-subtitle v-if="wallet !== null && wallet.connected && !wallet.connecting && walletBalance !== null && workspace !== null">
                    <span 
                      :style="`${walletBalance <= 0.1 && getWorkspace().cluster !== 'mainnet-beta' ? 'color: rgb(76, 175, 80); border: 1px solid rgb(76, 175, 80); border-radius: 0em; padding: 0 1em; font-weight: bold; cursor: pointer;' : ''}`"
                      @click.stop="async (e) => {
                      if (walletBalance <= 0.1 && getWorkspace().cluster !== 'mainnet-beta') {
                        e.preventDefault();
                        await airdropDevnetSOL()
                      }
                    }"><v-tooltip v-if="walletBalance <= 0.1 && getWorkspace().cluster !== 'mainnet-beta'" activator="parent" location="end">AirDrop SOL</v-tooltip>
                      {{ walletBalance.toFixed(2) }} SOL
                    </span>

                  </v-card-subtitle>
                  <v-card variant="plain" v-if="computedUserPredictions !== null && computedUserPredictions.length > 0 && computedUserPredictions.filter(prediction => prediction !== undefined && prediction !== null  && !prediction.account.settled).length > 0">
                    <v-card-title>Predictions</v-card-title>
                    <v-card-text>
                      <table style="width: 300px;">
                        <tr>
                          <th>
                            Asset
                          </th>
                          <th>
                            Direction
                          </th>
                          <th>
                            Amount
                          </th>
                          <th>Winning</th>
                        </tr>
                        <tr v-for="(prediction, predictionIndex) in computedUserPredictions.filter(prediction => prediction !== undefined && prediction !== null && !prediction.account.settled)" :key="'prediction-'+predictionIndex">
                          <td>
                            {{ computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58()).account.baseSymbol  }}
                          </td>
                          <td>
                            {{ UpOrDown[prediction.account.upOrDown] }}
                          </td>
                          <td>
                            {{ bnQuoteAssetToNumberFromGame(prediction.account.amount, computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58())) }}
                          </td>
                          <td> {{ computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58()).currentRound.convertOraclePriceToNumber(computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58()).currentRound.account.roundPriceDifference, computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58()).currentRound.account.roundPriceDifferenceDecimals, computedGames.find(g => g.account.address.toBase58() === prediction.account.game.toBase58())) > 0 ? prediction.account.upOrDown === UpOrDown.Up : false }}</td>
                        </tr>
                      </table>
                    </v-card-text>
                  </v-card>
                  <v-card variant="plain">
                    <v-card-title>Balances</v-card-title>
                    <v-card-text>
                      <table style="width: 300px;">
                        <tr>
                          <th>
                            Asset
                          </th>
                          <th>
                            Total
                          </th>
                          <th>
                            Wallet
                          </th>
                          <th>
                            Claimable  
                          </th>
                        </tr>
                        <tr justify="start" v-for="([key, value], tokenIndex) in getTotalAvailableBalancesByTokenAsNumbers.entries()" :key="'tokenBalance'+tokenIndex">
                          <td>{{ key }}</td>
                          <td>{{ value.total.toFixed(2) }} </td> 
                          <td>{{ value.wallet.toFixed(2) }} </td>
                          <td 
                            :style="`${value.claimable > 0 ? 'color: rgb(76, 175, 80); border: 1px solid rgb(76, 175, 80); border-radius: 1em; font-weight: bold; cursor: pointer;' : ''}`"
                            @click.stop="async (e) => {
                              if (value.claimable > 0) {
                                e.preventDefault();
                                await userClaimAll(value.mint);
                              }
                            }"
                          >{{ value.claimable.toFixed(2) }}</td> 
                        </tr>
                      </table>
                    </v-card-text>
                  </v-card>
                  
                  <v-divider v-if="wallet !== null && wallet.connected && hasSomeClaimable()"></v-divider>
                  <v-card-actions v-if="wallet !== null && wallet.connected && hasSomeClaimable()">
                    <v-spacer></v-spacer>
                    <v-btn 
                      variant="outlined"
                      color="success"
                      @click="async () => {
                        await userClaimAll()
                      }"
                    >
                      Claim All
                    </v-btn>
                    <v-spacer></v-spacer>
                  </v-card-actions>
                </v-card> 
              </v-row>
            </v-col>
          </v-fade-transition>
        </v-row>
      </v-fade-transition>
      <!-- CHART -->
      <v-fade-transition leave-absolute hide-on-leave>
        <v-row v-show="useDisplay().width.value > 1000 ? useDisplay().height.value >= 1280 ? true : showChart : showChart">
          <v-col :cols="wallet !== null && wallet.connected && !showChart ? 7 : 12" :style="`padding: 8px; transition: all .3s; margin-top: ${showAccountInfo ? '1em' : '0'};`">
            <div :style="`resize: vertical; border-radius: .25em; width: 100%; height: ${useDisplay().width.value > 1000 && useDisplay().height.value >= 1280 ? useDisplay().height.value - (useDisplay().height.value * 0.25) + 'px' : useDisplay().height.value - (useDisplay().height.value * 0.25) + 'px'}; overflow: hidden;`">
              <iframe id="aggr" 
                :src="`${'https://aggr.solpredict.io'}?workspace-url=${aggrWorkspace}`" 
                frameborder="0" style=" border-radius: .25em; width: 100%; height: 100%;"
              ></iframe>
            </div>
            
            <!-- <iframe id="aggr" 
              :src="`https://v3.aggr.trade`" 
              frameborder="0" style="border-radius: .25em; width: 100%; min-height: 50vh; max-height: 50vh; margin: .75em;"
            ></iframe> -->
            
          </v-col>
        </v-row>
      </v-fade-transition>
      <!-- HISTORY -->
      <v-fade-transition leave-absolute hide-on-leave>
        <v-row v-show="useDisplay().width.value > 1000 ? useDisplay().height.value >= 1280 ? true : showHistory : showHistory">
          <v-col :cols="wallet !== null && wallet.connected && !showHistory ? 7 : 12" :style="`padding: 8px; transition: all .3s; margin-bottom: ${showAccountInfo ? '1em' : '0'}; margin-top: ${showChart ? '1em' : '1em'};`">
            <v-card style="height: 100%;">
              <v-card-title>
                <v-container fluid>
                  <v-row align="center">
                    <v-col cols="12" sm="6" class="d-flex">
                      
                      <v-select 
                          style="margin: 0;" 
                          label="Asset" 
                          :items="computedGames.filter(g => g !== undefined && g.account !== undefined).map(g => {
                            return {
                              title: g.baseSymbolAsString(),
                              value: g.account.address.toBase58()
                            }
                          })"
                          v-model="selectedGameHistory"
                      />
                    </v-col>
                    <v-col cols="12" sm="6" class="d-flex">
                      <v-select style="margin: 0;"  label="History" v-if="
                      selectedGameHistory !== null && 
                      frontendGameData.get(selectedGameHistory) !== undefined && 
                      frontendGameData.get(selectedGameHistory) !== null" :items="Object.keys(frontendGameData.get(selectedGameHistory).history.show)" @update:model-value="(val) => {
                        Object.keys(frontendGameData.get(selectedGameHistory).history.show).forEach(showable => {
                          frontendGameData.get(selectedGameHistory).history.show[showable] = false;
                        })
                        frontendGameData.get(selectedGameHistory).history.show[val] = true;
                      }"></v-select>
                    </v-col>

                  </v-row>
                </v-container>
              </v-card-title>
              <v-card-text>
                <div v-if="selectedGameHistory !== null && selectedGameHistory !== undefined && histories.get(selectedGameHistory) !== undefined">
                  <v-card variant="plain" v-if="
                    frontendGameData.get(selectedGameHistory) !== undefined && 
                    frontendGameData.get(selectedGameHistory) !== null && 
                    frontendGameData.get(selectedGameHistory).history.show.rounds &&
                    histories.has(selectedGameHistory)
                  ">
                    <v-card-title>Round History</v-card-title>
                    <v-card-subtitle>{{ computedGames.find(g => g.account.address.toBase58() === selectedGameHistory).baseSymbolAsString() }}</v-card-subtitle>
                    <v-card-text>
                      <v-table>
                        <thead>
                          <tr>
                            <th>
                              Round Number
                            </th>
                            <th>
                              Duration 
                            </th>
                            <th>
                              Start Price $
                            </th>
                            <th>
                              Price Difference $
                            </th>
                            <th>
                              Predictions
                            </th>
                            <th>
                              Up Stake
                            </th>
                            <th>
                              Down Stake
                            </th>
                            <th>
                              Fee Collected
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          
                          <tr
                            :class="`roundHistoryItem ${ !(historyItem as any).invalid ? (historyItem.roundWinningDirection === 1 ? 'up' : 'down') : 'invalid' }`"
                            v-for="historyItem in computedRoundHistoryItems"
                          >
                              <td>
                                {{historyItem.roundNumber}}
                              </td>
                              <td>
                                {{ Math.floor(historyItem.roundTimeDifference.toNumber() / 60) + ':' + (historyItem.roundTimeDifference.toNumber() % 60 >= 10 ? historyItem.roundTimeDifference.toNumber() % 60 : "0" + historyItem.roundTimeDifference.toNumber() % 60)}}
                              </td>
                              <td>
                                {{ computedGames.find(g => g.account.address.toBase58() === selectedGameHistory).currentRound.convertOraclePriceToNumber(historyItem.roundStartPrice, historyItem.roundStartPriceDecimals, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)).toFixed(2) }}
                              </td>
                              <td>
                                {{ computedGames.find(g => g.account.address.toBase58() === selectedGameHistory).currentRound.convertOraclePriceToNumber(historyItem.roundPriceDifference, historyItem.roundPriceDifferenceDecimals, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)).toFixed(2) }}
                              </td>
                              <td>
                                {{historyItem.totalPredictions}}
                              </td>
                              <td>
                                {{ bnQuoteAssetToNumberFromGame(historyItem.totalUpAmount, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }} {{ getGameQuoteSymbol(computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }}
                              </td>
                              <td>
                                {{ bnQuoteAssetToNumberFromGame(historyItem.totalDownAmount, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }} {{ getGameQuoteSymbol(computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }}
                              </td>
                              <td>
                                {{ bnQuoteAssetToNumberFromGame(historyItem.totalFeeCollected, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }} {{ getGameQuoteSymbol(computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }}
                              </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card-text>
                  </v-card>
                  <v-card variant="plain" v-else-if="
                    frontendGameData.get(selectedGameHistory) !== undefined && 
                    frontendGameData.get(selectedGameHistory) !== null && 
                    frontendGameData.get(selectedGameHistory).history.show.userPredictions &&
                    histories.has(selectedGameHistory)
                  ">
                    <v-card-title>User Prediction History</v-card-title>
                    <v-card-subtitle>{{ computedGames.find(g => g.account.address.toBase58() === selectedGameHistory).baseSymbolAsString() }}</v-card-subtitle>
                    <v-card-text>
                      <v-table
                      >
                        <thead>
                          <tr>
                            <th>
                              Direction
                            </th>
                            <th>
                              Amount
                            </th>
                            <th>
                              Round
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr :class="`userPredictionHistoryItem ${historyItem.upOrDown === 1 ? 'up' : 'down'}`" 
                            v-for="historyItem in computedUserPredictionHistoryItems">
                            <td>
                              {{ UpOrDown[historyItem.upOrDown] }}
                            </td>
                            <td>
                              {{ bnQuoteAssetToNumberFromGame(historyItem.amount, computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }} {{ getGameQuoteSymbol(computedGames.find(g => g.account.address.toBase58() === selectedGameHistory)) }}
                            </td>
                            <td>
                              <a @click.stop="(e) => {
                                e.preventDefault();
                                roundHistorySelectedRound = historyItem.round.toBase58()
                              }">{{ histories.get(selectedGameHistory).roundHistory.account.rounds.find(h =>  {
                                return (h.address !== undefined ? h.address!.toBase58() === historyItem.round.toBase58() : false)
                              }) !== undefined ? histories.get(selectedGameHistory).roundHistory.account.rounds.find(h => {
                                return (h.address !== undefined ? h.address!.toBase58() === historyItem.round.toBase58() : false)
                              }).roundNumber : historyItem.round.toBase58() }}</a>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card-text>
                  </v-card>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-fade-transition>
    </div>
    
    
  </v-container>
</template>

<style>

.roundHistoryItem.up {
  background-color: rgba(76,175,80,0.1);
}

.roundHistoryItem.down {
  background-color: rgba(207,102,121,0.1);
}

.userPredictionHistoryItem.up {
  background-color: rgba(76,175,80,0.1);
}

.userPredictionHistoryItem.down {
  background-color: rgba(207,102,121,0.1);
}

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
  backdrop-filter: blur(10px);
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
