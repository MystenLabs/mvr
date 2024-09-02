# Scripts

To publish the current contracts and test the creation of names,
apps & package Info objects, you can use the `init-for-testing.ts` script.

1. Run `pnpm i` to install packages
2. Run `pnpm ts-node src/init-for-testing.ts` (This will do the setup using the Sui Cli's active network)


## Local run including Local Node & GraphQL

> To do this, you should first have the main sui repo cloned (or the equivalent binaries)
> and run all these commands on that repo's root.

1. Start a local network by running:
```sh
RUST_LOG="off,sui_node=info" cargo run --features indexer --bin sui -- start --with-faucet --with-indexer
```

2. Run the above init script in the `scripts` folder
```
pnpm ts-node src/init-for-testing.ts
```

3. Copy the output config file from the console (e.g. GraphQL Config file saved at: `/path/to/graphql.localnet.config.toml`), and use that to 
spin up a GQL server
```
cargo run --bin sui-graphql-rpc start-server —db-url "postgresql://manosliolios:@localhost/sui_indexer" --config "/path/to/graphql.localnet.config.toml"
```

