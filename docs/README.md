# Documentation

Technical documentation for Sensors Lab motion tracking system.

## Quick Links

- **[Architecture Guide](guides/ARCHITECTURE.md)** - System design, components, and data flow
- **[Configuration](features/CONFIGURATION.md)** - Profile-based configuration system
- **[Dynamic Sensor Switching](features/DYNAMIC_SENSOR_SWITCHING.md)** - Runtime sensor mode changes
- **[Arduino Integration](arduino/)** - Arduino firmware and setup guides
- **[Windows Dev Quick Start](guides/WINDOWS_DEV_QUICKSTART.md)** - Local development setup on Windows
- **[Lightsail Quick Start](guides/LIGHTSAIL_QUICKSTART.md)** - Cloud backend deployment on AWS Lightsail
- **[Pi Gateway Quick Start](guides/PI_GATEWAY_QUICKSTART.md)** - Raspberry Pi gateway setup and service install

## Documentation Structure

```
docs/
├── features/           # Feature documentation
│   ├── CONFIGURATION.md
│   └── DYNAMIC_SENSOR_SWITCHING.md
├── guides/            # Technical guides
│   ├── ARCHITECTURE.md
│   ├── WINDOWS_DEV_QUICKSTART.md
│   ├── LIGHTSAIL_QUICKSTART.md
│   └── PI_GATEWAY_QUICKSTART.md
├── arduino/           # Arduino-specific documentation
│   ├── README.md
│   └── examples/
├── hardware/          # Hardware setup and troubleshooting
│   ├── ARDUINO_TROUBLESHOOTING.md
│   └── BNO055_ARDUINO_WIRING.md
└── archive/           # Historical documentation and tutorials
    ├── getting-started/
    └── design_history/
```

## Core Documentation

### System Architecture
[`guides/ARCHITECTURE.md`](guides/ARCHITECTURE.md) covers:
- Component overview
- Data flow and processing
- Sensor abstraction layer
- Web server architecture
- WebSocket communication

### Configuration System
[`features/CONFIGURATION.md`](features/CONFIGURATION.md) explains:
- Profile-based configuration
- Sensor mode and type selection
- Runtime configuration changes
- Configuration file structure

### Arduino Integration
[`arduino/README.md`](arduino/README.md) provides:
- Firmware overview
- Upload instructions
- Serial and BLE protocols
- Troubleshooting guides

## Hardware Documentation

- **[BNO055 Arduino Wiring](hardware/BNO055_ARDUINO_WIRING.md)** - Connection diagrams and pin mappings
- **[Arduino Troubleshooting](hardware/ARDUINO_TROUBLESHOOTING.md)** - Common issues and solutions

## Archived Documentation

Historical documentation and detailed tutorials are available in [`archive/`](archive/):

- **Getting Started Guides** - Step-by-step setup tutorials (moved from getting-started/)
- **Design History** - Evolution of the system architecture and features

## Additional Resources

- **Main README**: [`../README.md`](../README.md)
- **Arduino Firmware**: [`../arduino/`](../arduino/)
- **Example Code**: [`../examples/`](../examples/)
- **Scripts**: [`../scripts/`](../scripts/)

## Contributing to Documentation

When adding documentation:

1. **Production docs** go in `features/`, `guides/`, or `hardware/`
2. **Tutorials and walkthroughs** go in `archive/getting-started/`
3. **Historical/design docs** go in `archive/design_history/`
4. Keep production docs concise and professional
5. Use clear headings and code examples
6. Update this index when adding new files

---

For questions or issues with documentation, please open an issue on GitHub.
