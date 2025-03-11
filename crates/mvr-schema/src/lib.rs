use diesel_migrations::{embed_migrations, EmbeddedMigrations};

pub mod models;
pub mod schema;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");
