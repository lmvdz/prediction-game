

use anchor_lang::prelude::*;

#[zero_copy]
#[derive(Default)]
#[repr(packed)]
pub struct Claim {
    pub amount: u64,
    pub mint: Pubkey,
    pub vault: Pubkey
}


#[account(zero_copy)]
#[repr(packed)]
pub struct UserClaimable {
    pub user: Pubkey,
    pub claims: [Claim; 64]
}

#[account]
#[derive(Default)]
#[repr(packed)]
pub struct User {

    // accounts

    pub address: Pubkey,

    pub owner: Pubkey,

    pub user_claimable: Pubkey,

    pub padding01: [Pubkey; 8]

}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum UpOrDown {
    None = 0,
    Up = 1,
    Down = 2
}

#[account(zero_copy)]
#[derive(Default)]
#[repr(packed)]
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
    pub settled: bool,

    pub padding01: [Pubkey; 8]

}

