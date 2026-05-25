#!/usr/bin/env python3
"""
Arduino Nano 33 BLE Sense - Basic Connection Test
This is the "Hello World" for Arduino communication.

Purpose: Verify the Arduino is connected and we can communicate via serial.
"""

import serial
import serial.tools.list_ports
import time
import sys


def list_serial_ports():
    """List all available serial ports."""
    ports = serial.tools.list_ports.comports()
    print("\n📡 Available Serial Ports:")
    print("-" * 60)

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

        # Highlight Arduino devices
        if "Arduino" in port.description or "2341" in port.hwid:
            print("    ⭐ This looks like an Arduino!")

    print("-" * 60)
    return ports


def test_serial_connection(port_name, baudrate=115200):
    """
    Test basic serial communication with Arduino.

    Args:
        port_name: Serial port device name (e.g., '/dev/ttyACM0')
        baudrate: Communication speed (Arduino Nano 33 typically uses 115200)
    """
    print(f"\n🔌 Attempting to connect to {port_name} at {baudrate} baud...")

    try:
        # Open serial connection
        ser = serial.Serial(port_name, baudrate, timeout=2)
        print("✅ Serial port opened successfully!")

        # Give Arduino time to reset (opening serial connection resets Arduino)
        print("⏳ Waiting for Arduino to initialize (2 seconds)...")
        time.sleep(2)

        # Flush any existing data
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        print("\n📨 Reading data from Arduino...")
        print("(Waiting up to 5 seconds for data...)")
        print("-" * 60)

        # Try to read any data the Arduino is sending
        start_time = time.time()
        data_received = False

        while time.time() - start_time < 5:
            if ser.in_waiting > 0:
                try:
                    line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if line:
                        print(f"📩 Received: {line}")
                        data_received = True
                except Exception as e:
                    print(f"⚠️  Decode error: {e}")
            time.sleep(0.1)

        print("-" * 60)

        if data_received:
            print("\n✅ SUCCESS! Arduino is sending data.")
            print("\nNext steps:")
            print("1. If you see sensor data, the Arduino sketch is running")
            print("2. If you see garbage/noise, check the baud rate")
            print("3. If you see nothing, upload a test sketch to the Arduino")
        else:
            print("\n⚠️  No data received from Arduino.")
            print("\nPossible reasons:")
            print("1. No sketch uploaded to Arduino (it's blank)")
            print("2. Sketch not sending serial data")
            print("3. Wrong baud rate (try 9600 if 115200 doesn't work)")
            print("4. Arduino needs to be reset (press reset button)")

            print("\n💡 Test: Try sending a command to Arduino...")
            ser.write(b"Hello Arduino\n")
            time.sleep(0.5)
            if ser.in_waiting > 0:
                response = ser.read(ser.in_waiting).decode("utf-8", errors="ignore")
                print(f"📩 Response: {response}")

        ser.close()
        return True

    except serial.SerialException as e:
        print(f"❌ Serial connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check if another program is using the port")
        print("2. Verify you have permission to access serial ports:")
        print("   sudo usermod -a -G dialout $USER")
        print("   (then log out and log back in)")
        print("3. Try a different USB port")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    print("=" * 60)
    print("Arduino Nano 33 BLE Sense - Connection Test")
    print("=" * 60)

    # Step 1: List all available ports
    ports = list_serial_ports()

    if not ports:
        print("\n❌ Cannot proceed without serial ports.")
        print("\n💡 Steps to fix:")
        print("1. Connect Arduino Nano 33 BLE Sense via USB")
        print("2. Run 'lsusb' to verify it's detected")
        print("3. Run this script again")
        sys.exit(1)

    # Step 2: Let user select a port or auto-detect Arduino
    arduino_port = None

    # Try to auto-detect Arduino
    for port in ports:
        if "Arduino" in port.description or "2341" in port.hwid:
            arduino_port = port.device
            print(f"\n🎯 Auto-detected Arduino at: {arduino_port}")
            break

    # If not auto-detected, ask user
    if not arduino_port:
        if len(ports) == 1:
            arduino_port = ports[0].device
            print(f"\n🎯 Using only available port: {arduino_port}")
        else:
            print("\n❓ Which port is your Arduino connected to?")
            try:
                choice = int(input("Enter number [0-{}]: ".format(len(ports) - 1)))
                if 0 <= choice < len(ports):
                    arduino_port = ports[choice].device
                else:
                    print("❌ Invalid choice")
                    sys.exit(1)
            except (ValueError, KeyboardInterrupt):
                print("\n❌ Cancelled by user")
                sys.exit(1)

    # Step 3: Test connection
    print(f"\n🔬 Testing connection to {arduino_port}...")
    success = test_serial_connection(arduino_port)

    # Step 4: Summary
    print("\n" + "=" * 60)
    if success:
        print("✅ Connection test completed!")
        print("\nYour Arduino is communicating via serial port.")
        print(f"Port: {arduino_port}")
        print("Baud rate: 115200")
    else:
        print("❌ Connection test failed")
        print("\nPlease check the troubleshooting steps above.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Test interrupted by user")
        sys.exit(0)
