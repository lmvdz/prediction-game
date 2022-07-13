import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'
import { createPinia } from 'pinia'
import SolanaWallets from 'solana-wallets-vue';
import 'solana-wallets-vue/styles.css';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache } from "@solana-mobile/wallet-adapter-mobile"
import {
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

const walletOptions = {
  wallets: [
    new SolanaMobileWalletAdapter({
      appIdentity: {
          name: 'SolPredict',
          icon: './assets/logo.svg',
          uri: window.location.href,
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
    }),
    new PhantomWalletAdapter(),
    new SlopeWalletAdapter(),
    new SolflareWalletAdapter({ network: WalletAdapterNetwork.Mainnet }),
  ],
  autoConnect: false,
}
import Vue3Lottie from 'vue3-lottie'
import 'vue3-lottie/dist/style.css'
import { initTokenList } from "./plugins/tokenList"

loadFonts()

;(async () => {
  await initTokenList('mainnet-beta');

  createApp(App)
    .use(vuetify)
    .use(router)
    .use(createPinia())
    .use(SolanaWallets, walletOptions)
    .use(Vue3Lottie, { name: 'LottieAnimation' })
    .mount('#app')
})();




