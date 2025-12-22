## 项目目标

* 搭建一个基于 Flask 的轻量 Web 应用，运行在 `0.0.0.0:5050`

* 实现硬编码登录认证（admin/passwd）与 Session 管理

* 提供设备发现、灯光控制、场景管理、能源看板的后端接口（Mock 数据）

* 使用 JSON 文件作为临时数据存储

* 前端实现登录页、基础骨架与仪表盘三个页面，AJAX 调用后端

## 技术选型

* 后端：`Python + Flask`

* 模板：`Jinja2`

* 前端：原生 `HTML/CSS/JS` + `Fetch API`；图表使用 `ECharts`（CDN 加载）

* 存储：`JSON` 文件（不使用数据库）

* 依赖：初期仅 `Flask`，后续需要串口时再引入 `pyserial`

## 目录结构

* `Project_DALI/`

  * `app.py`

  * `config.py`

  * `data/`

    * `devices.json`

    * `scenes.json`

    * `energy_log.json`

  * `static/`

    * `css/style.css`

    * `js/auth.js`

    * `js/lights.js`

    * `js/scenes.js`

    * `js/energy.js`

    * `img/`（占位）

  * `templates/`

    * `login.html`

    * `base.html`

    * `dashboard.html`

## 基础配置与启动

* `config.py`

  * `HOST = '0.0.0.0'`

  * `PORT = 5050`

  * `ADMIN_USER = 'admin'`

  * `ADMIN_PASS = 'passwd'`

  * `SECRET_KEY`（默认常量，可支持从环境变量读取）

  * `DATA_DIR = './data'`

* 启动方式

  * `python app.py`（内部使用 `app.run(host=HOST, port=PORT)`）

## 数据文件与初始内容

* `devices.json`（数组）

```
[
  {"id": 1, "address": 0, "name": "模拟射灯A", "level": 0},
  {"id": 2, "address": 1, "name": "模拟灯带B", "level": 254},
  {"id": 3, "address": 2, "name": "模拟筒灯C", "level": 128}
]
```

* `scenes.json`（数组）

```
[
  {
    "id": 1,
    "name": "全亮",
    "description": "所有灯具亮度置 254",
    "actions": [{"type": "set_all", "level": 254}]
  },
  {
    "id": 2,
    "name": "节能",
    "description": "将所有灯具亮度置 80",
    "actions": [{"type": "set_all", "level": 80}]
  }
]
```

* `energy_log.json`（数组）

```
[
  {"timestamp": "2025-12-11T09:00:00Z", "power_watt": 110.2, "daily_kwh": 3.1},
  {"timestamp": "2025-12-11T10:00:00Z", "power_watt": 120.5, "daily_kwh": 3.2}
]
```

## 会话与认证

* 使用 Flask `session` 保存登录状态（键：`logged_in = True`）

* 受保护路由与 API 检查登录状态

* 开放路由：`/login`（GET/POST）、静态资源

* 登出通过清理 `session`

* Cookie 设置：`SESSION_COOKIE_HTTPONLY=True`、`SESSION_COOKIE_SAMESITE='Lax'`

## 路由与接口

* 页面路由

  * `GET /`：未登录重定向 `/login`；已登录渲染 `dashboard.html`

  * `GET /login`：渲染登录页

  * `POST /login`：表单 `username/password`，比对 `ADMIN_USER/ADMIN_PASS`，成功设置 `session` 并重定向 `/`，失败返回错误提示

  * `GET /logout`：清理 `session` 并重定向 `/login`

* 系统与设备发现

  * `GET /api/system/scan_ports`：返回 `["/dev/ttyAMA0", "/dev/ttyAMA1"]`

  * `POST /api/system/connect_port`：输入 `{"port":"/dev/ttyAMA0"}`，返回 `{"status":"success","msg":"已连接到 RS485 接口"}`

  * `POST /api/dali/scan_devices`：返回 3-5 个假设备列表，并写入 `devices.json`

* 灯光控制

  * `GET /api/lights`：读取 `devices.json` 返回设备列表

  * `POST /api/lights/control`：输入 `{"address":0, "command":"set_level", "value":50}`，更新对应设备 `level` 并返回 `{"status":"ok","new_level":50}`

* 场景管理

  * `GET /api/scenes`：读取 `scenes.json` 返回列表

  * `POST /api/scenes/apply`：输入 `{"scene_id":1}`，根据 `actions` 更新所有设备到指定亮度，返回 `{"status":"ok"}`

* 能源看板

  * `GET /api/energy/realtime`：返回 `{"current_power_watt":120.5,"daily_kwh":3.2}`（可基于 `energy_log.json` 最近记录或固定 Mock）

## 模板与前端交互

* `templates/login.html`

  * 简洁登录表单，POST 到 `/login`

  * 错误提示展示（后端模板变量传入）

* `templates/base.html`

  * 顶部导航与侧边栏（灯光、场景、能源）

  * 引入 `style.css`、ECharts CDN、各模块 JS

  * 内容区使用 `block content`

* `templates/dashboard.html`

  * 三个区域：灯光网格、场景按钮区、能源图表区

  * 页面加载后依次调用 `/api/lights`、`/api/scenes` 并渲染

  * 能源模块每 2 秒轮询 `/api/energy/realtime` 更新 ECharts

* `static/js`

  * `auth.js`：处理登出、登录态检查（必要时）

  * `lights.js`：加载设备列表、为每个设备渲染亮度滑条与开关，调用 `/api/lights/control`

  * `scenes.js`：加载并渲染场景按钮，调用 `/api/scenes/apply`

  * `energy.js`：初始化 ECharts，定时轮询实时数据并更新图表

* `static/css/style.css`

  * 布局网格、按钮样式、表单与导航样式

## 错误处理与返回格式

* 所有 API 统一返回 JSON：`{"status":"ok"|"error", ...}`

* 参数校验失败返回 `400` 与错误消息

* 未登录访问受保护接口返回 `401` 或重定向到 `/login`

## 运行与验证

* 安装：`pip install Flask`

* 启动：`python app.py`，监听 `0.0.0.0:5050`

* 验证流程：

  * 打开 `/login`，使用 `admin/passwd` 登录

  * 自动跳转 `/` 渲染仪表盘

  * 设备扫描、灯光控制、场景应用、能源实时数据全部能通过前端按钮与滑条触发并收到 Mock 响应

## 后续扩展建议

* 串口集成：引入 `pyserial`，按平台区分串口命名

* DALI 指令：在控制端点加入真实命令发送与反馈

* 能源计算：把设备亮度映射到功率、计算日耗电并写入 `energy_log.json`

* 权限与审计：更换硬编码为持久用户管理、操作日志记录

## 验收标准

* 登录成功与失败逻辑正确，Session 生效

* 未登录用户访问 `/` 被重定向 `/login`

* 仪表盘能加载设备与场景，并对灯光控制与场景应用返回 `ok`

* 能源看板能定时刷新并显示数据

* 所有接口遵循约定的输入输出 JSON 结构

