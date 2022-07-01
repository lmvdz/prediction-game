

use anchor_lang::prelude::*;

#[zero_copy]
#[derive(Default)]
pub struct Claim {
    pub amount: u64,
    pub mint: Pubkey,
    pub vault: Pubkey
}


#[account(zero_copy)]
#[derive(Default)]
pub struct UserClaimable {
    pub user: Pubkey,
    pub claims: [Claim; 10]
}

#[account]
#[derive(Default)]
pub struct User {

    // accounts

    pub address: Pubkey,

    pub owner: Pubkey,

    pub user_claimable: Pubkey

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
    pub user_claimable: Pubkey,
    pub game: Pubkey,
    pub round: Pubkey,

    pub up_or_down: u8,
    pub amount: u64,

    // state
    pub settled: bool

}