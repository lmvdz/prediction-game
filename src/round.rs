use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    pubkey::Pubkey
};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum RoundStatus {
    Created,
    Started,
    Ended,
    Paused
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum RoundTimeUnit {
    Seconds,
    Minutes,
    Hours,
    Days,
    Weeks,
    Months,
    Years
}


// PredictionRound 
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PredictionRound {
    pub round_slot: u32, // the game's slot when the round started
    pub owner_pubkey: Pubkey, // the publicKey of the game
    pub starting_price: u32, // the price of the asset when the round started
    pub predictions: [Pubkey; 1024], // list of accounts which are participating in the round
    pub round_status: RoundStatus, // the status of the round
    pub vault: Pubkey // where all the funds are deposited
}

pub fn create_round(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}

pub fn start_round(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}

pub fn end_round(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}

pub fn pause_round(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    Ok(())
}
