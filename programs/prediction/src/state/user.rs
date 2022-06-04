
use anchor_lang::prelude::*;


#[account]
#[derive(Default)]
pub struct User {
    pub address: Pubkey,

    pub owner: Pubkey,

    pub vault: Pubkey,

    pub token_mint_pubkey: Pubkey

}
