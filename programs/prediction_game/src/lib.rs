use anchor_lang::prelude::*;

use instructions::*;

pub mod instructions;
pub mod state;
pub mod errors;



declare_id!("EPZXCy45VtSdGA7darn8LcVErMYecZS4d7XYG8pwLExb");


#[program]
pub mod prediction_game {

    use super::*;
    

    pub fn init_game_instruction(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8) -> Result<()> {
        instructions::game::init_game(ctx, vault_up_token_account_nonce, vault_down_token_account_nonce)
    }

    pub fn update_game_instruction<'info>(ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
        instructions::game::update_game(ctx)
    }

    pub fn close_game_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseGame<'info>>) -> Result<()> {
        // instructions::game::close_game(ctx)
        Ok(())
    }

    pub fn close_round_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseRound<'info>>) -> Result<()> {
        // instructions::round::close_round(ctx)
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

    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

    pub fn init_user_prediction(ctx: Context<InitUserPrediction>) -> Result<()> {
        instructions::user::init_user_prediction(ctx)
    }

    

}
