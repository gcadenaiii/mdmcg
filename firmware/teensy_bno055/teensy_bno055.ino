/*
 * Teensy 4.0 — BNO055 Sensor Reader
 *
 * Reads BNO055 orientation data over I2C and streams it as CSV over
 * UART1 (Serial1) to the ESP-WROOM-32 bridge at 115200 baud.
 *
 * Data format (50 Hz):
 *   DATA,euler_x,euler_y,euler_z,accel_x,accel_y,accel_z,
 *        gyro_x,gyro_y,gyro_z,lin_x,lin_y,lin_z,
 *        cal_sys,cal_gyro,cal_accel,cal_mag
 *
 * Wiring:
 *   BNO055 VIN  -> Teensy 3.3V
 *   BNO055 GND  -> Teensy GND
 *   BNO055 SDA  -> Teensy SDA (pin 18)
 *   BNO055 SCL  -> Teensy SCL (pin 19)
 *
 *   ESP32 RX2 (GPIO16) <- Teensy TX1 (pin 1)
 *   ESP32 TX2 (GPIO17) -> Teensy RX1 (pin 0)   [optional, for future commands]
 *   ESP32 GND          -- Teensy GND
 *
 * Required Libraries (Arduino IDE Library Manager):
 *   - Adafruit BNO055
 *   - Adafruit Unified Sensor
 *
 * Board: Teensyduino -> Teensy 4.0
 * USB Type: Serial (for debug output on USB Serial)
 */

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>

// ── Configuration ──────────────────────────────────────────────────
#define UART_BAUD 115200 // Must match ESP32 firmware
#define SAMPLE_RATE_HZ 50
#define SAMPLE_MS (1000 / SAMPLE_RATE_HZ)

// BNO055 I2C address pin (ADR low = 0x28, ADR high = 0x29)
#define BNO055_ADDRESS 0x28
// ───────────────────────────────────────────────────────────────────

Adafruit_BNO055 bno = Adafruit_BNO055(55, BNO055_ADDRESS);

bool sensorOk = false;
unsigned long lastSample = 0;

// ── Setup ───────────────────────────────────────────────────────────
void setup()
{
    // USB Serial for debug messages
    Serial.begin(115200);

    // UART1 to ESP32
    Serial1.begin(UART_BAUD);

    delay(500);
    Serial.println("Teensy BNO055 bridge starting...");

    Wire.begin();

    if (!bno.begin())
    {
        Serial.println("ERROR: BNO055 not detected — check wiring!");
        // Keep retrying so we recover if sensor is connected later
        while (!bno.begin())
        {
            delay(2000);
            Serial.println("Retrying BNO055 init...");
        }
    }

    bno.setExtCrystalUse(true);
    delay(100);

    sensorOk = true;
    Serial.println("BNO055 OK — streaming data over Serial1");
}

// ── Helpers ─────────────────────────────────────────────────────────

void streamData()
{
    // Euler angles (degrees) - use default getEvent() like Arduino firmware does
    sensors_event_t euler_event;
    bno.getEvent(&euler_event); // No VECTOR_EULER - matches Arduino behavior

    // Raw acceleration (m/s²) - use getVector like Arduino
    imu::Vector<3> accel = bno.getVector(Adafruit_BNO055::VECTOR_ACCELEROMETER);

    // Gyroscope (rad/s) - use getVector like Arduino
    imu::Vector<3> gyro = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);

    // Linear acceleration (m/s², gravity removed) - use getVector like Arduino
    imu::Vector<3> linear_accel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);

    // Calibration status
    uint8_t cal_sys, cal_gyro, cal_accel, cal_mag;
    bno.getCalibration(&cal_sys, &cal_gyro, &cal_accel, &cal_mag);

    // Build CSV line (matches ArduinoSensor 16-value format)
    char buf[160];
    snprintf(buf, sizeof(buf),
             "DATA,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%d,%d,%d,%d",
             euler_event.orientation.x,
             euler_event.orientation.y,
             euler_event.orientation.z,
             accel.x(),
             accel.y(),
             accel.z(),
             gyro.x(),
             gyro.y(),
             gyro.z(),
             linear_accel.x(),
             linear_accel.y(),
             linear_accel.z(),
             cal_sys, cal_gyro, cal_accel, cal_mag);

    // Send to ESP32 over UART1 and also mirror to USB Serial for debugging
    Serial1.println(buf);
    Serial.println(buf);
}

// ── Loop ────────────────────────────────────────────────────────────
void loop()
{
    if (!sensorOk)
        return;

    unsigned long now = millis();
    if (now - lastSample >= SAMPLE_MS)
    {
        lastSample = now;
        streamData();
    }
}
