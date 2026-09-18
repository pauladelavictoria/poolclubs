# Finds RTSP cameras on the local network: probes port 554 across the
# subnet and sends an unauthenticated RTSP OPTIONS request to confirm
# something RTSP-shaped is actually listening (skips DESCRIBE deliberately
# — that needs credentials, and some cameras bind the digest auth challenge
# to the TCP connection it was issued on, so a stateless probe would report
# false 401s).
#
# Run on the OBS machine, on the club's own network. PowerShell blocks
# unsigned scripts by default, so run it as (not double-click):
#
#   powershell -ExecutionPolicy Bypass -File find-cameras.ps1
#
# Or with a specific subnet if auto-detection picks the wrong one:
#
#   powershell -ExecutionPolicy Bypass -File find-cameras.ps1 192.168.1
#
# Prints candidate IPs to paste into each table's Camera URL field in
# PoolClubs (Club > Recording), as rtsp://user:pass@<ip>:554/<path> — the
# path and credentials come from the camera itself (its manual or app),
# this script only finds the IP.

param([string]$Subnet)

$RtspPort = 554
$TimeoutMs = 400

function Get-LocalSubnet {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -notlike "169.254.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress
    if (-not $ip) {
        throw "No IPv4 network interface found. Pass a subnet, e.g. find-cameras.ps1 192.168.1"
    }
    return ($ip -split "\.")[0..2] -join "."
}

function Test-RtspCamera([string]$Ip) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect($Ip, $RtspPort, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne($TimeoutMs) -or -not $client.Connected) {
            return $false
        }
        $client.EndConnect($connect)

        $stream = $client.GetStream()
        $stream.ReadTimeout = $TimeoutMs
        $request = "OPTIONS rtsp://$Ip/ RTSP/1.0`r`nCSeq: 1`r`n`r`n"
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($request)
        $stream.Write($bytes, 0, $bytes.Length)

        $buffer = New-Object byte[] 512
        $read = $stream.Read($buffer, 0, $buffer.Length)
        $response = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
        return $response.StartsWith("RTSP/1.0 200")
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$subnetToScan = if ($Subnet) { $Subnet } else { Get-LocalSubnet }
Write-Host "Scanning $subnetToScan.1-254 on port $RtspPort... this can take a minute."

$found = @()
1..254 | ForEach-Object {
    $ip = "$subnetToScan.$_"
    if (Test-RtspCamera $ip) {
        Write-Host "  found: $ip"
        $found += $ip
    }
}

if ($found.Count -eq 0) {
    Write-Host "No RTSP cameras found. Try a different subnet, or check the camera is powered and on the same switch."
} else {
    Write-Host ""
    Write-Host "Found $($found.Count) camera(s):"
    foreach ($ip in $found) {
        Write-Host "  rtsp://<user>:<pass>@${ip}:554/<path>"
    }
}
