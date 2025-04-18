use chrono::NaiveDateTime;
use diesel::{ExpressionMethods, Insertable, QueryDsl, Queryable, Selectable, SelectableHelper};
use diesel_async::RunQueryDsl;
use futures::future::try_join_all;
use mvr_schema::models::PackageDependency;
use mvr_schema::schema::package_dependencies::dsl::package_dependencies;
use mvr_schema::schema::package_dependencies::package_id;
use mvr_schema::schema::packages;
use serde::{Deserialize, Serialize};
use sui_indexer_alt_framework::FieldCount;
use sui_pg_db::{Db, DbArgs};
use sui_types::move_package::MovePackage;
use url::Url;

#[derive(Queryable, Insertable, Selectable, Serialize, Deserialize, Debug, FieldCount)]
#[diesel(table_name = packages)]
pub struct Package {
    pub package_id: String,
    pub original_id: String,
    pub package_version: i64,
    pub move_package: Vec<u8>,
    pub chain_id: String,
    pub tx_hash: String,
    pub sender: String,
    pub timestamp: NaiveDateTime,
}

#[tokio::test]
async fn test() {
    let database_url = Url::parse("postgres://postgres:quick-ranking-snoring-orson@35.233.238.97:5432/mvr").unwrap();
    let db = Db::for_write(database_url, DbArgs::default()).await.unwrap();

    let mut conn = db.connect().await.unwrap();
    // 1, get all packages
    let results: Vec<_> = packages::table.select(Package::as_select()).load::<Package>(&mut conn).await.unwrap();
    println!("Updating {} packages.", results.len());

    let (ids, deps) = results.iter().fold((vec![], vec![]), |(mut ids, mut results), pkg| {
        let p: MovePackage = bcs::from_bytes(&pkg.move_package).unwrap();
        let deps = p
            .linkage_table()
            .iter()
            .map(|(_, u)| PackageDependency {
                package_id: pkg.package_id.clone(),
                dependency_package_id: u.upgraded_id.to_hex_uncompressed(),
                chain_id: pkg.chain_id.clone(),
            })
            .collect::<Vec<_>>();
        ids.push(pkg.package_id.clone());
        results.extend(deps);
        (ids, results)
    });

    // 2, delete existing deps.
    let deleted_deps = diesel::delete(package_dependencies.filter(package_id.eq_any(ids))).execute(&mut conn).await.unwrap();

    // 3, insert new deps
    let insert_deps: usize = try_join_all(deps.chunks(2000).map(|deps|{
        diesel::insert_into(package_dependencies)
            .values(deps)
            .on_conflict_do_nothing()
            .execute(&mut conn)
    })).await.unwrap().iter().sum();

    println!("updated {} rows, deleted {} rows", insert_deps, deleted_deps)
}