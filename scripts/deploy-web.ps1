# Web 端部署脚本（Windows → Linux 服务器）
# 用法: .\scripts\deploy-web.ps1 -ServerIP "122.152.201.146" -ServerUser "ubuntu"

param(
    [string]$ServerIP = "122.152.201.146",
    [string]$ServerUser = "ubuntu",
    [string]$DeployPath = "/root/banana-mall-standalone",
    [string]$ServiceName = "banana-mall",
    [string]$AuthServerUrl = "http://localhost:4000"
)

$ErrorActionPreference = "Stop"
$sshTarget = "$ServerUser@$ServerIP"

function Invoke-RemoteCommand($command) {
    Write-Host ">>> ssh $sshTarget $command" -ForegroundColor DarkGray
    $result = ssh $sshTarget "$command" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed: $command`n$result"
    }
    return $result
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  摹图 Web 端部署" -ForegroundColor Cyan
Write-Host "  目标服务器: $ServerIP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 本地构建
Write-Host "`n[1/6] 本地构建 standalone..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "构建失败" }

# 2. 复制静态资源到 standalone 目录（关键！之前漏了这步）
Write-Host "`n[2/6] 复制静态资源到 standalone..." -ForegroundColor Yellow
$staticSrc = ".next/static"
$staticDst = ".next/standalone/.next/static"
if (Test-Path $staticDst) { Remove-Item -Recurse -Force $staticDst }
Copy-Item -Recurse -Force $staticSrc $staticDst

# 3. 复制其他必要文件（严格排除 dev.db，防止覆盖服务器数据库）
Write-Host "`n[3/6] 复制 prisma/public/.env 到 standalone..." -ForegroundColor Yellow
if (Test-Path ".next/standalone/prisma") { Remove-Item -Recurse -Force ".next/standalone/prisma" }
Copy-Item -Recurse -Force "prisma" ".next/standalone/prisma"
# 双重保险：确保 dev.db 不会被打包
if (Test-Path ".next/standalone/prisma/dev.db") { Remove-Item -Force ".next/standalone/prisma/dev.db" }
if (Test-Path ".next/standalone/public") { Remove-Item -Recurse -Force ".next/standalone/public" }
Copy-Item -Recurse -Force "public" ".next/standalone/public"
Copy-Item -Force ".env" ".next/standalone/.env"
Copy-Item -Force "package.json" ".next/standalone/package.json"

# 4. 清理不需要的目录后打包
Write-Host "`n[4/6] 清理并打包部署文件..." -ForegroundColor Yellow
$excludeDirs = @(".git", ".github", "auth-server", "dist-desktop", "deploy-patch", "deploy-web", "desktop", "node_modules", "remotion", "storage")
foreach ($dir in $excludeDirs) {
    $fullPath = Join-Path ".next/standalone" $dir
    if (Test-Path $fullPath) {
        Remove-Item -Recurse -Force $fullPath
        Write-Host "  已排除: $dir" -ForegroundColor DarkGray
    }
}

$deployZip = "deploy-web.zip"
if (Test-Path $deployZip) { Remove-Item -Force $deployZip }
Compress-Archive -Path ".next/standalone/*" -DestinationPath $deployZip -Force
Write-Host "打包完成: $([math]::Round((Get-Item $deployZip).Length / 1MB, 2)) MB" -ForegroundColor Green

# 5. 上传
Write-Host "`n[5/6] 上传到服务器..." -ForegroundColor Yellow
scp $deployZip "${sshTarget}:/tmp/$deployZip"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

# 6. 服务器端部署
Write-Host "`n[6/6] 服务器端部署..." -ForegroundColor Yellow

# 上传远程部署脚本
$remoteScriptPath = "scripts/deploy-remote.sh"
scp $remoteScriptPath "${sshTarget}:/tmp/deploy-remote.sh"
if ($LASTEXITCODE -ne 0) { throw "上传远程脚本失败" }

# 执行远程部署脚本
ssh $sshTarget "sudo bash /tmp/deploy-remote.sh $DeployPath $AuthServerUrl $ServiceName" 2>&1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  部署完成" -ForegroundColor Green
Write-Host "  访问: http://$ServerIP:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
