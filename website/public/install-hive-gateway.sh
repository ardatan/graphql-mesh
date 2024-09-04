#!/bin/sh

set -u

GITHUB_OWNER="ardatan"
GITHUB_REPO="graphql-mesh"
BINARY_NAME="hive-gateway"

# Determine the package version
if [ "$#" -eq 1 ]; then
  TARGET_VERSION=$1
else
  echo "Version not provided. Retrieving the latest version..."
  TARGET_VERSION=$(npm show @graphql-hive/gateway version 2> /dev/null)
  if [ -z "$TARGET_VERSION" ]; then
    echo "Could not retrieve the latest version of @graphql-hive/gateway."
    exit 1
  fi
  echo "Using version: $TARGET_VERSION"
fi

fetch_and_prepare_binary() {
  identify_architecture || return 1
  architecture="$ARCH_DETECTED"
  check_non_empty "$architecture" "architecture"

  RELEASE_TAG="v$TARGET_VERSION"
  RELEASE_API_URL="https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/tags/$RELEASE_TAG"

  echo "Fetching release details from: $RELEASE_API_URL"

  API_RESPONSE=$(curl -s "$RELEASE_API_URL")

  # Validate JSON response
  if ! echo "$API_RESPONSE" | jq . > /dev/null 2>&1; then
    echo "Error parsing release information from GitHub API."
    exit 1
  fi

  # Ensure assets are available
  TOTAL_ASSETS=$(echo "$API_RESPONSE" | jq '.assets | length')
  if [ "$TOTAL_ASSETS" -eq 0 ]; then
    echo "No assets found for release $RELEASE_TAG. Exiting."
    exit 1
  fi

  DOWNLOAD_URL=$(echo "$API_RESPONSE" | jq -r ".assets[] | select(.name == \"$BINARY_NAME-${architecture}\") | .browser_download_url")

  if [ -n "$DOWNLOAD_URL" ]; then
    destination_file="./$BINARY_NAME-${architecture}.gz"
    echo "Downloading $BINARY_NAME from $DOWNLOAD_URL ..."
    curl -sSfL "$DOWNLOAD_URL" -o "$destination_file"

    if [ $? -ne 0 ]; then
      echo "Download failed: $DOWNLOAD_URL"
      exit 1
    fi

    echo "Unzipping $destination_file..."
    unzip "$destination_file"

    if [ $? -ne 0 ]; then
      echo "Unzipping failed: $destination_file"
      exit 1
    fi

    binary_path="./$BINARY_NAME"
    chmod +x "$binary_path"
    echo "Binary downloaded and ready to use at $binary_path."
  else
    echo "No suitable binary found for architecture $architecture in release $RELEASE_TAG."
    exit 1
  fi
}

identify_architecture() {
  os_type="$(uname -s)"
  cpu_type="$(uname -m)"

  case "$os_type" in
    Linux)
      os_type="Linux"
      ;;
    Darwin)
      os_type="macOS"
      ;;
    *)
      echo "No binaries available for OS: $os_type"
      return 1
      ;;
  esac

  case "$cpu_type" in
    x86_64 | x64 | amd64)
      cpu_type="X64"
      ;;
    arm64 | aarch64)
      cpu_type="ARM64"
      ;;
    *)
      echo "No binaries available for CPU architecture: $cpu_type"
      return 1
      ;;
  esac

  ARCH_DETECTED="$os_type-$cpu_type"
}

check_non_empty() {
  if [ -z "$1" ]; then
    echo "Error: $2 is empty or undefined"
    exit 1
  fi
}

fetch_and_prepare_binary "$@" || exit 1
