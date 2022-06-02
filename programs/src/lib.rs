pub mod game;
pub mod prediction;
pub mod round;

use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey
};

use crate::game::{create_game, delete_game, start_game, end_game, pause_game};
use crate::prediction::{create_prediction,settle_prediction};
use crate::round::{start_round,end_round,pause_round};


// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo], 
    _instruction_data: &[u8]
) -> ProgramResult {

    let instruction_data = _instruction_data;

    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    // user functions

    if instruction_data[0] == 10 {
        return create_prediction(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 11 {
        return settle_prediction(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    // game administration

    if instruction_data[0] == 0 {
        return create_game(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 1 {
        return delete_game(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 2 {
        return start_game(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 3 {
        return pause_game(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 4 {
        return end_game(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    // round administration

    if instruction_data[0] == 5 {
        return start_round(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 6 {
        return pause_round(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    if instruction_data[0] == 7 {
        return end_round(program_id, accounts, &instruction_data[1..instruction_data.len()]);
    }

    Ok(())
}



// // Sanity tests
// #[cfg(test)]
// mod test {
//     use super::*;
//     use solana_program::clock::Epoch;
//     use std::mem;

//     #[test]
//     fn test_sanity() {
//         let program_id = Pubkey::default();
//         let key = Pubkey::default();
//         let mut lamports = 0;
//         let mut data = vec![0; mem::size_of::<u32>()];
//         let owner = Pubkey::default();
//         let account = AccountInfo::new(
//             &key,
//             false,
//             true,
//             &mut lamports,
//             &mut data,
//             &owner,
//             false,
//             Epoch::default(),
//         );
//         let instruction_data: Vec<u8> = Vec::new();

//         let accounts = vec![account];

//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             0
//         );
//         process_instruction(&program_id, &accounts, &instruction_data).unwrap();
//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             1
//         );
//         process_instruction(&program_id, &accounts, &instruction_data).unwrap();
//         assert_eq!(
//             GreetingAccount::try_from_slice(&accounts[0].data.borrow())
//                 .unwrap()
//                 .counter,
//             2
//         );
//     }
// }
