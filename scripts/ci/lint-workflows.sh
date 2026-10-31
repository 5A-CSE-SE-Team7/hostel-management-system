#!/usr/bin/env bash
set -euo pipefail
# GitHub-hosted ubuntu runner; pinned upstream release and published SHA-256.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
curl --fail --silent --show-error --location \
  https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_linux_amd64.tar.gz \
  --output "$work/actionlint.tar.gz"
printf '%s  %s\n' '023070a287cd8cccd71515fedc843f1985bf96c436b7effaecce67290e7e0757' "$work/actionlint.tar.gz" | sha256sum --check --status
tar -xzf "$work/actionlint.tar.gz" -C "$work" actionlint
"$work/actionlint"
