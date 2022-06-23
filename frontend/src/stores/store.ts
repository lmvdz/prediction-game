import { defineStore } from 'pinia'
import { TxStatus } from '../components/HelloWorld.vue'

// useStore could be anything like useUser, useCart
// the first argument is a unique id of the store across your application
export const useStore = defineStore('main', {
    state: () => {
        return {
            txStatusList: new Array<TxStatus>()
        }
    }
})