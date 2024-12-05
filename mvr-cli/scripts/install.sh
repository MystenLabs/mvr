#!/bin/bash
set -e

# Default configuration
REPO_OWNER="mystenlabs"
REPO_NAME="mvr"
BINARY_NAME="mvr"

# Main installation function
install() {
    # Check if curl and tar are available
    command -v curl >/dev/null 2>&1 || { 
        echo >&2 "Error: curl is required but not installed. Aborting."; 
        exit 1; 
    }

    # Detect the operating system
    detect_os() {
        local os=$(uname -s | tr '[:upper:]' '[:lower:]')
        case "$os" in
            darwin) echo "macos" ;;
            linux) echo "ubuntu" ;;
            msys*|mingw*|cygwin*) echo "windows" ;;
            *)
                echo "Unsupported operating system: $os" >&2
                exit 1
                ;;
        esac
    }

    # Detect the architecture
    detect_arch() {
        local arch=$(uname -m)
        case "$arch" in
            x86_64|amd64) echo "x86_64" ;;
            arm64|aarch64) echo "arm64" ;;
            *)
                echo "Unsupported architecture: $arch" >&2
                exit 1
                ;;
        esac
    }

    # Perform the installation
    local os=$(detect_os)
    local arch=$(detect_arch)
    
    # Construct binary name
    local filename="${BINARY_NAME}-${os}-${arch}"
    if [ "$os" == "windows" ]; then
        filename="${filename}.exe"
    fi

    # GitHub API to get latest release
    local api_url="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"
    
    # Fetch download URL
    local download_url=$(curl -s "$api_url" | \
        grep "browser_download_url" | \
        grep "$filename" | \
        cut -d '"' -f 4)
    
    if [ -z "$download_url" ]; then
        echo "No matching binary found for ${os}-${arch}" >&2
        exit 1
    fi

    # Determine installation path
    local install_path=""
    case "$os" in
        macos|ubuntu)
            install_path="${HOME}/.local/bin"
            mkdir -p "$install_path"
            
            # Download and install
            echo "Downloading ${filename}"
            curl -L "$download_url" -o "${install_path}/${BINARY_NAME}"
            chmod +x "${install_path}/${BINARY_NAME}"
            
            # Update PATH if needed
            if [[ ":$PATH:" != *":$install_path:"* ]]; then
                echo "Adding ${install_path} to PATH"
                echo "export PATH=\$PATH:${install_path}" >> ~/.bashrc
                echo "export PATH=\$PATH:${install_path}" >> ~/.zshrc
                echo "Added to PATH. Please restart your shell or run 'source ~/.bashrc' (or ~/.zshrc)"
            fi
            ;;
        windows)
            echo "Windows installation requires manual steps." >&2
            echo "Please download the binary from: $download_url" >&2
            exit 1
            ;;
    esac

    echo "Successfully installed ${BINARY_NAME}"
}

# Allow sourcing the script or running directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    install "$@"
fi
