/*
 * Arduino BNO055 Sensor Integration for Sensors Lab
 *
 * This sketch provides production-ready integration between Arduino and
 * the Sensors Lab platform. It continuously streams BNO055 sensor data
 * over USB Serial or Bluetooth Low Energy (BLE).
 *
 * Communication Mode:
 *   Set USE_BLE to true for BLE mode, false for Serial mode
 *
 * Hardware Requirements:
 *   - Arduino Nano 33 BLE (required for BLE support)
 *   - BNO055 9-axis IMU sensor breakout board
 *   - USB cable for power (and Serial communication)
 *
 * Wiring (I2C):
 *   BNO055 VIN  -> Arduino 3.3V
 *   BNO055 GND  -> Arduino GND
 *   BNO055 SDA  -> Arduino A4 (SDA)
 *   BNO055 SCL  -> Arduino A5 (SCL)
 *
 * Required Libraries:
 *   - Adafruit BNO055 (Install via Arduino Library Manager)
 *   - Adafruit Unified Sensor (dependency, auto-installed)
 *   - ArduinoBLE (for BLE mode only)
 *
 * Installation:
 * 1. Install libraries: Sketch -> Include Library -> Manage Libraries
 *    Search "Adafruit BNO055" and "ArduinoBLE", click Install
 * 2. Set USE_BLE below to choose communication mode
 * 3. Open this file in Arduino IDE
 * 4. Select: Tools -> Board -> Arduino Nano 33 BLE
 * 5. Select: Tools -> Port -> (your Arduino's port)
 * 6. Click Upload
 *
 * Configuration:
 *   For Serial mode, configure config.json:
 *   {"sensor": {"sensor_type": "arduino", "arduino_port": null}}
 *
 *   For BLE mode, configure config.json:
 *   {"sensor": {"sensor_type": "arduino_ble", "ble_device_name": "BNO055_Sensor"}}
 *
 * Data Format:
 *   CSV format at 50Hz sampling rate
 *   Format: DATA,euler_x,euler_y,euler_z,accel_x,accel_y,accel_z,
 *                gyro_x,gyro_y,gyro_z,lin_x,lin_y,lin_z,
 *                cal_sys,cal_gyro,cal_accel,cal_mag
 *
 * Author: Sensors Lab Team
 * Version: 2.0
 * Date: October 2025
 */

// ============== CONFIGURATION ==============
// Set to true for BLE, false for Serial
#define USE_BLE false
#define BLE_DEVICE_NAME "BNO055_Sensor"
// ==========================================

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>

#if USE_BLE
#include <ArduinoBLE.h>

// BLE Service and Characteristic UUIDs
#define BLE_SERVICE_UUID "19B10000-E8F2-537E-4F6C-D104768A1214"
#define BLE_DATA_CHAR_UUID "19B10001-E8F2-537E-4F6C-D104768A1214"
#define BLE_COMMAND_CHAR_UUID "19B10002-E8F2-537E-4F6C-D104768A1214"

BLEService sensorService(BLE_SERVICE_UUID);
BLEStringCharacteristic dataCharacteristic(BLE_DATA_CHAR_UUID, BLERead | BLENotify, 100);
BLEStringCharacteristic commandCharacteristic(BLE_COMMAND_CHAR_UUID, BLEWrite, 50);
#endif

// Configuration
#define SERIAL_BAUD 115200
#define SAMPLE_RATE_HZ 50
#define SAMPLE_INTERVAL_MS (1000 / SAMPLE_RATE_HZ)
#define BNO055_SAMPLERATE_DELAY_MS 10 // Minimum delay between sensor reads

// Create BNO055 instance
// Using default I2C address (0x28)
Adafruit_BNO055 bno = Adafruit_BNO055(55);

// Timing
unsigned long lastSampleTime = 0;

// Error tracking
bool sensorInitialized = false;
unsigned long errorCount = 0;

void setup()
{
    // Initialize serial communication (always for debugging)
    Serial.begin(SERIAL_BAUD);

#if !USE_BLE
    // Wait for serial port to connect (Serial mode only)
    while (!Serial)
    {
        delay(10);
    }
#endif

    // Brief startup delay
    delay(500);

#if USE_BLE
    // Initialize BLE
    if (!BLE.begin())
    {
        Serial.println("ERROR: Failed to initialize BLE");
        while (1)
            ; // Halt
    }

    // Set advertised local name and service
    BLE.setLocalName(BLE_DEVICE_NAME);
    BLE.setAdvertisedService(sensorService);

    // Add characteristics to service
    sensorService.addCharacteristic(dataCharacteristic);
    sensorService.addCharacteristic(commandCharacteristic);

    // Add service
    BLE.addService(sensorService);

    // Start advertising
    BLE.advertise();

    Serial.print("BLE device active, name: ");
    Serial.println(BLE_DEVICE_NAME);
#else
    Serial.println("Serial mode active");
#endif

    // Initialize I2C
    Wire.begin();

    // Initialize BNO055 sensor
    sensorInitialized = initializeSensor();

    if (!sensorInitialized)
    {
        // If initialization fails, we'll keep trying in the loop
        Serial.println("ERROR: Sensor initialization failed - will retry");
    }
}

bool initializeSensor()
{
    // Attempt to initialize the BNO055 sensor
    if (!bno.begin())
    {
        return false;
    }

    // Configure sensor for optimal performance
    // Use external crystal for better accuracy
    bno.setExtCrystalUse(true);

    // Brief delay to let sensor stabilize
    delay(100);

    return true;
}

void loop()
{
#if USE_BLE
    // Listen for BLE central connections
    BLEDevice central = BLE.central();

    if (central)
    {
        Serial.print("Connected to central: ");
        Serial.println(central.address());

        while (central.connected())
        {
            // If sensor not initialized, retry
            if (!sensorInitialized)
            {
                sensorInitialized = initializeSensor();
                if (!sensorInitialized)
                {
                    delay(1000);
                    continue;
                }
                Serial.println("STATUS: Sensor initialized successfully");
            }

            // Check for incoming commands
            if (commandCharacteristic.written())
            {
                processCommandBLE();
            }

            // Check if it's time for next sample
            unsigned long currentTime = millis();
            if (currentTime - lastSampleTime >= SAMPLE_INTERVAL_MS)
            {
                lastSampleTime = currentTime;
                streamSensorDataBLE();
            }
        }

        Serial.println("Disconnected from central");
    }
#else
    // Serial mode
    // If sensor not initialized, retry
    if (!sensorInitialized)
    {
        sensorInitialized = initializeSensor();
        if (!sensorInitialized)
        {
            delay(1000); // Wait before retry
            return;
        }
        Serial.println("STATUS: Sensor initialized successfully");
    }

    // Check for incoming commands
    if (Serial.available() > 0)
    {
        processCommand();
    }

    // Check if it's time for next sample
    unsigned long currentTime = millis();
    if (currentTime - lastSampleTime >= SAMPLE_INTERVAL_MS)
    {
        lastSampleTime = currentTime;
        streamSensorData();
    }
#endif
}

void processCommand()
{
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "GET_OFFSETS")
    {
        sendCalibrationOffsets();
    }
    else if (command.startsWith("SET_OFFSETS:"))
    {
        setCalibrationOffsets(command.substring(12));
    }
}

#if USE_BLE
void processCommandBLE()
{
    String command = commandCharacteristic.value();
    command.trim();

    if (command == "GET_OFFSETS")
    {
        sendCalibrationOffsetsBLE();
    }
    else if (command.startsWith("SET_OFFSETS:"))
    {
        setCalibrationOffsets(command.substring(12));
        dataCharacteristic.writeValue("STATUS:Offsets applied successfully");
    }
}
#endif

void sendCalibrationOffsets()
{
    adafruit_bno055_offsets_t offsets;
    if (bno.getSensorOffsets(offsets))
    {
        Serial.print("OFFSETS:");
        Serial.print(offsets.accel_offset_x);
        Serial.print(",");
        Serial.print(offsets.accel_offset_y);
        Serial.print(",");
        Serial.print(offsets.accel_offset_z);
        Serial.print(",");
        Serial.print(offsets.gyro_offset_x);
        Serial.print(",");
        Serial.print(offsets.gyro_offset_y);
        Serial.print(",");
        Serial.print(offsets.gyro_offset_z);
        Serial.print(",");
        Serial.print(offsets.mag_offset_x);
        Serial.print(",");
        Serial.print(offsets.mag_offset_y);
        Serial.print(",");
        Serial.print(offsets.mag_offset_z);
        Serial.print(",");
        Serial.print(offsets.accel_radius);
        Serial.print(",");
        Serial.println(offsets.mag_radius);
    }
    else
    {
        Serial.println("ERROR:Failed to read offsets");
    }
}

#if USE_BLE
void sendCalibrationOffsetsBLE()
{
    adafruit_bno055_offsets_t offsets;
    if (bno.getSensorOffsets(offsets))
    {
        String response = "OFFSETS:";
        response += String(offsets.accel_offset_x) + ",";
        response += String(offsets.accel_offset_y) + ",";
        response += String(offsets.accel_offset_z) + ",";
        response += String(offsets.gyro_offset_x) + ",";
        response += String(offsets.gyro_offset_y) + ",";
        response += String(offsets.gyro_offset_z) + ",";
        response += String(offsets.mag_offset_x) + ",";
        response += String(offsets.mag_offset_y) + ",";
        response += String(offsets.mag_offset_z) + ",";
        response += String(offsets.accel_radius) + ",";
        response += String(offsets.mag_radius);

        dataCharacteristic.writeValue(response);
    }
    else
    {
        dataCharacteristic.writeValue("ERROR:Failed to read offsets");
    }
}
#endif

void setCalibrationOffsets(String offsetData)
{
    // Parse comma-separated offset values
    adafruit_bno055_offsets_t offsets;

    int values[11];
    int index = 0;
    int startPos = 0;

    // Parse comma-separated values
    for (int i = 0; i < 11; i++)
    {
        int commaPos = offsetData.indexOf(',', startPos);
        if (commaPos == -1 && i < 10)
        {
            Serial.println("ERROR:Invalid offset format");
            return;
        }

        String valueStr = (commaPos == -1) ? offsetData.substring(startPos) : offsetData.substring(startPos, commaPos);
        values[i] = valueStr.toInt();
        startPos = commaPos + 1;
    }

    // Assign values to offset structure
    offsets.accel_offset_x = values[0];
    offsets.accel_offset_y = values[1];
    offsets.accel_offset_z = values[2];
    offsets.gyro_offset_x = values[3];
    offsets.gyro_offset_y = values[4];
    offsets.gyro_offset_z = values[5];
    offsets.mag_offset_x = values[6];
    offsets.mag_offset_y = values[7];
    offsets.mag_offset_z = values[8];
    offsets.accel_radius = values[9];
    offsets.mag_radius = values[10];

    // Apply offsets to sensor (setSensorOffsets returns void, not bool)
    bno.setSensorOffsets(offsets);
    Serial.println("STATUS:Offsets applied successfully");
}

void streamSensorData()
{
    // Get calibration status
    uint8_t cal_sys, cal_gyro, cal_accel, cal_mag;
    cal_sys = cal_gyro = cal_accel = cal_mag = 0;
    bno.getCalibration(&cal_sys, &cal_gyro, &cal_accel, &cal_mag);

    // Get Euler angles (orientation in degrees)
    sensors_event_t orientationData;
    bno.getEvent(&orientationData);

    // Get raw acceleration (includes gravity, m/s²)
    imu::Vector<3> accel = bno.getVector(Adafruit_BNO055::VECTOR_ACCELEROMETER);

    // Get gyroscope data (rad/s)
    imu::Vector<3> gyro = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);

    // Get linear acceleration (gravity removed, m/s²)
    imu::Vector<3> linear_accel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

    // Send data in CSV format
    // Format: DATA,euler_x,euler_y,euler_z,accel_x,accel_y,accel_z,
    //              gyro_x,gyro_y,gyro_z,lin_x,lin_y,lin_z,
    //              cal_sys,cal_gyro,cal_accel,cal_mag
    Serial.print("DATA,");

    // Euler angles (heading, roll, pitch in degrees)
    Serial.print(orientationData.orientation.x, 2);
    Serial.print(",");
    Serial.print(orientationData.orientation.y, 2);
    Serial.print(",");
    Serial.print(orientationData.orientation.z, 2);
    Serial.print(",");

    // Raw acceleration (includes gravity)
    Serial.print(accel.x(), 2);
    Serial.print(",");
    Serial.print(accel.y(), 2);
    Serial.print(",");
    Serial.print(accel.z(), 2);
    Serial.print(",");

    // Gyroscope (angular velocity)
    Serial.print(gyro.x(), 2);
    Serial.print(",");
    Serial.print(gyro.y(), 2);
    Serial.print(",");
    Serial.print(gyro.z(), 2);
    Serial.print(",");

    // Linear acceleration (gravity removed)
    Serial.print(linear_accel.x(), 2);
    Serial.print(",");
    Serial.print(linear_accel.y(), 2);
    Serial.print(",");
    Serial.print(linear_accel.z(), 2);
    Serial.print(",");

    // Calibration status (0-3 for each subsystem)
    Serial.print(cal_sys);
    Serial.print(",");
    Serial.print(cal_gyro);
    Serial.print(",");
    Serial.print(cal_accel);
    Serial.print(",");
    Serial.println(cal_mag);

    // Add minimal delay to ensure stable readings
    delay(BNO055_SAMPLERATE_DELAY_MS);
}

#if USE_BLE
void streamSensorDataBLE()
{
    // Get calibration status
    uint8_t cal_sys, cal_gyro, cal_accel, cal_mag;
    cal_sys = cal_gyro = cal_accel = cal_mag = 0;
    bno.getCalibration(&cal_sys, &cal_gyro, &cal_accel, &cal_mag);

    // Get Euler angles (orientation in degrees)
    sensors_event_t orientationData;
    bno.getEvent(&orientationData);

    // Get raw acceleration (includes gravity, m/s²)
    imu::Vector<3> accel = bno.getVector(Adafruit_BNO055::VECTOR_ACCELEROMETER);

    // Get gyroscope data (rad/s)
    imu::Vector<3> gyro = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);

    // Get linear acceleration (gravity removed, m/s²)
    imu::Vector<3> linear_accel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

    // Build CSV string
    String data = "DATA,";

    // Euler angles
    data += String(orientationData.orientation.x, 2) + ",";
    data += String(orientationData.orientation.y, 2) + ",";
    data += String(orientationData.orientation.z, 2) + ",";

    // Raw acceleration
    data += String(accel.x(), 2) + ",";
    data += String(accel.y(), 2) + ",";
    data += String(accel.z(), 2) + ",";

    // Gyroscope
    data += String(gyro.x(), 2) + ",";
    data += String(gyro.y(), 2) + ",";
    data += String(gyro.z(), 2) + ",";

    // Linear acceleration
    data += String(linear_accel.x(), 2) + ",";
    data += String(linear_accel.y(), 2) + ",";
    data += String(linear_accel.z(), 2) + ",";

    // Calibration status
    data += String(cal_sys) + ",";
    data += String(cal_gyro) + ",";
    data += String(cal_accel) + ",";
    data += String(cal_mag);

    // Send via BLE
    dataCharacteristic.writeValue(data);

    // Add minimal delay to ensure stable readings
    delay(BNO055_SAMPLERATE_DELAY_MS);
}
#endif
