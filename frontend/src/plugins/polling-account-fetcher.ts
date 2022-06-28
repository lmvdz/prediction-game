import { PollingAccountsFetcher } from 'polling-account-fetcher';


let pollingAccountsFetcher: PollingAccountsFetcher = null
export const usePAF = () => pollingAccountsFetcher


export const initPAF = (rpcUrl: string) => {
    pollingAccountsFetcher = new PollingAccountsFetcher(rpcUrl, 1000, 5);
}