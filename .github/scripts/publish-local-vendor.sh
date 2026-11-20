#!/usr/bin/env bash
set -euo pipefail
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
python3 .github/scripts/build-local-vendor.py "$stage"
while IFS= read -r -d '' js; do node --check "$js"; done < <(find "$stage" -name '*.js' -print0)
test -n "$FTP_USER" && test -n "$FTP_PASS"
cert="$stage/ftp-cert.pem"
# Bootstrap trust only after checking the certificate fingerprint recorded by the failed deployment.
timeout 30s openssl s_client -starttls ftp -connect "$FTP_HOST:21" -servername "$FTP_HOST" -showcerts </dev/null 2>/dev/null | openssl x509 -out "$cert"
expected='89:D1:FA:62:43:86:94:55:EC:ED:41:A3:7C:82:D1:6C:DF:40:07:34'
actual="$(openssl x509 -in "$cert" -noout -fingerprint -sha1 | cut -d= -f2)"
if [ "$actual" != "$expected" ]; then echo 'FTP certificate changed; deployment stopped' >&2; exit 1; fi
cmd="$stage/upload.commands"
{
  echo 'set cmd:fail-exit yes'
  echo 'set ftp:ssl-force true'
  echo 'set ftp:ssl-protect-data true'
  printf 'set ssl:ca-file %s\n' "$cert"
  echo 'set ssl:verify-certificate yes'
  # The legacy FTP alias differs from the pinned certificate identity.
  # Keep certificate trust verification and encrypted control/data channels.
  echo 'set ssl:check-hostname no'
  echo 'set ftp:passive-mode true'
  echo 'set ftp:prefer-epsv false'
  echo 'set net:timeout 45'
  echo 'set net:max-retries 2'
  while IFS= read -r file; do
    rel="$(realpath --relative-to="$stage" "$file")"
    remote="/khat-yar.ir/vendor/$rel"
    if curl --fail --silent --max-time 15 "https://khat-yar.ir/vendor/$rel" -o "$stage/existing.check" && cmp -s "$file" "$stage/existing.check"; then continue; fi
    printf 'mkdir -p %s\n' "$(dirname "$remote")"
    printf 'put %s -o %s\n' "$file" "$remote.new"
    printf 'mv %s %s\n' "$remote.new" "$remote"
  done < <(find "$stage" -type f ! -name ftp-cert.pem ! -name upload.commands ! -name existing.check ! -name '*.css' | sort; find "$stage" -type f -name '*.css' | sort)
  echo bye
} > "$cmd"
lftp --user "$FTP_USER" --password "$FTP_PASS" "ftp://$FTP_HOST:21" -e "$(cat "$cmd")"
while IFS= read -r file; do
  rel="$(realpath --relative-to="$stage" "$file")"
  curl --fail --silent --show-error --retry 2 --max-time 35 "https://khat-yar.ir/vendor/$rel?verify=$GITHUB_SHA" -o "$stage/remote.check"
  cmp "$file" "$stage/remote.check"
  echo "Verified local dependency: $rel"
done < <(find "$stage" -type f ! -name ftp-cert.pem ! -name upload.commands ! -name existing.check ! -name remote.check | sort)
