use anchor_lang::prelude::*;

#[account(zero_copy)]
#[repr(packed)]
pub struct RoundHistory {
    pub head: u64,
    pub rounds: [RoundHistoryItem; 1024]
}


impl RoundHistory {
    pub fn append(&mut self, pos: RoundHistoryItem) {
        self.rounds[RoundHistory::index_of(self.head)] = pos;
        self.head = (self.head + 1) % 1024;
    }

    pub fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter).unwrap()
    }

    pub fn next_record_id(&self) -> u128 {
        let prev_record_id = if self.head == 0 { 1023 } else { self.head - 1 };
        let prev_record = &self.rounds[RoundHistory::index_of(prev_record_id)];
        prev_record.record_id + 1
    }
}


#[zero_copy]
#[derive(Default)]
#[repr(packed)]
pub struct RoundHistoryItem {
    pub record_id: u128,
    
    pub round_number: u32,

    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,

    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_end_price: i128,
    pub round_price_difference: i128,
    pub round_price_decimals: u8,

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
    pub total_amount_paid_to_cranks: u64
}