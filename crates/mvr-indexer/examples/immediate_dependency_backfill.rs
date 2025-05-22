use clap::Parser;
use diesel::upsert::excluded;
use diesel::{ExpressionMethods, QueryableByName};
use diesel_async::scoped_futures::ScopedFutureExt;
use diesel_async::{AsyncConnection, RunQueryDsl};
use futures::future::try_join_all;
use mvr_indexer::handlers::package_handler::package_dependencies;
use sui_indexer_alt_framework::db;
use sui_pg_db::DbArgs;
use url::Url;

const SQL_QUERY: &str = "select move_package, chain_id
from packages
where package_id in (select distinct package_id from package_dependencies where immediate_dependency is null)";

#[derive(Parser)]
#[clap(rename_all = "kebab-case", author, version)]
struct Args {
    #[command(flatten)]
    db_args: DbArgs,
    #[clap(
        env,
        long,
        default_value = "postgres://postgres:postgrespw@localhost:5432/mvr"
    )]
    database_url: Url,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let Args {
        db_args,
        database_url,
    } = Args::parse();

    // 1, get list of packages need to be refilled.
    let db = db::Db::for_write(database_url, db_args).await?;
    let mut conn = db.connect().await?;
    let packages: Vec<PackagesData> = diesel::sql_query(SQL_QUERY).load(&mut conn).await?;

    println!("Updating dependencies for {} packages.", packages.len());

    // 2, update package dependencies
    let mut results = vec![];
    for package in packages {
        let move_package = bcs::from_bytes(&package.move_package)?;
        let deps = package_dependencies(package.chain_id, &move_package)?;
        results.extend(deps)
    }
    println!("Updating {} records.", results.len());

    use mvr_schema::schema::package_dependencies::*;
    let count = conn
        .transaction(|conn| {
            async move {
                let inserts = try_join_all(results.chunks(1000).map(|chunk| {
                    diesel::insert_into(
                        mvr_schema::schema::package_dependencies::dsl::package_dependencies,
                    )
                    .values(chunk)
                    .on_conflict((package_id, dependency_package_id, chain_id))
                    .do_update()
                    .set(immediate_dependency.eq(excluded(immediate_dependency)))
                    .execute(conn)
                }))
                .await?;
                Ok::<usize, diesel::result::Error>(inserts.iter().sum())
            }
            .scope_boxed()
        })
        .await?;

    println!("Updated {count} records.");
    Ok(())
}

#[derive(QueryableByName, Debug)]
struct PackagesData {
    #[diesel(sql_type = diesel::sql_types::Text)]
    chain_id: String,
    #[diesel(sql_type = diesel::sql_types::Bytea)]
    move_package: Vec<u8>,
}
