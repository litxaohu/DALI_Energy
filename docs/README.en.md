# DALI Lighting & Energy Management (English)

> GitHub-friendly docs. Please place screenshots under `docs/images/` and update links accordingly.

## Overview

Gateway-side web app that integrates:
- Serial-based DALI lighting control (hex protocol)
- Scene control (turn all on/off)
- Energy dashboard (Grid/Battery/Building)
- Price/Cost history with unit toggles and manual refresh
- Data interfaces: MQTT inputs (path mapping) & outputs (publishing)
- Test data injection (paste/upload JSON and apply)

## Quick Start

1. Install deps: `pip install -r Project_DALI/requirements.txt`
2. Run server: `python Project_DALI/app.py`
3. Visit: `http://localhost:5050/`
4. Configure login in `Project_DALI/config.py`

## Lighting Control

- Select & confirm serial: `/dev/ttyAMA2` `/dev/ttyAMA3` `/dev/ttyAMA4`
- Add device: name, gateway (hex, e.g., `01`), device number (hex, e.g., `06`)
- Adjust brightness and click “Send” → backend writes hex command to serial
- Export/Import devices (`data/devices.json`)

Hex format: `28 + 01 + GW + 12 + DEV_ADDR + CMD + CHECKSUM`
- Device address: device number (hex input) × 2 → hex, e.g., `06` → `0C`
- Checksum: sum of first 6 bytes (low byte)

## Scene Control

- Serial selection & confirmation (same as lighting)
- Turn All On: `28010112fefe38`
- Turn All Off: `28010112fe003a`

## Energy Dashboard

- Panels for Grid/Battery/Building
- History: Price/Cost for realtime/day/week/month; unit toggles (CNY/$/€); click “Refresh”
- Color legend on the top-right

## Data Interfaces (MQTT)

### Inputs

- Multiple services; each can subscribe to multiple topics
- For each topic, bind dashboard fields to JSON paths
- Examples:
  - `realtime_price ← data.market.realtime_price`
  - `house_kwh ← data.totals.building_consumption_total`
  - `battery_time_left_h ← data.battery_status.battery_remaining_time` (auto minutes→hours)
- Start subscriptions: incoming messages update dashboard `summary`

### Outputs

- Multiple output services with host/port/username/password/topic
- “Publish Now” to publish the current dashboard JSON to all output topics

## Test Data

- Enable “Test Mode”
- Paste or upload JSON and click “Apply”
- Two supported structures:
  1. Dashboard structure: `{ summary, times, power_series, use_series }` (rendered as-is)
  2. Standard device structure: `{ data.totals/power_flow/battery_status/market }` (auto-converted)
- A success alert is shown upon applying test data

## Project Structure

```
Project_DALI/
  app.py          # backend entry & routes
  config.py       # HOST/PORT/SECRET/login
  templates/      # HTML templates
  static/js/      # frontend logic
  static/css/     # styles
  data/           # JSON data (devices/mqtt_inputs/mqtt_outputs)
  scripts/        # send_dali_hex.sh
docs/
  README.zh.md    # Chinese doc
  README.en.md    # English doc
  images/         # screenshots (add your own)
```

## API Highlights

- Serial & Lighting
  - `POST /api/system/set_port`
  - `POST /api/dali/send`
  - `POST /api/dali/send_hex`
  - `POST /api/lights/add` / `POST /api/lights/delete`
  - `GET /api/lights`
- Scenes
  - `POST /api/dali/send_hex` (turn all on/off)
- Dashboard
  - `GET /api/energy/dashboard`
  - `GET /api/energy/history?metric=price|cost&period=...`
- Data Interfaces
  - `GET/POST /api/mqtt_inputs` `/save` `/delete` `/start`
  - `GET/POST /api/mqtt_outputs` `/save` `/publish_now`
  - `POST /api/interfaces/test/toggle` `/test/set`

## Development

- Frontend: update per module in `static/js/*.js`; keep alignment with `summary` fields
- Backend: add routes in `app.py`; manage JSON data via `data/`; use `read_json/write_json`
- Serial: prefer `pyserial`; fallback to file write or bash script
- Security: use strong credentials; manage serial permissions via udev/groups

## License & Contributions

PRs & issues are welcome. License per repository settings (e.g., MIT/Apache-2.0).
