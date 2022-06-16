<script setup lang="ts">
import {inject, ref} from "vue";
import Logo from "./Logo.vue"

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

</script>

<script lang="ts">
import { defineComponent } from 'vue'
import { ref, reactive, computed } from 'vue'

export default defineComponent({
  name: 'HelloWorld',
  mounted() {
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
  <v-container class="bg-surface-variant text-center">
    <v-row justify="center" no-gutters>
      <!-- PREVIOUS ROUND -->
      <v-card class="ma-2 round">
        <v-card-title>
          {{round.mint}} - {{round.currentPrice}}
        </v-card-title>
        <v-card-subtitle>
          Expired
        </v-card-subtitle>
        <v-card-text>
          Test
        </v-card-text>
      </v-card>
      <!-- CURRENT ROUND -->
      <v-card :class="`ma-2 text-center round current ${round.currentPrice > round.startPrice ? 'up' : round.currentPrice < round.startPrice ? 'down' : 'tie'}`">
        <v-card-title>
          {{round.mint}} - {{round.currentPrice}} - {{ ((round.startTime+(60*10)-round.currentTime) / 60).toFixed(0) + ":" + (((round.startTime+(60*10)-round.currentTime) % 60) < 10 ? "0" + ((round.startTime+(60*10)-round.currentTime) % 60) : ((round.startTime+(60*10)-round.currentTime) % 60))}}
        </v-card-title>
        <v-card-subtitle style="padding: 0px;">
          <div :style="`color: black; background: rgba(255, 255, 255, 1); border: 1px solid white; padding: 0px; margin: 0px; width: 100%; height: .5em; background: linear-gradient(90deg, rgba(255,255,255,1) ${100-((((round.startTime+(60*10))-round.currentTime) / (60*10)) * 100)}%, rgba(148,148,148,0) ${Math.min(100-((((round.startTime+(60*10))-round.currentTime) / (60*10)) * 100)+2, 100)}%, rgba(255,255,255,0) 100%);`"/>
        </v-card-subtitle>
        <v-card-text>
          Test
        </v-card-text>
      </v-card>
      <!-- NEXT ROUND -->
      <v-card :class="`ma-2 round`">
        <v-card-title>
          {{ ((round.startTime+(60*10)-round.currentTime) / 60).toFixed(0) + ":" + (((round.startTime+(60*10)-round.currentTime) % 60) < 10 ? "0" + ((round.startTime+(60*10)-round.currentTime) % 60) : ((round.startTime+(60*10)-round.currentTime) % 60))}}
        </v-card-title>
        <v-card-subtitle>
          # {{round.roundNumber+1}}
        </v-card-subtitle>
        <v-card-text>
          Test
        </v-card-text>
      </v-card>
    </v-row>
  </v-container>
</template>

<style>

.round {
  width: 20%;
}

.up {
  background: rgb(0,26,36);
  background: linear-gradient(0deg, rgba(0,26,36,1) 0%, rgba(9,121,18,0.5) 100%) !important;
}
.down {
  background: rgb(0,26,36);
  background: linear-gradient(180deg, rgba(0,26,36,1) 0%, rgba(121,9,9,0.5) 100%) !important;
}
.tie {
  background: rgb(0,26,36);
  background: linear-gradient(180deg, rgba(0,26,36,0.5) 0%, rgba(121,114,9,0.75) 50%) !important;
}
</style>
