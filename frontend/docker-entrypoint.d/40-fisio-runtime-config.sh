#!/bin/sh
set -eu

template_path=/etc/fisio/runtime-config.template.js
target_path=/usr/share/nginx/html/runtime-config.js
defaults_path=/etc/fisio/runtime-defaults.sh
policy_path=/etc/fisio/connect-sources.conf

. "$defaults_path"

# Refuse privileged/malformed keys before writing any browser-readable configuration.
public_key=${PUBLIC_SUPABASE_ANON_KEY:-}
case "$public_key" in
  *[!A-Za-z0-9_.-]*) echo 'Invalid public Supabase key' >&2; exit 1 ;;
  sb_publishable_) echo 'Invalid public Supabase key' >&2; exit 1 ;;
  sb_publishable_*) ;;
  eyJ*.*.*)
    payload=$(printf '%s' "$public_key" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null || true)
    printf '%s' "$payload" | grep -Eq '"role"[[:space:]]*:[[:space:]]*"anon"' || exit 1
    if printf '%s' "$payload" | grep -Eq '"role"[[:space:]]*:[[:space:]]*"service_role"'; then exit 1; fi ;;
  '') ;;
  *) echo 'Only public Supabase keys are allowed' >&2; exit 1 ;;
esac

endpoint_origin() {
  # Only literal HTTP(S) endpoints enter JavaScript and nginx; reject config injection.
  case "$1" in ''|*[!A-Za-z0-9:/._~%-]*) echo 'Invalid public endpoint' >&2; exit 1 ;; esac
  host='[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*'
  if ! printf '%s' "$1" | grep -Eq "^https://$host(:[0-9]{1,5})?(/[A-Za-z0-9._~%/-]*)?$|^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(/[A-Za-z0-9._~%/-]*)?$"; then
    echo 'Public endpoints require HTTPS (HTTP only on loopback)' >&2; exit 1
  fi
  authority=${1#*://}
  authority=${authority%%/*}
  case "$authority" in *:*)
    port=${authority##*:}
    if [ "$port" -le 0 ] || [ "$port" -gt 65535 ]; then echo 'Invalid public endpoint port' >&2; exit 1; fi ;;
  esac
  printf '%s://%s' "${1%%://*}" "$authority"
}

# ponytail: keep existing fallback hosts until explicit endpoints are required in every client.
api_origin=$(endpoint_origin "${PUBLIC_BACKEND_URL:-${FISIO_BUILD_BACKEND_URL:-https://fisio-backend.b5xbaf.easypanel.host}}")
supabase_origin=$(endpoint_origin "${PUBLIC_SUPABASE_URL:-${FISIO_BUILD_SUPABASE_URL:-https://fisio-dev.supabase.co}}")

envsubst '${PUBLIC_SUPABASE_URL} ${PUBLIC_BACKEND_URL}' \
  < "$template_path" \
  > "$target_path.tmp"
printf 'set $fisio_connect_sources "%s %s";\n' "$api_origin" "$supabase_origin" > "$policy_path.tmp"
mv "$target_path.tmp" "$target_path"
mv "$policy_path.tmp" "$policy_path"
