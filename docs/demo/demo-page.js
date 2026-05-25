/**
 * Demo Page Integration
 * Connects DataPlayback engine with Three.js visualization
 */

// Initialize playback engine
const demo = new DataPlayback('sample_data.json');
let loopEnabled = true;

// Three.js Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f9fa);

const camera = new THREE.PerspectiveCamera(
    75,
    1, // Will be updated on resize
    0.1,
    1000
);
camera.position.set(2, 2, 2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
const container = document.getElementById('orientation-view');

// Ensure container has dimensions before setting renderer size
function updateRendererSize() {
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

updateRendererSize();
container.appendChild(renderer.domElement);

// Create sensor model (box) with colored faces
const sensorGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.3);

// Create materials for each face with different colors
const materials = [
    new THREE.MeshPhongMaterial({ color: 0xff6b6b }), // Right - Red
    new THREE.MeshPhongMaterial({ color: 0x4ecdc4 }), // Left - Cyan
    new THREE.MeshPhongMaterial({ color: 0x95e1d3 }), // Top - Light Green
    new THREE.MeshPhongMaterial({ color: 0xf38181 }), // Bottom - Pink
    new THREE.MeshPhongMaterial({ color: 0xfeca57 }), // Front - Yellow
    new THREE.MeshPhongMaterial({ color: 0xee5a6f })  // Back - Dark Red
];

const sensor = new THREE.Mesh(sensorGeometry, materials);
scene.add(sensor);

// Add coordinate axes
const axesHelper = new THREE.AxesHelper(1.8);
scene.add(axesHelper);

// Add grid
const gridHelper = new THREE.GridHelper(4, 10, 0xcccccc, 0xe0e0e0);
scene.add(gridHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Handle window resize
function onWindowResize() {
    updateRendererSize();
}
window.addEventListener('resize', onWindowResize);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Update visualization when data arrives
demo.onData((frame) => {
    // Update 3D sensor orientation
    const roll = THREE.MathUtils.degToRad(frame.orientation.roll);
    const pitch = THREE.MathUtils.degToRad(frame.orientation.pitch);
    const yaw = THREE.MathUtils.degToRad(frame.orientation.yaw);

    // Apply Euler angles (ZYX order matches BNO055)
    sensor.rotation.set(pitch, yaw, roll, 'ZYX');

    // Update orientation display
    document.getElementById('roll-value').textContent = frame.orientation.roll.toFixed(1) + '°';
    document.getElementById('pitch-value').textContent = frame.orientation.pitch.toFixed(1) + '°';
    document.getElementById('yaw-value').textContent = frame.orientation.yaw.toFixed(1) + '°';

    // Update acceleration display
    document.getElementById('accel-x').textContent = frame.linear_acceleration.x.toFixed(2);
    document.getElementById('accel-y').textContent = frame.linear_acceleration.y.toFixed(2);
    document.getElementById('accel-z').textContent = frame.linear_acceleration.z.toFixed(2);

    // Update time display
    const metadata = demo.getMetadata();
    const currentTime = demo.getCurrentTime();
    const totalTime = metadata.total_duration_seconds;
    document.getElementById('time-display').textContent =
        `${currentTime.toFixed(1)}s / ${totalTime.toFixed(1)}s`;

    // Update frame display
    document.getElementById('frame-display').textContent =
        `${demo.currentIndex} / ${metadata.sample_count}`;

    // Update progress bar
    const progress = demo.getProgress() * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-percent').textContent = progress.toFixed(0) + '%';
});

// Update status badge
demo.onStatus((status, message) => {
    const badge = document.getElementById('status-badge');
    const statusMsg = document.getElementById('status-message');

    // Remove all status classes
    badge.className = 'status-badge';

    // Add appropriate status class
    badge.classList.add('status-' + status);

    // Update text
    const statusText = {
        'ready': 'Ready',
        'playing': 'Playing',
        'paused': 'Paused',
        'stopped': 'Stopped',
        'ended': 'Ended',
        'error': 'Error'
    };
    badge.textContent = statusText[status] || status;
    statusMsg.textContent = message;
});

// Load data on page load
demo.load().then((success) => {
    if (success) {
        console.log('Demo ready! Metadata:', demo.getMetadata());
        // Auto-play after loading
        setTimeout(() => {
            demo.play();
        }, 500);
    }
});

// Control functions (called from HTML buttons)
function playDemo() {
    demo.play();
}

function pauseDemo() {
    demo.pause();
}

function stopDemo() {
    demo.stop();
}

function updateSpeed(value) {
    const speed = parseFloat(value);
    demo.setSpeed(speed);
    document.getElementById('speed-label').textContent = speed.toFixed(1) + 'x';
}

function toggleLoop() {
    loopEnabled = !loopEnabled;
    demo.setLoop(loopEnabled);

    const button = document.getElementById('loop-button');
    if (loopEnabled) {
        button.textContent = '🔁 Loop: ON';
        button.style.background = '#28a745';
    } else {
        button.textContent = '🔁 Loop: OFF';
        button.style.background = '#6c757d';
    }
}

function seekDemo(event) {
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = x / rect.width;

    const metadata = demo.getMetadata();
    if (metadata) {
        const targetIndex = Math.floor(percent * metadata.sample_count);
        demo.seek(targetIndex);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case ' ': // Spacebar
            e.preventDefault();
            if (demo.isPlaying) {
                pauseDemo();
            } else {
                playDemo();
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            demo.seek(demo.currentIndex - 10);
            break;
        case 'ArrowRight':
            e.preventDefault();
            demo.seek(demo.currentIndex + 10);
            break;
        case 'Home':
            e.preventDefault();
            stopDemo();
            break;
    }
});

console.log('Demo page loaded! Controls:');
console.log('  Space: Play/Pause');
console.log('  ←/→: Skip backward/forward');
console.log('  Home: Stop and reset');
