use anchor_lang::prelude::*;

#[account]
#[derive(Default, Copy)]
pub struct Vault {
    pub owner: Pubkey,
    pub address: Pubkey,

    pub token_mint: Pubkey,
    pub token_decimals: u8,
    
    pub vault_ata: Pubkey,
    pub vault_nonce: u8,
    pub vault_authority: Pubkey,

    pub fee_vault_ata: Pubkey,
    pub fee_vault_nonce: u8,
    pub fee_vault_authority: Pubkey
}