import { OBS_COLLECTION } from "./obsSceneCollection";

/**
 * The start-up scripts for a club's streaming computer — one OBS per table,
 * started at login and restarted if it closes — built from the club's own
 * table names, so what the Recording tab hands an admin runs as downloaded.
 * Each table's OBS profile and scene are named exactly like the table (the
 * scene by obsSceneCollection.ts, the profile by the admin following the
 * steps), which is what lets one name drive both flags.
 *
 * Every script is safe to run again after tables change: each one first
 * removes whatever the last run installed.
 */

export type StreamerOs = "windows" | "mac" | "linux";

export type StreamerFile = { name: string; content: string };

/** POSIX single quotes: nothing inside is special except the quote itself. */
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inside a quoted batch argument only `%` still expands. ponytail: a table
 *  name with a `"` in it can't be passed to a .bat at all; none has one. */
const bat = (s: string) => s.replace(/%/g, "%%").replace(/"/g, "");

const launchdId = (name: string, i: number) =>
  `app.poolclubs.obs.${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || i + 1
  }`;

const OBS_FLAGS = `--collection "${OBS_COLLECTION}" --minimize-to-tray --disable-shutdown-check`;

function windows(tables: string[]): StreamerFile[] {
  // CRLF: cmd reads LF-only files, but a label on a line it misparses is the
  // kind of bug nobody at a club can debug. chcp 65001: accented names.
  const crlf = (lines: string[]) => lines.join("\r\n") + "\r\n";
  return [
    {
      name: "start-table.bat",
      content: crlf([
        "@echo off",
        "chcp 65001 >nul",
        'cd /d "C:\\Program Files\\obs-studio\\bin\\64bit"',
        ":loop",
        `obs64.exe --multi --profile "%~1" --scene "%~1" ${OBS_FLAGS}`,
        "timeout /t 10 /nobreak >nul",
        "goto loop",
      ]),
    },
    {
      name: "start-all.bat",
      content: crlf([
        "@echo off",
        "chcp 65001 >nul",
        ...tables.map(
          (t) =>
            `start "${bat(t)}" /min "C:\\PoolClubs\\start-table.bat" "${bat(t)}"`,
        ),
      ]),
    },
  ];
}

function mac(tables: string[]): StreamerFile[] {
  const lines = [
    "#!/bin/bash",
    "# PoolClubs: one OBS per table, started at login, relaunched if it closes.",
    "set -euo pipefail",
    'dir="$HOME/Library/LaunchAgents"',
    'mkdir -p "$dir"',
    "",
    "# Whatever a previous run installed goes first, so a removed table stops.",
    'for f in "$dir"/app.poolclubs.obs.*.plist; do',
    '  [ -e "$f" ] || continue',
    '  launchctl bootout "gui/$(id -u)" "$f" 2>/dev/null || true',
    '  rm -f "$f"',
    "done",
    "",
    "add() {",
    '  local id=$1 name=$2 plist="$dir/$1.plist"',
    '  cat > "$plist" <<EOF',
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0"><dict>',
    "  <key>Label</key><string>$id</string>",
    "  <key>ProgramArguments</key><array>",
    "    <string>/Applications/OBS.app/Contents/MacOS/OBS</string>",
    "    <string>--multi</string>",
    "    <string>--profile</string><string>$name</string>",
    "    <string>--scene</string><string>$name</string>",
    `    <string>--collection</string><string>${OBS_COLLECTION}</string>`,
    "    <string>--minimize-to-tray</string>",
    "    <string>--disable-shutdown-check</string>",
    "  </array>",
    "  <key>RunAtLoad</key><true/>",
    "  <key>KeepAlive</key><true/>",
    "  <key>ThrottleInterval</key><integer>10</integer>",
    "</dict></plist>",
    "EOF",
    '  launchctl bootstrap "gui/$(id -u)" "$plist"',
    "}",
    "",
    // Escaped for XML here, where the value is known, not in bash.
    ...tables.map((t, i) => `add ${sh(launchdId(t, i))} ${sh(xml(t))}`),
  ];
  return [{ name: "poolclubs-obs.sh", content: lines.join("\n") + "\n" }];
}

function linux(tables: string[]): StreamerFile[] {
  const lines = [
    "#!/bin/bash",
    "# PoolClubs: one OBS per table, started with the desktop, restarted if it crashes.",
    "set -euo pipefail",
    'dir="$HOME/.config/systemd/user"',
    'mkdir -p "$dir"',
    "",
    "# Whatever a previous run enabled goes first, so a removed table stops.",
    'for u in "$dir"/graphical-session.target.wants/obs@*.service; do',
    '  [ -e "$u" ] || continue',
    '  systemctl --user disable --now "$(basename "$u")"',
    "done",
    "",
    `cat > "$dir/obs@.service" <<'EOF'`,
    "[Unit]",
    "Description=OBS stream %I",
    "After=graphical-session.target network-online.target",
    "PartOf=graphical-session.target",
    "",
    "[Service]",
    `ExecStart=/usr/bin/obs --multi --profile "%I" --scene "%I" ${OBS_FLAGS}`,
    "Restart=always",
    "RestartSec=10",
    "",
    "[Install]",
    "WantedBy=graphical-session.target",
    "EOF",
    "",
    "systemctl --user daemon-reload",
    `for t in ${tables.map(sh).join(" ")}; do`,
    '  systemctl --user enable --now "obs@$(systemd-escape "$t").service"',
    "done",
  ];
  return [{ name: "poolclubs-obs.sh", content: lines.join("\n") + "\n" }];
}

export const streamerFiles = (os: StreamerOs, tables: string[]) =>
  ({ windows, mac, linux })[os](tables);
