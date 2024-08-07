#!/bin/bash

set -e

# clean previous builds
rm -f mesh-serve mesh-serve.exe
rm -f sea-prep.blob

# generate SEA blob
node --experimental-sea-config sea-config.json

ci_platform="${1:-$(uname -s)}"
arch="${2:-$(uname -m)}"

if [[ "$ci_platform" == "macos-latest" ]]; then
  platform="apple-darwin"
elif [[ "$ci_platform" == "ubuntu-latest" ]]; then
  platform="unknown-linux-gnu"
elif [[ "$ci_platform" == "windows-latest" ]]; then
  platform="pc-windows-msvc"
else
  platform="$ci_platform"
fi

if [[ "$arch" == "arm64" ]]; then
  arch="aarch64"
elif [[ "$arch" == "x64" || "$arch" == "x86_64" ]]; then
  arch="x86_64"
fi

output_dir="graphql-mesh-${2}-${platform}"
exe_name="mesh-serve"
if [[ "$platform" == "pc-windows-msvc" ]]; then
  exe_name="mesh-serve.exe"
fi

mkdir -p $output_dir

if [[ "$platform" == "apple-darwin" ]]; then
  cp $(command -v node) $output_dir/$exe_name
  codesign --remove-signature $output_dir/$exe_name
elif [[ "$platform" == "unknown-linux-gnu" ]]; then
  cp $(command -v node) $output_dir/$exe_name
elif [[ "$platform" == "pc-windows-msvc" ]]; then
  powershell -Command "Copy-Item $(Get-Command node).Source $output_dir/$exe_name"
  echo "Skipping signature removal for Windows"
fi

# inject the blob into the binary (only once per binary)
npx postject $output_dir/$exe_name NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Sign the binary if necessary
if [[ "$platform" == "apple-darwin" ]]; then
  codesign --sign - $output_dir/$exe_name
elif [[ "$platform" == "pc-windows-msvc" ]]; then
  echo "Signing on Windows (skipped)"
fi

# Make the binary executable on Unix-like systems
if [[ "$platform" != "pc-windows-msvc" ]]; then
  chmod +x $output_dir/$exe_name
fi
