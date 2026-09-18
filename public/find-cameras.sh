#!/bin/bash
# find-cameras.sh — same purpose as find-cameras.ps1 (Windows), for macOS
# and Linux. See that script's own header for what this checks and why
# (unauthenticated OPTIONS, not DESCRIBE — some cameras bind the digest auth
# challenge to the TCP connection it was issued on, so a stateless probe
# would report false 401s on the credentialed path).
#
# Run on the OBS machine, on the club's own network, in Terminal:
#   bash find-cameras.sh
# Or with a specific subnet if auto-detection picks the wrong one:
#   bash find-cameras.sh 192.168.1
#
# Bash only (/dev/tcp, read -t) — no Python/nmap/nc dependency, so nothing
# to install first on either platform.

set -u
RTSP_PORT=554
READ_TIMEOUT=1

subnet="${1:-}"
if [ -z "$subnet" ]; then
  # macOS first (Linux has no ipconfig), hostname -I as the Linux fallback.
  ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
  if [ -z "$ip" ]; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  if [ -z "$ip" ]; then
    echo "No IPv4 address found. Pass a subnet, e.g. bash find-cameras.sh 192.168.1" >&2
    exit 1
  fi
  subnet=$(echo "$ip" | cut -d. -f1-3)
fi

echo "Scanning $subnet.1-254 on port $RTSP_PORT... this can take a minute."

found=()
for i in $(seq 1 254); do
  ip="$subnet.$i"
  response=""
  if exec 3<>"/dev/tcp/$ip/$RTSP_PORT" 2>/dev/null; then
    printf 'OPTIONS rtsp://%s/ RTSP/1.0\r\nCSeq: 1\r\n\r\n' "$ip" >&3
    IFS= read -r -t "$READ_TIMEOUT" response <&3
    exec 3<&- 3>&-
  fi
  if [[ "$response" == RTSP/1.0\ 200* ]]; then
    echo "  found: $ip"
    found+=("$ip")
  fi
done

if [ ${#found[@]} -eq 0 ]; then
  echo "No RTSP cameras found. Try a different subnet, or check the camera is powered and on the same switch."
else
  echo
  echo "Found ${#found[@]} camera(s):"
  for ip in "${found[@]}"; do
    echo "  rtsp://<user>:<pass>@$ip:554/<path>"
  done
fi
