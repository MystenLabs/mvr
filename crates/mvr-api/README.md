# MVR API

This is a REST API for MVR. 

## Running the API

By default, the API will run on port `8000`. To specify a different port, use the `--api-port` flag. 

The `network` can be either `mainnet` or `testnet`. This will determine which network all resolution requests will be made to.

```bash
cargo run --bin mvr-api -- --database-url postgres://postgres:postgres@localhost:5432/mvr --network mainnet
```


