use anchor_lang::prelude::*;
use instructions::*;

pub mod instructions;
pub mod utils;
pub mod state;
pub mod errors;



declare_id!("EPZXCy45VtSdGA7darn8LcVErMYecZS4d7XYG8pwLExb");


#[program]
pub mod prediction_game {

    use super::*;
    

    pub fn test_round_rollover_instruction(_ctx: Context<RoundRollover>) -> Result<()> {
        let current_round_number = u32::MAX;
        let next_round_number = if current_round_number.eq(&u32::MAX) {
            1
        } else {
            current_round_number.saturating_add(1)
        };
        require!(current_round_number.eq(&u32::MAX) && next_round_number.eq(&1_u32), errors::ErrorCode::TestRoundRolloverFailed);
        Ok(())
    }

    pub fn init_game_instruction(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8, token_decimal: u8) -> Result<()> {
        instructions::game::init_game(ctx, vault_up_token_account_nonce, vault_down_token_account_nonce, token_decimal)
    }

    pub fn init_first_round_instruction(ctx: Context<InitFirstRound>) -> Result<()> {
        instructions::round::init_first_round(ctx)
    }

    pub fn init_second_round_instruction(ctx: Context<InitSecondRound>) -> Result<()> {
        instructions::round::init_second_round(ctx)
    }

    pub fn init_next_round_and_close_previous_instruction(ctx: Context<InitNextRoundAndClosePrevious>) -> Result<()> {
        instructions::round::init_next_round_and_close_previous(ctx)
    }

    pub fn update_game_instruction<'info>(ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
        instructions::game::update_game(ctx)
    }

    pub fn settle_predictions_instruction<'info>(ctx: Context<'_, '_, '_, 'info, SettlePredictions<'info>>) -> Result<()> {
        instructions::game::settle_predictions(ctx)
    }


    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

    pub fn transfer_user_token_account_instruction(ctx: Context<UserTransfer>, amount: u64) -> Result<()> {
        instructions::user::transfer_user_token_account(ctx, amount)
    }

    pub fn init_user_prediction_instruction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64) -> Result<()> {
        instructions::user::init_user_prediction(ctx, up_or_down, amount)
    }

    pub fn close_game_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseGame<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn close_game_fee_vault_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CloseGameFeeVault<'info>>) -> Result<()> {
        instructions::game::close_game_fee_vault(ctx)
    }

    pub fn close_round_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseRound<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn close_vault_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseVault<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn close_vault_and_token_accounts_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultAndTokenAccounts<'info>>) -> Result<()> {
        instructions::vault::close_vault_and_token_accounts(ctx)
    }

    pub fn close_vault_token_accounts_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccounts<'info>>) -> Result<()> {
        instructions::vault::close_vault_token_accounts(ctx)
    }

    pub fn close_user_prediction_instruction(_ctx: Context<CloseUserPrediction>) -> Result<()> {
        Ok(())
    }

    pub fn close_user_account_instruction(_ctx: Context<CloseUserAccount>) -> Result<()> {
        Ok(())
    }

    pub fn close_user_token_account_instruction(_ctx: Context<CloseUserTokenAccount>) -> Result<()> {
        Ok(())
    }
    
    

    

}
