#!/bin/bash
# 服务器磁盘清理脚本
# 用法: sudo bash server-cleanup.sh
# 建议加入 crontab: 0 3 * * 1 /opt/banana-mall/scripts/server-cleanup.sh >> /var/log/cleanup.log 2>&1

set -e

DEPLOY_PATH="/opt/banana-mall"
LOG_FILE="/var/log/server-cleanup.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "  服务器清理 - $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 清理前磁盘情况
echo -e "\n[清理前]" | tee -a "$LOG_FILE"
df -h / | tee -a "$LOG_FILE"

FREED=0

# 1. 清理 /tmp 临时文件（超过 7 天的 deploy 包和生成文件）
echo -e "\n[1/5] 清理 /tmp 临时文件..." | tee -a "$LOG_FILE"
if [ -d /tmp ]; then
    find /tmp -maxdepth 1 -type f \( \
        -name "deploy-web.zip" -o \
        -name "deploy-web.tar.gz" -o \
        -name "banana-mall*.zip*" -o \
        -name "generated_*.zip" -o \
        -name "*.bak" \
    \) -mtime +1 -print -delete 2>/dev/null | tee -a "$LOG_FILE" || true
    find /tmp -maxdepth 1 -type d \( \
        -name "node-compile-cache" -o \
        -name "jiti" -o \
        -name "temp_clone" \
    \) -mtime +1 -print -exec rm -rf {} + 2>/dev/null | tee -a "$LOG_FILE" || true
fi

# 2. 清理部署旧备份（保留最近 3 个）
echo -e "\n[2/5] 清理旧部署备份..." | tee -a "$LOG_FILE"
if [ -d "$DEPLOY_PATH" ]; then
    find "$DEPLOY_PATH" -maxdepth 1 -type d -name "*.bak.*" 2>/dev/null | \
        sort -r | tail -n +4 | \
        while read -r dir; do
            echo "删除旧备份: $dir" | tee -a "$LOG_FILE"
            rm -rf "$dir"
        done || true
fi

# 3. 清理系统日志
echo -e "\n[3/5] 清理系统日志..." | tee -a "$LOG_FILE"
journalctl --vacuum-size=100M 2>/dev/null | tee -a "$LOG_FILE" || true
find /var/log -type f \( -name "*.gz" -o -name "*.old" -o -name "*.1" -o -name "*.2" \) -mtime +7 -delete 2>/dev/null || true

# 4. 清理 npm 缓存
echo -e "\n[4/5] 清理 npm 缓存..." | tee -a "$LOG_FILE"
npm cache clean --force 2>/dev/null | tee -a "$LOG_FILE" || true

# 5. 清理 Next.js standalone 旧构建缓存（如果存在）
echo -e "\n[5/5] 清理构建缓存..." | tee -a "$LOG_FILE"
find "$DEPLOY_PATH" -path "*/.next/cache" -type d -exec rm -rf {} + 2>/dev/null | tee -a "$LOG_FILE" || true

# 清理后磁盘情况
echo -e "\n[清理后]" | tee -a "$LOG_FILE"
df -h / | tee -a "$LOG_FILE"

echo -e "\n✅ 清理完成 - $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
