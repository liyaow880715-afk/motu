#!/usr/bin/env bash
#
# Banana Mall — 一键部署脚本
# 用法:
#   ./deploy.sh [选项]
#
# 示例:
#   ./deploy.sh                          # 默认部署到 /opt/banana-mall，端口 3000
#   ./deploy.sh -d /var/www/bm -p 8080   # 自定义目录和端口
#   ./deploy.sh --pm2                    # 使用 PM2 启动
#   ./deploy.sh -z ./banana-mall-standalone.zip  # 指定 zip 包路径
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# 默认配置
# ─────────────────────────────────────────────────────────────
DEPLOY_DIR="/opt/banana-mall"
PORT="3000"
ZIP_FILE=""
USE_PM2=false
NODE_MIN_VERSION="18"

# ─────────────────────────────────────────────────────────────
# 颜色输出
# ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC}  $*" >&2; }

# ─────────────────────────────────────────────────────────────
# 参数解析
# ─────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Banana Mall 部署脚本

用法: $0 [选项]

选项:
  -d, --dir DIR       部署目录 (默认: /opt/banana-mall)
  -p, --port PORT     服务端口 (默认: 3000)
  -z, --zip PATH      standalone zip 包路径
      --pm2           使用 PM2 启动守护进程
  -h, --help          显示此帮助

示例:
  $0                           # 默认部署
  $0 -d /var/www/bm -p 8080    # 自定义目录+端口
  $0 --pm2                     # PM2 守护模式
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dir)   DEPLOY_DIR="$2"; shift 2 ;;
    -p|--port)  PORT="$2"; shift 2 ;;
    -z|--zip)   ZIP_FILE="$2"; shift 2 ;;
    --pm2)      USE_PM2=true; shift ;;
    -h|--help)  usage; exit 0 ;;
    *)          err "未知参数: $1"; usage; exit 1 ;;
  esac
done

# ─────────────────────────────────────────────────────────────
# 1. 环境检查
# ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🍌 Banana Mall 一键部署"
echo "═══════════════════════════════════════════════════════════"
echo ""

info "检查环境..."

# Node.js
if ! command -v node &>/dev/null; then
  err "Node.js 未安装，请先安装 Node.js ${NODE_MIN_VERSION}+"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//;s/\..*//')
if [[ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]]; then
  err "Node.js 版本过低: $(node -v)，需要 ${NODE_MIN_VERSION}+"
  exit 1
fi
ok "Node.js $(node -v)"

# npm
if ! command -v npm &>/dev/null; then
  err "npm 未安装"
  exit 1
fi
ok "npm $(npm -v)"

# unzip（如果需要解压）
if [[ -n "$ZIP_FILE" ]] && ! command -v unzip &>/dev/null; then
  err "unzip 未安装，请执行: apt-get install -y unzip"
  exit 1
fi

# PM2（如果指定）
if $USE_PM2 && ! command -v pm2 &>/dev/null; then
  warn "PM2 未安装，尝试全局安装..."
  npm install -g pm2
fi

# ─────────────────────────────────────────────────────────────
# 2. 解压/准备代码
# ─────────────────────────────────────────────────────────────
echo ""
info "准备部署目录: ${DEPLOY_DIR}"

if [[ -n "$ZIP_FILE" ]]; then
  if [[ ! -f "$ZIP_FILE" ]]; then
    err "ZIP 包不存在: $ZIP_FILE"
    exit 1
  fi
  info "解压 ${ZIP_FILE}..."
  rm -rf "$DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"
  unzip -q "$ZIP_FILE" -d "$DEPLOY_DIR"
  ok "解压完成"
else
  # 假设当前目录就是 standalone 目录或包含 standalone 内容
  if [[ ! -f "server.js" ]]; then
    err "当前目录缺少 server.js，请确认已在 standalone 目录内，或使用 -z 指定 zip 包"
    exit 1
  fi
  info "复制当前目录到 ${DEPLOY_DIR}..."
  rm -rf "$DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"
  cp -r . "$DEPLOY_DIR/"
  ok "复制完成"
fi

cd "$DEPLOY_DIR"

# ─────────────────────────────────────────────────────────────
# 3. 安装依赖
# ─────────────────────────────────────────────────────────────
echo ""
info "安装生产依赖..."
npm install --production --silent
ok "依赖安装完成"

# ─────────────────────────────────────────────────────────────
# 4. Prisma 生成 Linux Query Engine
# ─────────────────────────────────────────────────────────────
echo ""
info "生成 Prisma Client (Linux 平台)..."

# standalone 包在 Windows 上构建，query engine 是 Windows 版本，
# 必须在 Linux 服务器上重新生成
npx prisma generate
ok "Prisma Client 生成完成"

# ─────────────────────────────────────────────────────────────
# 5. 数据库迁移
# ─────────────────────────────────────────────────────────────
echo ""
info "执行数据库迁移..."
node scripts/apply-prisma-migrations.cjs
ok "数据库就绪"

# ─────────────────────────────────────────────────────────────
# 6. 创建必要的目录
# ─────────────────────────────────────────────────────────────
echo ""
info "创建数据目录..."

# 从 .env 读取 STORAGE_ROOT，默认 ./storage
STORAGE_ROOT="./storage"
if [[ -f ".env" ]]; then
  ENV_STORAGE=$(grep "^STORAGE_ROOT=" .env | cut -d'"' -f2 || true)
  [[ -n "$ENV_STORAGE" ]] && STORAGE_ROOT="$ENV_STORAGE"
fi

mkdir -p "$STORAGE_ROOT"
chmod 755 "$STORAGE_ROOT"
ok "Storage 目录: ${STORAGE_ROOT}"

# 确保数据库目录可写
DB_DIR="prisma"
mkdir -p "$DB_DIR"
chmod 755 "$DB_DIR"
ok "数据库目录: ${DB_DIR}"

# ─────────────────────────────────────────────────────────────
# 7. 端口检查 & .env 配置
# ─────────────────────────────────────────────────────────────
echo ""
info "检查端口 ${PORT}..."
if command -v lsof &>/dev/null && lsof -i :"$PORT" &>/dev/null; then
  warn "端口 ${PORT} 已被占用，正在尝试释放..."
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi
ok "端口 ${PORT} 可用"

# 更新 .env 中的端口
if [[ -f ".env" ]]; then
  if grep -q "^PORT=" .env; then
    sed -i "s/^PORT=.*/PORT=${PORT}/" .env
  else
    echo "PORT=${PORT}" >> .env
  fi
  ok ".env 端口已更新为 ${PORT}"
fi

# ─────────────────────────────────────────────────────────────
# 8. 启动服务
# ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🚀 启动服务"
echo "═══════════════════════════════════════════════════════════"
echo ""

export PORT="$PORT"

if $USE_PM2; then
  info "使用 PM2 启动..."
  pm2 delete banana-mall 2>/dev/null || true
  pm2 start server.js --name "banana-mall" --env PORT="$PORT"
  pm2 save
  ok "PM2 进程已启动"
  echo ""
  info "常用命令:"
  echo "  pm2 status              # 查看状态"
  echo "  pm2 logs banana-mall    # 查看日志"
  echo "  pm2 restart banana-mall # 重启"
  echo "  pm2 stop banana-mall    # 停止"
else
  info "使用 nohup 启动..."
  nohup node server.js > app.log 2>&1 &
  PID=$!
  sleep 2
  if kill -0 "$PID" 2>/dev/null; then
    ok "服务已启动 (PID: $PID)"
    echo "  日志: ${DEPLOY_DIR}/app.log"
    echo "  停止: kill $PID"
  else
    err "启动失败，请检查 app.log"
    exit 1
  fi
fi

# ─────────────────────────────────────────────────────────────
# 9. 健康检查
# ─────────────────────────────────────────────────────────────
echo ""
info "等待服务就绪..."
sleep 3

HEALTH_URL="http://localhost:${PORT}"
if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "307" ]]; then
    ok "健康检查通过 (HTTP ${HTTP_CODE})"
  else
    warn "健康检查异常 (HTTP ${HTTP_CODE})，服务可能还在启动中"
  fi
else
  warn "curl 未安装，跳过健康检查"
fi

# ─────────────────────────────────────────────────────────────
# 10. 完成
# ─────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ 部署完成"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  📁 部署目录: ${DEPLOY_DIR}"
echo "  🌐 访问地址: http://服务器IP:${PORT}"
echo "  🗄️  数据库:  ${DEPLOY_DIR}/prisma/dev.db"
echo "  📂 存储目录: ${DEPLOY_DIR}/${STORAGE_ROOT}"
echo ""

if ! $USE_PM2; then
  echo "  ⚠️  当前使用 nohup 运行，建议生产环境使用 PM2:"
  echo "     pm2 start ${DEPLOY_DIR}/server.js --name banana-mall"
  echo ""
fi

warn "如果配置了域名，建议配置 Nginx 反向代理（见 nginx.conf 示例）"
echo ""
