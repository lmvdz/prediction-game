use anchor_lang::prelude::*;


#[account]
#[derive(Default)]
pub struct Vault {
    
    pub address: Pubkey,
    pub owner: Pubkey,

    pub up_token_account_pubkey: Pubkey,
    pub up_token_account_authority: Pubkey,
    pub up_token_account_nonce: u8,
    
    pub down_token_account_pubkey: Pubkey,
    pub down_token_account_authority: Pubkey,
    pub down_token_account_nonce: u8,

    pub token_mint_pubkey: Pubkey,

    pub up_amount: u128,
    pub down_amount: u128

}