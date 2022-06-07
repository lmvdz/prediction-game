use anchor_lang::prelude::*;

use instructions::*;

pub mod instructions;
pub mod state;
pub mod errors;



declare_id!("FVUPGJ2QiLbW1dtcKMkPyAfhcSPeACVR2GujZfxh3W8e");


#[program]
pub mod prediction {

    use super::*;
    

    pub fn init_game_instruction(ctx: Context<InitializeGame>, vault_up_token_account_nonce: u8, vault_down_token_account_nonce: u8) -> Result<()> {
        instructions::game::init_game(ctx, vault_up_token_account_nonce, vault_down_token_account_nonce)
    }

    pub fn update_game_instruction<'info>(mut ctx: Context<'_, '_, '_, 'info, UpdateGame<'info>>) -> Result<()> {
        instructions::game::update_game(ctx)
    }

    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

    pub fn init_user_prediction(ctx: Context<InitUserPrediction>) -> Result<()> {
        instructions::user::init_user_prediction(ctx)
    }

}
