use anchor_lang::prelude::*;


#[error_code]
pub enum ErrorCode {
    #[msg("Game not up_vault owner")]
    InvalidUpVaultAccountAuthority,
    #[msg("Game not down_vault owner")]
    InvalidDownVaultAccountAuthority,
}