#!/usr/bin/env bash
set -euo pipefail
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
python3 .github/scripts/build-local-vendor.py "$stage"
find "$stage" -name '*.js' -exec node --check {} \;
test -n "$FTP_USER" && test -n "$FTP_PASS"
cmd="$stage/upload.commands"
{
  echo 'set cmd:fail-exit yes'
  echo 'set ftp:ssl-force false'
  echo 'set ftp:ssl-protect-data false'
  echo 'set ftp:passive-mode true'
  echo 'set ftp:prefer-epsv false'
  echo 'set net:timeout 45'
  echo 'set net:max-retries 2'
  while IFS= read -r file; do
    rel="$(realpath --relative-to="$stage" "$file")"
    remote="/khat-yar.ir/vendor/$rel"
    printf 'mkdir -p %s\n' "$(dirname "$remote")"
    printf 'put %s -o %s\n' "$file" "$remote.new"
    printf 'mv %s %s\n' "$remote.new" "$remote"
  done < <(find "$stage" -type f ! -name upload.commands ! -name '*.css' | sort; find "$stage" -type f -name '*.css' | sort)
  echo bye
} > "$cmd"
lftp --user "$FTP_USER" --password "$FTP_PASS" "ftp://$FTP_HOST:21" -e "$(cat "$cmd")"
while IFS= read -r file; do
  rel="$(realpath --relative-to="$stage" "$file")"
  curl --fail --silent --show-error --retry 2 --max-time 35 "https://khat-yar.ir/vendor/$rel?verify=$GITHUB_SHA" -o "$stage/remote.check"
  cmp "$file" "$stage/remote.check"
  echo "Verified local dependency: $rel"
done < <(find "$stage" -type f ! -name upload.commands ! -name remote.check | sort)
