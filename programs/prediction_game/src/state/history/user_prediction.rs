use anchor_lang::prelude::*;

#[account(zero_copy)]
#[repr(packed)]
pub struct UserPredictionHistory {
    pub head: u64,
    pub user_predictions: [UserPredictionHistoryItem; 1024]
}

impl UserPredictionHistory {
    pub fn append(&mut self, pos: UserPredictionHistoryItem) {
        self.user_predictions[UserPredictionHistory::index_of(self.head)] = pos;
        self.head = (self.head + 1) % 1024;
    }

    pub fn index_of(counter: u64) -> usize {
        std::convert::TryInto::try_into(counter).unwrap()
    }

    pub fn next_record_id(&self) -> u128 {
        let prev_record_id = if self.head == 0 { 1023 } else { self.head - 1 };
        let prev_record = &self.user_predictions[UserPredictionHistory::index_of(prev_record_id)];
        prev_record.record_id + 1
    }
}


#[zero_copy]
#[derive(Default)]
#[repr(packed)]
pub struct UserPredictionHistoryItem {
    pub record_id: u128,

    pub address: Pubkey,
    pub game: Pubkey,
    pub round: Pubkey,
    pub up_or_down: u8,
    pub amount: u64

}