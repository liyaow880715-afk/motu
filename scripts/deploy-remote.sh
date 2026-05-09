#!/bin/bash
set -e
DeployPath="$1"
AuthServerUrl="$2"
ServiceName="$3"

cd "$DeployPath"

# 备份当前版本（保留最近3个）
backup_dir="${DeployPath}.bak.$(date +%Y%m%d_%H%M%S)"
cp -r "$DeployPath" "$backup_dir" 2>/dev/null || true
ls -dt "${DeployPath}".bak.* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

# 保护 .env 和数据库：解压前备份
if [ -f "$DeployPath/.env" ]; then
    cp "$DeployPath/.env" /tmp/.env.bak
fi
if [ -f "$DeployPath/prisma/dev.db" ]; then
    cp "$DeployPath/prisma/dev.db" /tmp/dev.db.bak
    echo "已备份数据库: /tmp/dev.db.bak ($(stat -c%s "$DeployPath/prisma/dev.db") bytes)"
fi

# 解压新代码
rm -rf "$DeployPath/node_modules/.package-lock.json" 2>/dev/null || true
cd /tmp
unzip -o -q deploy-web.zip -d "$DeployPath" || true

# 安装 Linux 平台 sharp（Windows 构建的二进制不兼容）
cd "$DeployPath"
rm -rf node_modules/sharp
npm install --os=linux --cpu=x64 sharp --silent

# 恢复服务器端 .env 中的关键配置（防止被本地 .env 覆盖）
if [ -f /tmp/.env.bak ]; then
    for key in AUTH_SERVER_URL APP_SECRET DATABASE_URL STORAGE_ROOT ADMIN_SECRET; do
        if grep -q "^$key=" /tmp/.env.bak 2>/dev/null && ! grep -q "^$key=" .env 2>/dev/null; then
            grep "^$key=" /tmp/.env.bak >> .env
            echo "已恢复 .env 配置: $key"
        fi
    done
    rm -f /tmp/.env.bak
fi

# 恢复数据库（防止部署包中的空 dev.db 覆盖服务器数据）
if [ -f /tmp/dev.db.bak ]; then
    if [ -f prisma/dev.db ]; then
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
npx prisma generate
npx prisma migrate deploy || echo "迁移可能已是最新"

# 修复文件权限
chmod -R 755 "$DeployPath"

# 重启服务
systemctl restart "$ServiceName"
sleep 2
systemctl is-active "$ServiceName" && echo "服务重启成功" || echo "服务状态异常"

# 验证
sleep 2
curl -s -o /dev/null -w "首页: %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "静态CSS: %{http_code}\n" http://localhost:3000/_next/static/css/7fea7ac81266abd3.css || true
