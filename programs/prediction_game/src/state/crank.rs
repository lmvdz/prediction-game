use anchor_lang::prelude::*;

#[account]
#[derive(Default)]

pub struct Crank {

    // accounts

    pub address: Pubkey,
    pub owner: Pubkey,
    pub user: Pubkey,
    pub game: Pubkey,
    
    pub cranks: u16,
    pub last_crank_round: Pubkey,
    pub last_paid_crank_round: Pubkey

}