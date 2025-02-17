use sui_client_build;

fn main() {
    let schema = "RPC";
    sui_client_build::register_schema(schema);
}
