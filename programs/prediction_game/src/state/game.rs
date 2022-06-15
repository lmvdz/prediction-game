use anchor_lang::prelude::*;


#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub token_decimal: u8,
    pub token_mint: Pubkey,

    pub round_number: u32,
    pub current_round: Pubkey,
    pub previous_round: Pubkey,

    pub vault: Pubkey, 
    pub fee_vault: Pubkey,

    pub total_volume: u128,
    pub total_volume_rollover: u128
}