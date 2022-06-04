
use anchor_lang::prelude::*;



#[account]
#[derive(Default)]
pub struct User {
    pub address: Pubkey,

    pub owner: Pubkey,
    pub vault: Pubkey

}

#[account]
#[derive(Default)]
pub struct UserVault {
    pub address: Pubkey,

    pub round: Pubkey,
    pub owner: Pubkey,

    pub up_token_account: Pubkey,
    pub down_token_account: Pubkey,

    pub token_mint_pubkey: Pubkey,

    pub up_amount: u128,
    pub down_amount: u128

}
