#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <encrypted-file> [output-file]" >&2
  echo "Example: $0 secrets/stripe.enc.yaml secrets/stripe.yaml" >&2
}

if [[ ${1:-} == "" ]]; then
  usage
  exit 1
fi

ENCRYPTED_PATH="$1"
OUTPUT_PATH="${2:-${ENCRYPTED_PATH%.enc.yaml}.yaml}"

if ! command -v sops >/dev/null 2>&1; then
  echo "Error: sops is not installed. See https://github.com/getsops/sops#installation" >&2
  exit 2
fi

if [[ ! -f "$ENCRYPTED_PATH" ]]; then
  echo "Error: encrypted file '$ENCRYPTED_PATH' not found" >&2
  exit 3
fi

sops -d "$ENCRYPTED_PATH" > "$OUTPUT_PATH"

cat <<MSG
Decrypted $ENCRYPTED_PATH -> $OUTPUT_PATH
Remember to remove the plaintext file when finished:
  rm -f "$OUTPUT_PATH"
MSG
