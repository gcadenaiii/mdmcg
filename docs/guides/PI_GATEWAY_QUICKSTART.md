# Pi Gateway Quick Start

This guide sets up the Raspberry Pi as the hardware gateway that ingests BLE sensor data and syncs it to the Lightsail backend.

## Goal

Run on Pi:
- gateway process
- BLE/device ingest
- local buffering and retry
- background service via systemd

## 1. Prepare Raspberry Pi

- Raspberry Pi OS updated
- Internet connectivity
- Bluetooth enabled (for BLE mode)
- Sensor hardware powered and advertising (if BLE)

Update system:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip git
```

## 2. Clone Repo and Create Venv

```bash
git clone <your-repo-url>
cd move_sensor-poc
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
```

## 3. Install Gateway Dependencies

```bash
pip install -r gateway/requirements.txt
```

Only install additional sensor stacks if your Pi role requires them.

## 4. Configure Environment Variables

Gateway env contract is defined in gateway/config.py.

Set required values for current shell test:

```bash
export RPM_BACKEND_URL="https://your-domain.com"
export RPM_API_KEY="same-key-used-in-lightsail-env"
export RPM_BLE_DEVICE_NAME="ESP32_BNO055"
export RPM_LOG_LEVEL="INFO"
```

Optional tuning:

```bash
export RPM_SYNC_INTERVAL="10"
export RPM_BATCH_SIZE="200"
export RPM_STATUS_PORT="8090"
```

## 5. Run Interactive Test

Real BLE mode:

```bash
python -m gateway
```

Mock mode (for connectivity validation):

```bash
python -m gateway --mock
```

In another terminal:

```bash
curl http://127.0.0.1:8090
```

Confirm:
- gateway starts
- sync attempts are logged
- uploads succeed against backend

## 6. Install as systemd Service

Use infra/gateway.service as template.

Before install, edit values for your Pi:
- User and Group
- WorkingDirectory
- ExecStart path
- RPM_BACKEND_URL
- RPM_API_KEY
- RPM_BLE_DEVICE_NAME

Install and start:

```bash
sudo cp infra/gateway.service /etc/systemd/system/rpm-gateway.service
sudo systemctl daemon-reload
sudo systemctl enable rpm-gateway
sudo systemctl start rpm-gateway
```

View logs:

```bash
sudo systemctl status rpm-gateway
sudo journalctl -u rpm-gateway -f
```

## 7. End-to-End Validation

Check all three layers:
- Pi logs show successful sync batches
- Lightsail health endpoint is healthy
- Dashboard shows gateway online and receiving data

## 8. Troubleshooting

- Auth failures (401): API key mismatch between Pi and Lightsail
- Connection failures: backend URL/firewall/DNS issues
- BLE not found: verify device name/address and adapter state
- Intermittent sync: inspect internet stability and retry logs
