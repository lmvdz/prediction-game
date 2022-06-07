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
    RoundPredictionsIsUninitialized,
    #[msg("Can't close user account when user token account is not empty")]
    UserTokenAccountNotEmpty,
    #[msg("Can't close user account when user token account is not closed")]
    UserTokenAccountNotClosed,
    #[msg("User is not the owner of the token account")]
    UserNotOwnerOfTokenAccount,
    #[msg("Token account authority not equal")]
    FromTokenAccountAuthorityNotEqual,
    #[msg("User owner not the same as the to token account owner")]
    UserOwnerNotToTokenAccountOwner,
    #[msg("User owner not the same as the from token account owner")]
    UserOwnerNotFromTokenAccountOwner,
    #[msg("Game key not equal to the round's game key")]
    RoundGameKeyNotEqual,
    #[msg("Round owner not the vault owner")]
    RoundOwnerNotVaultOwner,
    #[msg("Signer not owner of user")]
    SignerNotOwnerOfUser,
    #[msg("Vault owner not to token account owner")]
    VaultOwnerNotToTokenAccountOwner,
    #[msg("To token account not part of vault")]
    ToTokenAccountNotPartOfVault,
    #[msg("Signer not owner of from token account")]
    SignerNotOwnerOfFromTokenAccount,
    #[msg("Signer not owner")]
    SignerNotOwner,
    #[msg("User prediction owner and to token account owner mismatch")]
    UserPredictionOwnerNotToTokenAccountOwner,
    #[msg("User prediction owner and from token account owner mismatch")]
    UserPredictionOwnerNotFromTokenAccountOwner,
    #[msg("vault token account account authority not equal to from token account")]
    VaultTokenAccountAuthorityNotEqualToFromTokenAccount,
    #[msg("Failed to init game")]
    FailedToInitGame,
    #[msg("Failed to init round")]
    FailedToInitRound,
    #[msg("Failed to init vault")]
    FailedToInitVault,
    #[msg("Round Price Program Not Equal")]
    RoundPriceProgramNotEqual,
    #[msg("Round Price Feed Not Equal")]
    RoundPriceFeedNotEqual,
    #[msg("Vault up token account authority not equal to the one provided")]
    VaultUpTokenAccountAuthorityMismatch,
    #[msg("Vault down token account authority not equal to the one provided")]
    VaultDownTokenAccountAuthorityMismatch,
    #[msg("Round already settled")]
    RoundAlreadySettled,
    #[msg("Round not settled")]
    RoundNotSettled,
    #[msg("Failed to settle round")]
    FailedToSettleRound,
    #[msg("Failed to withdraw winnings")]
    FailedToWithdrawWinnings,
    #[msg("Failed to withdraw initial amount")]
    FailedToWithdrawInitialAmount,
}