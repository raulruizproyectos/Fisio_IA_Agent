#!/bin/sh
set -eu

template_path=/etc/fisio/runtime-config.template.js
target_path=/usr/share/nginx/html/runtime-config.js

envsubst '${PUBLIC_SUPABASE_URL} ${PUBLIC_SUPABASE_ANON_KEY} ${PUBLIC_BACKEND_URL}' \
  < "$template_path" \
  > "$target_path"
