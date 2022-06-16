<script setup lang="ts">
import {inject, ref} from "vue";

const phantom: any = inject("phantom");
const publicWalletAddress = ref("");

const connectPhantom = async () => {
  if (phantom) {
    const response = await phantom.connect();
    publicWalletAddress.value = response.publicKey.toString();
  }
}

const disconnectPhantom = async () => {
  if (phantom && publicWalletAddress.value !== "") {
    const response = await phantom.disconnect();
    publicWalletAddress.value = ""
  }
}

</script>

<template>
    <div>
        <button
            v-if="phantom && !publicWalletAddress"
            class="wallet-connect-btn"
            @click="connectPhantom"
        >
            CONNECT WALLET
        </button>
        <button 
            class="wallet-connected-btn" 
            v-else
            @click="disconnectPhantom"
        >
            {{publicWalletAddress.slice(0, 10) + '...'}}
        </button>
    </div>
    
</template>

<style>
.wallet-connect-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: .5em;
    color: rgba(255, 255, 255, .5)
}

.wallet-connect-btn:hover {
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 1)
}


.wallet-connected-btn {
    border: 1px solid rgba(100, 255, 100, 0.2);
    padding: .5em;
    color: rgba(100, 255, 100, .5)
}

.wallet-connected-btn:hover {
    border: 1px solid rgba(100, 255, 100, 0.5);
    color: rgba(100, 255, 100, 1)
}

</style>