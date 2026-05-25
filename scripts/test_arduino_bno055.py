#!/usr/bin/env python3
"""
Arduino BNO055 Connection Test
Tests serial communication with Arduino reading BNO055 sensor data.

This script reads sensor data from Arduino and displays it in real-time.
"""

import serial
import serial.tools.list_ports
import time
import sys
from datetime import datetime


def find_arduino():
    """Find Arduino Nano 33 BLE in available serial ports."""
    ports = serial.tools.list_ports.comports()

    for port in ports:
        # Look for Arduino or common USB serial identifiers
        if "Arduino" in port.description or "2341" in port.hwid or "ACM" in port.device:
            return port.device

    return None


def list_serial_ports():
    """Display all available serial ports."""
    ports = serial.tools.list_ports.comports()
    print("\n📡 Available Serial Ports:")
    print("-" * 70)

    if not ports:
        print("❌ No serial ports found!")
        print("\nTroubleshooting:")
        print("1. Make sure Arduino is plugged into USB")
        print("2. Check USB cable (must support data, not just power)")
        print("3. Try a different USB port")
        return None

    for i, port in enumerate(ports):
        print(f"\n[{i}] {port.device}")
        print(f"    Description: {port.description}")
        print(f"    Hardware ID: {port.hwid}")

        if "Arduino" in port.description or "2341" in port.hwid:
            print("    ⭐ This looks like an Arduino!")

    print("-" * 70)
    return ports


def parse_sensor_data(line):
    """Parse CSV sensor data from Arduino."""
    if not line.startswith("DATA,"):
        return None

    try:
        # Remove "DATA," prefix and split
        parts = line[5:].split(",")

        if len(parts) < 13:
            return None

        data = {
            "euler": {"x": float(parts[0]), "y": float(parts[1]), "z": float(parts[2])},
            "accel": {"x": float(parts[3]), "y": float(parts[4]), "z": float(parts[5])},
            "gyro": {"x": float(parts[6]), "y": float(parts[7]), "z": float(parts[8])},
            "calibration": {
                "system": int(parts[9]),
                "gyro": int(parts[10]),
                "accel": int(parts[11]),
                "mag": int(parts[12]),
            },
        }
        return data

    except (ValueError, IndexError) as e:
        return None


def get_calibration_bar(value, max_value=3):
    """Create a visual calibration progress bar."""
    if value == 0:
        return "⬜⬜⬜ Not calibrated"
    elif value == 1:
        return "🟨⬜⬜ Starting..."
    elif value == 2:
        return "🟨🟨⬜ Good"
    else:
        return "🟩🟩🟩 Fully calibrated"


def test_bno055_connection(port_name, baudrate=115200, duration=30):
    """
    Test BNO055 sensor connection via Arduino.

    Args:
        port_name: Serial port device name
        baudrate: Communication speed (default 115200)
        duration: How long to display data in seconds (default 30)
    """
    print("\n" + "=" * 70)
    print("Arduino BNO055 Connection Test")
    print("=" * 70)
    print(f"\n🔌 Connecting to: {port_name}")
    print(f"   Baud rate: {baudrate}")

    try:
        ser = serial.Serial(port_name, baudrate, timeout=1)
        print("✅ Serial port opened successfully!")

        print("\n⏳ Waiting for Arduino to initialize...")
        print("   (Arduino resets when serial connection opens)")
        time.sleep(2.5)

        # Flush any buffered data
        ser.reset_input_buffer()

        print("\n📊 Reading sensor data from BNO055...")
        print(
            "   (Will display for {} seconds, or press Ctrl+C to stop)".format(duration)
        )
        print("\n" + "-" * 70)

        start_time = time.time()
        data_count = 0
        last_display = 0
        display_interval = 0.5  # Update display every 500ms

        while time.time() - start_time < duration:
            try:
                if ser.in_waiting > 0:
                    line = ser.readline().decode("utf-8", errors="ignore").strip()

                    if not line:
                        continue

                    # Parse sensor data
                    data = parse_sensor_data(line)

                    if data:
                        data_count += 1

                        # Throttle display updates
                        if time.time() - last_display >= display_interval:
                            # Clear previous lines
                            print("\033[F" * 8)  # Move cursor up 8 lines

                            print(f"📦 Packets received: {data_count}")
                            print(
                                f"🧭 Orientation (Euler):  X={data['euler']['x']:7.2f}°  Y={data['euler']['y']:7.2f}°  Z={data['euler']['z']:7.2f}°"
                            )
                            print(
                                f"🚀 Acceleration (m/s²):  X={data['accel']['x']:7.2f}   Y={data['accel']['y']:7.2f}   Z={data['accel']['z']:7.2f}"
                            )
                            print(
                                f"🔄 Gyroscope (rad/s):    X={data['gyro']['x']:7.2f}   Y={data['gyro']['y']:7.2f}   Z={data['gyro']['z']:7.2f}"
                            )
                            print(f"\n📊 Calibration Status:")
                            print(
                                f"   System: {get_calibration_bar(data['calibration']['system'])}"
                            )
                            print(
                                f"   Gyro:   {get_calibration_bar(data['calibration']['gyro'])}"
                            )
                            print(
                                f"   Accel:  {get_calibration_bar(data['calibration']['accel'])}"
                            )

                            last_display = time.time()

                    else:
                        # Print non-data messages (initialization, errors, etc.)
                        if line and not line.startswith("DATA,"):
                            print(f"📩 {line}")

                time.sleep(0.01)

            except KeyboardInterrupt:
                print("\n\n⏹️  Stopped by user")
                break

        print("\n" + "-" * 70)

        if data_count > 0:
            print(f"\n✅ SUCCESS! Received {data_count} data packets from BNO055")
            print(f"   Data rate: {data_count / duration:.1f} packets/sec")
            print("\n🎉 BNO055 is connected and working!")
            print("\nNext steps:")
            print("1. Move sensor to improve calibration (figure-8 pattern)")
            print("2. Check calibration status in the output above")
            print("3. Try the motion tracking application")
            print("4. See: ./scripts/motion_track.py --mode web")

        else:
            print("\n⚠️  No sensor data received!")
            print("\nPossible issues:")
            print("1. Arduino sketch not uploaded - upload arduino_bno055_test.ino")
            print("2. BNO055 not connected - check I2C wiring")
            print("3. Wrong baud rate - verify 115200 in sketch")
            print("4. Sensor initialization failed - check Arduino serial output")

        ser.close()

    except serial.SerialException as e:
        print(f"\n❌ Serial port error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure Arduino is plugged in")
        print("2. Check if another program is using the port")
        print("3. Try unplugging and replugging Arduino")
        print("4. Check USB cable quality")
        return False

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

    return data_count > 0


def main():
    """Main test function."""
    print("\n🔍 Arduino BNO055 Sensor Test")
    print("=" * 70)

    # Try to auto-detect Arduino
    arduino_port = find_arduino()

    if arduino_port:
        print(f"\n✅ Found Arduino at: {arduino_port}")
        use_this = input("\n   Use this port? [Y/n]: ").strip().lower()

        if use_this in ["n", "no"]:
            arduino_port = None

    if not arduino_port:
        # List all ports and let user choose
        ports = list_serial_ports()

        if not ports:
            return

        print("\nEnter port number or full path (e.g., 0 or /dev/ttyACM0)")
        choice = input("Port: ").strip()

        try:
            # Check if it's a number (index) or full path
            if choice.isdigit():
                idx = int(choice)
                if 0 <= idx < len(ports):
                    arduino_port = ports[idx].device
                else:
                    print(f"❌ Invalid port number: {idx}")
                    return
            else:
                arduino_port = choice
        except ValueError:
            print(f"❌ Invalid input: {choice}")
            return

    # Run the test
    print(f"\n🚀 Starting BNO055 test on {arduino_port}...")
    print("   (Press Ctrl+C to stop early)\n")

    success = test_bno055_connection(arduino_port)

    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Test cancelled by user")
        sys.exit(0)
