# Run Spring Boot backend (Maven Wrapper)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Test-PortOpen([int]$Port) {
    $test = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $test.TcpTestSucceeded
}

Write-Host "Checking database..." -ForegroundColor Cyan
$profile = ""
if (Test-PortOpen 5433) {
    Write-Host "PostgreSQL detected on port 5433 (Docker)." -ForegroundColor Green
} elseif (Test-PortOpen 5432) {
    Write-Host "PostgreSQL detected on port 5432 (local install)." -ForegroundColor Green
    $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/task_workflow_db?sslmode=disable"
} else {
    Write-Host "No PostgreSQL found - using in-memory H2 database (dev mode)." -ForegroundColor Yellow
    Write-Host "For real PostgreSQL: start Docker Desktop, then run ..\start-db.ps1" -ForegroundColor Yellow
    $profile = "h2"
}

Write-Host ""
Write-Host "Compiling..."
.\mvnw.cmd -q compile -DskipTests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting backend on http://localhost:8081 ..."
if ($profile) {
    .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=$profile"
} elseif ($env:SPRING_DATASOURCE_URL) {
    .\mvnw.cmd spring-boot:run
} else {
    .\mvnw.cmd spring-boot:run
}
