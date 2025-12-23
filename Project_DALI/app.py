from flask import Flask, request, jsonify, session, redirect, url_for, render_template
import os
import json
from pathlib import Path
import config
import threading
import time
import math
import subprocess
import os

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

def read_json(name):
    p = Path(config.DATA_DIR) / name
    if not p.exists():
        return []
    try:
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def write_json(name, data):
    p = Path(config.DATA_DIR) / name
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def login_required(fn):
    def wrapper(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

@app.route('/')
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return redirect(url_for('lights_page'))

@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html', error=None)

@app.route('/login', methods=['POST'])
def do_login():
    username = request.form.get('username', '')
    password = request.form.get('password', '')
    if username == config.ADMIN_USER and password == config.ADMIN_PASS:
        session['logged_in'] = True
        return redirect(url_for('index'))
    return render_template('login.html', error='用户名或密码错误')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/lights')
@login_required
def lights_page():
    return render_template('lights.html')

@app.route('/scenes')
@login_required
def scenes_page():
    return render_template('scenes.html')

@app.route('/energy')
@login_required
def energy_page():
    return render_template('energy.html')

@app.route('/users')
@login_required
def users_page():
    return render_template('users.html')
@app.route('/interfaces')
@login_required
def interfaces_page():
    return render_template('interfaces.html')

@app.route('/api/system/scan_ports', methods=['GET'])
@login_required
def scan_ports():
    return jsonify(["/dev/ttyAMA2", "/dev/ttyAMA3", "/dev/ttyAMA4"])

@app.route('/api/system/set_port', methods=['POST'])
@login_required
def set_port():
    data = request.get_json(force=True)
    port = data.get('port')
    if not port:
        return jsonify({"status": "error", "msg": "缺少端口"}), 400
    app.config['ACTIVE_PORT'] = port
    return jsonify({"status": "ok", "port": port})

@app.route('/api/system/connect_port', methods=['POST'])
@login_required
def connect_port():
    data = request.get_json(force=True)
    port = data.get('port')
    if not port:
        return jsonify({"status": "error", "msg": "缺少端口"}), 400
    return jsonify({"status": "success", "msg": "已连接到 RS485 接口"})

@app.route('/api/dali/scan_devices', methods=['POST'])
@login_required
def dali_scan_devices():
    devices = [
        {"id": 1, "address": 0, "name": "模拟射灯A", "level": 0},
        {"id": 2, "address": 1, "name": "模拟灯带B", "level": 254},
        {"id": 3, "address": 2, "name": "模拟筒灯C", "level": 128},
        {"id": 4, "address": 3, "name": "模拟壁灯D", "level": 50}
    ]
    write_json('devices.json', devices)
    return jsonify(devices)

@app.route('/api/lights', methods=['GET'])
@login_required
def get_lights():
    devices = read_json('devices.json')
    return jsonify(devices)

@app.route('/api/lights/control', methods=['POST'])
@login_required
def control_light():
    data = request.get_json(force=True)
    address = data.get('address')
    command = data.get('command')
    value = data.get('value')
    if command != 'set_level' or address is None or value is None:
        return jsonify({"status": "error", "msg": "参数错误"}), 400
    devices = read_json('devices.json')
    updated = False
    instruction = None
    for d in devices:
        if d.get('address') == address:
            d['level'] = int(value)
            updated = True
            gw = str(d.get('gateway') or "01").upper()
            port = d.get('port') or "/dev/ttyAMA3"
            instruction = _build_instruction(gateway_hex=gw, device_addr_dec=int(address), level=int(value))
            break
    if updated:
        write_json('devices.json', devices)
        return jsonify({"status": "ok", "new_level": int(value), "instruction": instruction})
    return jsonify({"status": "error", "msg": "未找到设备"}), 404

@app.route('/api/scenes', methods=['GET'])
@login_required
def get_scenes():
    scenes = read_json('scenes.json')
    return jsonify(scenes)

@app.route('/api/scenes/apply', methods=['POST'])
@login_required
def apply_scene():
    data = request.get_json(force=True)
    scene_id = data.get('scene_id')
    scenes = read_json('scenes.json')
    target = None
    for s in scenes:
        if s.get('id') == scene_id:
            target = s
            break
    if not target:
        return jsonify({"status": "error", "msg": "场景不存在"}), 404
    devices = read_json('devices.json')
    actions = target.get('actions', [])
    for a in actions:
        if a.get('type') == 'set_all':
            level = int(a.get('level', 0))
            for d in devices:
                d['level'] = level
    write_json('devices.json', devices)
    return jsonify({"status": "ok"})

@app.route('/api/energy/realtime', methods=['GET'])
@login_required
def energy_realtime():
    logs = read_json('energy_log.json')
    mqtt_cfg = read_json('mqtt.json')
    if isinstance(mqtt_cfg, dict) and mqtt_cfg.get('enabled') and app.config.get('MQTT_LAST_REALTIME'):
        return jsonify(app.config['MQTT_LAST_REALTIME'])
    if logs:
        last = logs[-1]
        return jsonify({
            "current_power_watt": float(last.get('power_watt', 120.5)),
            "daily_kwh": float(last.get('daily_kwh', 3.2))
        })
    return jsonify({"current_power_watt": 120.5, "daily_kwh": 3.2})

@app.route('/api/energy/dashboard', methods=['GET'])
@login_required
def energy_dashboard():
    cfg = read_json('mqtt.json')
    if isinstance(cfg, dict) and cfg.get('enabled') and app.config.get('MQTT_LAST_DASH'):
        return jsonify(app.config['MQTT_LAST_DASH'])
    # Mock data
    now = time.localtime()
    times = []
    solar = []
    grid = []
    battery = []
    total = []
    use_grid = []
    use_solar = []
    use_batt = []
    feed = []
    for i in range(16):
        h = (i) + 0
        times.append(f"{h}:00")
        s = max(0, (8 <= h <= 16) and (5 + (i%5)) or (0))
        g = 10 + (i%7)
        b = 2 + (i%3)
        t = s + g + b
        solar.append(float(s))
        grid.append(float(g))
        battery.append(float(b))
        total.append(float(t))
        use_grid.append(round(g*0.4,2))
        use_solar.append(round(s*0.6,2))
        use_batt.append(round(b*0.2,2))
        feed.append(round(s*0.1,2))
    summary = {
        "solar_kwh": 5.61,
        "battery_in_kwh": 1.42,
        "battery_out_kwh": 1.76,
        "battery_net_kwh": -0.34,
        "grid_in_kwh": 3.64,
        "grid_out_kwh": 1.04,
        "gas_m3": 1.6,
        "water_l": 340,
        "house_kwh": 8.91,
        "grid_cost_usd": 0.63,
        "gas_cost_usd": 0.96,
        "water_cost_usd": 0.00,
        "grid_to_batt_kwh": 1.42,
        "grid_to_house_kwh": 2.22,
        "battery_charge_kw": 0.85,
        "battery_soc_percent": 68,
        "battery_remaining_kwh": 18.4,
        "battery_time_left_h": 4.6,
        "battery_to_house_kw": 2.8
    }
    return jsonify({
        "summary": summary,
        "times": times,
        "power_series": {"grid": grid, "battery": battery, "total": total},
        "use_series": {"grid": use_grid, "battery": use_batt}
    })
@app.route('/api/energy/history', methods=['GET'])
@login_required
def energy_history():
    metric = request.args.get('metric','price')
    period = request.args.get('period','day')
    cfg = read_json('mqtt.json')
    hist = app.config.get('MQTT_HISTORY') or {}
    if isinstance(cfg, dict) and cfg.get('enabled'):
        if hist.get(metric) and hist[metric].get(period):
            return jsonify(hist[metric][period])
    if period == 'realtime':
        times = [f"{i}:00" for i in range(16)]
    elif period == 'day':
        times = [f"{i}时" for i in range(24)]
    elif period == 'week':
        times = ["周一","周二","周三","周四","周五","周六","周日"]
    else:
        times = [f"{i}月" for i in range(1,13)]
    if metric == 'price':
        base = 0.8
        vals = []
        for i in range(len(times)):
            v = base + 0.3*math.sin(i/3.0) + 0.1*math.cos(i/2.0)
            vals.append(round(max(0.1, v), 2))
        app.config.setdefault('HIST_PRICE', {})[period] = {"times": times, "values": vals}
        return jsonify({"times": times, "values": vals})
    elif metric == 'cost':
        # price series from cache or deterministic
        price_cache = app.config.setdefault('HIST_PRICE', {})
        price_data = price_cache.get(period)
        if not price_data:
            base = 0.8
            pvals = []
            for i in range(len(times)):
                v = base + 0.3*math.sin(i/3.0) + 0.1*math.cos(i/2.0)
                pvals.append(round(max(0.1, v), 2))
            price_data = {"times": times, "values": pvals}
            price_cache[period] = price_data
        # building consumption series (deterministic, not random)
        bvals = []
        if period == 'realtime':
            # approximate real-time by dashboard formula
            bvals = []
            for i in range(len(times)):
                g = 10 + (i % 7)
                b = 2 + (i % 3)
                use_grid = round(g*0.4, 2)
                use_batt = round(b*0.2, 2)
                bvals.append(round(use_grid + use_batt, 2))
        elif period == 'day':
            for i in range(len(times)):
                # lower at night, higher at daytime
                v = 0.3 + 0.6*max(0, math.sin((i-6)/24.0 * math.pi * 2))
                bvals.append(round(v, 2))
        elif period == 'week':
            pattern = [0.9,0.8,1.0,1.1,1.2,1.0,0.7]
            for i in range(len(times)):
                bvals.append(round(0.4*pattern[i], 2))
        else:  # month
            for i in range(len(times)):
                season = 0.5 + 0.4*max(0, math.sin((i)/12.0 * math.pi * 2))
                bvals.append(round(season, 2))
        # compute cost = price * building consumption
        cvals = [round((price_data['values'][i] * bvals[i]), 2) for i in range(len(times))]
        app.config.setdefault('HIST_COST', {})[period] = {"times": times, "values": cvals}
        return jsonify({"times": times, "values": cvals})
    else:
        return jsonify({"times": times, "values": []})

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    users = read_json('users.json')
    res = [{"username": u.get('username')} for u in users]
    return jsonify(res)

@app.route('/api/users/add', methods=['POST'])
@login_required
def add_user():
    data = request.get_json(force=True)
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"status": "error", "msg": "缺少参数"}), 400
    users = read_json('users.json')
    for u in users:
        if u.get('username') == username:
            return jsonify({"status": "error", "msg": "用户已存在"}), 400
    users.append({"username": username, "password": password})
    write_json('users.json', users)
    return jsonify({"status": "ok"})

@app.route('/api/users/delete', methods=['POST'])
@login_required
def delete_user():
    data = request.get_json(force=True)
    username = data.get('username')
    if not username:
        return jsonify({"status": "error", "msg": "缺少参数"}), 400
    if username == config.ADMIN_USER:
        return jsonify({"status": "error", "msg": "不可删除管理员"}), 400
    users = read_json('users.json')
    users = [u for u in users if u.get('username') != username]
    write_json('users.json', users)
    return jsonify({"status": "ok"})

def _try_import_mqtt():
    try:
        import paho.mqtt.client as mqtt  # type: ignore
        return mqtt
    except Exception:
        return None

def _start_mqtt(cfg):
    mqtt = _try_import_mqtt()
    if not mqtt:
        app.config['MQTT_CONNECTED'] = False
        return
    client = mqtt.Client()
    if cfg.get('username'):
        client.username_pw_set(cfg.get('username'), cfg.get('password'))
    def on_connect(c, userdata, flags, rc):
        app.config['MQTT_CONNECTED'] = (rc == 0)
        if rc == 0 and cfg.get('topic'):
            c.subscribe(cfg['topic'])
    def on_message(c, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            if isinstance(payload, dict):
                if payload.get('type') == 'realtime':
                    app.config['MQTT_LAST_REALTIME'] = payload.get('data')
                elif payload.get('type') == 'dashboard':
                    app.config['MQTT_LAST_DASH'] = payload.get('data')
                elif payload.get('type') == 'history':
                    m = payload.get('metric')
                    p = payload.get('period')
                    d = payload.get('data')
                    if m and p and d:
                        if not app.config.get('MQTT_HISTORY'):
                            app.config['MQTT_HISTORY'] = {}
                        app.config['MQTT_HISTORY'].setdefault(m, {})[p] = d
        except Exception:
            pass
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(cfg.get('host','localhost'), int(cfg.get('port',1883)), 60)
        threading.Thread(target=client.loop_forever, daemon=True).start()
        app.config['MQTT_CLIENT'] = client
    except Exception:
        app.config['MQTT_CONNECTED'] = False

@app.route('/api/mqtt/config', methods=['POST'])
@login_required
def mqtt_config():
    data = request.get_json(force=True)
    enabled = bool(data.get('enabled'))
    cfg = {
        'enabled': enabled,
        'host': data.get('host') or 'localhost',
        'port': int(data.get('port') or 1883),
        'topic': data.get('topic') or 'dali/energy',
        'username': data.get('username') or '',
        'password': data.get('password') or ''
    }
    write_json('mqtt.json', cfg)
    if enabled:
        _start_mqtt(cfg)
    return jsonify({"status": "ok"})

@app.route('/api/mqtt/status', methods=['GET'])
@login_required
def mqtt_status():
    cfg = read_json('mqtt.json')
    connected = bool(app.config.get('MQTT_CONNECTED'))
    return jsonify({"configured": bool(cfg) and bool(cfg.get('enabled')) if isinstance(cfg, dict) else False, "connected": connected})

def _hex2byte(h):
    return int(h, 16) & 0xFF
def _byte2hex(b):
    return f"{b & 0xFF:02X}"
def _build_instruction(gateway_hex, device_addr_dec, level):
    start = "28"
    fixed = "01"
    ctrl = "12"
    gw = gateway_hex.upper().zfill(2)
    dev = f"{(int(device_addr_dec) * 2) & 0xFF:02X}"
    cmd = f"{int(level) & 0xFF:02X}"
    parts = [start, fixed, gw, ctrl, dev, cmd]
    checksum = sum(_hex2byte(p) for p in parts) & 0xFF
    chk = _byte2hex(checksum)
    return "".join(parts) + chk

@app.route('/api/lights/add', methods=['POST'])
@login_required
def add_light():
    data = request.get_json(force=True)
    name = data.get('name')
    address_hex = data.get('address_hex')
    address_dec = data.get('address_dec')
    gateway_hex = (data.get('gateway_hex') or "01").upper()
    port = data.get('port') or "/dev/ttyAMA3"
    dev_no = None
    if address_hex:
        try:
            dev_no = int(str(address_hex), 16)
        except Exception:
            dev_no = None
    elif address_dec is not None:
        try:
            dev_no = int(address_dec)
        except Exception:
            dev_no = None
    if not name or dev_no is None:
        return jsonify({"status": "error", "msg": "缺少参数"}), 400
    devices = read_json('devices.json')
    for d in devices:
        if d.get('address') == int(dev_no):
            return jsonify({"status": "error", "msg": "地址已存在"}), 400
    new_dev = {"id": (max([x.get('id',0) for x in devices]) + 1 if devices else 1), "address": int(dev_no), "name": name, "level": 0, "gateway": gateway_hex, "port": port}
    devices.append(new_dev)
    write_json('devices.json', devices)
    return jsonify({"status": "ok", "device": new_dev})

@app.route('/api/lights/delete', methods=['POST'])
@login_required
def delete_light():
    data = request.get_json(force=True)
    dev_id = data.get('id')
    if dev_id is None:
        return jsonify({"status": "error", "msg": "缺少设备ID"}), 400
    devices = read_json('devices.json')
    before = len(devices)
    devices = [d for d in devices if d.get('id') != int(dev_id)]
    if len(devices) == before:
        return jsonify({"status": "error", "msg": "未找到设备"}), 404
    write_json('devices.json', devices)
    return jsonify({"status": "ok"})

@app.route('/api/lights/import', methods=['POST'])
@login_required
def import_lights():
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify({"status": "error", "msg": "格式错误"}), 400
    required = {"id", "address", "name", "level", "gateway", "port"}
    for item in data:
        if not isinstance(item, dict) or not required.issubset(set(item.keys())):
            return jsonify({"status": "error", "msg": "缺少字段"}), 400
    write_json('devices.json', data)
    return jsonify({"status": "ok"})

def _try_import_serial():
    try:
        import serial  # type: ignore
        return serial
    except Exception:
        return None

@app.route('/api/dali/send', methods=['POST'])
@login_required
def dali_send():
    data = request.get_json(force=True)
    port = data.get('port') or app.config.get('ACTIVE_PORT') or "/dev/ttyAMA3"
    gateway_hex = (data.get('gateway_hex') or "01").upper()
    address_hex = data.get('address_hex')
    address_dec = data.get('address_dec')
    dev_no = 0
    try:
        if address_hex is not None:
            dev_no = int(str(address_hex), 16)
        elif address_dec is not None:
            dev_no = int(address_dec)
        else:
            dev_no = 0
    except Exception:
        dev_no = 0
    level = int(data.get('level') or 0)
    instr = _build_instruction(gateway_hex=gateway_hex, device_addr_dec=dev_no, level=level)
    serial = _try_import_serial()
    sent = False
    modes = []
    print(f"[DALI] Send HEX {instr} to {port} (gw={gateway_hex} addr_dec={address_dec} level={level})")
    if serial:
        try:
            ser = serial.Serial(port, baudrate=9600, bytesize=8, parity='N', stopbits=1, timeout=1)
            ser.write(bytes.fromhex(instr))
            ser.close()
            sent = True
            modes.append("serial")
        except Exception:
            modes.append("serial_error")
    if not sent:
        try:
            try:
                os.chmod(port, 0o666)
            except Exception:
                pass
            with open(port, 'wb', buffering=0) as f:
                f.write(bytes.fromhex(instr))
            sent = True
            modes.append("file")
        except Exception:
            pass
    # Always attempt terminal-based send as well (prints command)
    try:
        script_path = Path(__file__).resolve().parent / "scripts" / "send_dali_hex.sh"
        print(f"[DALI] Script send: bash {script_path} {port} {instr}")
        subprocess.run(["bash", str(script_path), port, instr], check=True)
        modes.append("script")
        sent = True
    except Exception:
        modes.append("script_error")
    return jsonify({"status": "ok", "instruction": instr, "checksum": instr[-2:], "sent": sent, "mode": "+".join(modes)})
@app.route('/api/interfaces', methods=['GET'])
@login_required
def interfaces_get():
    mqtt_cfg = read_json('mqtt.json')
    inter_cfg = read_json('interfaces.json')
    if not isinstance(inter_cfg, list):
        inter_cfg = []
    return jsonify({"mqtt": mqtt_cfg if isinstance(mqtt_cfg, dict) else {}, "mqtt_status": {"connected": bool(app.config.get('MQTT_CONNECTED'))}, "metrics": inter_cfg})
@app.route('/api/interfaces/save', methods=['POST'])
@login_required
def interfaces_save():
    data = request.get_json(force=True)
    key = data.get('key')
    inter_cfg = read_json('interfaces.json')
    if not isinstance(inter_cfg, list):
        inter_cfg = []
    updated = False
    for i in inter_cfg:
        if i.get('key') == key:
            i['enabled'] = bool(data.get('enabled'))
            i['subscribe_topic'] = data.get('subscribe_topic') or ''
            i['publish_topic'] = data.get('publish_topic') or ''
            i['test_data'] = data.get('test_data') or {}
            updated = True
            break
    if not updated and key:
        inter_cfg.append({"key": key, "label": key, "enabled": bool(data.get('enabled')), "subscribe_topic": data.get('subscribe_topic') or '', "publish_topic": data.get('publish_topic') or '', "test_data": data.get('test_data') or {}})
    write_json('interfaces.json', inter_cfg)
    return jsonify({"status": "ok"})
@app.route('/api/interfaces/test', methods=['POST'])
@login_required
def interfaces_test():
    data = request.get_json(force=True)
    key = data.get('key')
    payload = data.get('data') or {}
    mqtt = app.config.get('MQTT_CLIENT')
    inter_cfg = read_json('interfaces.json')
    topic = ''
    for i in inter_cfg if isinstance(inter_cfg, list) else []:
        if i.get('key') == key:
            topic = i.get('publish_topic') or ''
            break
    if mqtt and topic:
        try:
            mqtt.publish(topic, json.dumps({"key": key, "data": payload}))
        except Exception:
            pass
    if key == 'battery':
        app.config['MQTT_LAST_DASH'] = app.config.get('MQTT_LAST_DASH') or {}
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.PORT)
