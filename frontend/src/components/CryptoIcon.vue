<script setup lang="ts">
    const props = defineProps({
        icon: String
    })
    let url = new URL(`../assets/crypto-icons/${props.icon}.svg`, import.meta.url).href;
</script>

<template>
    <v-img class="crypto-icon" style="margin: 0 auto;" :src="url"></v-img>
</template>

<style>
.crypto-icon > img {
    position: relative !important;
}
</style>