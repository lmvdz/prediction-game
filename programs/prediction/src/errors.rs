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
    UserPredictionAmountNotZero,
    #[msg("Token account has insufficient amount")]
    InsufficientTokenAccountAmount,
    #[msg("Failed to append user prediction")]
    FailedToAppendUserPrediction,
    #[msg("Prediction already exists")]
    PredictionAlreadyPushed,
    #[msg("No prediction to pop off array found based on pubkey")]
    NoPredictionToPopFound,
    #[msg("Failed to pop user prediction")]
    FailedToPopUserPrediction,
    #[msg("Prediction hasn't been settled")]
    PredictionHasntBeenSettled,
    #[msg("No space to add Prediction")]
    NoSpaceToPushPrediction,
    #[msg("Position not valid to Pop")]
    PredictionNotValidToPop,
    #[msg("Failed to initialize user prediction")]
    FailedToInitUserPrediction,
    #[msg("Failed to complete deposit for user prediction")]
    UserPredictionFailedToDeposit,
    #[msg("User position could not be closed because it is unsettled")]
    FailedToCloseUnsettledUserPosition,
    #[msg("User prediction was denied because round finished")]
    UserPredictionDeniedRoundFinished,
    #[msg("Failed to update round")]
    FailedToUpdateRound,
    #[msg("Round not finished")]
    RoundNotFinished,
    #[msg("Round already finished")]
    RoundAlreadyFinished,
    #[msg("Failed to settle user prediction")]
    FailedToSettleUserPrediction,
    #[msg("Signer not owner of vault")]
    SignerNotOwnerOfVault,
    #[msg("Failed to deposit")]
    FailedToDeposit,
    #[msg("Failed to withdraw")]
    FailedToWithdraw,
    #[msg("The account to deposit to doesn't equal the up or down token account")]
    ToAccountDoesNotMatchVaultUpOrDown,
    #[msg("Round predictions array is uninitialized")]
    RoundPredictionsIsUninitialized
}