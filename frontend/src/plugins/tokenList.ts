import { Cluster } from "@solana/web3.js"
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry"

let tokenList: Array<TokenInfo> = []
export const useTokenList = () => tokenList

export const initTokenList = async(cluster: Cluster) => {
    let tokens = await ((new TokenListProvider()).resolve());
    tokenList = tokens.filterByClusterSlug(cluster).getList();
}