## Usage
After [installing](#installation) the MVR CLI, use `mvr --help` to explore which commands are supported.

### Examples

#### Adding a dependency
In the root of a Move project, use `mvr add @package_name/app --network [testnet | mainnet]` to add that dependency to the `Move.toml` file.

#### Finding the metadata of a package
In a terminal, run `mvr resolve @package_name/app` to find the metadata for a specific package and app.

For example, calling `mvr resolve @mvr/demo` should output the following:
```bash
mvr resolve @mvr/demo
 Package:  @mvr/demo 

  [testnet]
     Registered address not found    

  [mainnet]
     Package Address  0xf388e75a4ed8c7eb7aff4337a058c7949f5b426a58e586bf6e12785b99c03e31 
     Upgrade Cap      0xf57cfdce1ab2de7130b35f743c05d934dd6d11af52f33240c58d26f2d1904dd6 
     Version          1                                                                  
     Repository       https://github.com/MystenLabs/mvr                                  
     Tag              19ffe56e43f294b9896dd6d07fffce8f6aa1ce0c                           
     Path             packages/tests/demo     
```

## Installation

There are three ways to install the `mvr` CLI tool.
- [Cargo install](#cargo-install)
- [From release](#from-release)
- [From source](#from-source)

Below are the `mvr` binaries for macOS (Intel and Apple CPUs), Ubuntu (Intel and ARM), and Windows:
| OS      | CPU             | Architecture                                                                                              |
| :---    | :----:          | :---                                                                                                      |
| MacOS   | Apple Silicon   | [mvr-macos-arm64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-arm64)             |
| MacOS   | Intel 64bit     | [mvr-macos-x86_64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-x86_64)           |
| Ubuntu  | ARM64           | [mvr-ubuntu-aarch64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-aarch64)       |
| Ubuntu  | Intel 64bit     | [mvr-ubuntu-x86_64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-x86_64)         |
| Windows | Intel 64bit     | [mvr-windows-x86_64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-windows-x86_64.exe)   |

### Cargo install

- `cargo install --locked --git https://github.com/mystenlabs/mvr --branch release mvr`

### From release
 
- Download the binary corresponding to your OS and architecture from the list above.
- Rename the binary to `mvr`
- Make the binary executable: `chmod +x mvr`
- Place it in a directory that is on your `PATH` environment variable.
- `mvr --version` to verify that the installation was successful.

**NOTE** If you are using Windows, you can rename the binary to `mvr.exe` instead of `mvr`, and adapt the commands accordingly to ensure the binary is on your `PATH`.

### From source

Run the following commands in your terminal:
- `git clone https://github.com/mystenlabs/mvr.git`
- `cd mvr/crates/mvr-cli && cargo install --path .`
- `mvr --version` to verify that the installation was successful.

Note that if you install both from source and from release, you need to check which folder comes first on the `PATH` environment variable. The binary in that folder will be the one that is executed when you run `mvr`.
