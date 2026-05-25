#!/usr/bin/env python3
"""
Convert H5 sensor logs to JSON format for web demo playback.

This script converts the recorded sensor data from HDF5 format to JSON,
making it accessible for the static GitHub Pages demo site.

Usage:
    python scripts/convert_logs_to_json.py <input.h5> <output.json> [--max-samples 2000]
"""

import h5py
import json
import argparse
from pathlib import Path


def convert_h5_to_json(h5_file: str, json_file: str, max_samples: int = 2000):
    """
    Convert H5 log file to JSON format for web playback.

    Args:
        h5_file: Path to input .h5 file
        json_file: Path to output .json file
        max_samples: Maximum number of samples to export (default: 2000 = 100 seconds at 20Hz)
    """
    print(f"Converting {h5_file} to {json_file}...")
    print(f"Max samples: {max_samples}")

    with h5py.File(h5_file, "r") as f:
        # Print available datasets
        print(f"\nAvailable datasets: {list(f.keys())}")

        # Access the motion_data group
        motion_group = f["motion_data"]
        print(f"Motion data keys: {list(motion_group.keys())}")

        # Get actual sample count
        timestamps = motion_group["time"][:]
        actual_samples = min(len(timestamps), max_samples)
        print(f"Total samples in file: {len(timestamps)}")
        print(f"Exporting: {actual_samples} samples")

        # Extract data
        orientation = motion_group["euler"][:actual_samples]  # [roll, pitch, yaw]
        linear_accel = motion_group["linear_accel"][:actual_samples]

        data = {
            "metadata": {
                "original_file": Path(h5_file).name,
                "sample_count": actual_samples,
                "total_duration_seconds": float(
                    timestamps[actual_samples - 1] - timestamps[0]
                ),
                "sample_rate_hz": 20,
            },
            "timestamps": timestamps[:actual_samples].tolist(),
            "orientation": {
                "roll": orientation[:, 0].tolist(),
                "pitch": orientation[:, 1].tolist(),
                "yaw": orientation[:, 2].tolist(),
            },
            "linear_acceleration": {
                "x": linear_accel[:, 0].tolist(),
                "y": linear_accel[:, 1].tolist(),
                "z": linear_accel[:, 2].tolist(),
            },
        }

        # Add optional datasets if they exist
        if "velocity" in motion_group:
            velocity = motion_group["velocity"][:actual_samples]
            data["velocity"] = {
                "x": velocity[:, 0].tolist(),
                "y": velocity[:, 1].tolist(),
                "z": velocity[:, 2].tolist(),
            }

        if "position" in motion_group:
            position = motion_group["position"][:actual_samples]
            data["position"] = {
                "x": position[:, 0].tolist(),
                "y": position[:, 1].tolist(),
                "z": position[:, 2].tolist(),
            }

    # Write JSON
    with open(json_file, "w") as f:
        json.dump(data, f, indent=2)

    # Calculate file size
    json_size = Path(json_file).stat().st_size / 1024  # KB
    print(f"\n✓ Conversion complete!")
    print(f"  Output: {json_file}")
    print(f"  Size: {json_size:.1f} KB")
    print(f"  Duration: {data['metadata']['total_duration_seconds']:.1f} seconds")


def main():
    parser = argparse.ArgumentParser(
        description="Convert H5 sensor logs to JSON for web demo"
    )
    parser.add_argument("input", help="Input .h5 file")
    parser.add_argument("output", help="Output .json file")
    parser.add_argument(
        "--max-samples",
        type=int,
        default=2000,
        help="Maximum number of samples to export (default: 2000)",
    )

    args = parser.parse_args()

    # Validate input file exists
    if not Path(args.input).exists():
        print(f"Error: Input file not found: {args.input}")
        return 1

    # Convert
    try:
        convert_h5_to_json(args.input, args.output, args.max_samples)
        return 0
    except Exception as e:
        print(f"Error during conversion: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
