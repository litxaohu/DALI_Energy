# DALI 灯光与能源管理应用（中文）


## 简介

本工程提供网关侧的 DALI 灯光控制与能源看板管理，集成：
- 串口灯光控制（十六进制协议）
- 场景控制（全开/全关）
- 能源看板（电网/电池/建筑）
- 电价/电费历史（单位切换，手动刷新）
- 数据接口：MQTT 输入映射/输出发布
- 测试数据导入（粘贴或上传 JSON 并一键应用）

## 快速开始

1. 安装依赖：`pip install -r Project_DALI/requirements.txt`
2. 启动服务：`python Project_DALI/app.py`
3. 浏览器访问：`http://localhost:5050/`
4. 登录账号与密码在 `Project_DALI/config.py` 中配置

## 灯光控制

- 串口设置与确认：`/dev/ttyAMA2`、`/dev/ttyAMA3`、`/dev/ttyAMA4`
- 添加灯具：名称、网关地址（十六进制，如 `01`）、设备号（十六进制，如 `06`）
- 控制亮度后点击“发送”，后端通过串口发送十六进制指令，并在终端打印调试信息
- 导出/导入设备配置（`data/devices.json`）

指令格式：`28 + 01 + 网关地址 + 12 + 设备地址 + 控制指令 + 校验和`
- 设备地址：设备号（十六进制输入）× 2 → 十六进制；如设备号 `06` → 地址 `0C`
- 校验和：前六字节累加取低字节

## 场景控制

- 串口选择与确认（同灯光控制）
- 全开：`28010112fefe38`
- 全关：`28010112fe003a`

## 能源看板

- 面板：电网、建筑、电池三者功率与用量
- 历史：电价/电费支持实时、天、周、月；单位切换（元/$/€）；点击“刷新”更新
- 颜色图例：右上角统一说明

## 数据接口（MQTT）

### 输入服务

- 支持多个服务；每个服务可订阅多个主题
- 为主题配置数据映射：将“看板字段”绑定到 JSON 路径
- 常用映射示例：
  - `realtime_price ← data.market.realtime_price`
  - `house_kwh ← data.totals.building_consumption_total`
  - `battery_time_left_h ← data.battery_status.battery_remaining_time`（自动分钟→小时）
- 启动订阅：消息到达后按映射填充能源看板 `summary`

### 输出服务

- 支持多个服务；配置地址、端口、用户名、密码、主题
- 一键“立即发布当前数据”：将能源看板标准 JSON 发布到所有输出服务主题

## 测试数据

- 勾选“启用测试模式”
- 粘贴或上传 JSON 并点击“应用测试数据”
- 支持两种结构：
  1. 看板结构：`{ summary, times, power_series, use_series }`（直接显示）
  2. 标准设备结构：`{ data.totals/power_flow/battery_status/market }`（服务端自动转换）
- 成功应用后弹窗提示“测试数据导入成功”

## 目录结构

```
Project_DALI/
  app.py          # 后端入口与路由
  config.py       # HOST/PORT/SECRET/账户等
  templates/      # 页面模板
  static/js/      # 前端逻辑
  static/css/     # 样式
  data/           # JSON 数据（devices/mqtt_inputs/mqtt_outputs）
  scripts/        # 发送脚本 send_dali_hex.sh
docs/
  README.zh.md    # 中文文档
  README.en.md    # 英文文档
  images/         # 截图（自备）
```

## API（选择）

- 串口与灯光
  - `POST /api/system/set_port` 设置活动串口
  - `POST /api/dali/send` 构建并发送十六进制指令
  - `POST /api/dali/send_hex` 直接发送原始十六进制字符串
  - `POST /api/lights/add` / `POST /api/lights/delete`
  - `GET /api/lights`
- 场景
  - `POST /api/dali/send_hex`（全开/全关）
- 能源看板
  - `GET /api/energy/dashboard`
  - `GET /api/energy/history?metric=price|cost&period=...`
- 数据接口
  - `GET/POST /api/mqtt_inputs`、`/save`、`/delete`、`/start`
  - `GET/POST /api/mqtt_outputs`、`/save`、`/publish_now`
  - `POST /api/interfaces/test/toggle`、`/test/set`

## 二次开发

- 前端：按模块在 `static/js/*.js` 更新交互；保证与 `summary` 字段一致
- 后端：新增路由在 `app.py`；数据文件统一在 `data/`；工具函数 `read_json/write_json`
- 串口：优先 `pyserial`；失败回退文件写入或 bash 脚本
- 安全与权限：生产环境使用安全账户与密钥；串口权限建议通过 udev/用户组管理

## 许可与贡献

欢迎提交 PR/Issue。许可请按仓库设置（MIT/Apache-2.0 等）。
