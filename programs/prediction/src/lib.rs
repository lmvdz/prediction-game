use anchor_lang::prelude::*;

use instructions::*;

pub mod instructions;
pub mod state;
pub mod errors;



declare_id!("FVUPGJ2QiLbW1dtcKMkPyAfhcSPeACVR2GujZfxh3W8e");


#[program]
pub mod prediction {

    use super::*;
    

    pub fn init_game_instruction(ctx: Context<InitializeGame>) -> Result<()> {
        instructions::game::init_game(ctx)
    }
    
    pub fn next_round_instruction(ctx: Context<NextRound>) -> Result<()> {
        instructions::game::next_round(ctx)
    }

    pub fn update_round_instruction(ctx: Context<UpdateRound>) -> Result<()> {
        instructions::round::update_round(ctx)
    }

    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

}
