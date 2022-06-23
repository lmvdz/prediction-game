import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'
import { createPinia } from 'pinia'
import { dragscrollNext } from "vue-dragscroll";
import SolanaWallets from 'solana-wallets-vue';
import 'solana-wallets-vue/styles.css';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
const walletOptions = {
  wallets: [
    new PhantomWalletAdapter(),
    new SlopeWalletAdapter(),
    new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
  ],
  autoConnect: true,
}
import { initTokenList } from "./plugins/tokenList"
await initTokenList('mainnet-beta');

loadFonts()

createApp(App)
  .use(vuetify)
  .use(router)
  .use(createPinia())
  .use(SolanaWallets, walletOptions)
  .directive('dragscroll', dragscrollNext)
  .mount('#app')
