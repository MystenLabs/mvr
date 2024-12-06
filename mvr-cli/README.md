## Installation

We currently provide the `mvr` cli binary for macOS (Intel and Apple CPUs), Ubuntu (Intel and ARM), and Windows:
| OS      | CPU             | Architecture                                                                                              |
| :---    | :----:          | :---                                                                                                      |
| MacOS   | Apple Silicon   | [mvr-macos-arm64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-arm64)             |
| MacOS   | Intel 64bit     | [mvr-macos-x86_64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-x86_64)           |
| Ubuntu  | ARM64           | [mvr-ubuntu-aarch64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-aarch64)       |
| Ubuntu  | Intel 64bit     | [mvr-ubuntu-x86_64](https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-x86_64)         |
| Windows | Intel 64bit     | [mvr-windows-x86_64](https://github.com/MystenLabs/mvr/releases/latest/download/mvr-windows-x86_64.exe)   |

### From release
 
- Download the binary corresponding to your OS and architecture from the list above.
- Rename the binary to `mvr`
- Make the binary executable: `chmod +x mvr`
- Place it in a directory that is on your `PATH` environment variable.
- `mvr --version` to verify that the installation was successful.

[!Note] If you are using Windows, you can rename the binary to `mvr.exe` instead of `mvr`, and adapt the commands accordingly to ensure the binary is on your `PATH`.

### From source

Run the following commands in your terminal:
- `git clone https://github.com/mystenlabs/mvr.git`
- `cd mvr/mvr-cli && cargo install --path .`
- `mvr --version` to verify that the installation was successful.

Note that if you install both from source and from release, you need to check which folder comes first on the `PATH` environment variable. The binary in that folder will be the one that is executed when you run `mvr`.
