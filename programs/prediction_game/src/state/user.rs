

use anchor_lang::prelude::*;

#[account]
#[derive(Default)]

pub struct User {

    // accounts

    pub address: Pubkey,

    pub owner: Pubkey,

    pub claimable: u64

}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum UpOrDown {
    None = 0,
    Up = 1,
    Down = 2
}

#[account]
#[derive(Default, Copy)]
pub struct UserPrediction {

    // accounts
    pub owner: Pubkey,
    pub address: Pubkey,

    pub user: Pubkey,
    pub game: Pubkey,
    pub round: Pubkey,

    pub up_or_down: u8,
    pub amount: u64,

    // state
    pub settled: bool

}