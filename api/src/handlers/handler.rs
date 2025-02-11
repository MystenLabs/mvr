use axum::Json;
use serde_json::json;

pub async fn root() -> Json<serde_json::Value> {
    Json(json!({"message": "Welcome to the API!"}))
}
