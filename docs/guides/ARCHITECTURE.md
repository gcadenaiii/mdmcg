# Architecture Overview

## Design Philosophy

This project follows **Unix philosophy** and **separation of concerns**:
- Each tool does one thing well
- Tools can be composed together
- Clear, explicit error messages
- No hidden magic or automatic fixes

## Components

### 1. Calibration Tool (`calibrate_sensor.py`)

**Responsibility:** Interactive sensor calibration only

**Features:**
- Real-time calibration progress display
- Visual progress bars with color coding
- Step-by-step instructions
- Saves calibration timestamp to `~/.bno055_calibration.json`

**Design Decisions:**
- Standalone tool - doesn't know about motion tracking
- Focused UI optimized for calibration task
- Saves status file for other tools to check
- Exits when calibration complete

**Usage:**
```bash
./calibrate_sensor.py
```

### 2. Motion Tracker (`motion_track.py`)

**Responsibility:** Track motion data only (requires calibrated sensor)

**Features:**
- Checks calibration status on startup
- **Exits gracefully** if sensor not calibrated
- Provides clear instructions for calibration
- Multiple modes: web, terminal, log

**Design Decisions:**
- Does NOT do calibration itself
- Explicit check at startup: calibrated or exit
- Clear error messages guide user to solution
- Single Responsibility Principle

**Calibration Check Logic:**
```python
def _check_calibration_or_exit(self):
    status = self.sensor.get_calibration_status()
    
    if all(level >= 2 for level in status.values()):
        # Show status, continue
        return
    
    # Show current levels, exit with instructions
    sys.exit(1)
```

**Usage:**
```bash
# Will check calibration first
./motion_track.py --mode web

# Exits if not calibrated with:
# "Please calibrate the sensor before tracking motion."
# "To calibrate, run: ./calibrate_sensor.py"
```

### 3. Calibration Checker (`check_calibration.py`)

**Responsibility:** Display calibration status

**Features:**
- Reads saved calibration file
- Shows calibration levels
- Displays calibration age
- No sensor connection required

**Design Decisions:**
- Read-only operation
- Works offline (reads file only)
- Fast status check

**Usage:**
```bash
./check_calibration.py
```

### 4. Hardware Diagnostic (`test_sensor_basic.py`)

**Responsibility:** Verify sensor hardware

**Features:**
- Tests I2C communication
- Shows raw sensor readings
- Calibration status
- Troubleshooting tips

**Usage:**
```bash
./test_sensor_basic.py
```

## Data Flow

```
User starts system
        ↓
run calibrate_sensor.py
        ↓
    [Calibration Process]
        ↓
Save status to ~/.bno055_calibration.json
        ↓
run motion_track.py
        ↓
Check calibration status
        ↓
    Calibrated? ──No──→ [Exit with instructions]
        ↓ Yes
    Track motion
```

## Why This Design?

### Before (Problems)

**Monolithic Approach:**
- `motion_track.py` tried to do everything
- Automatic calibration during startup
- Mixed concerns: tracking + calibration
- Long startup time
- Confusing when calibration failed
- Hard to test individual components

**User Experience Issues:**
- Waited for calibration every time
- Unclear if calibration was needed
- No way to pre-calibrate
- Calibration UI mixed with tracking UI

### After (Solutions)

**Separated Tools:**
- ✅ Each tool has one clear purpose
- ✅ Fast startup for motion tracking
- ✅ Calibration is explicit, intentional step
- ✅ Easy to understand what each tool does
- ✅ Better error messages
- ✅ Easier to test and maintain

**User Experience Improvements:**
- ✅ Clear workflow: calibrate → track
- ✅ Can calibrate once, track many times
- ✅ Explicit feedback on calibration status
- ✅ No waiting if already calibrated
- ✅ Clear instructions when calibration needed

## Pythonic Principles Applied

### 1. Explicit is Better Than Implicit
```python
# Bad: Automatic calibration
tracker.setup()  # What happens? Unknown...

# Good: Explicit check with clear outcome
tracker._check_calibration_or_exit()  # Calibrated or exit
```

### 2. Errors Should Never Pass Silently
```python
# Bad: Continue with bad calibration
if not calibrated:
    print("Warning: not calibrated")
    # continue anyway...

# Good: Fail fast with actionable message
if not calibrated:
    print("To calibrate, run: ./calibrate_sensor.py")
    sys.exit(1)
```

### 3. Simple is Better Than Complex
```python
# Bad: Complex calibration logic in tracker
class MotionTracker:
    def setup(self):
        # 100+ lines of calibration code
        # Mixed with tracking setup
        
# Good: Separate concerns
class MotionTracker:
    def setup(self):
        self._check_calibration_or_exit()  # Simple
        # Only tracking setup here
```

### 4. Readability Counts
```python
# Method name tells you exactly what it does
def _check_calibration_or_exit(self):
    """Check if sensor is calibrated, exit with instructions if not."""
```

## File Structure

```
~/.bno055_calibration.json    # Calibration status file
├── status: dict              # Calibration levels
├── timestamp: float          # When calibrated

applications/motion_tracking/logs/
└── motion_data_*.h5          # Motion tracking data
    ├── calibration/          # Calibration snapshot
    ├── time                  # Timestamps
    ├── euler                 # Orientation
    ├── linear_accel          # Acceleration
    ├── position              # Position estimates
    └── velocity              # Velocity estimates
```

## Extension Points

### Adding New Sensors

1. Implement sensor class in `sensors/`
2. Inherit from `SensorBase`
3. Implement calibration methods if needed
4. Create sensor-specific calibration tool if needed

### Adding New Tracking Modes

1. Add mode to `motion_track.py` argument parser
2. Implement mode in tracker or separate module
3. Ensure calibration check happens first

### Adding New Visualizations

1. Extend `visualization.py`
2. Add new routes to `web/server.py`
3. Add frontend in `web/static/`

## Testing Strategy

### Unit Tests
- Test each component independently
- Mock sensor for testing tracker logic
- Test calibration file reading/writing

### Integration Tests
- Test workflow: calibrate → track
- Test error cases: uncalibrated sensor
- Test file generation and formats

### Manual Testing
```bash
# Test calibration
./calibrate_sensor.py

# Test status check
./check_calibration.py

# Test tracking with calibration
./motion_track.py --mode web

# Test tracking without calibration (should exit)
rm ~/.bno055_calibration.json
./motion_track.py --mode web  # Should exit with message
```

## Future Improvements

1. **Calibration Profiles**: Save multiple calibration profiles
2. **Auto-Detect**: Detect sensor power cycle and warn
3. **Calibration Validation**: Check if calibration degraded
4. **Remote Calibration**: Calibrate via web interface
5. **Calibration Transfer**: Export/import calibration data

## Conclusion

This architecture provides:
- **Clear separation** of concerns
- **Explicit** workflow
- **Better** user experience
- **Easier** maintenance
- **More** testable code
- **Pythonic** design

Each tool does one thing well, and they compose together naturally.
