#!/bin/sh
set -eu

CONFIG=/usr/share/nginx/html/config.json5
PUBLIC_CONFIG=/usr/share/nginx/html/config.public.json5
PROXY_INCLUDE=/etc/nginx/proxy-locations.conf

if [ ! -f "$CONFIG" ]; then
  echo "config.json5 not found at $CONFIG" >&2
  exit 1
fi

JSON=$(json5 "$CONFIG") || {
  echo "config.json5: parse failed (check syntax)" >&2
  exit 1
}

echo "$JSON" | jq -e '.networks | type == "array" and length > 0' > /dev/null || {
  echo "config.json5: networks must be a non-empty array" >&2
  exit 1
}

# Strip URL down to host[:port] for Host header derivation.
host_of() {
  printf '%s' "$1" | sed -E 's|^[a-z]+://||; s|/.*$||'
}

SLUG_REGEX='^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'

> "$PROXY_INCLUDE"

count=$(echo "$JSON" | jq '.networks | length')
i=0
while [ "$i" -lt "$count" ]; do
  entry=$(echo "$JSON" | jq ".networks[$i]")
  slug=$(echo "$entry" | jq -r '.slug // empty')
  rpc=$(echo "$entry" | jq -r '.rpcUrl // empty')
  stats=$(echo "$entry" | jq -r '.statsUrl // empty')

  if [ -z "$slug" ] || [ -z "$rpc" ]; then
    echo "config.json5: networks[$i] missing required slug or rpcUrl" >&2
    exit 1
  fi
  if ! echo "$slug" | grep -Eq "$SLUG_REGEX"; then
    echo "config.json5: networks[$i].slug '$slug' is not URL-safe (allowed: a-z, 0-9, hyphen; must start and end alphanumeric)" >&2
    exit 1
  fi

  rpc_host=$(host_of "$rpc")
  # nginx variable names allow only [A-Za-z0-9_], so hyphens in slugs become underscores.
  var=$(echo "$slug" | tr '-' '_')

  cat >> "$PROXY_INCLUDE" <<EOF
# $slug
location = /rpc/$slug {
  limit_req zone=rpc burst=100 nodelay;
  set \$upstream_$var "$rpc";
  rewrite ^ / break;
  proxy_pass \$upstream_$var;
  proxy_ssl_server_name on;
  proxy_http_version 1.1;
  proxy_set_header Host $rpc_host;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

  if [ -n "$stats" ]; then
    stats_host=$(host_of "$stats")
    cat >> "$PROXY_INCLUDE" <<EOF
location = /rpc/stats/$slug {
  limit_req zone=rpc burst=100 nodelay;
  set \$upstream_stats_$var "$stats";
  rewrite ^ / break;
  proxy_pass \$upstream_stats_$var;
  proxy_ssl_server_name on;
  proxy_http_version 1.1;
  proxy_set_header Host $stats_host;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
  fi

  i=$((i + 1))
done

# Write redacted public config the SPA fetches. Strips upstream URLs.
echo "$JSON" | jq '{
  networks: [.networks[] | {
    slug,
    name,
    type,
    isArchive,
    hasStats: (.statsUrl != null),
  }],
  pollIntervalMs,
  cacheEnabled,
}' > "$PUBLIC_CONFIG"

echo "Generated $PROXY_INCLUDE with $count network(s)."
echo "Generated $PUBLIC_CONFIG (redacted, no upstream URLs)."
