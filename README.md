# prediction-game
SolPredict - Prediction Game deployed on the Solana Blockchain

## Introduction  
SolPredict is my first project which I am developing to learn Rust + Solana Blockchain tech.


## Devnet
Currently SolPredict is deployed on the Solana Devnet


## How does it work?  
> The idea is heavily inspired by BSC PancakeSwap's Prediction Game  
> Speculate if the price is going to be higher/lower than the starting price  
> Round Length by default is 5 minutes  
  
> the first half of the round is unlocked for placing predictions  
> the second half of the round is locked until the end  
> at the end of the round each prediction is settled  
  
> winning predictions gain a % of the losing pools' total amount  
  
> placing a prediction when there is a claimable amount, subtracts from the claimable before requesting for more quote asset to be deposited  

## Checklist  
- [x] Solana Devnet
- [x] Pyth, Chainlink, Switchboard Oracles (feel free to request more solana oracles through github issues) 
- [x] Crank Code
- [x] Airdrop Devnet USDC
- [x] Claim Winnings
- [ ] Admin UI   
- [ ] Dedicated RPC
- [ ] UX/UI Developer
  
## Known Bugs  
Keeping track of cranks for each round is not working correctly.
Will be better to keep track of each crank's pubkey instead of just having a counter.
Possible fix is to also keep track of the round number, not sure what the cause of the bug is yet.

## Website
https://devnet.solpredict.io --- not running, don't have a reliable RPC

![image](https://user-images.githubusercontent.com/2179775/186953604-2f0f11d1-ff2f-4aae-afec-33fb6a062aa3.png)
![image](https://user-images.githubusercontent.com/2179775/186953633-e3daaf07-6d45-4e75-b1df-632e3c84605d.png)
![image](https://user-images.githubusercontent.com/2179775/186964729-d286c7b9-129c-4652-871f-1f9cecba14a2.png)

