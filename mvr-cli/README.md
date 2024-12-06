## Installation

### From installation script

Run the following commands in your terminal:
- `curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/mystenlabs/mvr/main/mvr-cli/scripts/install.sh | sh`
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
