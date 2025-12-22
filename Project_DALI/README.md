# DALI 灯光与能源管理应用

基于 Python + Flask 的轻量级 Web 应用，用于演示 DALI 灯光控制与能源看板。项目使用本地 JSON 文件作为临时数据存储，提供登录认证、设备发现、灯光控制、场景应用与能源实时数据等基础功能。默认监听 `0.0.0.0:5050`。

## 功能特性
- 极简登录认证：硬编码 `admin / passwd`，基于 Session 管理
- 设备发现（Mock）：RS485 端口扫描与 DALI 设备寻址
- 灯光控制：设置设备亮度（0–254）并更新前端 UI
- 场景管理：全亮/节能等示例场景，一键应用到所有设备
- 能源看板：ECharts 图表每 2 秒轮询展示实时功率与当日耗电
- 数据存储：`devices.json`、`scenes.json`、`energy_log.json`

## 技术栈
- 后端：Python 3 + Flask
- 模板：Jinja2
- 前端：原生 HTML/CSS/JS + Fetch API，ECharts（CDN）
- 存储：JSON 文件（不使用数据库）

## 目录结构
```
Project_DALI/
├── app.py                 # Flask 入口与路由、API
├── config.py              # 全局配置（HOST/PORT/ADMIN/SECRET_KEY/DATA_DIR）
├── requirements.txt       # 依赖清单（Flask）
├── data/                  # 临时数据（JSON 文件）
│   ├── devices.json       # 灯具列表（id/address/name/level）
│   ├── scenes.json        # 场景列表（actions）
│   └── energy_log.json    # 能源历史记录
├── static/                # 静态资源
│   ├── css/style.css      # 基础样式
│   ├── js/auth.js         # 登录态/导航（占位）
│   ├── js/lights.js       # 灯光控制前端交互
│   ├── js/scenes.js       # 场景按钮交互
│   └── js/energy.js       # 能源图表轮询
└── templates/             # 页面模板
    ├── login.html         # 登录页
    ├── base.html          # 页面骨架（导航/资源加载）
    └── dashboard.html     # 仪表盘（灯光/场景/能源）
```

### 关键配置
- 配置文件：`config.py`
  - `HOST = '0.0.0.0'`
  - `PORT = 5050`
  - `ADMIN_USER = 'admin'`
  - `ADMIN_PASS = 'passwd'`
  - `SECRET_KEY = 'dali-energy-secret-key'`
  - `DATA_DIR = 'data'`

## API 约定
- 认证与导航
  - `GET /` 未登录重定向 `/login`；已登录渲染仪表盘
  - `GET /login` 渲染登录页
  - `POST /login` 表单字段 `username`/`password`；成功写入 Session 并跳转 `/`
  - `GET /logout` 清理 Session 并重定向 `/login`
- 系统与设备发现
  - `GET /api/system/scan_ports` → `["/dev/ttyAMA0", "/dev/ttyAMA1"]`
  - `POST /api/system/connect_port` 输入 `{"port":"/dev/ttyAMA0"}` → `{"status":"success","msg":"已连接到 RS485 接口"}`
  - `POST /api/dali/scan_devices` → 返回 3–5 个假设备并写入 `devices.json`
- 灯光控制
  - `GET /api/lights` → 设备列表（来自 `devices.json`）
  - `POST /api/lights/control` 输入 `{"address":0,"command":"set_level","value":50}` → `{"status":"ok","new_level":50}`
- 场景管理
  - `GET /api/scenes` → 场景列表（来自 `scenes.json`）
  - `POST /api/scenes/apply` 输入 `{"scene_id":1}` → `{"status":"ok"}` 并更新所有设备亮度
- 能源看板
  - `GET /api/energy/realtime` → `{ "current_power_watt": 120.5, "daily_kwh": 3.2 }`（或取 `energy_log.json` 最近记录）

## 部署与运行

### 1. 环境准备
- 安装 Python 3.9+（建议 64 位）
  - Windows：从 python.org 下载并安装，勾选 “Add Python to PATH”
  - macOS：使用 Homebrew `brew install python`
  - Linux：使用发行版包管理器安装，如 `sudo apt-get install python3 python3-venv`

### 2. 获取代码
将 `Project_DALI/` 放置到本地任意目录，进入该目录的上级路径。

### 3. 安装依赖
- 使用虚拟环境（推荐）：
  - Windows PowerShell
    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install -r Project_DALI\requirements.txt
    ```
  - macOS/Linux
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r Project_DALI/requirements.txt
    ```
- 直接安装（不建议，可能污染系统环境）：
  ```bash
  pip install Flask
  ```

### 4. 启动服务
在激活的虚拟环境中执行：
```bash
python Project_DALI/app.py
```
服务默认监听 `0.0.0.0:5050`。若需修改，请编辑 `Project_DALI/config.py` 的 `HOST/PORT`。

### 5. 访问应用
- 浏览器打开 `http://localhost:5050/`
- 使用账号 `admin`，密码 `passwd` 登录
- 仪表盘中可进行设备扫描、调光、应用场景与查看能源曲线

## 常见问题
- 命令 `python` 不可用（Windows）
  - 解决：确认安装 Python 并将其加入 PATH，或使用 `py -3` 启动
- 端口被占用
  - 解决：修改 `config.py` 的 `PORT`，或释放占用端口
- 静态资源未加载
  - 解决：确认访问路径为 `http://localhost:5050/`，且浏览器未被代理拦截

## 后续扩展
- 串口集成：引入 `pyserial` 读取真实 RS485 端口与 DALI 报文
- 能源计算：根据亮度估算功率并累计日耗电，记录到 `energy_log.json`
- 用户管理：替换硬编码，支持多用户与角色权限
- 日志与审计：记录操作日志、错误日志与接口访问统计

---
若你希望我直接在本机安装依赖并启动服务，我可以继续完成环境准备与运行验证，然后提供可点击的预览地址。
