use anchor_lang::prelude::*;

use crate::state::round::Round;

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub round_number: u128,
    pub round: Pubkey,

    pub total_volume: u128
}

impl Game {

    // setup the game and initialize the first round
    pub fn init<'info>(
        
        &mut self, 
        owner: &Signer<'info>, 
        address: Pubkey,
        first_round: &mut Box<Account<'info, Round>>, 
        price_program: &AccountInfo<'info>, 
        price_feed: &AccountInfo<'info>

    ) -> Result<()> {

        self.owner = owner.key();
        self.address = address.key();
        self.round_number = first_round.round_number;
        self.round = first_round.address.key();
        self.total_volume = 0;
        first_round.init(owner.key(), price_program, price_feed)

    }

    pub fn update<'info>(&mut self, price_program: &AccountInfo<'info>,  price_feed: &AccountInfo<'info>, round: &mut Box<Account<'info, Round>>) -> Result<()> {
        round.update(price_program, price_feed)
    }
}