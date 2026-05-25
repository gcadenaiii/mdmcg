/*
 * ESP-WROOM-32 — BLE Bridge for Teensy BNO055
 *
 * Receives sensor CSV data from Teensy 4.0 over UART2 and advertises it
 * as a BLE GATT service so the Raspberry Pi gateway can connect wirelessly.
 *
 * This replaces the WiFi TCP bridge (esp32_bridge.ino) with BLE for:
 *   - Lower power consumption
 *   - No WiFi configuration needed (patient-friendly)
 *   - Automatic connection when Pi comes in range
 *
 * Data flow:
 *   BNO055 --I2C--> Teensy 4.0 --UART--> ESP32 --BLE--> Raspberry Pi
 *
 * The BLE service uses the same UUIDs as the Arduino Nano 33 BLE firmware
 * for compatibility with the existing BLE sensor code on the Pi.
 *
 * Wiring (same as WiFi bridge):
 *   Teensy TX1 (pin 1) -> ESP32 RX2 (GPIO16)
 *   Teensy RX1 (pin 0) <- ESP32 TX2 (GPIO17)  [optional]
 *   Teensy GND         -- ESP32 GND
 *   Power ESP32 from USB or dedicated 3.3V/5V supply
 *
 * Arduino IDE setup:
 *   Board:     ESP32 Dev Module
 *   Board Manager URL:
 *     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *
 * Required library:
 *   ESP32 BLE Arduino (included with ESP32 board package)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── USER CONFIGURATION ─────────────────────────────────────────────
#define BLE_DEVICE_NAME "ESP32_BNO055"     // Name the Pi scans for
#define UART_BAUD       115200             // Must match Teensy firmware
#define NOTIFY_INTERVAL_MS 50              // 20 Hz notification rate
// ───────────────────────────────────────────────────────────────────

// BLE UUIDs — same as Arduino Nano 33 BLE firmware for Pi compatibility
#define SERVICE_UUID        "19B10000-E8F2-537E-4F6C-D104768A1214"
#define DATA_CHAR_UUID      "19B10001-E8F2-537E-4F6C-D104768A1214"
#define COMMAND_CHAR_UUID   "19B10002-E8F2-537E-4F6C-D104768A1214"

// UART2 pins for receiving from Teensy
#define RXD2 16
#define TXD2 17

// ── Globals ─────────────────────────────────────────────────────────
BLECharacteristic *dataCharacteristic = nullptr;
BLECharacteristic *commandCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;
String latestLine = "";
unsigned long lastNotifyMs = 0;

// ── BLE callbacks ───────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *pServer) override {
        deviceConnected = true;
        Serial.println("BLE: Raspberry Pi connected");
    }
    void onDisconnect(BLEServer *pServer) override {
        deviceConnected = false;
        Serial.println("BLE: Raspberry Pi disconnected");
    }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) override {
        String cmd = pCharacteristic->getValue().c_str();
        Serial.print("BLE command received: ");
        Serial.println(cmd);

        // Forward command to Teensy if needed (future use)
        Serial2.println(cmd);
    }
};

// ── Setup ───────────────────────────────────────────────────────────
void setup() {
    // USB debug serial
    Serial.begin(115200);
    Serial.println("\nESP32 BLE Bridge starting...");

    // UART2 — receive from Teensy
    Serial2.begin(UART_BAUD, SERIAL_8N1, RXD2, TXD2);

    // Initialize BLE
    BLEDevice::init(BLE_DEVICE_NAME);
    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    // Create BLE service
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Data characteristic — notify the Pi with sensor CSV lines
    dataCharacteristic = pService->createCharacteristic(
        DATA_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    dataCharacteristic->addDescriptor(new BLE2902());

    // Command characteristic — receive commands from Pi
    commandCharacteristic = pService->createCharacteristic(
        COMMAND_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE
    );
    commandCharacteristic->setCallbacks(new CommandCallbacks());

    // Start
    pService->start();

    // Start advertising
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // connection interval hints
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.print("BLE advertising as: ");
    Serial.println(BLE_DEVICE_NAME);
    Serial.println("Waiting for Raspberry Pi to connect...");
}

// ── Loop ────────────────────────────────────────────────────────────
void loop() {
    // Read complete lines from Teensy UART
    while (Serial2.available()) {
        char c = Serial2.read();
        if (c == '\n') {
            latestLine.trim();
            if (latestLine.startsWith("DATA,")) {
                // Send via BLE if connected and interval elapsed
                if (deviceConnected) {
                    unsigned long now = millis();
                    if (now - lastNotifyMs >= NOTIFY_INTERVAL_MS) {
                        // BLE characteristic max is typically 512 bytes;
                        // our CSV line is ~120 chars — fits easily.
                        dataCharacteristic->setValue(latestLine.c_str());
                        dataCharacteristic->notify();
                        lastNotifyMs = now;
                    }
                }
            }
            latestLine = "";
        } else {
            latestLine += c;
        }
    }

    // Handle reconnection — restart advertising after disconnect
    if (!deviceConnected && oldDeviceConnected) {
        delay(500);  // give BLE stack time to clean up
        BLEDevice::startAdvertising();
        Serial.println("BLE: Restarted advertising");
    }
    oldDeviceConnected = deviceConnected;
}
