#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn run(env: Env, source: Address, sac: Address) -> i128 {
        source.require_auth();

        let token = token::Client::new(&env, &sac);

        token.transfer(&source, &env.current_contract_address(), &10_000_000);

        token.balance(&env.current_contract_address())
    }
}

#[cfg(test)]
mod test;
