use anchor_lang::prelude::*;

use crate::state::price::get_price;
use crate::errors::ErrorCode;

#[account]
#[derive(Default)]
pub struct Round {

    pub owner: Pubkey,
    pub game: Pubkey,
    pub address: Pubkey,

    pub finished: bool,
    pub round_number: u128,

    pub price_program_pubkey: Pubkey,
    pub price_feed_pubkey: Pubkey,

    pub round_start_time: i64,
    pub round_current_time: i64,
    pub round_time_difference: i64,

    pub round_start_price: i128,
    pub round_current_price: i128,
    pub round_end_price: i128,
    pub round_price_difference: i128
}


impl Round {

    // initialize the round
    pub fn init<'info>(&mut self, owner: Pubkey, price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<()> {

        require_keys_eq!(*price_feed.owner, price_program.key(), ErrorCode::PriceProgramNotOwnerOfPriceFeed);
        self.owner = owner.key();
        self.price_program_pubkey = price_program.key();
        self.price_feed_pubkey = price_program.key();

        self.round_start_time = Clock::get()?.unix_timestamp;

        let price = get_price(price_program, price_feed).unwrap_or(0); // disabled in localnet
        // let price = 100;
        self.round_start_price = price;
        self.round_current_price = price;
        self.finished = false;
        Ok(())
    }

    pub fn update<'info>(&mut self, price_program: &AccountInfo<'info>, price_feed: &AccountInfo<'info>) -> Result<()> {
        if !self.finished {
            // update the round time
            self.round_current_time = Clock::get()?.unix_timestamp;
            // calculate the difference in time or set to zero
            self.round_time_difference = self.round_current_time.checked_sub(self.round_start_time).unwrap_or(0);
            
            // update the round price
            self.round_current_price = get_price(price_program, price_feed).unwrap_or(self.round_start_price);  // disabled in localnet
            self.round_current_price += 1;
            
            // calculate the difference in price or set to zero
            self.round_price_difference = self.round_current_price.checked_sub(self.round_start_price).unwrap_or(0);


            if self.round_time_difference > (5 * 60) {
                self.round_end_price = self.round_current_price;
                self.finished = true;
                // do settlement for all users who predicted
            }
        }
        Ok(())
    }
}
