use anchor_lang::prelude::*;

#[account(zero_copy)]
#[derive(Default)]
#[repr(packed)]
pub struct Round {

    pub owner: Pubkey,
    pub game: Pubkey,
    pub address: Pubkey,

    pub round_number: u32,
    pub round_length: i64,

    pub finished: bool,
    pub invalid: bool,
    pub settled: bool,
    pub fee_collected: bool,
    pub cranks_paid: bool,

    pub round_predictions_allowed: bool,

    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,

    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_end_price: i128,
    pub round_price_difference: i128,

    pub round_start_price_decimals: i128,
    pub round_current_price_decimals: i128,
    pub round_end_price_decimals: i128,
    pub round_price_difference_decimals: i128,

    pub round_winning_direction: u8,

    pub total_fee_collected: u64,

    pub total_up_amount: u64,
    pub total_down_amount: u64,

    pub total_amount_settled: u64,
    pub total_predictions_settled: u32,
    pub total_predictions: u32,

    pub total_unique_crankers: u32,
    pub total_cranks: u32,
    pub total_cranks_paid: u32,
    pub total_amount_paid_to_cranks: u64,

    pub padding01: [Pubkey; 8]
}

