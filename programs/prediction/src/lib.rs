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

    pub fn update_game_instruction(ctx: Context<UpdateGame>) -> Result<()> {
        instructions::game::update_game(ctx)
    }

    pub fn init_user_instruction(ctx: Context<InitUser>) -> Result<()> {
        instructions::user::init_user(ctx)
    }

}
