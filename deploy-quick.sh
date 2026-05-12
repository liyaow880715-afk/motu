#!/bin/bash
set -e
DeployPath="/root/banana-mall-standalone"
AuthServerUrl="http://localhost:4000"
ServiceName="banana-mall"

cd "$DeployPath"

# 只备份 .env 和数据库
cp "$DeployPath/.env" /root/.env.bak 2>/dev/null || true
if [ -f "$DeployPath/prisma/dev.db" ]; then
    cp "$DeployPath/prisma/dev.db" /root/dev.db.bak
    echo "已备份数据库"
fi

# 解压新代码
rm -rf "$DeployPath/node_modules/.package-lock.json" 2>/dev/null || true
cd /tmp
unzip -o -q deploy-web.zip -d "$DeployPath" || true

# 安装 Linux 平台 sharp
cd "$DeployPath"
rm -rf node_modules/sharp
npm install --os=linux --cpu=x64 sharp --silent

# 恢复 .env
if [ -f /root/.env.bak ]; then
    cp /root/.env.bak "$DeployPath/.env"
    rm -f /root/.env.bak
fi

# 恢复数据库
if [ -f /root/dev.db.bak ]; then
    if [ -f "$DeployPath/prisma/dev.db" ]; then
        local_size=$(stat -c%s "$DeployPath/prisma/dev.db" 2>/dev/null || echo 0)
        backup_size=$(stat -c%s /root/dev.db.bak 2>/dev/null || echo 0)
        if [ "$backup_size" -gt "$local_size" ]; then
            cp /root/dev.db.bak "$DeployPath/prisma/dev.db"
            echo "已恢复数据库备份 ($backup_size bytes)"
        else
            echo "保留当前数据库 ($local_size bytes)"
        fi
    else
        cp /root/dev.db.bak "$DeployPath/prisma/dev.db"
        echo "已恢复数据库备份"
    fi
    rm -f /root/dev.db.bak
fi

# 确保 AUTH_SERVER_URL
if ! grep -q "^AUTH_SERVER_URL=" "$DeployPath/.env" 2>/dev/null; then
    echo "AUTH_SERVER_URL=$AuthServerUrl" >> "$DeployPath/.env"
    echo "已添加 AUTH_SERVER_URL=$AuthServerUrl"
fi

# Prisma
npx prisma generate
npx prisma migrate deploy || echo "迁移可能已是最新"

# 修复权限
chmod -R 755 "$DeployPath"

# 重启服务
systemctl restart "$ServiceName"
sleep 2
systemctl is-active "$ServiceName" && echo "服务重启成功" || echo "服务状态异常"

# 验证
sleep 2
curl -s -o /dev/null -w "首页: %{http_code}\n" http://localhost:3000/
