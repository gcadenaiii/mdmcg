#!/usr/bin/env python3
"""
Quick BLE Scanner

Simple tool to quickly scan for BLE devices and find the Arduino.
"""

import asyncio
from bleak import BleakScanner


async def quick_scan():
    print("\n🔍 Scanning for Bluetooth devices (5 seconds)...\n")

    devices = await BleakScanner.discover(timeout=5.0)

    if not devices:
        print("❌ No devices found!\n")
        print("Troubleshooting:")
        print("  • Check if Bluetooth is on: sudo bluetoothctl power on")
        print("  • Make sure Arduino is powered")
        print("  • Verify BLE firmware uploaded (USE_BLE = true)\n")
        return

    print(f"Found {len(devices)} device(s):\n")

    target_found = False

    for device in sorted(devices, key=lambda d: d.name or ""):
        name = device.name or "Unknown"
        address = device.address
        rssi = getattr(device, "rssi", None)
        rssi_str = f"{rssi} dBm" if rssi else "N/A"

        # Check if this is our target
        is_target = "BNO055" in name or "Arduino" in name

        if is_target:
            target_found = True
            print(f"⭐ {name}")
            print(f"   Address: {address}")
            print(f"   Signal:  {rssi_str}")
            print(f"   👉 THIS IS YOUR ARDUINO!")
        else:
            print(f"   {name}")
            print(f"   Address: {address}")
            print(f"   Signal:  {rssi_str}")
        print()

    if target_found:
        print("✅ Arduino found! You can now use Quick Connect in the web UI.")
    else:
        print("⚠️  Arduino not found in scan results.")
        print("   Make sure:")
        print("   • Arduino is powered on")
        print("   • BLE firmware is uploaded (change USE_BLE to true)")
        print("   • Device is within Bluetooth range\n")


if __name__ == "__main__":
    try:
        asyncio.run(quick_scan())
    except KeyboardInterrupt:
        print("\n\nScan cancelled.\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
