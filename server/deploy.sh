#!/bin/sh
# 校园委托 · 云服务器一键部署
# 适用：Ubuntu 20.04 / 22.04 / 24.04（Debian 亦可），root 或 sudo 用户都能跑
# 用 systemd 托管，不依赖 pm2（避免 npm 全局目录不在 PATH 的坑）
# 用法：把整个 server 目录传上去，cd 进去，执行 sh deploy.sh
set -e

APP_DIR=/opt/campus-commission
PORT=${PORT:-3000}
SERVICE=campus
NODE_VER=v22.11.0
ME=$(whoami)
MY_UID=$(id -u)
MY_GID=$(id -g)

if [ "$MY_UID" = "0" ]; then
  SUDO=""
  RUN_USER=root
else
  SUDO="sudo"
  RUN_USER="$ME"
fi

echo "== 1/7 检查 Node.js =="
if command -v node >/dev/null 2>&1; then
  echo "已安装：$(node -v)  ($(command -v node))"
else
  echo "未安装，开始安装 Node $NODE_VER（国内镜像，不走 apt）"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) NARCH=x64 ;;
    aarch64|arm64) NARCH=arm64 ;;
    *) NARCH=x64 ;;
  esac
  PKG="node-$NODE_VER-linux-$NARCH"
  TMP="/tmp/$PKG.tar.xz"
  if ! curl -fsSL --max-time 300 "https://npmmirror.com/mirrors/node/$NODE_VER/$PKG.tar.xz" -o "$TMP"; then
    echo "国内镜像失败，改用官方源"
    curl -fsSL --max-time 300 "https://nodejs.org/dist/$NODE_VER/$PKG.tar.xz" -o "$TMP"
  fi
  $SUDO mkdir -p /usr/local/lib/nodejs
  $SUDO tar -xJf "$TMP" -C /usr/local/lib/nodejs
  $SUDO ln -sf "/usr/local/lib/nodejs/$PKG/bin/node" /usr/local/bin/node
  $SUDO ln -sf "/usr/local/lib/nodejs/$PKG/bin/npm" /usr/local/bin/npm
  $SUDO ln -sf "/usr/local/lib/nodejs/$PKG/bin/npx" /usr/local/bin/npx
  rm -f "$TMP"
  echo "装好了：$(node -v)"
fi
NODE_BIN=$(command -v node)

echo "== 2/7 复制文件到 $APP_DIR =="
$SUDO mkdir -p "$APP_DIR"
$SUDO cp -f ./server.js ./package.json "$APP_DIR"/
# 管理脚本也带上，方便在 /opt 目录里直接跑
if [ -f ./make-admin.js ]; then
  $SUDO cp -f ./make-admin.js "$APP_DIR"/
fi
# 管理脚本也带上，方便在 /opt 目录里直接跑
if [ -f ./make-admin.js ]; then
  $SUDO cp -f ./make-admin.js "$APP_DIR"/
fi
if [ -d ./public ]; then
  $SUDO mkdir -p "$APP_DIR/public"
  $SUDO cp -rf ./public/. "$APP_DIR/public/"
fi
# 只在服务器上还没有数据时才导入；已有数据一律不覆盖（防止误清空）
if [ -f ./data.json ] && [ ! -f "$APP_DIR/data.json" ]; then
  $SUDO cp -f ./data.json "$APP_DIR/data.json"
  echo "已导入本机 data.json（服务器原本没有数据）"
fi
# 目录归运行用户所有，否则写不了 data.json
$SUDO chown -R "$MY_UID:$MY_GID" "$APP_DIR"

echo "== 3/7 写入 systemd 服务 =="
$SUDO tee /etc/systemd/system/$SERVICE.service >/dev/null <<EOF
[Unit]
Description=Campus Commission
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN server.js
Environment=PORT=$PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "== 4/7 启动并设为开机自启 =="
$SUDO systemctl daemon-reload
$SUDO systemctl enable $SERVICE >/dev/null 2>&1 || true
$SUDO systemctl restart $SERVICE

echo "== 5/7 本机自检 =="
sleep 2
if curl -s --max-time 5 "http://127.0.0.1:$PORT/api/ping" | grep -q ok; then
  echo "接口正常"
else
  echo "接口没响应，看日志：sudo journalctl -u $SERVICE -n 40 --no-pager"
fi

echo "== 6/7 每日自动备份 =="
$SUDO mkdir -p "$APP_DIR/backups"
cat > /tmp/cc-backup.sh <<'EOS'
#!/bin/sh
D=/opt/campus-commission
mkdir -p "$D/backups"
if [ -f "$D/data.json" ]; then
  cp -f "$D/data.json" "$D/backups/$(date +%Y%m%d-%H%M).json"
fi
ls -1t "$D"/backups/*.json 2>/dev/null | tail -n +31 | while read f; do rm -f "$f"; done
EOS
$SUDO cp -f /tmp/cc-backup.sh "$APP_DIR/backup.sh"
$SUDO chmod +x "$APP_DIR/backup.sh"
rm -f /tmp/cc-backup.sh
$SUDO tee /etc/cron.d/campus-backup >/dev/null <<EOF
# 校园委托 每日 03:00 备份 data.json
0 3 * * * $RUN_USER $APP_DIR/backup.sh
EOF
$SUDO chmod 644 /etc/cron.d/campus-backup
echo "已配置：每天 03:00 自动备份，保留最近 30 份"

echo "== 7/7 完成 =="
IP=$(curl -s --max-time 8 https://ifconfig.me 2>/dev/null || true)
if [ -z "$IP" ]; then
  IP=$(curl -s --max-time 8 https://ipinfo.io/ip 2>/dev/null || true)
fi
if [ -z "$IP" ]; then
  IP="你的公网IP"
fi
echo ""
echo "  访问地址： http://$IP:$PORT"
echo "  数据文件： $APP_DIR/data.json"
echo "  自动备份： $APP_DIR/backups/  （每天 03:00，留 30 份）"
echo "  常用命令： sudo systemctl status $SERVICE"
echo "            sudo systemctl restart $SERVICE"
echo "            sudo journalctl -u $SERVICE -n 50 --no-pager"
echo ""
echo "  打不开的话，去控制台「防火墙」放行 $PORT 端口"
