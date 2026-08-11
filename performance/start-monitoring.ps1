$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
docker compose -f (Join-Path $repositoryRoot 'backend\compose.yml') up -d mysql redis prometheus

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -UseBasicParsing 'http://localhost:9090/-/ready' -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # Retry until the container is ready.
    }
}

if (-not $ready) {
    throw 'Prometheus was not ready within 30 seconds. Check Docker logs.'
}

Write-Host 'Prometheus ready: http://localhost:9090'
Write-Host 'Start Spring with the local profile to begin metric collection.'
