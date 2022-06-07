use anchor_lang::prelude::*;


#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub round_number: u128,
    pub current_round: Pubkey,

    pub vault: Pubkey, 

    pub total_volume: u128
}