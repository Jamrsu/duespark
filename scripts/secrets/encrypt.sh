#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <plaintext-file> [encrypted-file]" >&2
  echo "Example: $0 secrets/stripe.yaml secrets/stripe.enc.yaml" >&2
}

if [[ ${1:-} == "" ]]; then
  usage
  exit 1
fi

PLAINTEXT_PATH="$1"
ENCRYPTED_PATH="${2:-${PLAINTEXT_PATH%.yaml}.enc.yaml}"

if ! command -v sops >/dev/null 2>&1; then
  echo "Error: sops is not installed. See https://github.com/getsops/sops#installation" >&2
  exit 2
fi

if [[ ! -f "$PLAINTEXT_PATH" ]]; then
  echo "Error: plaintext file '$PLAINTEXT_PATH' not found" >&2
  exit 3
fi

sops -e "$PLAINTEXT_PATH" > "$ENCRYPTED_PATH"

cat <<MSG
Encrypted $PLAINTEXT_PATH -> $ENCRYPTED_PATH
Consider removing the plaintext file:
  shred -u "$PLAINTEXT_PATH"
MSG
