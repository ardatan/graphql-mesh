#!/bin/bash

set -e

# utils
clean_previous_builds() {
  rm -f mesh-serve mesh-serve.exe
  rm -f sea-prep.blob
}

generate_sea_blob() {
  if [ ! -f sea-prep.blob ]; then
    node --experimental-sea-config sea-config.json
  fi
}

inject_blob() {
  local exe_path=$1
  npx postject "$exe_path" NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA
  echo "💉 Injection done!"
}

sign_binary() {
  local exe_path=$1
  codesign --sign - "$exe_path"
}

make_executable() {
  local exe_path=$1
  chmod +x "$exe_path"
}

# macOS x86_64
build_macos_x86_64() {
  local exe_name="mesh-serve"
  cp "$(command -v node)" "$exe_name"
  codesign --remove-signature "$exe_name"
  inject_blob "$exe_name"
  sign_binary "$exe_name"
  make_executable "$exe_name"
}

# macOS aarch64
build_macos_aarch64() {
  local exe_name="mesh-serve"
  cp "$(command -v node)" "$exe_name"
  codesign --remove-signature "$exe_name"
  inject_blob "$exe_name"
  sign_binary "$exe_name"
  make_executable "$exe_name"
}

# Ubuntu x86_64
build_ubuntu_x86_64() {
  local exe_name="mesh-serve"
  cp "$(command -v node)" "$exe_name"
  inject_blob "$exe_name"
  make_executable "$exe_name"
}

# Ubuntu aarch64
build_ubuntu_aarch64() {
  local exe_name="mesh-serve"
  cp "$(command -v node)" "$exe_name"
  inject_blob "$exe_name"
  make_executable "$exe_name"
}

# Windows x86_64
build_windows_x86_64() {
  local exe_name="mesh-serve.exe"
  powershell -Command "Copy-Item $(Get-Command node).Source $exe_name"
  inject_blob "$exe_name"
}

main() {
  clean_previous_builds
  generate_sea_blob

  local ci_platform="$1"
  local arch="$2"

  if [[ "$ci_platform" == "macos-latest" || "$ci_platform" == "macos-latest-large" ]]; then
    if [[ "$arch" == "x86_64" ]]; then
      build_macos_x86_64
    elif [[ "$arch" == "aarch64" ]]; then
      build_macos_aarch64
    fi
  elif [[ "$ci_platform" == "ubuntu-latest" ]]; then
    if [[ "$arch" == "x86_64" ]]; then
      build_ubuntu_x86_64
    elif [[ "$arch" == "aarch64" ]]; then
      build_ubuntu_aarch64
    fi
  elif [[ "$ci_platform" == "windows-latest" ]]; then
    build_windows_x86_64
  else
    echo "Unsupported platform: $ci_platform"
    exit 1
  fi

  echo "Build completed for platform: $ci_platform, architecture: $arch"
}

main "$@"
