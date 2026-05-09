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

# 4. 打包
Write-Host "`n[4/6] 打包部署文件..." -ForegroundColor Yellow
$deployZip = "deploy-web.zip"
if (Test-Path $deployZip) { Remove-Item -Force $deployZip }
Compress-Archive -Path ".next/standalone/*" -DestinationPath $deployZip -Force
Write-Host "打包完成: $((Get-Item $deployZip).Length / 1MB) MB" -ForegroundColor Green

# 5. 上传
Write-Host "`n[5/6] 上传到服务器..." -ForegroundColor Yellow
scp $deployZip "${sshTarget}:/tmp/$deployZip"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

# 6. 服务器端部署
Write-Host "`n[6/6] 服务器端部署..." -ForegroundColor Yellow

$remoteScript = @"
set -e
cd $DeployPath

# 备份当前版本（保留最近3个）
backup_dir="${DeployPath}.bak.$(date +%Y%m%d_%H%M%S)"
cp -r $DeployPath "\$backup_dir" 2>/dev/null || true
ls -dt ${DeployPath}.bak.* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

# 保护 .env 和数据库：解压前备份
if [ -f $DeployPath/.env ]; then
    cp $DeployPath/.env /tmp/.env.bak
fi
if [ -f $DeployPath/prisma/dev.db ]; then
    cp $DeployPath/prisma/dev.db /tmp/dev.db.bak
    echo "已备份数据库: /tmp/dev.db.bak ($(stat -c%s $DeployPath/prisma/dev.db) bytes)"
fi

# 解压新代码
rm -rf $DeployPath/node_modules/.package-lock.json 2>/dev/null || true
cd /tmp
unzip -o -q $deployZip -d $DeployPath

# 安装 Linux 平台 sharp（Windows 构建的二进制不兼容）
cd $DeployPath
rm -rf node_modules/sharp
npm install --os=linux --cpu=x64 sharp --silent

# 恢复服务器端 .env 中的关键配置（防止被本地 .env 覆盖）
if [ -f /tmp/.env.bak ]; then
    for key in AUTH_SERVER_URL APP_SECRET DATABASE_URL STORAGE_ROOT ADMIN_SECRET; do
        if grep -q "^`$key=" /tmp/.env.bak 2>/dev/null && ! grep -q "^`$key=" .env 2>/dev/null; then
            grep "^`$key=" /tmp/.env.bak >> .env
            echo "已恢复 .env 配置: `$key"
        fi
    done
    rm -f /tmp/.env.bak
fi

# 恢复数据库（防止部署包中的空 dev.db 覆盖服务器数据）
if [ -f /tmp/dev.db.bak ]; then
    if [ -f prisma/dev.db ]; then
        # 如果新部署包带了 dev.db，比较大小，服务器端更大则恢复
        local_size=$(stat -c%s prisma/dev.db 2>/dev/null || echo 0)
        backup_size=$(stat -c%s /tmp/dev.db.bak 2>/dev/null || echo 0)
        if [ "$backup_size" -gt "$local_size" ]; then
            cp /tmp/dev.db.bak prisma/dev.db
            echo "已恢复数据库备份 ($backup_size bytes)"
        else
            echo "保留当前数据库 ($local_size bytes)"
        fi
    else
        cp /tmp/dev.db.bak prisma/dev.db
        echo "已恢复数据库备份"
    fi
    rm -f /tmp/dev.db.bak
fi

# 确保 AUTH_SERVER_URL 配置（首次部署时）
if ! grep -q "^AUTH_SERVER_URL=" .env 2>/dev/null; then
    echo "AUTH_SERVER_URL=$AuthServerUrl" >> .env
    echo "已添加 AUTH_SERVER_URL=$AuthServerUrl"
fi

# Prisma
npx prisma generate --silent
npx prisma migrate deploy || echo "迁移可能已是最新"

# 修复文件权限
chmod -R 755 $DeployPath

# 重启服务
systemctl restart $ServiceName
sleep 2
systemctl is-active $ServiceName && echo "服务重启成功" || echo "服务状态异常"

# 验证
sleep 2
curl -s -o /dev/null -w "首页: %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "静态CSS: %{http_code}\n" http://localhost:3000/_next/static/css/7fea7ac81266abd3.css || true
"@

ssh $sshTarget "sudo bash -c '$remoteScript'" 2>&1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "  访问: http://$ServerIP:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
