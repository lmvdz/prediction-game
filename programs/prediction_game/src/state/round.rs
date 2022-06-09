use anchor_lang::prelude::*;


use crate::state::price::get_price;
// use crate::errors::ErrorCode;

// use super::UserPrediction;

#[account]
#[derive(Default)]
pub struct Round {

    pub owner: Pubkey,
    pub game: Pubkey,
    pub address: Pubkey,

    pub finished: bool,
    pub settled: bool,
    pub round_number: u128,

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

    // pub predictions: [[UserPrediction; 32]; 32],
}


impl Round {

    pub fn update<'info>(
            &mut self,
            price_program: &AccountInfo<'info>, 
            price_feed: &AccountInfo<'info>
        ) -> Result<()> {
        if !self.finished{
            // update the round time
            self.round_current_time = Clock::get()?.unix_timestamp;
            // calculate the difference in time or set to zero
            self.round_time_difference = self.round_current_time.checked_sub(self.round_start_time).unwrap_or(0);
            
            // update the round price
            self.round_current_price = get_price(price_program, price_feed).unwrap_or(self.round_start_price);  // disabled in localnet
            // self.round_current_price += 1;
            
            // calculate the difference in price or set to zero
            self.round_price_difference = self.round_current_price.checked_sub(self.round_start_price).unwrap_or(0);

            if self.round_time_difference > (5 * 60) {
                self.round_end_price = self.round_current_price;

                self.round_winning_direction = if self.round_end_price > self.round_start_price {
                    1
                } else {
                    2
                };

                self.finished = true;
            }
        }
        Ok(())
    }


    // pub fn push<'info>(&mut self, predictions: [&AccountInfo], user_prediction: &Account<'info, UserPrediction>) -> Result<()> {
    //     // round can't be finished
    //     require!(!self.finished, ErrorCode::RoundAlreadyFinished);
        
    //     // there has to be space to add the prediction to the round and it can't already exist
    //     require!(self.predictions.iter().any(|p_array| p_array.iter().any(|p| p.address.eq(&Pubkey::default())) && p_array.iter().all(|p| !p.address.eq(&user_prediction.key()))), ErrorCode::PredictionAlreadyPushed);

    //     // find index
    //     let round_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.address.eq(&Pubkey::default())));
    //     require!(round_first_array_index.is_some(), ErrorCode::NoSpaceToPushPrediction);
    //     let round_second_array_index_to_insert = self.predictions[round_first_array_index.unwrap()].iter().position(|p| p.address.eq(&Pubkey::default()));
    //     require!(round_second_array_index_to_insert.is_some(), ErrorCode::NoSpaceToPushPrediction);

    //     // add user_prediction pubkey to round.predictions array
    //     self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()] = **user_prediction;
    //     // make sure it was pushed
    //     require!(self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()].address.eq(&user_prediction.key()), ErrorCode::FailedToAppendUserPrediction);

    //     Ok(())

    // }

    // pub fn pop<'info>(&mut self, user_prediction: &mut Account<'info, UserPrediction>) -> Result<()> {
    //     // round has to be finished
    //     require!(self.finished, ErrorCode::RoundNotFinished);

    //     // settle the prediction if unsettled
    //     if !user_prediction.settled {
    //         // check that it has been settled
    //         require!(user_prediction.settle(self).is_ok(), ErrorCode::PredictionHasntBeenSettled)
    //     }


    //     // find index
    //     let round_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.address.eq(&user_prediction.key())));
    //     require!(round_first_array_index.is_some(), ErrorCode::NoPredictionToPopFound);
    //     let round_second_array_index_to_insert = self.predictions[round_first_array_index.unwrap()].iter().position(|p| p.address.eq(&user_prediction.key()));
    //     require!(round_second_array_index_to_insert.is_some(), ErrorCode::NoPredictionToPopFound);
    //     // remove pubkey from predictions array
    //     self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()].address = Pubkey::default();
    //     // make sure it was popped
    //     require!(self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()].address.eq(&Pubkey::default()), ErrorCode::FailedToPopUserPrediction);


    //     Ok(())

    // }

    pub fn close(&mut self) -> Result<()> {

        Ok(())
    }

}

