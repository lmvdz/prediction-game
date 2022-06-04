use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Round {
    pub game: Pubkey,
    pub address: Pubkey,

    pub round_up_vault: Pubkey,
    pub round_down_vault: Pubkey,

    pub round_up_vault_amount: u128,
    pub round_down_vault_amount: u128,

    pub token_mint_pubkey: Pubkey

}

