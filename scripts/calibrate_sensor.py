#!/usr/bin/env python3
"""
Interactive BNO055 calibration tool.

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

from utils.calibration import (
    calibrate_sensor,
    save_arduino_calibration,
    check_calibration_status,
)
from sensors.factory import create_sensor
from sensors.arduino_sensor import ArduinoSensor
from config import get_config


def main():
    """Main calibration entry point that handles both sensor types."""
    config = get_config()

    # Check if we're using Arduino sensor (serial or BLE)
    if (
        config.sensor.sensor_type in ["arduino", "arduino_ble"]
        and config.sensor.mode == "real"
    ):
        sensor_mode = "BLE" if config.sensor.sensor_type == "arduino_ble" else "Serial"
        print(f"Detected Arduino sensor configuration ({sensor_mode})")
        print("\nCalibrating Arduino BNO055 sensor...")
        print("Please move the sensor through various orientations")
        print("until all calibration values reach 3/3\n")

        # Create and connect to Arduino sensor
        sensor = create_sensor()
        if not sensor.connect():
            print("✗ Failed to connect to Arduino sensor")
            return 1

        try:
            # Monitor calibration interactively
            import time

            last_status = None
            tips_shown = set()

            while True:
                status_dict = sensor.get_calibration_status()
                current_status = (
                    status_dict["system"],
                    status_dict["gyroscope"],
                    status_dict["accelerometer"],
                    status_dict["magnetometer"],
                )

                # Only print when status changes
                if current_status != last_status:
                    print(
                        f"\rSystem: {status_dict['system']}/3  "
                        f"Gyro: {status_dict['gyroscope']}/3  "
                        f"Accel: {status_dict['accelerometer']}/3  "
                        f"Mag: {status_dict['magnetometer']}/3",
                        end="",
                        flush=True,
                    )

                    # Show helpful tips when values improve
                    if last_status:
                        if (
                            status_dict["accelerometer"] > last_status[2]
                            and status_dict["accelerometer"] < 3
                        ):
                            if "accel" not in tips_shown:
                                print(
                                    "\n  → Accel improving! Continue moving through 6 orientations",
                                    end="",
                                )
                                tips_shown.add("accel")
                        if (
                            status_dict["magnetometer"] > last_status[3]
                            and status_dict["magnetometer"] < 3
                        ):
                            if "mag" not in tips_shown:
                                print(
                                    "\n  → Mag improving! Continue figure-8 motion",
                                    end="",
                                )
                                tips_shown.add("mag")

                    last_status = current_status

                # Check if fully calibrated
                if all(v == 3 for v in current_status):
                    print("\n\n✓ CALIBRATION COMPLETE!")

                    # Save calibration offsets
                    from utils.calibration import CalibrationStatus

                    status = CalibrationStatus(**status_dict)
                    if save_arduino_calibration(sensor, status):
                        print("\n✓ Calibration offsets saved")
                        print("  Will be restored automatically on next startup")
                        print("  No need to recalibrate after power cycles!")
                    break

                time.sleep(0.5)

        except KeyboardInterrupt:
            print("\n\nCalibration interrupted.")
            return 1
        finally:
            sensor.disconnect()

    else:
        # Use standard BNO055 calibration
        try:
            calibrate_sensor()
        except KeyboardInterrupt:
            print("\n\nCalibration interrupted.")
            return 1
        except Exception as e:
            print(f"\nError: {e}")
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
