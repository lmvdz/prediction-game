use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    pubkey::Pubkey
};



#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum PredictionDirection {
    Long,
    Short
}

// Prediction
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Prediction {
    pub authority: Pubkey, // the authority's (player) public key
    pub game_owner: Pubkey, // the game's public key
    pub direction: PredictionDirection, // the direction the player thinks the round will go
    pub prediction: u32, // the player's prediction amount
    pub prediction_slot: u32 // the game slot the prediction was created
}




pub fn create_prediction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}

pub fn settle_prediction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}

