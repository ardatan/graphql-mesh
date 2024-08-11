#!/bin/bash

set -e

BINARY_DIR=$(find . -type d -name "graphql-mesh-*")

echo "Found binary directory: $BINARY_DIR"

if [[ -z "$BINARY_DIR" ]]; then
  echo "No directory found with prefix 'graphql-mesh-'"
  exit 1
fi

BINARY_PATH="$BINARY_DIR/mesh-serve"

if [[ ! -f "$BINARY_PATH" ]]; then
  echo "Binary 'mesh-serve' not found in $BINARY_DIR"
  exit 1
fi

echo "Testing $BINARY_PATH..."

# start the binary and capture output in the background
logs=$(mktemp)
./"$BINARY_PATH" >"$logs" 2>&1 & pid=$!

# wait a bit for the server to start
sleep 5

# check the logs so far
captured_logs=$(cat "$logs")
echo "Captured logs:"
echo "$captured_logs"

# check if there are any logs that are not of type INFO
if echo "$captured_logs" | grep -qv "INFO"; then
  echo "Error: Found log entries that are not of type INFO."
  kill $pid 2>/dev/null
  exit 1
fi

# check if the uWS error message shows up
if echo "$captured_logs" | grep -q "uWebSockets.js is not available"; then
  echo "Error: Detected uWebSockets.js is not available."
  kill $pid 2>/dev/null
  exit 1
fi

# check the /healthcheck endpoint
status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/healthcheck)

if [ "$status_code" -ne 200 ]; then
  echo "Error: Healthcheck endpoint did not return 200 status code. Returned $status_code instead."
  kill $pid 2>/dev/null
  exit 1
fi

kill $pid 2>/dev/null

echo "$BINARY_PATH passed the test."
