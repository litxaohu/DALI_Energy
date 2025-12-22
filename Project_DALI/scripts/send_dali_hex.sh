#!/bin/bash
# 使用方法: ./send_dali_hex.sh <串口设备> <十六进制字符串>
# 示例: ./send_dali_hex.sh /dev/ttyAMA3 28010112fefe38

if [ "$#" -ne 2 ]; then
  echo "使用方法: $0 <串口设备> <十六进制字符串>"
  echo "示例: $0 /dev/ttyAMA3 28010112fefe38"
  exit 1
fi

SERIAL_PORT=$1
HEX_DATA=$2

# 可选：放宽串口权限（若系统允许，无密码 sudo 环境）
sudo chmod 666 "$SERIAL_PORT" 2>/dev/null || true

# 将连续的十六进制字符串拆分为 \xHH 格式并写入串口
printf "$(echo -n "$HEX_DATA" | sed 's/../\\x&/g')" > "$SERIAL_PORT"

echo "已发送十六进制数据: $HEX_DATA 到串口: $SERIAL_PORT"
