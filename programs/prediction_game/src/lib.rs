use anchor_lang::prelude::*;
use instructions::*;

pub mod instructions;
pub mod utils;
pub mod state;
pub mod errors;



declare_id!("BW6JsuUYGwRoqpvGXPaGoekxUZgmoR6vcqeNAguHLYZv");


#[program]
pub mod prediction_game {

    use super::*;
    

    pub fn init_game_instruction(ctx: Context<InitializeGame>, oracle: u8, base_symbol: [u8; 16], fee_bps: u16, crank_bps: u16, round_length: i64) -> Result<()> {
        instructions::game::init_game(ctx, oracle, base_symbol, fee_bps, crank_bps, round_length)
    }

    pub fn init_game_history_instruction(ctx: Context<InitGameHistory>) -> Result<()> {
        instructions::game::init_game_history(ctx)
    }

    pub fn init_vault_instruction(ctx: Context<InitializeVault>, vault_nonce: u8, fee_vault_nonce: u8) -> Result<()> {
        instructions::vault::init_vault(ctx, vault_nonce, fee_vault_nonce)
    }

    pub fn init_first_round_instruction(ctx: Context<InitFirstRound>) -> Result<()> {
        instructions::round::init_first_round(ctx)
    }

    pub fn init_second_round_instruction(ctx: Context<InitSecondRound>, next_round_number: [u8; 4]) -> Result<()> {
        instructions::round::init_second_round(ctx, next_round_number)
    }

    pub fn init_next_round_and_close_previous_instruction(ctx: Context<InitNextRoundAndClosePrevious>, next_round_number: [u8; 4]) -> Result<()> {
        instructions::round::init_next_round_and_close_previous(ctx, next_round_number)
    }

    pub fn update_game_instruction<'info>(ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
        instructions::game::update_game(ctx)
    }

    pub fn collect_fee_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CollectFee<'info>>) -> Result<()> {
        instructions::game::collect_fee(ctx)
    }

    pub fn claim_fee_instruction<'info>(ctx: Context<'_, '_, '_, 'info, ClaimFee<'info>>) -> Result<()> {
        instructions::game::claim_fee(ctx)
    }

    pub fn withdraw_fee_instruction<'info>(ctx: Context<'_, '_, '_, 'info, WithdrawFee<'info>>) -> Result<()> {
        instructions::game::withdraw_fee(ctx)
    }

    pub fn payout_cranks_instruction<'info>(ctx: Context<'_, '_, '_, 'info, PayoutCranks<'info>>) -> Result<()> {
        instructions::game::payout_cranks(ctx)
    }

    pub fn settle_predictions_instruction<'info>(ctx: Context<'_, '_, '_, 'info, SettlePredictions<'info>>) -> Result<()> {
        instructions::game::settle_predictions(ctx)
    }


    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

    pub fn init_crank_instruction(ctx: Context<InitCrank>) -> Result<()> {
        instructions::crank::init_crank(ctx)
    }

    pub fn init_user_prediction_instruction(ctx: Context<InitUserPrediction>, up_or_down: u8, amount: u64, round_number: [u8; 4]) -> Result<()> {
        instructions::user::init_user_prediction(ctx, up_or_down, amount, round_number)
    }

    pub fn user_claim_instruction(ctx: Context<UserClaim>, amount: u64) -> Result<()> {
        instructions::user::user_claim(ctx, amount)
    }

    pub fn user_claim_all_instruction<'info>(ctx: Context<'_, '_, '_, 'info, UserClaimAll<'info>>) -> Result<()> {
        instructions::user::user_claim_all(ctx)
    }

    pub fn admin_close_game_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, AdminCloseGame<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn close_crank_account_instruction(_ctx: Context<CloseCrankAccount>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_crank_account_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, AdminCloseCrankAccount<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn close_fee_vault_ata_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CloseFeeVaultTokenAccount<'info>>) -> Result<()> {
        instructions::vault::close_fee_vault_token_account(ctx)
    }
    pub fn close_vault_ata_instruction<'info>(ctx: Context<'_, '_, '_, 'info, CloseVaultTokenAccount<'info>>) -> Result<()> {
        instructions::vault::close_vault_token_account(ctx)
    }
    pub fn admin_close_vault_instruction(_ctx: Context<AdminCloseVaultAccount>) -> Result<()> {
        Ok(())
    }

    pub fn close_round_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, CloseRound<'info>>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_round_instruction<'info>(_ctx: Context<'_, '_, '_, 'info, AdminCloseRound<'info>>) -> Result<()> {
        Ok(())
    }

    

    pub fn close_user_prediction_instruction(_ctx: Context<CloseUserPrediction>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_user_prediction_instruction(_ctx: Context<AdminCloseUserPrediction>) -> Result<()> {
        Ok(())
    }

    pub fn close_user_account_instruction(_ctx: Context<CloseUserAccount>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_user_account_instruction(_ctx: Context<AdminCloseUserAccount>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_round_history_instruction(_ctx: Context<AdminCloseRoundHistory>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_user_prediction_history_instruction(_ctx: Context<AdminCloseUserPredictionHistory>) -> Result<()> {
        Ok(())
    }

    pub fn admin_close_user_claimable_instruction(_ctx: Context<AdminCloseUserClaimable>) -> Result<()> {
        Ok(())
    }
    

    

}
