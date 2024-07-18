# README

A basic way to externally resolve `app@org` packages via the `.move` registry.

The idea is that this package depends on the `../demo` package.

Run:

```
make -C ../../dotmove-cli; rm -rf build; rm Move.lock; sui move build
```

- There's a symlink in this directory so you don't have to add the binary to your path

Expected output:

```
cargo build
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.72s
RESOLVING DEPENDENCIES IN demo FROM nftmaker WITH ./dotmove
./dotmove stderr:
[+] `--resolve-move-dependencies` for demo
[+] Value for key 'demo' using serde: resolver = ./dotmove, packages.id = nft@sample
[+] Found PackageInfo ID for nft@sample (testnet): 0x7e045f7bdc3dc0b0acdab5878fe8833efbf60b889c526b67d0dc35d7293c568a
[+] Found GitInfo ID for nft@sample (testnet): 0x60de1e4a1aefd9ff07389b5d1c545621588f190a7c79f9499fdabbaa3645719f
[+] Git versioning information for nft@sample: https://github.com/MystenLabs/dot_move | packages/package_info | releases/mainnet/v1
UPDATING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
UPDATING GIT DEPENDENCY https://github.com/MystenLabs/dot_move.git
INCLUDING DEPENDENCY demo
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING nftmaker
```
