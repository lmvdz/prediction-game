use anchor_lang::prelude::*;

use crate::state::round::Round;

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub round_number: u128,
    pub current_round: Pubkey,

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
        price_feed: &AccountInfo<'info>, 
        clock: &AccountInfo<'info>
    ) -> Result<()> {
        self.owner = owner.key();
        self.address = address.key();
        self.round_number = 0;
        self.current_round = first_round.address.key();
        self.total_volume = 0;
        first_round.init(price_program, price_feed, clock)
    }
}