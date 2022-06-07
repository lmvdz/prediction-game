use anchor_lang::prelude::*;


use crate::state::price::get_price;
use crate::errors::ErrorCode;

use super::UserPrediction;

#[account]
#[derive(Default)]
pub struct Round {

    pub owner: Pubkey,
    pub game: Pubkey,
    pub address: Pubkey,

    pub finished: Option<bool>,
    pub round_number: Option<u128>,

    pub price_program_pubkey: Option<Pubkey>,
    pub price_feed_pubkey: Option<Pubkey>,

    pub round_start_time: Option<i64>,
    pub round_current_time: Option<i64>,
    pub round_time_difference: Option<i64>,

    pub round_start_price: Option<i128>,
    pub round_current_price: Option<i128>,
    pub round_end_price: Option<i128>,
    pub round_price_difference: Option<i128>,

    pub predictions: [[Pubkey; 32]; 32],
}


impl Round {

    // initialize the round
    pub fn init<'info>(&mut self, owner: Pubkey, price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>, round_number: u128) -> Result<()> {

        require_keys_eq!(*price_feed.owner, price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed);

        self.owner = owner.key();
        self.price_program_pubkey = Some(price_program.key());
        self.price_feed_pubkey = Some(price_program.key());

        self.round_number = Some(round_number);
    
        let now = Clock::get()?.unix_timestamp;

        self.round_start_time = Some(now);
        self.round_current_time = Some(now);
        self.round_time_difference = Some(0);

        let price = get_price(price_program, price_feed).unwrap_or(0);

        self.round_start_price = Some(price);
        self.round_current_price = Some(price);
        self.round_price_difference = Some(0);

        self.finished = Some(false);

        self.predictions = [[Pubkey::default(); 32];32];

        Ok(())
    }

    pub fn update<'info>(&mut self, price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<()> {
        require_keys_eq!(*price_feed.owner, price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed);
        if !self.finished.unwrap_or(false){
            // update the round time
            self.round_current_time = Some(Clock::get()?.unix_timestamp);
            // calculate the difference in time or set to zero
            self.round_time_difference = Some(self.round_current_time.unwrap_or(0).checked_sub(self.round_start_time.unwrap_or(0)).unwrap_or(0));
            
            // update the round price
            self.round_current_price = Some(get_price(price_program, price_feed).unwrap_or_else(|_| self.round_start_price.unwrap_or(0)));  // disabled in localnet
            // self.round_current_price += Some(1);
            
            // calculate the difference in price or set to zero
            self.round_price_difference = Some(self.round_current_price.unwrap_or(0).checked_sub(self.round_start_price.unwrap_or(0)).unwrap_or(0));

            if self.round_time_difference.unwrap_or(0) > (5 * 60) {
                self.round_end_price = self.round_current_price;
                self.finished = Some(true);
            }
        }
        Ok(())
    }


    pub fn push<'info>(&mut self, user_prediction: &Account<'info, UserPrediction>) -> Result<()> {
        // round can't be finished
        require!(!self.finished.unwrap_or(false), ErrorCode::RoundAlreadyFinished);
        
        // there has to be space to add the prediction to the round and it can't already exist
        require!(self.predictions.iter().any(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())) && p_array.iter().all(|p| !p.eq(&user_prediction.key()))), ErrorCode::PredictionAlreadyPushed);

        // find index
        let round_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&Pubkey::default())));
        require!(round_first_array_index.is_some(), ErrorCode::NoSpaceToPushPrediction);
        let round_second_array_index_to_insert = self.predictions[round_first_array_index.unwrap()].iter().position(|p| p.eq(&Pubkey::default()));
        require!(round_second_array_index_to_insert.is_some(), ErrorCode::NoSpaceToPushPrediction);

        // add user_prediction pubkey to round.predictions array
        self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()] = user_prediction.key();
        // make sure it was pushed
        require!(self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()].eq(&user_prediction.key()), ErrorCode::FailedToAppendUserPrediction);

        Ok(())

    }

    pub fn pop<'info>(&mut self, user_prediction: &mut Account<'info, UserPrediction>) -> Result<()> {
        // round has to be finished
        require!(self.finished.unwrap_or(false), ErrorCode::RoundNotFinished);

        // settle the prediction if unsettled
        if !user_prediction.settled.unwrap_or(false) {
            // check that it has been settled
            require!(user_prediction.settle(self).is_ok(), ErrorCode::PredictionHasntBeenSettled)
        }


        // find index
        let round_first_array_index = self.predictions.iter().position(|p_array| p_array.iter().any(|p| p.eq(&user_prediction.key())));
        require!(round_first_array_index.is_some(), ErrorCode::NoPredictionToPopFound);
        let round_second_array_index_to_insert = self.predictions[round_first_array_index.unwrap()].iter().position(|p| p.eq(&user_prediction.key()));
        require!(round_second_array_index_to_insert.is_some(), ErrorCode::NoPredictionToPopFound);
        // remove pubkey from predictions array
        self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()] = Pubkey::default();
        // make sure it was popped
        require!(self.predictions[round_first_array_index.unwrap()][round_second_array_index_to_insert.unwrap()].eq(&Pubkey::default()), ErrorCode::FailedToPopUserPrediction);


        Ok(())

    }

    pub fn close(&mut self) -> Result<()> {

        Ok(())
    }

}

