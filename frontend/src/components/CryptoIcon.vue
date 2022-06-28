<script setup lang="ts">
    const props = defineProps({
        icon: String
    })
    let url = new URL(`../assets/crypto-icons/${props.icon}.svg`, import.meta.url).href;
</script>

<template>
    <v-img :src="url"></v-img>
</template>