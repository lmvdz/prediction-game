use anchor_lang::prelude::*;


#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub up_vault_authority: Pubkey,
    pub up_vault_pubkey: Pubkey,
    pub up_vault_amount: u128,

    pub down_vault_pubkey: Pubkey,
    pub down_vault_authority: Pubkey,
    pub down_vault_amount: u128,

    pub token_mint_pubkey: Pubkey,

    pub round_number: u128,
    pub current_round: Pubkey,

    pub price_program_pubkey: Pubkey,
    pub price_feed_pubkey: Pubkey,

    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,

    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_price_difference: i128
}