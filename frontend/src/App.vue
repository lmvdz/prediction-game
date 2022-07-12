<script setup lang="ts">

import Logo from './components/Logo.vue'
import GithubLink from './components/GithubLink.vue'
import DiscordLink from './components/DiscordLink.vue'
import { WalletMultiButton, useWallet } from 'solana-wallets-vue'
import { useDisplay } from 'vuetify'
const wallet = useWallet();

</script>

<script lang="ts">
  import { defineComponent } from 'vue'
  export default defineComponent({
    name: 'App'
  })
</script>

<template>
  <v-app>
    <!-- <v-navigation-drawer app> -->
      <!-- -->
    <!-- </v-navigation-drawer> -->

    <div :class="`app-wallet-button ${useDisplay().width.value >= 420 ? '' : 'hidden'}`">
      <wallet-multi-button dark />
    </div>


    <v-app-bar app>
      <!-- -->
      <span class="hover-move-right-container">
        <Logo :height="64" heightUnits="px" :width="64" widthUnits="px" class="hover-move-right"/>
      </span>
      
      <v-spacer/>
    </v-app-bar>

    <!-- Sizes your content based upon application components -->
    <v-main>
      
      <!-- Provides the application the proper gutter -->
      <v-container fluid>
        <!-- If using vue-router -->
        <router-view/>
      </v-container>
    </v-main>

    <v-footer app>
      <v-row>
        <a class="hover-move-up-container" href="https://github.com/lmvdz/prediction-game" target="_blank">
          <GithubLink href="https://github.com/lmvdz/prediction-game" :height="28" heightUnits="px" :width="28" widthUnits="px" class="hover-move-up github"/>
        </a>
        
        <a class="hover-move-up-container" href="https://discord.gg/qfeVZQvCv3" target="_blank">
          <DiscordLink href="https://discord.gg/qfeVZQvCv3" :height="32" heightUnits="px" :width="32" widthUnits="px" class="hover-move-up discord"/>
        </a>
        
      </v-row>
    </v-footer>
  </v-app>
  
</template>

<style>

.hover-move-right-container {
  position: relative;
  margin-left: 0.5em;
  margin-right: 0.5em;
  top: .15em;
  left: -3em;
  transition: all 0.3s;
}
.hover-move-right {
  margin-left: 0.5em;
  margin-right: 0.5em;
  position: relative;
  left: -3em;
  transition: all 0.3s;
}

.hover-move-right:hover {
  position: relative;
  left: 0em;
  transition: all 0.3s;
}

.hover-move-right-container:hover > .hover-move-right {
  position: relative;
  left: 0em;
  transition: all 0.3s;
}


.hover-move-up {
  margin-left: 0.5em;
  margin-right: 0.5em;
  position: relative;
  transition: all 0.3s;
}

.hover-move-up.discord {
  bottom: -0.25em;
}

.hover-move-up.github {
  bottom: -0.3em;
}

.hover-move-up:hover {
  position: relative;
  bottom: 1em;
  transition: all 0.3s;
}

.hover-move-up-container:hover > .hover-move-up {
  position: relative;
  bottom: 1em;
  transition: all 0.3s;
}

.account-button {
  border-radius: 1px !important; 
  border: 1px solid white;
  right: 11.25em; 
  margin-top: 0.2em;
  transition: all .3s;
}

.account-button:hover {
  border-radius: 1px; 
  border: 1px solid #6864b7; 
  transition: all .3s !important;
}

div.swv-modal-wrapper.swv-modal-wrapper-no-logo {
  border: 1px solid #6864b7;
  border-radius: 1px;
  background-color: rgb(33, 33, 33, 1);
  color:white;
}

div.swv-modal-wrapper.swv-modal-wrapper-no-logo > .swv-modal-button-close {
  background: rgba(255, 255, 255, 0.01);
  color: white;
  border-radius: 1px;
  transition: all .2s;
}

div.swv-modal-wrapper.swv-modal-wrapper-no-logo > .swv-modal-button-close:hover {
  background: rgba(255, 255, 255, 0.1);
  transition: all .2s;
}

div.swv-modal-wrapper.swv-modal-wrapper-no-logo > ul.swv-modal-list > li > .swv-button:hover{
  background-color: rgba(255, 255, 255, .1);
  color: #6864b7;
  transition: all .2s;
}

div.swv-modal-wrapper.swv-modal-wrapper-no-logo > ul.swv-modal-list > li > .swv-button {
  color: white;
  transition: all .2s;
}

.app-wallet-button {
  position: fixed !important; 
  right: 0px; top: 0px; z-index: 1008;
}

.app-wallet-button.hidden > .swv-dark > .swv-dropdown > .swv-button.swv-button-trigger > p {
  display: none;
}

.app-wallet-button > .swv-dark > .swv-button {
  position: fixed !important; 
  right: 0px; top: 0px; z-index: 1008;
  margin: 0 auto;
  border: 1px solid #6864b7;
  border-radius: 1px;
  background-color: rgba(0, 0, 0, 0);
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-button:hover {
  border: 1.5px solid #6864b7;
  font-size: 1.01rem;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, .025);
  color: #6864b7;
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-button-trigger {
  position: fixed !important; 
  right: 0px; 
  top: 0px; 
  z-index: 1008; 
  margin: .5em;
}

.app-wallet-button > .swv-dark > .swv-dropdown {
  position: fixed !important; 
  top: -3px;
  margin-top: 3px;
  border: 1.5px solid #6864b7;
  font-size: 1.01rem;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, .025);
  color: #6864b7;
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-dropdown > .swv-dropdown-list {
  top: 3.5em !important;
  right: 1em !important;
  border: 1px solid #6864b7;
  font-size: 1.01rem;
  border-radius: 2px;
  background-color: rgb(33 33 33);
  color: white;
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-dropdown > .swv-dropdown-list > li.swv-dropdown-list-item:hover {
  color: white;
  background-color: #6864b7ee;
  border-radius: 2px;
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-dropdown > .swv-button-trigger {
  position: fixed !important; 
  right: 0px; 
  top: 0px; 
  z-index: 1008; 
  margin: .5em;
  border: 1px solid #6864b7;
  border-radius: 1px;
  background-color: rgba(0, 0, 0, 0);
  transition: all .2s;
}

.app-wallet-button > .swv-dark > .swv-dropdown > .swv-button-trigger:hover {
  position: fixed !important; 
  right: 0px; 
  top: 0px; 
  z-index: 1008; 
  margin: .5em;
  border: 1.5px solid #6864b7;
  font-size: 1.01rem;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, .025);
  color: #6864b7;
  transition: all .2s;
}

</style>
