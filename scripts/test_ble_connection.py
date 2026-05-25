#!/usr/bin/env python3
"""
BLE Connection Debug Tool

Tests Bluetooth Low Energy connection to Arduino BNO055 sensor.
Helps diagnose connection issues and verify the device is working.
"""

import asyncio
import sys
from bleak import BleakScanner, BleakClient
from bleak.backends.device import BLEDevice
from typing import Optional


# BLE UUIDs (must match Arduino firmware)
SERVICE_UUID = "19B10000-E8F2-537E-4F6C-D104768A1214"
DATA_CHAR_UUID = "19B10001-E8F2-537E-4F6C-D104768A1214"
COMMAND_CHAR_UUID = "19B10002-E8F2-537E-4F6C-D104768A1214"


class BLEDebugger:
    def __init__(self):
        self.device: Optional[BLEDevice] = None
        self.client: Optional[BleakClient] = None
        self.data_received = []

    async def scan_devices(self, timeout: float = 5.0):
        """Scan for all BLE devices."""
        print(f"\n🔍 Scanning for BLE devices ({timeout}s)...")
        print("-" * 70)

        devices = await BleakScanner.discover(timeout=timeout)

        if not devices:
            print("❌ No BLE devices found!")
            print("\n💡 Troubleshooting tips:")
            print("   1. Check if Bluetooth is powered on: sudo bluetoothctl power on")
            print("   2. Verify Arduino has BLE firmware uploaded (USE_BLE = true)")
            print("   3. Make sure Arduino is powered and within range")
            return []

        print(f"✅ Found {len(devices)} device(s):\n")

        for i, device in enumerate(devices, 1):
            name = device.name or "Unknown"
            address = device.address
            rssi = getattr(device, "rssi", "N/A")

            # Highlight our target device
            marker = "⭐" if "BNO055" in name or "Arduino" in name.lower() else "  "

            print(f"{marker} [{i}] {name}")
            print(f"      Address: {address}")
            print(f"      Signal:  {rssi} dBm")
            print()

        return devices

    async def find_device_by_name(
        self, target_name: str = "BNO055_Sensor", timeout: float = 10.0
    ):
        """Find specific device by name."""
        print(f"\n🔎 Looking for device: {target_name}")
        print(f"   Timeout: {timeout}s")
        print("-" * 70)

        devices = await BleakScanner.discover(timeout=timeout)

        for device in devices:
            if device.name and target_name in device.name:
                self.device = device
                print(f"✅ Found target device!")
                print(f"   Name: {device.name}")
                print(f"   Address: {device.address}")
                print(f"   RSSI: {getattr(device, 'rssi', 'N/A')} dBm")
                return device

        print(f"❌ Device '{target_name}' not found")
        return None

    async def connect_to_device(self, device: BLEDevice):
        """Connect to BLE device."""
        print(f"\n🔗 Connecting to {device.name} ({device.address})...")
        print("-" * 70)

        try:
            self.client = BleakClient(device.address)
            await self.client.connect()

            if self.client.is_connected:
                print("✅ Connected successfully!")
                return True
            else:
                print("❌ Connection failed")
                return False

        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False

    async def inspect_services(self):
        """Inspect BLE services and characteristics."""
        if not self.client or not self.client.is_connected:
            print("❌ Not connected to device")
            return

        print("\n📋 Services and Characteristics:")
        print("-" * 70)

        services = self.client.services

        for service in services:
            print(f"\n🔹 Service: {service.uuid}")
            print(f"   Description: {service.description}")

            # Check if this is our service
            if service.uuid.lower() == SERVICE_UUID.lower():
                print("   ⭐ THIS IS OUR BNO055 SERVICE!")

            for char in service.characteristics:
                print(f"\n   📍 Characteristic: {char.uuid}")

                # Check if this is our characteristic
                if char.uuid.lower() == DATA_CHAR_UUID.lower():
                    print("      ⭐ THIS IS THE DATA CHARACTERISTIC!")
                elif char.uuid.lower() == COMMAND_CHAR_UUID.lower():
                    print("      ⭐ THIS IS THE COMMAND CHARACTERISTIC!")

                props = []
                if "read" in char.properties:
                    props.append("READ")
                if "write" in char.properties:
                    props.append("WRITE")
                if "notify" in char.properties:
                    props.append("NOTIFY")
                if "indicate" in char.properties:
                    props.append("INDICATE")

                print(f"      Properties: {', '.join(props) if props else 'None'}")

    def notification_handler(self, sender, data: bytearray):
        """Handle incoming BLE notifications."""
        try:
            message = data.decode("utf-8").strip()
            self.data_received.append(message)
            print(f"📨 Data: {message}")
        except Exception as e:
            print(f"⚠️  Error decoding: {e}")

    async def test_data_stream(self, duration: int = 5):
        """Test receiving data stream from sensor."""
        if not self.client or not self.client.is_connected:
            print("❌ Not connected to device")
            return

        print(f"\n📡 Testing data stream ({duration}s)...")
        print("-" * 70)

        try:
            # Subscribe to notifications
            await self.client.start_notify(DATA_CHAR_UUID, self.notification_handler)
            print("✅ Subscribed to data notifications")
            print("   Waiting for data...\n")

            # Wait and collect data
            await asyncio.sleep(duration)

            # Unsubscribe
            await self.client.stop_notify(DATA_CHAR_UUID)

            print(f"\n📊 Results:")
            print(f"   Messages received: {len(self.data_received)}")
            if self.data_received:
                print(f"   Data rate: ~{len(self.data_received) / duration:.1f} Hz")
                print(f"\n   Sample (first message):")
                print(f"   {self.data_received[0][:100]}...")
            else:
                print("   ❌ No data received!")
                print("\n💡 Possible issues:")
                print("   1. Arduino firmware not running")
                print("   2. Wrong UUIDs (check firmware)")
                print("   3. Arduino not streaming data")

        except Exception as e:
            print(f"❌ Error during data stream test: {e}")

    async def send_command(self, command: str):
        """Send a command to the Arduino."""
        if not self.client or not self.client.is_connected:
            print("❌ Not connected to device")
            return

        print(f"\n📤 Sending command: {command}")
        print("-" * 70)

        try:
            # Send command
            await self.client.write_gatt_char(
                COMMAND_CHAR_UUID, command.encode("utf-8")
            )
            print("✅ Command sent")

            # Wait a bit for response
            await asyncio.sleep(1)

        except Exception as e:
            print(f"❌ Error sending command: {e}")

    async def disconnect(self):
        """Disconnect from device."""
        if self.client and self.client.is_connected:
            await self.client.disconnect()
            print("\n🔌 Disconnected")


async def main():
    """Main debug routine."""
    print("=" * 70)
    print("  BLE CONNECTION DEBUG TOOL")
    print("  Arduino BNO055 Sensor")
    print("=" * 70)

    debugger = BLEDebugger()

    # Step 1: Scan for all devices
    devices = await debugger.scan_devices(timeout=5.0)

    if not devices:
        print("\n⚠️  No devices found. Exiting.")
        return

    # Step 2: Try to find our target device
    target_device = await debugger.find_device_by_name("BNO055_Sensor", timeout=10.0)

    if not target_device:
        print("\n⚠️  Target device not found.")
        print("\n💡 Options:")
        print("   1. Check if Arduino is powered on")
        print("   2. Verify BLE firmware is uploaded (USE_BLE = true)")
        print("   3. Try connecting to another device by address")

        # Ask if user wants to try a different device
        if devices:
            print(
                f"\n   Found {len(devices)} other device(s). Check scan results above."
            )
        return

    # Step 3: Connect to device
    connected = await debugger.connect_to_device(target_device)

    if not connected:
        print("\n❌ Failed to connect. Exiting.")
        return

    # Step 4: Inspect services and characteristics
    await debugger.inspect_services()

    # Step 5: Test data stream
    await debugger.test_data_stream(duration=5)

    # Step 6: Test sending a command (optional)
    print("\n🧪 Testing command interface...")
    await debugger.send_command("GET_OFFSETS")

    # Step 7: Disconnect
    await debugger.disconnect()

    print("\n" + "=" * 70)
    print("  DEBUG COMPLETE")
    print("=" * 70)

    if debugger.data_received:
        print("✅ BLE connection is working!")
        print(f"   Successfully received {len(debugger.data_received)} messages")
    else:
        print("⚠️  BLE connection established but no data received")
        print("   Check Arduino firmware and Serial Monitor output")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
