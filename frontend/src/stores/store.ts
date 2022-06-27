import { defineStore } from 'pinia'


type TxStatus = {
    index: number,
    signatures: Array<string>,
    color: string,
    title: string,
    subtitle: string
    loading: boolean
    show: boolean;
}

// useStore could be anything like useUser, useCart
// the first argument is a unique id of the store across your application
export const useStore = defineStore('main', {
    state: () => {
        return {
            txStatusList: new Array<TxStatus>()
        }
    }
})