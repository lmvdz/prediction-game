use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub token_decimal: u8,

    pub base_symbol: String,

    pub round_number: u32,
    pub current_round: Pubkey,
    pub previous_round: Pubkey,

    pub vault: Pubkey, 

    pub unclaimed_fees: u64,


    pub fee_bps: u16,
    pub crank_bps: u16,

    pub total_volume: u128,
    pub total_volume_rollover: u128,

    pub oracle: u8,
    pub price_program: Pubkey,
    pub price_feed: Pubkey,
}