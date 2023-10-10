use crate::{Contract, ContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, Env};

#[test]
fn hello() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Contract);
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::random(&env);
    let sac = env.register_stellar_asset_contract(admin.clone());
    let xlm = token::StellarAssetClient::new(&env, &sac);

    let user = Address::random(&env);

    xlm.mint(&user, &10_000_000);

    client.run(&user, &sac);
}
