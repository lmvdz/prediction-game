use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar
};

use crate::round::RoundTimeUnit;


#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum GameStatus {
    Created,
    Started,
    Ended,
    Paused
}

// PredictionGame is the account which holds information for a specific game of prediction.
// This allows for multiple PredictionGames to be created.
// We do not care if there are more than one Prediction Games for a single market (price_feed)
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct PredictionGame {
    pub owner: Pubkey, // the public key of the game owner (the account which created the game)
    pub current_slot: u32, // the slot of the game, each round adds 1 to the slot
    pub price_feed: Pubkey, // the public key of the price feed
    pub round_history: [Option<Pubkey>; 1024], // array of public keys of the last 1000 rounds
    pub current_round: Pubkey, // the public key of the current round
    pub round_length: u32, // how long a round should last
    pub round_time_unit: RoundTimeUnit, // time unit for round_length
    pub game_status: GameStatus // the status of the game
}

pub fn create_game(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let authority = next_account_info(accounts_iter)?;

    let instruction_data = _instruction_data;

    // make sure the authority is the signer
    if !authority.is_signer {
        msg!("authority should be signer");
        return Err(ProgramError::IncorrectProgramId);
    }

    // parse the instruction data
    let mut input_data = PredictionGame::try_from_slice(instruction_data).expect("Instruction data serialization didn't work.");

    // the owner of the game must be the signer
    if input_data.owner != *authority.key {
        msg!("authority does not equal signer");
        return Err(ProgramError::InvalidInstructionData);
    }

    // the round length must be greater than zero
    if input_data.round_length == 0 {
        msg!("round_length must be greater than zero");
        return Err(ProgramError::InvalidInstructionData);
    }

    let rent_exemption = Rent::get()?.minimum_balance(authority.data_len());

    if **authority.lamports.borrow() < rent_exemption {
        msg!("The balance of game should be more than rent_exemption");
        return Err(ProgramError::InsufficientFunds);
    }

    // initialize the predictions history with an array length of 1000
    input_data.round_history = [None; 1024];
    input_data.current_slot = 0;
    input_data.game_status = GameStatus::Created;

    // write the input_data (PredictionAccount) to the game_account
    input_data.serialize(&mut &mut authority.data.borrow_mut()[..])?;

    Ok(())
}

pub fn delete_game(program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]) -> ProgramResult {
    Ok(())
}

pub fn start_game(program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]) -> ProgramResult {
    Ok(())
}

pub fn end_game(program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]) -> ProgramResult {
    Ok(())
}

pub fn pause_game(program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]) -> ProgramResult {
    Ok(())
}