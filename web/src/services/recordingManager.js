/**
 * Recording Manager for WebRTC Interview Recording
 * Handles client-side recording using MediaRecorder API
 */
class RecordingManager {
    constructor(roomId, authToken) {
        this.roomId = roomId;
        this.authToken = authToken;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.recordingId = null;
        this.chunkIndex = 0;
        this.uploadQueue = [];
        this.maxChunkSize = 5 * 1024 * 1024; // 5MB chunks
        this.recordingStartTime = null;
        
        // Recording configuration
        this.config = {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 2500000, // 2.5 Mbps for 720p
            audioBitsPerSecond: 128000   // 128 kbps for audio
        };

        // Fallback MIME types if primary not supported
        this.fallbackMimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm',
            'video/mp4'
        ];

        this.events = new EventTarget();
        this.init();
    }

    /**
     * Initialize recording manager
     */
    init() {
        // Check MediaRecorder support
        if (!window.MediaRecorder) {
            throw new Error('MediaRecorder API not supported in this browser');
        }

        // Find supported MIME type
        this.config.mimeType = this.getSupportedMimeType();
        console.log('Using MIME type:', this.config.mimeType);
    }

    /**
     * Get supported MIME type
     */
    getSupportedMimeType() {
        for (const mimeType of this.fallbackMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }
        throw new Error('No supported MIME type found for recording');
    }

    /**
     * Start recording
     */
    async startRecording(mediaStream, options = {}) {
        try {
            if (this.isRecording) {
                throw new Error('Recording already in progress');
            }

            // Start recording session on server
            const response = await fetch('/api/recordings/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    options: {
                        format: 'webm',
                        quality: options.quality || '720p'
                    }
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to start recording');
            }

            this.recordingId = data.data.recording_id;
            this.recordingStartTime = new Date();

            // Initialize MediaRecorder
            this.mediaRecorder = new MediaRecorder(mediaStream, {
                mimeType: this.config.mimeType,
                videoBitsPerSecond: this.config.videoBitsPerSecond,
                audioBitsPerSecond: this.config.audioBitsPerSecond
            });

            // Set up event handlers
            this.setupMediaRecorderEvents();

            // Start recording
            this.mediaRecorder.start(10000); // 10-second chunks
            this.isRecording = true;
            this.isPaused = false;

            this.dispatchEvent('recordingStarted', {
                recordingId: this.recordingId,
                startTime: this.recordingStartTime
            });

            return {
                success: true,
                recordingId: this.recordingId
            };

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.dispatchEvent('recordingError', { error: error.message });
            throw error;
        }
    }

    /**
     * Stop recording
     */
    async stopRecording() {
        try {
            if (!this.isRecording) {
                throw new Error('No recording in progress');
            }

            // Stop MediaRecorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

            // Wait for final chunks to be processed
            await this.waitForUploadQueue();

            // Stop recording session on server
            if (this.recordingId) {
                const response = await fetch(`/api/recordings/${this.recordingId}/stop`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });

                const data = await response.json();
                if (!data.success) {
                    console.warn('Failed to stop recording on server:', data.message);
                }

                // Process recording chunks
                try {
                    const processResponse = await fetch(`/api/recordings/${this.recordingId}/process`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    });

                    const processData = await processResponse.json();
                    if (processData.success) {
                        console.log('Recording processed successfully:', processData.data);
                        this.dispatchEvent('recordingProcessed', processData.data);
                    } else {
                        console.warn('Failed to process recording:', processData.message);
                    }
                } catch (error) {
                    console.warn('Failed to process recording chunks:', error);
                }
            }

            this.isRecording = false;
            this.isPaused = false;
            
            const duration = this.recordingStartTime ? 
                (new Date() - this.recordingStartTime) / 1000 : 0;

            this.dispatchEvent('recordingStopped', {
                recordingId: this.recordingId,
                duration: duration
            });

            return {
                success: true,
                recordingId: this.recordingId,
                duration: duration
            };

        } catch (error) {
            console.error('Failed to stop recording:', error);
            this.dispatchEvent('recordingError', { error: error.message });
            throw error;
        }
    }

    /**
     * Pause recording
     */
    async pauseRecording() {
        try {
            if (!this.isRecording || this.isPaused) {
                throw new Error('Cannot pause recording');
            }

            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.pause();
            }

            // Notify server
            if (this.recordingId) {
                await fetch(`/api/recordings/${this.recordingId}/pause`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }

            this.isPaused = true;
            this.dispatchEvent('recordingPaused', { recordingId: this.recordingId });

            return { success: true };

        } catch (error) {
            console.error('Failed to pause recording:', error);
            throw error;
        }
    }

    /**
     * Resume recording
     */
    async resumeRecording() {
        try {
            if (!this.isRecording || !this.isPaused) {
                throw new Error('Cannot resume recording');
            }

            if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
                this.mediaRecorder.resume();
            }

            // Notify server
            if (this.recordingId) {
                await fetch(`/api/recordings/${this.recordingId}/resume`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }

            this.isPaused = false;
            this.dispatchEvent('recordingResumed', { recordingId: this.recordingId });

            return { success: true };

        } catch (error) {
            console.error('Failed to resume recording:', error);
            throw error;
        }
    }

    /**
     * Set up MediaRecorder event handlers
     */
    setupMediaRecorderEvents() {
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.handleRecordingChunk(event.data);
            }
        };

        this.mediaRecorder.onstart = () => {
            console.log('MediaRecorder started');
        };

        this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
        };

        this.mediaRecorder.onpause = () => {
            console.log('MediaRecorder paused');
        };

        this.mediaRecorder.onresume = () => {
            console.log('MediaRecorder resumed');
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            this.dispatchEvent('recordingError', { error: event.error.message });
        };
    }

    /**
     * Handle recording chunk
     */
    async handleRecordingChunk(chunk) {
        try {
            // Add to upload queue
            this.uploadQueue.push({
                chunk: chunk,
                index: this.chunkIndex++,
                timestamp: new Date()
            });

            // Process upload queue
            this.processUploadQueue();

        } catch (error) {
            console.error('Failed to handle recording chunk:', error);
        }
    }

    /**
     * Process upload queue
     */
    async processUploadQueue() {
        if (this.uploadQueue.length === 0 || !this.recordingId) {
            return;
        }

        const item = this.uploadQueue.shift();
        
        try {
            await this.uploadChunk(item.chunk, item.index);
            
            this.dispatchEvent('chunkUploaded', {
                chunkIndex: item.index,
                chunkSize: item.chunk.size
            });

            // Continue processing queue
            if (this.uploadQueue.length > 0) {
                setTimeout(() => this.processUploadQueue(), 100);
            }

        } catch (error) {
            console.error('Failed to upload chunk:', error);
            // Re-add to queue for retry
            this.uploadQueue.unshift(item);
        }
    }

    /**
     * Upload recording chunk to server
     */
    async uploadChunk(chunk, chunkIndex) {
        const formData = new FormData();
        formData.append('chunk', chunk, `chunk_${chunkIndex}.webm`);
        formData.append('chunk_index', chunkIndex);

        const response = await fetch(`/api/recordings/${this.recordingId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Wait for upload queue to be empty
     */
    async waitForUploadQueue(timeout = 30000) {
        const startTime = Date.now();
        
        while (this.uploadQueue.length > 0 && (Date.now() - startTime) < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.uploadQueue.length > 0) {
            console.warn('Upload queue not empty after timeout');
        }
    }

    /**
     * Get recording status
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            recordingId: this.recordingId,
            startTime: this.recordingStartTime,
            duration: this.recordingStartTime ? 
                (new Date() - this.recordingStartTime) / 1000 : 0,
            queueLength: this.uploadQueue.length
        };
    }

    /**
     * Event handling
     */
    addEventListener(type, listener) {
        this.events.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
        this.events.removeEventListener(type, listener);
    }

    dispatchEvent(type, detail) {
        this.events.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        
        this.recordedChunks = [];
        this.uploadQueue = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecordingManager;
} else if (typeof window !== 'undefined') {
    window.RecordingManager = RecordingManager;
}
