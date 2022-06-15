use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Round {

    pub owner: Pubkey,
    pub game: Pubkey,
    pub address: Pubkey,

    pub finished: bool,
    pub settled: bool,
    pub fee_collected: bool,
    pub round_number: u32,

    pub price_program_pubkey: Pubkey,
    pub price_feed_pubkey: Pubkey,

    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,

    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_end_price: i128,
    pub round_price_difference: i128,

    pub round_winning_direction: u8,

    pub total_up_amount: u64,
    pub total_down_amount: u64,

    pub total_amount_settled: u128,
    pub total_predictions_settled: u32,
    pub total_predictions: u32
}
