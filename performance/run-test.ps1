param(
    [ValidateSet('smoke', 'load', 'spike', 'stress', 'soak', 'websocket')]
    [string]$Scenario = 'smoke',
    [switch]$PrometheusOutput
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($env:TEST_PASSWORD)) {
    throw 'Set TEST_PASSWORD in the current PowerShell session before running the performance test.'
}
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$arguments = @(
    'compose', '-f', (Join-Path $repositoryRoot 'performance\compose.yml'),
    'run', '--rm', 'k6', 'run'
)
if ($PrometheusOutput) {
    $arguments += @('-o', 'experimental-prometheus-rw')
}
$arguments += "/scripts/$Scenario.js"

docker @arguments
if ($LASTEXITCODE -ne 0) {
    throw "$Scenario performance test failed."
}
