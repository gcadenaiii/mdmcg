/**
 * Demo Mode Visualization
 * Replaces WebSocket with DataPlayback engine for static demo
 */

// Initialize demo playback engine instead of WebSocket
const demo = new DataPlayback('sample_data.json');
let isConnected = false;

// Store original WebSocket constructor
const OriginalWebSocket = window.WebSocket;

// Track all WebSocket instances
const mockWebSockets = [];

// Mock WebSocket class for demo mode
class MockWebSocket {
    constructor(url) {
        console.log('Demo mode: Intercepted WebSocket connection to', url);
        this.url = url;
        this.readyState = 0; // CONNECTING
        this._onopen = null;
        this._onmessage = null;
        this._onerror = null;
        this._onclose = null;

        // Add to tracking list
        mockWebSockets.push(this);

        // Simulate connection after brief delay
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this._onopen) {
                this._onopen();
            }
        }, 100);
    }

    // Use setters to handle callbacks set after connection opens
    get onopen() { return this._onopen; }
    set onopen(handler) {
        this._onopen = handler;
        // If already connected, call handler immediately
        if (this.readyState === 1 && handler) {
            handler();
        }
    }

    get onmessage() { return this._onmessage; }
    set onmessage(handler) { this._onmessage = handler; }

    get onerror() { return this._onerror; }
    set onerror(handler) { this._onerror = handler; }

    get onclose() { return this._onclose; }
    set onclose(handler) { this._onclose = handler; }

    send(data) {
        console.log('Demo mode: WebSocket send() called but ignored');
    }

    close() {
        console.log('Demo mode: WebSocket close() called');
        this.readyState = 3; // CLOSED
        // Remove from tracking list
        const index = mockWebSockets.indexOf(this);
        if (index > -1) {
            mockWebSockets.splice(index, 1);
        }
    }
}

// Replace WebSocket constructor with mock
window.WebSocket = MockWebSocket;
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// visualization.js will create const ws via MockWebSocket constructor
// The MockWebSocket class above will handle all the behavior

// Load demo data and simulate connection
demo.load().then((success) => {
    if (success) {
        isConnected = true;

        // Find the ws instance created by visualization.js
        if (mockWebSockets.length > 0) {
            const ws = mockWebSockets[0];
            ws.readyState = 1; // OPEN

            // Trigger onopen callback if already set
            if (ws._onopen) {
                ws._onopen();
            }
        }

        // Update connection status
        updateConnectionStatus(true);

        // Start playback automatically
        setTimeout(() => {
            demo.play();
        }, 500);
    } else {
        const ws = mockWebSockets[0];
        if (ws && ws._onerror) {
            ws._onerror(new Error('Failed to load demo data'));
        }
        updateConnectionStatus(false);
    }
});

// Step detection state (prefixed with 'demo' to avoid conflicts with visualization.js)
let demoStepCount = 0;
let demoLastAccelMagnitude = 0;
let demoStepCooldown = 0;
let lastFrameIndex = 0;
const STEP_THRESHOLD = 1.5; // Acceleration magnitude threshold for step detection
const COOLDOWN_FRAMES = 10; // Minimum frames between steps (~0.5 seconds at 20Hz)

// Bridge demo data to WebSocket message handlers
demo.onData((frame) => {
    // Detect when data loops back to start and reset step counter
    const currentTimestamp = frame.timestamp;
    if (currentTimestamp < lastFrameIndex) {
        // Loop detected - reset step counter
        demoStepCount = 0;
        demoLastAccelMagnitude = 0;
        demoStepCooldown = 0;
    }
    lastFrameIndex = currentTimestamp;

    // Simple step detection based on acceleration magnitude changes
    if (frame.linear_acceleration) {
        const accelX = frame.linear_acceleration.x || 0;
        const accelY = frame.linear_acceleration.y || 0;
        const accelZ = frame.linear_acceleration.z || 0;
        const magnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

        // Detect step: significant change in acceleration magnitude
        if (demoStepCooldown === 0) {
            const deltaAccel = Math.abs(magnitude - demoLastAccelMagnitude);
            if (deltaAccel > STEP_THRESHOLD) {
                demoStepCount++;
                demoStepCooldown = COOLDOWN_FRAMES;
            }
        } else {
            demoStepCooldown--;
        }

        demoLastAccelMagnitude = magnitude;
    }

    // Convert demo frame to WebSocket message format
    const message = {
        type: 'sensor_data',
        timestamp: frame.timestamp,
        euler: [
            frame.orientation.yaw || 0,     // euler[0] = heading/yaw
            frame.orientation.roll || 0,    // euler[1] = roll
            frame.orientation.pitch || 0    // euler[2] = pitch
        ],
        position: frame.position ? [frame.position.x || 0, frame.position.y || 0, frame.position.z || 0] : [0, 0, 0],
        velocity: frame.velocity ? [frame.velocity.x || 0, frame.velocity.y || 0, frame.velocity.z || 0] : [0, 0, 0],
        acceleration: frame.linear_acceleration ? [
            frame.linear_acceleration.x || 0,
            frame.linear_acceleration.y || 0,
            frame.linear_acceleration.z || 0
        ] : [0, 0, 0],
        linear_acceleration: frame.linear_acceleration ? [
            frame.linear_acceleration.x || 0,
            frame.linear_acceleration.y || 0,
            frame.linear_acceleration.z || 0
        ] : [0, 0, 0],
        angular_velocity: { x: 0, y: 0, z: 0 }, // Not in demo data
        calibration_status: { system: 3, gyro: 3, accel: 3, mag: 3 }, // Mock as calibrated
        stepCount: demoStepCount,
        stepState: demoStepCooldown > 0 ? 'STEP_DETECTED' : 'WAITING'
    };

    const messageStr = JSON.stringify(message);
    const messageEvent = { data: messageStr };

    // Send to all mock WebSocket instances
    mockWebSockets.forEach((ws, idx) => {
        if (ws._onmessage && ws.readyState === 1) {
            ws._onmessage(messageEvent);
        }
    });
});

// Update connection status indicator
function updateConnectionStatus(connected) {
    setTimeout(() => {
        const statusEl = document.getElementById('connectionStatus');
        const textEl = document.getElementById('connectionText');

        if (statusEl && textEl) {
            if (connected) {
                statusEl.style.background = '#10b981'; // green
                statusEl.classList.add('pulse');
                textEl.textContent = 'Demo Mode';
                textEl.style.color = '#065f46';
            } else {
                statusEl.style.background = '#ef4444'; // red
                statusEl.classList.remove('pulse');
                textEl.textContent = 'Loading...';
                textEl.style.color = '#991b1b';
            }
        }
    }, 0);
}

// Demo controls (inject into page if viewer has controls)
function createDemoControls() {
    // Check if we're on a page that should have demo controls
    const container = document.querySelector('.bg-gray-900') || document.body;

    // Create demo control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'demo-controls';
    controlPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
        min-width: 200px;
    `;

    controlPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 10px; font-size: 14px; color: #fbbf24;">
            🎬 Demo Controls
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <button onclick="demoPlayPause()" id="demo-play-btn" style="flex: 1; padding: 8px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                ⏸ Pause
            </button>
            <button onclick="demoStop()" style="flex: 1; padding: 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                ⏹ Stop
            </button>
        </div>
        <div style="margin-bottom: 8px;">
            <label style="font-size: 12px; color: #9ca3af;">Speed: <span id="demo-speed-label">1.0x</span></label>
            <input type="range" id="demo-speed" min="0.5" max="3" step="0.1" value="1.0"
                   style="width: 100%; margin-top: 4px;"
                   oninput="demoSetSpeed(this.value)">
        </div>
        <div style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 10px;">
            Playing pre-recorded data
        </div>
    `;

    container.appendChild(controlPanel);
}

// Demo control functions
window.demoPlayPause = function () {
    const btn = document.getElementById('demo-play-btn');
    if (demo.isPlaying) {
        demo.pause();
        btn.innerHTML = '▶ Play';
        btn.style.background = '#10b981';
    } else {
        demo.play();
        btn.innerHTML = '⏸ Pause';
        btn.style.background = '#f59e0b';
    }
};

window.demoStop = function () {
    demo.stop();
    const btn = document.getElementById('demo-play-btn');
    btn.innerHTML = '▶ Play';
    btn.style.background = '#10b981';
};

window.demoSetSpeed = function (value) {
    const speed = parseFloat(value);
    demo.setSpeed(speed);
    document.getElementById('demo-speed-label').textContent = speed.toFixed(1) + 'x';
};

// Initialize demo controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createDemoControls, 100);
    });
} else {
    setTimeout(createDemoControls, 100);
}

// Log demo mode info
console.log('🎬 Demo Mode Active');
console.log('Using pre-recorded sensor data from sample_data.json');
console.log('Controls available in bottom-right corner');
