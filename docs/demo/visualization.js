// Initialize WebSocket connection
const ws = new WebSocket(`ws://${window.location.host}/ws`);

// Update connection status indicator
function updateConnectionStatus(connected) {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const statusEl = document.getElementById('connectionStatus');
        const textEl = document.getElementById('connectionText');
        console.log('updateConnectionStatus called, connected:', connected, 'statusEl:', statusEl, 'textEl:', textEl);

        if (statusEl && textEl) {
            if (connected) {
                statusEl.style.background = '#10b981'; // green
                statusEl.classList.add('pulse');
                textEl.textContent = 'Connected';
                textEl.style.color = '#065f46'; // dark green
                console.log('Status updated to: Connected');
            } else {
                statusEl.style.background = '#ef4444'; // red
                statusEl.classList.remove('pulse');
                textEl.textContent = 'Disconnected';
                textEl.style.color = '#991b1b'; // dark red
                console.log('Status updated to: Disconnected');
            }
        } else {
            console.error('Connection status elements not found!', { statusEl, textEl });
        }
    }, 0);
}

ws.onopen = function () {
    console.log('Design 1: WebSocket connected');
    updateConnectionStatus(true);
};

ws.onerror = function (error) {
    console.error('Design 1: WebSocket error:', error);
    updateConnectionStatus(false);
    alert('Connection error! Make sure the server is running with: sensors-track --mode web');
};

ws.onclose = function () {
    console.log('Design 1: WebSocket closed');
    updateConnectionStatus(false);
    alert('Connection lost! The server may have stopped.');
};

// ============================================================================
// ORIENTATION VIEW (Shows sensor rotation)
// ============================================================================
const orientationScene = new THREE.Scene();
const orientationCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const orientationRenderer = new THREE.WebGLRenderer({ antialias: true });
const orientationView = document.getElementById('orientation-view');

// Set renderer size
function resizeOrientationView() {
    const width = orientationView.clientWidth;
    const height = orientationView.clientHeight;
    if (width === 0 || height === 0) return; // Skip if not visible
    const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2 for performance
    orientationRenderer.setPixelRatio(pixelRatio);
    orientationRenderer.setSize(width, height, false);
    orientationRenderer.setViewport(0, 0, width, height);
    orientationCamera.aspect = width / height;
    orientationCamera.updateProjectionMatrix();
}
resizeOrientationView();
orientationView.appendChild(orientationRenderer.domElement);

// Create sensor model for orientation view (made larger for better visibility)
const sensorGeometry = new THREE.BoxGeometry(2.5, 1.25, 0.5); // Increased from 1, 0.5, 0.2
const sensorMaterial = new THREE.MeshPhongMaterial({ color: 0x3498db });
const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
orientationScene.add(sensor);

// Add coordinate axes to orientation view (made larger to match sensor)
const axesHelper = new THREE.AxesHelper(3.5); // Increased from 1.5
orientationScene.add(axesHelper);

// Add lights to orientation scene
const orientationAmbient = new THREE.AmbientLight(0xffffff, 0.6);
orientationScene.add(orientationAmbient);
const orientationDirectional = new THREE.DirectionalLight(0xffffff, 0.5);
orientationDirectional.position.set(5, 5, 5);
orientationScene.add(orientationDirectional);

// Position camera for orientation view (moved closer for larger appearance)
orientationCamera.position.set(3.5, 3.5, 5); // Adjusted from 2, 2, 3
orientationCamera.lookAt(0, 0, 0);

// ============================================================================
// STEP COUNTER VIEW (Shows footsteps and distance)
// ============================================================================
const stepScene = new THREE.Scene();
const stepCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const stepRenderer = new THREE.WebGLRenderer({ antialias: true });
const stepView = document.getElementById('step-view');

// Set renderer size
function resizeStepView() {
    const width = stepView.clientWidth;
    const height = stepView.clientHeight;
    if (width === 0 || height === 0) return; // Skip if not visible
    const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2 for performance
    stepRenderer.setPixelRatio(pixelRatio);
    stepRenderer.setSize(width, height, false);
    stepRenderer.setViewport(0, 0, width, height);
    stepCamera.aspect = width / height;
    stepCamera.updateProjectionMatrix();
}
resizeStepView();
stepView.appendChild(stepRenderer.domElement);

// Create infinite ground plane with repeating grid texture
stepScene.background = new THREE.Color(0x1a1a1a);

// Create a larger ground plane that moves with the walker
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0x2c3e50,
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2;
stepScene.add(ground);

// Create larger grid that moves with camera
const stepGrid = new THREE.GridHelper(100, 200, 0x444444, 0x333333);
stepScene.add(stepGrid);

// Step detection state
let stepCount = 0;
let totalDistance = 0;
const STEP_LENGTH = 0.7; // Average step length in meters
const stepMarkers = [];
let lastAccelMagnitude = 0;
let stepCooldown = 0;
let currentWalkPosition = 0; // Track how far we've walked

// Step detection state machine - tuned parameters
let stepState = 'WAITING';  // States: WAITING, LIFT_DETECTED, WAITING_IMPACT, STEP_COMPLETE
let peakAcceleration = 0;
let lastStepTime = 0;

// Balanced thresholds - not too sensitive, not too strict
const STEP_LIFT_THRESHOLD = 1.5;       // m/s² - foot lift acceleration
const STEP_IMPACT_THRESHOLD = 1.5;     // m/s² - foot impact spike
const STEP_QUIET_THRESHOLD = 1.0;      // m/s² - quiet period between phases
const MIN_STEP_INTERVAL = 300;         // ms - minimum time between steps (prevents double-counting)
let framesSinceLift = 0;

// Add a "walker" indicator at the origin (current position) - made larger
const walkerGeometry = new THREE.ConeGeometry(0.6, 1.2, 8); // Increased from 0.3, 0.6
const walkerMaterial = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
const walker = new THREE.Mesh(walkerGeometry, walkerMaterial);
walker.position.set(0, 0.6, 0); // Adjusted height
stepScene.add(walker);

// Add a small platform under walker - made larger
const platformGeometry = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16); // Increased from 0.5, 0.05
const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x34495e });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
platform.position.set(0, 0, 0);
stepScene.add(platform);

// Position camera for step view (adjusted for larger objects)
stepCamera.position.set(0, 10, 7); // Moved slightly closer from 12, 8
stepCamera.lookAt(0, 0, 0);

// Add lights
const stepAmbient = new THREE.AmbientLight(0xffffff, 0.8);
stepScene.add(stepAmbient);

// ============================================================================
// ACTIVITY VIEW (Shows movement intensity over time)
// ============================================================================
const activityScene = new THREE.Scene();
const activityCamera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);
const activityRenderer = new THREE.WebGLRenderer({ antialias: true });
const activityView = document.getElementById('activity-view');

// Set renderer size
function resizeActivityView() {
    const width = activityView.clientWidth;
    const height = activityView.clientHeight;
    if (width === 0 || height === 0) return; // Skip if not visible
    const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2 for performance
    activityRenderer.setPixelRatio(pixelRatio);
    activityRenderer.setSize(width, height, false);
    activityRenderer.setViewport(0, 0, width, height);
}
resizeActivityView();
activityView.appendChild(activityRenderer.domElement);

// Activity bars (recent movement intensity)
const activityBars = [];
const MAX_BARS = 50;
for (let i = 0; i < MAX_BARS; i++) {
    const barGeometry = new THREE.BoxGeometry(0.3, 0, 0.3);
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0x3498db });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.set(i * 0.4 - 10, 0, 0);
    activityScene.add(bar);
    activityBars.push(bar);
}

// Position camera for activity view
activityCamera.position.set(0, 5, 10);
activityCamera.lookAt(0, 0, 0);

// Add lights
const activityAmbient = new THREE.AmbientLight(0xffffff, 1.0);
activityScene.add(activityAmbient);

// Initialize Charts
const orientationChart = new Chart(document.getElementById('orientation-chart'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Heading', data: [], borderColor: '#e74c3c' },
            { label: 'Roll', data: [], borderColor: '#2ecc71' },
            { label: 'Pitch', data: [], borderColor: '#3498db' }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: { display: false },
            y: { min: -180, max: 180 }
        }
    }
});

const accelerationChart = new Chart(document.getElementById('acceleration-chart'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'X', data: [], borderColor: '#e74c3c' },
            { label: 'Y', data: [], borderColor: '#2ecc71' },
            { label: 'Z', data: [], borderColor: '#3498db' }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: { display: false },
            y: { min: -10, max: 10 }
        }
    }
});

// Handle WebSocket messages
ws.onmessage = function (event) {
    const data = JSON.parse(event.data);

    // Update sensor orientation in orientation view
    sensor.rotation.set(
        THREE.MathUtils.degToRad(data.euler[1]), // Roll
        THREE.MathUtils.degToRad(data.euler[0]), // Heading
        THREE.MathUtils.degToRad(data.euler[2])  // Pitch
    );

    // ========================================================================
    // STEP COUNT - Use server-provided step count (no client-side detection)
    // ========================================================================
    if (data.stepCount !== undefined) {
        // Update from server
        const newStepCount = data.stepCount;
        const stepState = data.stepState || 'WAITING';

        // Check if a new step was detected
        if (newStepCount > stepCount) {
            stepCount = newStepCount;
            currentWalkPosition = stepCount * STEP_LENGTH;
            totalDistance = currentWalkPosition;

            // Add footprint marker - made larger for better visibility on mobile
            const footprintGeometry = new THREE.BoxGeometry(0.6, 0.05, 1.0); // Increased from 0.25, 0.02, 0.4
            const footprintMaterial = new THREE.MeshBasicMaterial({
                color: stepCount % 2 === 0 ? 0x3498db : 0x2ecc71
            });
            const footprint = new THREE.Mesh(footprintGeometry, footprintMaterial);

            // Arrange footprints in a straight walking pattern with alternating sides
            const sideOffset = stepCount % 2 === 0 ? 0.4 : -0.4; // Increased from 0.2 for wider stance
            footprint.position.set(
                sideOffset,
                0.02, // Slightly raised for better visibility
                -currentWalkPosition
            );

            stepScene.add(footprint);
            stepMarkers.push(footprint);

            // Keep only last 30 footprints (about 15 steps visible)
            if (stepMarkers.length > 30) {
                const oldFootprint = stepMarkers.shift();
                stepScene.remove(oldFootprint);
            }

            // Move walker to current position
            walker.position.z = -currentWalkPosition;
            platform.position.z = -currentWalkPosition;

            // Update camera to follow walker - keep last ~10m visible
            const cameraTarget = -currentWalkPosition;
            stepCamera.position.z = cameraTarget + 8;
            stepCamera.lookAt(0, 0, cameraTarget);

            // Move grid to stay centered on walker
            stepGrid.position.z = cameraTarget;
            ground.position.z = cameraTarget;

            // Update step counter display
            document.getElementById('step-info').textContent =
                `(${stepCount} steps, ${totalDistance.toFixed(1)}m)`;
        }

        // Update state display
        const debugElement = document.getElementById('step-state');
        if (debugElement) {
            debugElement.textContent = `${stepState}`;
            // Color code by state
            const stateColors = {
                'WAITING': '#95a5a6',
                'LIFT_DETECTED': '#f39c12',
                'WAITING_IMPACT': '#3498db',
                'STEP_COMPLETE': '#2ecc71',
                'COOLDOWN': '#e74c3c'
            };
            debugElement.style.color = stateColors[stepState] || '#ecf0f1';
        }
    }

    // ========================================================================
    // OLD STEP DETECTION CODE - REMOVED (now handled server-side)
    // ========================================================================
    // Calculate acceleration magnitude for activity display only
    const accelMagnitude = Math.sqrt(
        data.acceleration[0] ** 2 +
        data.acceleration[1] ** 2 +
        data.acceleration[2] ** 2
    );

    lastAccelMagnitude = accelMagnitude;

    // ========================================================================
    // ACTIVITY VISUALIZATION
    // ========================================================================
    // Shift bars to the left
    for (let i = 0; i < activityBars.length - 1; i++) {
        const nextBar = activityBars[i + 1];
        activityBars[i].scale.y = nextBar.scale.y;
        activityBars[i].position.y = nextBar.position.y;

        // Color based on intensity
        const intensity = nextBar.scale.y;
        if (intensity > 2) {
            activityBars[i].material.color.setHex(0xe74c3c); // Red - high activity
        } else if (intensity > 1) {
            activityBars[i].material.color.setHex(0xf39c12); // Orange - medium
        } else if (intensity > 0.3) {
            activityBars[i].material.color.setHex(0x3498db); // Blue - low
        } else {
            activityBars[i].material.color.setHex(0x2c3e50); // Dark - no activity
        }
    }

    // Add new bar on the right
    const lastBar = activityBars[activityBars.length - 1];
    lastBar.scale.y = accelMagnitude;
    lastBar.position.y = accelMagnitude / 2;

    if (accelMagnitude > 2) {
        lastBar.material.color.setHex(0xe74c3c);
    } else if (accelMagnitude > 1) {
        lastBar.material.color.setHex(0xf39c12);
    } else if (accelMagnitude > 0.3) {
        lastBar.material.color.setHex(0x3498db);
    } else {
        lastBar.material.color.setHex(0x2c3e50);
    }

    // Update position display
    document.getElementById('pos-x').textContent = data.position[0].toFixed(2);
    document.getElementById('pos-y').textContent = data.position[1].toFixed(2);
    document.getElementById('pos-z').textContent = data.position[2].toFixed(2);

    // Update orientation display
    document.getElementById('euler-x').textContent = data.euler[0].toFixed(2);
    document.getElementById('euler-y').textContent = data.euler[1].toFixed(2);
    document.getElementById('euler-z').textContent = data.euler[2].toFixed(2);

    // Update velocity display
    document.getElementById('vel-x').textContent = data.velocity[0].toFixed(2);
    document.getElementById('vel-y').textContent = data.velocity[1].toFixed(2);
    document.getElementById('vel-z').textContent = data.velocity[2].toFixed(2);

    // Update acceleration display
    document.getElementById('acc-x').textContent = data.acceleration[0].toFixed(2);
    document.getElementById('acc-y').textContent = data.acceleration[1].toFixed(2);
    document.getElementById('acc-z').textContent = data.acceleration[2].toFixed(2);

    // Update charts
    const timeLabel = new Date().toLocaleTimeString();

    // Update orientation chart
    orientationChart.data.labels.push(timeLabel);
    orientationChart.data.datasets[0].data.push(data.euler[0]);
    orientationChart.data.datasets[1].data.push(data.euler[1]);
    orientationChart.data.datasets[2].data.push(data.euler[2]);

    // Update acceleration chart
    accelerationChart.data.labels.push(timeLabel);
    accelerationChart.data.datasets[0].data.push(data.acceleration[0]);
    accelerationChart.data.datasets[1].data.push(data.acceleration[1]);
    accelerationChart.data.datasets[2].data.push(data.acceleration[2]);

    // Keep only last 50 data points
    if (orientationChart.data.labels.length > 50) {
        orientationChart.data.labels.shift();
        orientationChart.data.datasets.forEach(dataset => dataset.data.shift());
    }
    if (accelerationChart.data.labels.length > 50) {
        accelerationChart.data.labels.shift();
        accelerationChart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    // Update charts
    orientationChart.update('none');
    accelerationChart.update('none');
};

// Handle window resize
window.addEventListener('resize', () => {
    resizeOrientationView();
    resizeStepView();
    resizeActivityView();
});

// Use ResizeObserver for more reliable container-based resizing
if (typeof ResizeObserver !== 'undefined') {
    const orientationObserver = new ResizeObserver(() => resizeOrientationView());
    orientationObserver.observe(orientationView);

    const stepObserver = new ResizeObserver(() => resizeStepView());
    stepObserver.observe(stepView);

    const activityObserver = new ResizeObserver(() => resizeActivityView());
    activityObserver.observe(activityView);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    orientationRenderer.render(orientationScene, orientationCamera);
    stepRenderer.render(stepScene, stepCamera);
    activityRenderer.render(activityScene, activityCamera);
}
animate();

// Reset function for Debug View step counter - calls server API
async function resetDebugStepCounter() {
    try {
        const response = await fetch('/api/reset-steps', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.status === 'success') {
            // Reset local state
            stepCount = 0;
            totalDistance = 0;
            currentWalkPosition = 0;

            // Clear all footprint markers
            stepMarkers.forEach(marker => stepScene.remove(marker));
            stepMarkers.length = 0;

            // Reset walker and platform position
            walker.position.z = 0;
            platform.position.z = 0;

            // Reset camera
            stepCamera.position.z = 8;
            stepCamera.lookAt(0, 0, 0);

            // Reset grid and ground
            stepGrid.position.z = 0;
            ground.position.z = 0;

            // Update display
            document.getElementById('step-info').textContent = '(0 steps, 0.00m)';

            console.log('Debug View step counter reset on server');
        }
    } catch (error) {
        console.error('Failed to reset step counter:', error);
        alert('Failed to reset step counter');
    }
}
