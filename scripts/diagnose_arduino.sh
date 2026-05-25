#!/bin/bash
# Arduino Connection Diagnostics
# Run this to gather all relevant information about USB/Arduino connection

echo "=========================================="
echo "Arduino Nano 33 BLE - Connection Diagnostics"
echo "=========================================="
echo ""

echo "1. USB Devices (lsusb)"
echo "----------------------------------------"
lsusb
echo ""

echo "2. Checking for Arduino in lsusb..."
echo "----------------------------------------"
if lsusb | grep -qi "arduino\|2341:805a\|2341:005a"; then
    echo "✅ Arduino found in lsusb!"
    lsusb | grep -i "arduino\|2341"
else
    echo "❌ Arduino NOT found in lsusb"
    echo "   → Check USB cable (must support data, not just charging)"
    echo "   → Try different USB port"
    echo "   → Try double-tapping reset button on Arduino"
fi
echo ""

echo "3. Serial Ports"
echo "----------------------------------------"
if ls /dev/ttyACM* 2>/dev/null; then
    echo "✅ Found /dev/ttyACM* ports (Arduino likely connected)"
    ls -la /dev/ttyACM*
elif ls /dev/ttyUSB* 2>/dev/null; then
    echo "✅ Found /dev/ttyUSB* ports"
    ls -la /dev/ttyUSB*
else
    echo "❌ No /dev/ttyACM* or /dev/ttyUSB* ports found"
    echo "   → Arduino is not creating a serial port"
    echo "   → Check cable and connection"
fi
echo ""

echo "4. Recent USB Kernel Messages (last 30 lines)"
echo "----------------------------------------"
dmesg | grep -i "usb\|ttyACM\|arduino" | tail -30
echo ""

echo "5. User Groups (for serial port access)"
echo "----------------------------------------"
if groups | grep -q dialout; then
    echo "✅ User is in 'dialout' group (can access serial ports)"
else
    echo "⚠️  User is NOT in 'dialout' group"
    echo "   → Run: sudo usermod -a -G dialout $USER"
    echo "   → Then log out and log back in"
fi
echo ""

echo "6. Arduino-Specific Checks"
echo "----------------------------------------"
# Check for Arduino in bootloader mode
if lsusb | grep -q "2341:005a"; then
    echo "⚠️  Arduino is in BOOTLOADER mode"
    echo "   → This is okay, means hardware works"
    echo "   → Upload a sketch to run normal mode"
    echo "   → Or wait 8 seconds and it will restart"
fi

# Check for Arduino in normal mode
if lsusb | grep -q "2341:805a"; then
    echo "✅ Arduino Nano 33 BLE detected in normal mode"
    echo "   → Ready for communication"
fi
echo ""

echo "=========================================="
echo "Diagnostic Summary"
echo "=========================================="

# Provide recommendations
if lsusb | grep -qi "arduino\|2341"; then
    echo "✅ STATUS: Arduino hardware is detected"
    if ls /dev/ttyACM* 2>/dev/null >/dev/null; then
        echo "✅ STATUS: Serial port is available"
        echo ""
        echo "🎉 Everything looks good! Try running:"
        echo "   ./scripts/test_arduino_connection.py"
    else
        echo "⚠️  STATUS: No serial port found"
        echo ""
        echo "Next steps:"
        echo "1. Try double-tapping reset button on Arduino"
        echo "2. Check dmesg output above for errors"
        echo "3. Try different USB port"
    fi
else
    echo "❌ STATUS: Arduino NOT detected"
    echo ""
    echo "Most likely causes:"
    echo "1. 🔌 Bad USB cable (charging-only, no data)"
    echo "2. 🔌 Arduino not plugged in"
    echo "3. ⚡ USB port not working"
    echo "4. 💡 Arduino not powered (no orange LED?)"
    echo ""
    echo "Try this:"
    echo "1. Check if orange LED lights up on Arduino"
    echo "2. Try a DIFFERENT USB cable (must support data)"
    echo "3. Try a different USB port on your computer"
    echo "4. Test Arduino on another computer to rule out hardware failure"
    echo ""
    echo "See: docs/ARDUINO_TROUBLESHOOTING.md for detailed help"
fi

echo ""
echo "=========================================="
