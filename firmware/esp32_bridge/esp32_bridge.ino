/*
 * ESP-WROOM-32 — WiFi TCP Bridge for Teensy BNO055
 *
 * Receives sensor CSV data from Teensy 4.0 over UART2 and forwards it
 * to any connected TCP client (the Raspberry Pi) over WiFi.
 *
 * The Raspberry Pi connects to this device's TCP server and reads the
 * same DATA,... lines that the serial ArduinoSensor would read over USB.
 *
 * Wiring:
 *   Teensy TX1 (pin 1) -> ESP32 RX2 (GPIO16)
 *   Teensy RX1 (pin 0) <- ESP32 TX2 (GPIO17)   [optional, future use]
 *   Teensy GND         -- ESP32 GND
 *   Power ESP32 from USB or dedicated 3.3V/5V supply
 *
 * Arduino IDE setup:
 *   Board:          ESP32 Dev Module
 *   Upload Speed:   921600
 *   Partition:      Default 4MB with spiffs
 *
 *   Board Manager URL (File -> Preferences):
 *   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *
 * Configuration:
 *   Set WIFI_SSID, WIFI_PASSWORD, and TCP_PORT below.
 *   After flashing, open Serial Monitor at 115200 to find the assigned IP.
 *   Set that IP as esp32_host in config.json on the Raspberry Pi.
 */

#include <WiFi.h>

// ── USER CONFIGURATION ─────────────────────────────────────────────
#define WIFI_SSID "YourNetworkName"
#define WIFI_PASSWORD "YourNetworkPassword"
#define TCP_PORT 5005    // Must match esp32_port in config.json
#define UART_BAUD 115200 // Must match Teensy firmware
// ───────────────────────────────────────────────────────────────────

// UART2 pins for receiving from Teensy
#define RXD2 16
#define TXD2 17

WiFiServer server(TCP_PORT);
WiFiClient activeClient;

// ── Setup ───────────────────────────────────────────────────────────
void setup()
{
    // USB debug serial
    Serial.begin(115200);

    // UART2 — receive from Teensy
    Serial2.begin(UART_BAUD, SERIAL_8N1, RXD2, TXD2);

    Serial.println("\nESP32 WiFi Bridge starting...");

    // Connect to WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("TCP Port:   ");
    Serial.println(TCP_PORT);
    Serial.println("Set esp32_host in config.json to the IP address above.");

    server.begin();
    Serial.println("TCP server started — waiting for Raspberry Pi to connect...");
}

// ── Loop ────────────────────────────────────────────────────────────
void loop()
{
    // Reconnect WiFi if dropped
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi disconnected — reconnecting...");
        WiFi.reconnect();
        delay(1000);
        return;
    }

    // Accept a new client if none connected (single-client server)
    if (!activeClient || !activeClient.connected())
    {
        if (activeClient)
        {
            activeClient.stop();
            Serial.println("Client disconnected");
        }
        WiFiClient candidate = server.available();
        if (candidate)
        {
            activeClient = candidate;
            Serial.print("Raspberry Pi connected from: ");
            Serial.println(activeClient.remoteIP());
        }
    }

    // Forward any data arriving from Teensy to the TCP client
    while (Serial2.available())
    {
        char c = (char)Serial2.read();
        if (activeClient && activeClient.connected())
        {
            activeClient.print(c);
        }
        // Also echo to USB Serial for debugging
        Serial.print(c);
    }
}
