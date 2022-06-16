<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import HelloWorld from './components/HelloWorld.vue'
import Logo from './components/Logo.vue'
import GithubLink from './components/GithubLink.vue'
import PhantomConnect from './components/PhantomConnect.vue'
import {provide} from "vue";

// @ts-ignore
const { solana } = window;

if (solana?.isPhantom) {
  provide("phantom", solana);
} else {
  provide("phantom", null);
}

</script>

<template>
  <v-app>
    <!-- <v-navigation-drawer app> -->
      <!-- -->
    <!-- </v-navigation-drawer> -->

    <v-app-bar app>
      <!-- -->
      <Logo :height="64" heightUnits="px" :width="64" widthUnits="px"/>
      <GithubLink :height="32" heightUnits="px" :width="32" widthUnits="px"/>
      <v-spacer></v-spacer>
      <PhantomConnect/>
    </v-app-bar>

    <!-- Sizes your content based upon application components -->
    <v-main>

      <!-- Provides the application the proper gutter -->
      <v-container fluid>
        <!-- If using vue-router -->
        <router-view></router-view>
      </v-container>
    </v-main>

    <v-footer app>
      <v-row>
        
      </v-row>
    </v-footer>
  </v-app>
  
</template>

<style scoped>

</style>
