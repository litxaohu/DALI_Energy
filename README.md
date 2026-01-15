<div align="right">

<a href="./docs/README.en.md"><img src="https://img.shields.io/badge/English-Doc-blue" alt="English Doc"></a>
<a href="./docs/README.zh.md"><img src="https://img.shields.io/badge/中文-文档-green" alt="中文文档"></a>

</div>

# DALI Lighting & Energy Application

A gateway-based web application for DALI lighting and energy management. It integrates serial lighting control, scene management, energy dashboard, MQTT data I/O, and test data injection. Suitable for local gateways and LAN deployment, with support for secondary development.

- Language Switch: English | 中文
  - English: [English Doc](./docs/README.en.md)
  - 中文: [中文文档](./docs/README.zh.md)

## Quick Start

- Environment
  - Python 3.9+ (Recommended 3.11)
  - Dependencies: `Flask`, `pyserial`, `paho-mqtt` (optional)
- Install
  - `pip install -r Project_DALI/requirements.txt`
- Run
  - `python Project_DALI/app.py`
  - Visit `http://localhost:5050/`
  - Default login: `admin / passwd` (Configurable in `Project_DALI/config.py`)

## Web Overview

![image](./docs/images/light-control.png)

- **Lighting Control**
  - Select & confirm serial port: `/dev/ttyAMA2`, `/dev/ttyAMA3`, `/dev/ttyAMA4`
  - Add Device: Name, Gateway Hex (e.g., `01`), Device No Hex (e.g., `06`)
  - Adjust brightness and "Send" via backend serial
  - Export/Import device configuration (`data/devices.json`)

![image](./docs/images/scenes-control.png)

- **Scene Control**
  - Serial confirmation
  - Turn All On: `28010112fefe38`
  - Turn All Off: `28010112fe003a`

![image](./docs/images/energy-dashboard.png)

- **Energy Dashboard**
  - Real-time power flow & consumption (Grid/Battery/Building)
  - Scene Modes: Eco, Warm, Breathing, High, Off (affects mock data & lighting)
  - History: Price/Cost charts with unit switching & refresh
  - Test Mode: Inject JSON data for testing

![image](./docs/images/interfaces.png)

- **Data Interfaces (MQTT)**
  - Inputs: Multiple services, topic mapping (Dashboard Field ← JSON Path)
  - Outputs: Multiple services, "Publish Now" feature

## Hex Command Protocol (Serial)

- Format: `28 + 01 + GW + 12 + DEV_ADDR + CMD + CHECKSUM`
- Address Rule: Device No (Hex Input) × 2 → Hex. E.g., `06` → `0C`
- Checksum: Sum of first 6 bytes (low byte)
- Example: Device `63` (dec) → `7E` (after ×2)
  - Command: `280101127E00BA`

## Directory Structure

```
DALI_Energy/
├── Project_DALI/
│   ├── app.py                # Flask Entry & Routes
│   ├── config.py             # Config (HOST/PORT/SECRET/Auth)
│   ├── templates/            # HTML Templates (Base/EN/ZH)
│   ├── static/
│   │   ├── js/               # Frontend Logic
│   │   └── css/              # Styles
│   ├── data/                 # JSON Data Storage
│   └── scripts/              # Helper Scripts (send_dali_hex.sh)
└── docs/
    ├── README.en.md          # Detailed English Doc
    └── README.zh.md          # Detailed Chinese Doc
```

## Secondary Development

- **Frontend**
  - Logic in `static/js/*.js`
  - Dashboard data structure: `{ summary, times, power_series, use_series }`
- **Backend**
  - Add routes in `app.py`
  - Data management via `data/*.json` helpers
  - Serial sending prefers `pyserial`, falls back to file write or bash script
- **Security & Logs**
  - Replace default credentials in production
  - Manage serial permissions via udev or groups

## Contribution & License

- Issues & PRs welcome
- License: MIT/Apache-2.0 (As configured)

---

View Detailed Documentation:

- English Doc → [docs/README.en.md](./docs/README.en.md)
- Chinese Doc → [docs/README.zh.md](./docs/README.zh.md)

