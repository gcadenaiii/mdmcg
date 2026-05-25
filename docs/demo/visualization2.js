// Design Option 2 - Dashboard Layout Visualization
// This handles the WebSocket connection and updates for the Tailwind-based dashboard

class MotionTrackerDashboard {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.dataBuffer = [];
        this.stepCount = 0;
        this.lastUpdateTime = Date.now();
        this.lastDataTime = null;  // Track when we last received data
        this.dataRate = 0;
        this.updateCounter = 0;

        // Step detection state machine - tuned parameters
        this.stepState = 'WAITING';  // States: WAITING, LIFT_DETECTED, WAITING_IMPACT, STEP_COMPLETE, COOLDOWN
        this.peakAcceleration = 0;
        this.lastStepTime = 0;
        this.stepCooldown = 0;

        // Balanced thresholds - not too sensitive, not too strict
        this.STEP_LIFT_THRESHOLD = 1.5;       // m/s² - foot lift acceleration
        this.STEP_IMPACT_THRESHOLD = 1.5;     // m/s² - foot impact spike
        this.STEP_QUIET_THRESHOLD = 1.0;      // m/s² - quiet period between phases
        this.MIN_STEP_INTERVAL = 300;         // ms - minimum time between steps (prevents double-counting)
        this.COOLDOWN_FRAMES = 15;            // ~0.75 second cooldown between steps (matches Debug View)
        this.framesSinceLift = 0;

        this.initializeElements();
        this.connectWebSocket();
    }

    initializeElements() {
        this.elements = {
            exportBtn: document.getElementById('exportBtn2'),
            connectionStatus: document.getElementById('connectionStatus2'),
            connectionText: document.getElementById('connectionText2'),
            orientationCube: document.getElementById('orientationCube2'),
            rollValue: document.getElementById('rollValue2'),
            pitchValue: document.getElementById('pitchValue2'),
            yawValue: document.getElementById('yawValue2'),
            accelX: document.getElementById('accelX2'),
            accelY: document.getElementById('accelY2'),
            accelZ: document.getElementById('accelZ2'),
            accelXBar: document.getElementById('accelXBar2'),
            accelYBar: document.getElementById('accelYBar2'),
            accelZBar: document.getElementById('accelZBar2'),
            totalAccel: document.getElementById('totalAccel2'),
            gyroX: document.getElementById('gyroX2'),
            gyroY: document.getElementById('gyroY2'),
            gyroZ: document.getElementById('gyroZ2'),
            stepCount: document.getElementById('stepCount2'),
            dataRate: document.getElementById('dataRate2'),
            temperature: document.getElementById('temperature2'),
            sysCal: document.getElementById('sysCal2'),
            gyroCal: document.getElementById('gyroCal2'),
            accelCal: document.getElementById('accelCal2'),
            magCal: document.getElementById('magCal2'),
            dataLog: document.getElementById('dataLog2'),
            sensorStatus: document.getElementById('sensorStatus2')
        };

        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportData());
        }
    }

    connectWebSocket() {
        // Only connect if Design 2 tab is visible or will be visible
        try {
            this.websocket = new WebSocket(`ws://${window.location.host}/ws`);

            this.websocket.onopen = () => {
                console.log('Design 2: WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus();
                this.logMessage('Connected to BNO055 sensor');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSensorData(data);
                } catch (error) {
                    console.error('Design 2: Error parsing WebSocket data:', error);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('Design 2: WebSocket error:', error);
                this.logMessage('Connection error occurred');
            };

            this.websocket.onclose = () => {
                console.log('Design 2: WebSocket closed');
                this.isConnected = false;
                this.updateConnectionStatus();
                this.logMessage('Disconnected from sensor');

                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
        } catch (error) {
            console.error('Design 2: Error creating WebSocket:', error);
        }
    }

    updateConnectionStatus() {
        if (!this.elements.connectionStatus || !this.elements.connectionText) return;

        // Check if we're receiving data (sensor is actually connected)
        const now = Date.now();
        const receivingData = this.lastDataTime && (now - this.lastDataTime < 2000);

        if (this.isConnected && receivingData) {
            this.elements.connectionStatus.className = 'status-indicator status-connected';
            this.elements.connectionText.textContent = 'Connected';
            if (this.elements.sensorStatus) {
                this.elements.sensorStatus.textContent = 'Connected - Streaming Data';
            }
        } else if (this.isConnected && !receivingData) {
            this.elements.connectionStatus.className = 'status-indicator status-warning';
            this.elements.connectionText.textContent = 'Sensor Not Connected';
            if (this.elements.sensorStatus) {
                this.elements.sensorStatus.textContent = 'WebSocket OK - Sensor Disconnected';
            }
        } else {
            this.elements.connectionStatus.className = 'status-indicator status-disconnected';
            this.elements.connectionText.textContent = 'Disconnected';
            if (this.elements.sensorStatus) {
                this.elements.sensorStatus.textContent = 'Disconnected';
            }
        }
    }

    handleSensorData(data) {
        // Track when we last received data
        this.lastDataTime = Date.now();

        // Update counter for data rate calculation
        this.updateCounter++;
        const now = Date.now(); if (now - this.lastUpdateTime >= 1000) {
            this.dataRate = this.updateCounter;
            if (this.elements.dataRate) {
                this.elements.dataRate.textContent = `${this.dataRate} Hz`;
            }
            this.updateCounter = 0;
            this.lastUpdateTime = now;

            // Update connection status periodically
            this.updateConnectionStatus();
        }

        // Use server-provided step count (no client-side detection needed)
        if (data.stepCount !== undefined) {
            this.stepCount = data.stepCount;
            if (this.elements.stepCount) {
                this.elements.stepCount.textContent = this.stepCount;
            }
        }

        // Update display with sensor data
        this.updateDisplay(data);

        // Store data for export
        this.dataBuffer.push({
            timestamp: Date.now(),
            ...data
        });

        // Keep buffer size manageable
        if (this.dataBuffer.length > 1000) {
            this.dataBuffer.shift();
        }
    }

    detectStep(acceleration) {
        // Calculate acceleration magnitude
        // acceleration is an array [x, y, z]
        const accelMagnitude = Math.sqrt(
            acceleration[0] * acceleration[0] +
            acceleration[1] * acceleration[1] +
            acceleration[2] * acceleration[2]
        );

        // Debug: Log acceleration magnitude occasionally to help tune thresholds
        if (!this._accelLogCount) this._accelLogCount = 0;
        this._accelLogCount++;
        if (this._accelLogCount % 50 === 0) {
            console.log(`Accel magnitude: ${accelMagnitude.toFixed(2)} m/s² | State: ${this.stepState} | Threshold: ${this.STEP_LIFT_THRESHOLD}`);
        }

        // Step detection state machine
        switch (this.stepState) {
            case 'WAITING':
                // Look for initial foot lift (upward acceleration spike)
                if (accelMagnitude > this.STEP_LIFT_THRESHOLD) {
                    this.stepState = 'LIFT_DETECTED';
                    this.peakAcceleration = accelMagnitude;
                    this.framesSinceLift = 0;
                }
                break;

            case 'LIFT_DETECTED':
                this.framesSinceLift++;

                // Track peak during lift phase
                if (accelMagnitude > this.peakAcceleration) {
                    this.peakAcceleration = accelMagnitude;
                }

                // Wait for quiet period after lift (matches Debug View behavior)
                if (accelMagnitude < this.STEP_QUIET_THRESHOLD) {
                    this.stepState = 'WAITING_IMPACT';
                    this.framesSinceLift = 0;
                }

                // Timeout if lift phase takes too long (>1 second = 20 frames @ 20Hz)
                if (this.framesSinceLift > 20) {
                    this.stepState = 'WAITING';
                }
                break;

            case 'WAITING_IMPACT':
                this.framesSinceLift++;

                // Look for foot impact (downward acceleration spike)
                if (accelMagnitude > this.STEP_IMPACT_THRESHOLD) {
                    // Valid step detected!
                    this.stepState = 'STEP_COMPLETE';
                }

                // Timeout if no impact detected (>1 second = 20 frames @ 20Hz, matches Debug View)
                if (this.framesSinceLift > 20) {
                    this.stepState = 'WAITING';
                }
                break;

            case 'STEP_COMPLETE':
                // Check if enough time has passed since last step (prevent double-counting)
                const now = Date.now();
                if (now - this.lastStepTime >= this.MIN_STEP_INTERVAL) {
                    // Increment step counter
                    this.stepCount++;
                    this.lastStepTime = now;

                    // Log step detection for debugging
                    console.log(`[DEMO VIEW] Step detected! Count: ${this.stepCount}`);

                    // Update display
                    if (this.elements.stepCount) {
                        this.elements.stepCount.textContent = this.stepCount;
                    }
                }

                // Reset to cooldown state (matches Debug View behavior)
                this.stepState = 'COOLDOWN';
                this.stepCooldown = this.COOLDOWN_FRAMES;
                this.peakAcceleration = 0;
                break;

            case 'COOLDOWN':
                // Wait in cooldown before detecting next step
                if (this.stepCooldown > 0) {
                    this.stepCooldown--;
                } else {
                    this.stepState = 'WAITING';
                }
                break;
        }
    }

    updateDisplay(data) {
        // Update orientation
        // Data comes as array [x, y, z] where x=heading, y=roll, z=pitch
        if (data.euler) {
            const roll = data.euler[1] || 0;   // y-axis
            const pitch = data.euler[2] || 0;  // z-axis
            const yaw = data.euler[0] || 0;    // x-axis (heading)

            if (this.elements.rollValue) this.elements.rollValue.textContent = `${roll.toFixed(1)}°`;
            if (this.elements.pitchValue) this.elements.pitchValue.textContent = `${pitch.toFixed(1)}°`;
            if (this.elements.yawValue) this.elements.yawValue.textContent = `${yaw.toFixed(1)}°`;

            // Update 3D cube rotation
            if (this.elements.orientationCube) {
                this.elements.orientationCube.style.transform =
                    `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
            }
        }

        // Update acceleration
        // Data comes as array [x, y, z]
        if (data.acceleration) {
            const ax = data.acceleration[0] || 0;
            const ay = data.acceleration[1] || 0;
            const az = data.acceleration[2] || 0;

            if (this.elements.accelX) this.elements.accelX.textContent = `${ax.toFixed(2)} m/s²`;
            if (this.elements.accelY) this.elements.accelY.textContent = `${ay.toFixed(2)} m/s²`;
            if (this.elements.accelZ) this.elements.accelZ.textContent = `${az.toFixed(2)} m/s²`;

            // Update acceleration bars (normalized to ±10 m/s²)
            const maxAccel = 10;
            if (this.elements.accelXBar) {
                this.elements.accelXBar.style.width = `${Math.min(Math.abs(ax) / maxAccel * 100, 100)}%`;
            }
            if (this.elements.accelYBar) {
                this.elements.accelYBar.style.width = `${Math.min(Math.abs(ay) / maxAccel * 100, 100)}%`;
            }
            if (this.elements.accelZBar) {
                this.elements.accelZBar.style.width = `${Math.min(Math.abs(az) / maxAccel * 100, 100)}%`;
            }

            const totalAccel = Math.sqrt(ax * ax + ay * ay + az * az);
            if (this.elements.totalAccel) {
                this.elements.totalAccel.textContent = `${totalAccel.toFixed(2)} m/s²`;
            }
        }

        // Update gyroscope
        if (data.gyroscope) {
            const gx = data.gyroscope.x || 0;
            const gy = data.gyroscope.y || 0;
            const gz = data.gyroscope.z || 0;

            if (this.elements.gyroX) this.elements.gyroX.textContent = `${gx.toFixed(1)}°/s`;
            if (this.elements.gyroY) this.elements.gyroY.textContent = `${gy.toFixed(1)}°/s`;
            if (this.elements.gyroZ) this.elements.gyroZ.textContent = `${gz.toFixed(1)}°/s`;
        }

        // Update temperature
        if (data.temperature !== undefined && this.elements.temperature) {
            this.elements.temperature.textContent = `${data.temperature.toFixed(1)}°C`;
        }

        // Update calibration status
        if (data.calibration) {
            this.updateCalibrationStatus(data.calibration);
        }

        // Log data occasionally
        if (Math.random() > 0.98 && data.euler && data.acceleration) {
            const roll = data.euler[1] || 0;
            const pitch = data.euler[2] || 0;
            const yaw = data.euler[0] || 0;
            const totalAccel = Math.sqrt(
                (data.acceleration[0] || 0) ** 2 +
                (data.acceleration[1] || 0) ** 2 +
                (data.acceleration[2] || 0) ** 2
            );
            this.logMessage(`Roll: ${roll.toFixed(1)}° Pitch: ${pitch.toFixed(1)}° Yaw: ${yaw.toFixed(1)}° | Accel: ${totalAccel.toFixed(2)} m/s²`);
        }
    }

    updateCalibrationStatus(calibration) {
        const sys = calibration.system || 0;
        const gyro = calibration.gyro || 0;
        const accel = calibration.accel || 0;
        const mag = calibration.mag || 0;

        if (this.elements.sysCal) {
            this.elements.sysCal.textContent = `${sys}/3`;
            this.elements.sysCal.className = `text-lg font-bold ${this.getCalibrationColor(sys)}`;
        }
        if (this.elements.gyroCal) {
            this.elements.gyroCal.textContent = `${gyro}/3`;
            this.elements.gyroCal.className = `text-lg font-bold ${this.getCalibrationColor(gyro)}`;
        }
        if (this.elements.accelCal) {
            this.elements.accelCal.textContent = `${accel}/3`;
            this.elements.accelCal.className = `text-lg font-bold ${this.getCalibrationColor(accel)}`;
        }
        if (this.elements.magCal) {
            this.elements.magCal.textContent = `${mag}/3`;
            this.elements.magCal.className = `text-lg font-bold ${this.getCalibrationColor(mag)}`;
        }
    }

    getCalibrationColor(value) {
        if (value >= 3) return 'text-green-600';
        if (value >= 2) return 'text-yellow-600';
        if (value >= 1) return 'text-orange-600';
        return 'text-red-600';
    }

    logMessage(message) {
        if (!this.elements.dataLog) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'mb-1';
        logEntry.textContent = `[${timestamp}] ${message}`;

        this.elements.dataLog.appendChild(logEntry);
        this.elements.dataLog.scrollTop = this.elements.dataLog.scrollHeight;

        // Keep log manageable
        while (this.elements.dataLog.children.length > 50) {
            this.elements.dataLog.removeChild(this.elements.dataLog.firstChild);
        }
    }

    exportData() {
        if (this.dataBuffer.length === 0) {
            this.logMessage('No data to export');
            alert('No data available to export');
            return;
        }

        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `motion_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.logMessage(`Exported ${this.dataBuffer.length} data points to CSV`);
    }

    generateCSV() {
        const headers = [
            'Timestamp', 'Roll', 'Pitch', 'Yaw',
            'AccelX', 'AccelY', 'AccelZ',
            'GyroX', 'GyroY', 'GyroZ',
            'Temperature', 'Steps'
        ];

        let csv = headers.join(',') + '\n';

        this.dataBuffer.forEach(data => {
            // Handle both array and object formats
            const euler = data.euler || [0, 0, 0];
            const accel = data.acceleration || [0, 0, 0];
            const gyro = data.gyroscope || { x: 0, y: 0, z: 0 };

            const row = [
                data.timestamp,
                (euler[1] || 0).toFixed(3),  // roll
                (euler[2] || 0).toFixed(3),  // pitch
                (euler[0] || 0).toFixed(3),  // yaw
                (accel[0] || 0).toFixed(3),  // accel x
                (accel[1] || 0).toFixed(3),  // accel y
                (accel[2] || 0).toFixed(3),  // accel z
                (gyro.x || 0).toFixed(3),    // gyro x
                (gyro.y || 0).toFixed(3),    // gyro y
                (gyro.z || 0).toFixed(3),    // gyro z
                (data.temperature || 0).toFixed(2),
                this.stepCount  // Use current step count
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }
}

// Global reset function for step counter - calls server API
async function resetStepCounter() {
    try {
        const response = await fetch('/api/reset-steps', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.status === 'success' && window.motionTrackerDashboard) {
            // Update local display
            window.motionTrackerDashboard.stepCount = 0;
            if (window.motionTrackerDashboard.elements.stepCount) {
                window.motionTrackerDashboard.elements.stepCount.textContent = '0';
            }
            console.log('Step counter reset on server');
        }
    } catch (error) {
        console.error('Failed to reset step counter:', error);
        alert('Failed to reset step counter');
    }
}

// Initialize the dashboard when the page loads
// Only create instance if we're on the page with design2 elements
if (document.getElementById('design2')) {
    window.motionTrackerDashboard = new MotionTrackerDashboard();
}
