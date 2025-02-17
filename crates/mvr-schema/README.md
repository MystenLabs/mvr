# MVR Schema

This crate contains the schema for the MVR project. This will be used by both the indexer
and the API crate.

## How to setup your database

1. Create a `.env` file and add the following:
```
DATABASE_URL=postgres://<username>:<password>@localhost:5432/mvr
```

2. Run the following command to create the database:
```
diesel setup
```

> You can now use all diesel commands to manage your database.

