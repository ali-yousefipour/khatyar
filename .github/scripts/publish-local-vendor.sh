#!/usr/bin/env bash
set -euo pipefail
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
cache="$PWD/.vendor-ci-cache"
if [ ! -f "$cache/.complete" ] || ! (cd "$cache" && sha256sum --quiet -c .manifest); then
  rm -rf "$cache"
  python3 .github/scripts/build-local-vendor.py "$stage"
  mkdir -p "$cache"
  cp -a "$stage/." "$cache/"
  (cd "$cache" && find . -type f ! -name .manifest -print0 | sort -z | xargs -0 sha256sum > .manifest)
  touch "$cache/.complete"
else
  echo 'Using verified build cache for pinned runtime dependencies'
  cp -a "$cache/." "$stage/"
  rm -f "$stage/.manifest" "$stage/.complete"
fi
while IFS= read -r -d '' js; do node --check "$js"; done < <(find "$stage" -name '*.js' -print0)
# The verified public vendor assets are immutable for a given pinned build.
# If all byte-for-byte copies already exist over trusted HTTPS, do not require
# FTPS merely to republish identical bytes. This also avoids transient port 21
# outages stopping unrelated PHP changes after a prior successful deployment.
all_verified=true
checked=0
while IFS= read -r -d '' file; do
  rel="$(realpath --relative-to="$stage" "$file")"
  url="https://khat-yar.ir/vendor/$rel"
  if ! curl --fail --silent --show-error --location --retry 2 --retry-delay 2 --max-time 25 "$url" -o "$stage/existing.check"; then
    all_verified=false
    echo "Vendor asset unavailable via HTTPS: $rel; FTPS publish required."
    break
  fi
  if ! cmp -s "$file" "$stage/existing.check"; then
    all_verified=false
    echo "Vendor asset differs from verified local build: $rel; FTPS publish required."
    break
  fi
  checked=$((checked+1))
done < <(find "$stage" -type f ! -name '.manifest' ! -name '.complete' ! -name 'existing.check' -print0 | sort -z)
rm -f "$stage/existing.check"
if [ "$all_verified" = true ] && [ "$checked" -gt 0 ]; then
  echo "Verified $checked previously published vendor assets byte-for-byte via HTTPS; no FTPS transfer necessary."
  exit 0
fi

test -n "$FTP_USER" && test -n "$FTP_PASS"
cert="$stage/ftp-cert.pem"
expected='89:D1:FA:62:43:86:94:55:EC:ED:41:A3:7C:82:D1:6C:DF:40:07:34'
# Transient connection failures must not be confused with a changed certificate.
# Never disable TLS or trust an unverified fingerprint.
verified=false
for attempt in 1 2 3 4; do
  rm -f "$cert"
  echo "FTPS certificate preflight: attempt $attempt/4"
  if timeout 18s openssl s_client -starttls ftp -connect "$FTP_HOST:21" -servername "$FTP_HOST" -showcerts </dev/null 2>"$stage/tls-error.log" | openssl x509 -out "$cert" 2>/dev/null; then
    actual="$(openssl x509 -in "$cert" -noout -fingerprint -sha1 | cut -d= -f2)"
    if [ "$actual" != "$expected" ]; then
      echo "SECURITY: FTP certificate fingerprint differs from pinned value; refusing deployment." >&2
      exit 1
    fi
    verified=true
    break
  fi
  echo "FTPS handshake unavailable on attempt $attempt; waiting before retry." >&2
  if [ "$attempt" -lt 4 ]; then sleep $((attempt * 4)); fi
done
if [ "$verified" != true ]; then
  echo "ERROR: Cannot reach a verified FTPS endpoint at the configured host on port 21." >&2
  echo "Check hosting connectivity, FTP TLS availability, firewall and GitHub runner access. Deployment stopped without plaintext fallback." >&2
  exit 1
fi
rm -f "$stage/tls-error.log"
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
