#!/usr/bin/env python3
"""
Check BNO055 calibration status.

This is a CLI wrapper around the calibration utility module.
For programmatic use, import from utils.calibration instead.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path so imports work correctly
# Use realpath to resolve symlinks
script_path = Path(os.path.realpath(__file__))
parent_dir = script_path.parent.parent
sys.path.insert(0, str(parent_dir))

from utils.calibration import check_calibration_status, format_calibration_status

if __name__ == "__main__":
    status = check_calibration_status()
    
    if status is None:
        print("❌ No saved calibration found")
        print(f"\nTo calibrate your sensor, run:")
        print("  ./calibrate_sensor.py")
    else:
        print(format_calibration_status(status))
        
        if not status.is_fully_calibrated:
            print("\nTo recalibrate:")
            print("  ./calibrate_sensor.py")
