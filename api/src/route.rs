use axum::{
    routing::get,
    Router,
};

use crate::{db::establish_connection_pool, handler::root, test::seed::seed_database};

pub fn create_router() -> Router {
    let db = establish_connection_pool();

    let _ = seed_database(&mut db.get().unwrap());
    Router::new().route("/", get(root)).with_state(db)
}
