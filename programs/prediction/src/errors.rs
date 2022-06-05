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
    FailedToFinishRound,
    #[msg("The deposit amount attempted was too much")]
    DepositOverflow,
    #[msg("The withraw amount attempted was too much")]
    WithdrawUnderflow,
    #[msg("User account amount not zero")]
    UserAccountAmountNotZero,
    #[msg("Token account has insufficient amount")]
    InsufficientTokenAccountAmount
}