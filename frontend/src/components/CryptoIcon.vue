<script setup lang="ts">
    const getCryptoIcon = (currency: string) => {
        return new URL('../../node_modules/cryptocurrency-icons/svg/color/'+currency+'.svg', import.meta.url).href
    }
</script>

<template>
    <v-img :src="getCryptoIcon(icon)"></v-img>
</template>

<script lang="ts">
export default {
    props: ['icon']
}
</script>