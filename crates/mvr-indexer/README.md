# MVR indexer

The MVR Indexer uses sui-indexer-alt framework for indexing MVR packages. 
It processes checkpoints from the Sui blockchain and extracts structured data for use in 
applications or analysis.

---

## Getting Started

### Prerequisites

Ensure that the following dependencies are installed:

- **Rust** (latest stable version recommended)
- **PostgreSQL** (version 13 or higher)

### Installation

Clone the repository:

```bash
git clone https://github.com/MystenLabs/mvr.git
cd mvr/crates/mvr-indexer
```

### Running the Indexer

To run the MVR Indexer, specify the PostgreSQL connection URL:

```bash
cargo run --package mvr-indexer --bin mvr-indexer -- --database-url=postgres://postgres:postgrespw@localhost:5432/mvr
```
* `--database-url` – Connection string for the PostgreSQL database.

---

## Testing

The MVR Indexer supports snapshot-based testing using the [`cargo-insta`](https://crates.io/crates/insta) crate.

### Creating New Tests

1. **Download checkpoints**  
   Download the required data for replay using the following command:

    ```bash
    cargo run --example download-checkpoint -- --checkpoint=<checkpoint_number>
    ```

2. **Store Checkpoints**  
   Place the downloaded checkpoint files in the `checkpoints/` folder.

3. **Create a New Test**  
   Use the `data_test` function to create a new test case:

    ```rust
    #[test]
    fn test_example() {
        let handler = ...; // indexer pipeline handler to be tested
        data_test("<checkpoint folder name>", handler, ["db tables to be checked"]).await?;
        Ok(())
    }
    ```

4. **Generate Snapshots**  
   Run the following command to generate or update test snapshots:

    ```bash
    cargo insta review
    ```

5. **Review Snapshots**  
   If snapshots differ from expectations, `cargo insta` will prompt you to review and approve the changes.
