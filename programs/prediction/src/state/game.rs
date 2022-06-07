use anchor_lang::{prelude::*, solana_program::example_mocks::solana_sdk::signature::Keypair};

use crate::state::round::Round;

#[account]
#[derive(Default)]
pub struct Game {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub round_number: Option<u128>,
    pub current_round: Option<Pubkey>,

    pub total_volume: Option<u128>
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
        self.round_number = Some(1);
        self.current_round = Some(first_round.address.key());
        self.total_volume = Some(0);
        first_round.init(owner.key(), price_program, price_feed, 1)

    }

    pub fn update<'info>(&mut self, price_program: &AccountInfo<'info>,  price_feed: &AccountInfo<'info>, round: &mut Box<Account<'info, Round>>) -> Result<()> {
        if !round.finished.unwrap_or(false) {
            round.update(price_program, price_feed)
        } else {
            let next_round_address = Keypair::new().pubkey();
            self.current_round = Some(next_round_address);
            let next_round = &mut Round {
                address: next_round_address,
                owner: round.owner,
                game: round.game,
                finished: None,
                round_number: None,
                price_program_pubkey: None,
                price_feed_pubkey: None,
                round_start_time: None,
                round_current_time: None,
                round_time_difference: None,
                round_start_price: None,
                round_current_price: None,
                round_end_price: None,
                round_price_difference: None,
                predictions: [[Pubkey::default();32];32]
            };
            next_round.init(round.owner.key(), price_program, price_feed, round.round_number.unwrap_or(0)+1)
        }
        

    }

}