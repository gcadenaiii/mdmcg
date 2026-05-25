/**
 * Data Playback Engine for Sensors Lab Demo
 * Replays pre-recorded sensor data with interactive controls
 */

class DataPlayback {
    constructor(dataUrl) {
        this.dataUrl = dataUrl;
        this.data = null;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.playbackInterval = null;
        this.playbackSpeed = 1.0; // 1.0 = real-time, 0.5 = half speed, 2.0 = double speed
        this.loop = true;
        this.onDataCallback = null;
        this.onStatusCallback = null;
    }

    /**
     * Load sensor data from JSON file
     */
    async load() {
        try {
            const response = await fetch(this.dataUrl);
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.statusText}`);
            }
            this.data = await response.json();
            console.log('Data loaded:', this.data.metadata);
            this._updateStatus('ready', `Loaded ${this.data.metadata.sample_count} samples`);
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            this._updateStatus('error', `Failed to load data: ${error.message}`);
            return false;
        }
    }

    /**
     * Start playback
     */
    play() {
        if (!this.data) {
            console.warn('No data loaded. Call load() first.');
            return;
        }

        if (this.isPlaying) {
            return; // Already playing
        }

        this.isPlaying = true;
        this._updateStatus('playing', 'Playing...');

        // Calculate interval based on playback speed
        // Original sample rate is 20Hz (50ms), adjust by speed
        const baseInterval = 50; // ms
        const interval = baseInterval / this.playbackSpeed;

        this.playbackInterval = setInterval(() => {
            this._playFrame();
        }, interval);
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.isPlaying) {
            return;
        }

        this.isPlaying = false;
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        this._updateStatus('paused', `Paused at ${this.currentIndex}/${this.data.metadata.sample_count}`);
    }

    /**
     * Stop and reset to beginning
     */
    stop() {
        this.pause();
        this.currentIndex = 0;
        this._updateStatus('stopped', 'Stopped');
    }

    /**
     * Jump to specific sample index
     */
    seek(index) {
        if (!this.data) return;

        this.currentIndex = Math.max(0, Math.min(index, this.data.metadata.sample_count - 1));

        // Emit current frame if not playing
        if (!this.isPlaying) {
            this._playFrame();
        }
    }

    /**
     * Set playback speed
     * @param {number} speed - Playback speed multiplier (0.5 = half, 2.0 = double)
     */
    setSpeed(speed) {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause();
        }

        this.playbackSpeed = Math.max(0.1, Math.min(speed, 5.0)); // Clamp between 0.1x and 5.0x

        if (wasPlaying) {
            this.play();
        }
    }

    /**
     * Toggle loop mode
     */
    setLoop(enabled) {
        this.loop = enabled;
    }

    /**
     * Register callback for data updates
     * @param {function} callback - Called with frame data on each update
     */
    onData(callback) {
        this.onDataCallback = callback;
    }

    /**
     * Register callback for status updates
     * @param {function} callback - Called with (status, message) on status change
     */
    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    /**
     * Get current playback progress (0.0 to 1.0)
     */
    getProgress() {
        if (!this.data) return 0;
        return this.currentIndex / this.data.metadata.sample_count;
    }

    /**
     * Get current timestamp in seconds
     */
    getCurrentTime() {
        if (!this.data || this.currentIndex >= this.data.timestamps.length) return 0;
        return this.data.timestamps[this.currentIndex];
    }

    /**
     * Internal: Play single frame
     */
    _playFrame() {
        if (!this.data) return;

        // Check if we've reached the end
        if (this.currentIndex >= this.data.metadata.sample_count) {
            if (this.loop) {
                this.currentIndex = 0; // Loop back to start
            } else {
                this.pause();
                this._updateStatus('ended', 'Playback complete');
                return;
            }
        }

        // Build frame data in the same format as WebSocket messages
        const frame = {
            type: 'sensor_data',
            timestamp: this.data.timestamps[this.currentIndex],

            // Orientation (Euler angles)
            orientation: {
                roll: this.data.orientation.roll[this.currentIndex],
                pitch: this.data.orientation.pitch[this.currentIndex],
                yaw: this.data.orientation.yaw[this.currentIndex]
            },

            // Linear acceleration
            linear_acceleration: {
                x: this.data.linear_acceleration.x[this.currentIndex],
                y: this.data.linear_acceleration.y[this.currentIndex],
                z: this.data.linear_acceleration.z[this.currentIndex]
            }
        };

        // Add velocity if available
        if (this.data.velocity) {
            frame.velocity = {
                x: this.data.velocity.x[this.currentIndex],
                y: this.data.velocity.y[this.currentIndex],
                z: this.data.velocity.z[this.currentIndex]
            };
        }

        // Add position if available
        if (this.data.position) {
            frame.position = {
                x: this.data.position.x[this.currentIndex],
                y: this.data.position.y[this.currentIndex],
                z: this.data.position.z[this.currentIndex]
            };
        }

        // Emit frame data
        if (this.onDataCallback) {
            this.onDataCallback(frame);
        }

        this.currentIndex++;
    }

    /**
     * Internal: Update status
     */
    _updateStatus(status, message) {
        if (this.onStatusCallback) {
            this.onStatusCallback(status, message);
        }
    }

    /**
     * Get metadata about loaded recording
     */
    getMetadata() {
        return this.data ? this.data.metadata : null;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataPlayback;
}
