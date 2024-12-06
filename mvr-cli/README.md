## Installation

We currently provide the `mvr-cli` binary for macOS (Intel and Apple CPUs), Ubuntu, and Windows:
| OS      | CPU             | Architecture                                                                      |
| :---    |    :----:       |          ---:                                                                     |
| MacOS   | Apple Silicon   | https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-arm64        |
| MacOS   | Intel 64bit     | https://github.com/mystenlabs/mvr/releases/latest/download/mvr-macos-x86_64       |
| Ubuntu  | ARM64           | https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-aarch64     |
| Ubuntu  | Intel 64bit     | https://github.com/mystenlabs/mvr/releases/latest/download/mvr-ubuntu-x86_64      |
| Windows | Intel 64bit     | https://github.com/MystenLabs/mvr/releases/latest/download/mvr-windows-x86_64.exe |

### From installation script

Run the following commands in your terminal:
- `curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/mystenlabs/mvr/tree/main/mvr-cli/scripts/install.sh | sh`
-  `mvr --version` to verify that the installation was successful.

### From release
 
- Download the binary corresponding to your OS and architecture from GitHub: `https://github.com/mystenLabs/mvr/releases/latest`.
- Rename the binary to `mvr`
- Make the binary executable: `chmod +x mvr`
- Place it in a directory that is in your `PATH` environment variable.
- `mvr --version` to verify that the installation was successful.

### From source

Run the following commands in your terminal:
- `git clone https://github.com/mystenlabs/mvr.git`
- `cd mvr/mvr-cli && cargo install --path .`
- `mvr --version` to verify that the installation was successful.
