use anchor_lang::prelude::*;


#[error_code]
pub enum ErrorCode {
    #[msg("Game not up_vault owner")]
    InvalidUpVaultAccountAuthority,
    #[msg("Game not down_vault owner")]
    InvalidDownVaultAccountAuthority,
    #[msg("Price Feed PublicKey does not match")]
    PriceFeedKeyMismatch,
    #[msg("Checked subtraction overflow")]
    CheckedSubOverflow,
    #[msg("Price Program not owner of Price Feed")]
    PriceProgramNotOwnerOfPriceFeed,
    #[msg("Next round number does not match what was computed")]
    NextComputedRoundNumberError,
    #[msg("Round failed to finish")]
    FailedToFinishRound
}