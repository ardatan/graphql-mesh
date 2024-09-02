#!/bin/sh

set -u

OWNER="ardatan"
REPO="graphql-mesh"
ARTIFACT_NAME="hive-gateway"
BINARY_DOWNLOAD_PREFIX="https://github.com/$OWNER/$REPO/releases/download"

# Check if a version was provided as an argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

PACKAGE_VERSION=$1

download_binary() {
    downloader --check
    need_cmd mktemp
    need_cmd chmod
    need_cmd mkdir
    need_cmd rm
    need_cmd rmdir
    need_cmd tar
    need_cmd which
    need_cmd dirname
    need_cmd awk
    need_cmd cut

    get_architecture || return 1
    _arch="$RETVAL"
    assert_nz "$_arch" "arch"

    # Start searching from the latest release and find the correct one
    RELEASES_URL="https://api.github.com/repos/$OWNER/$REPO/releases"
    while [ -n "$RELEASES_URL" ]; do
        # Fetch the list of releases
        RESPONSE=$(curl -s "$RELEASES_URL")
        for RELEASE in $(echo "$RESPONSE" | jq -r '.[] | @base64'); do
            _jq() {
                echo "${RELEASE}" | base64 --decode | jq -r "${1}"
            }

            TAG_NAME=$(_jq '.tag_name')
            BODY=$(_jq '.body')

            # Check if the release notes/body mention the specific version of serve-cli
            if echo "$BODY" | grep -q "@graphql-hive/gateway@$PACKAGE_VERSION"; then
                echo "Found matching release: $TAG_NAME"
                ASSET_URL=$(_jq ".assets[] | select(.name | contains(\"$ARTIFACT_NAME-${_arch}\")) | .browser_download_url")

                if [ -n "$ASSET_URL" ]; then
                    _url="$ASSET_URL"
                    _dir="$(mktemp -d 2>/dev/null || ensure mktemp -d -t mesh)"
                    _file="$_dir/input.tar.gz"
                    _mesh="$_dir/hive-gateway"

                    say "Downloading $ARTIFACT_NAME from $_url ..." 1>&2

                    ensure mkdir -p "$_dir"
                    downloader "$_url" "$_file"
                    if [ $? != 0 ]; then
                      say "Failed to download $_url"
                      exit 1
                    fi

                    ensure tar xf "$_file" -C "$_dir"

                    outfile="./hive-gateway"

                    say "Moving $_mesh to $outfile ..."
                    mv "$_mesh" "$outfile"

                    # Ensure the binary is executable
                    chmod +x "$outfile"

                    _retval=$?

                    say ""

                    ignore rm -rf "$_dir"

                    return "$_retval"
                fi
            fi
        done

        # Get the URL for the next page of releases (if any)
        RELEASES_URL=$(echo "$RESPONSE" | jq -r 'if .next == null then empty else .next end')
    done

    echo "No matching release found."
    exit 1
}

get_architecture() {
    case $(uname -ms) in
    'Darwin x86_64')
        RETVAL="macOS-X64"
        ;;
    'Darwin arm64')
        RETVAL="macOS-ARM64"
        ;;
    'Linux arm64')
        RETVAL="linux-ARM64"
        ;;
    'Linux x86_64' | *)
        RETVAL="linux-X64"
        ;;
    esac
}

say() {
    green=$(tput setaf 2 2>/dev/null || echo '')
    reset=$(tput sgr0 2>/dev/null || echo '')
    echo "$1"
}

err() {
    red=$(tput setaf 1 2>/dev/null || echo '')
    reset=$(tput sgr0 2>/dev/null || echo '')
    say "${red}ERROR${reset}: $1" >&2
    exit 1
}

need_cmd() {
    if ! check_cmd "$1"
    then err "Installation halted. Reason: [command not found '$1' - please install this command]"
    fi
}

check_cmd() {
    command -v "$1" > /dev/null 2>&1
    return $?
}

need_ok() {
    if [ $? != 0 ]; then err "$1"; fi
}

assert_nz() {
    if [ -z "$1" ]; then err "assert_nz $2"; fi
}

# Run a command that should never fail. If the command fails execution
# will immediately terminate with an error showing the failing
# command.
ensure() {
    "$@"
    need_ok "command failed: $*"
}

# This is just for indicating that commands' results are being
# intentionally ignored. Usually, because it's being executed
# as part of error handling.
ignore() {
    "$@"
}

# This wraps curl or wget. Try curl first, if not installed,
# use wget instead.
downloader() {
    if check_cmd curl
    then _dld=curl
    elif check_cmd wget
    then _dld=wget
    else _dld='curl or wget' # to be used in error message of need_cmd
    fi

    if [ "$1" = --check ]
    then need_cmd "$_dld"
    elif [ "$_dld" = curl ]
    then curl -sSfL "$1" -o "$2"
    elif [ "$_dld" = wget ]
    then wget "$1" -O "$2"
    else err "Unknown downloader"   # should not reach here
    fi
}

download_binary "$@" || exit 1
