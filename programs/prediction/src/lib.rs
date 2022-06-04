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
    
    pub fn init_round_instruction(ctx: Context<InitRound>) -> Result<()> {
        instructions::round::init_round(ctx)
    }

}
