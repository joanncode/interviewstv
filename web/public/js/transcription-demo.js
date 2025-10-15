/**
 * AI Transcription Demo
 * Real-time speech-to-text transcription with speaker identification
 */
class TranscriptionDemo {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.transcriptionSegments = [];
        this.currentSpeaker = 'Speaker 1';
        this.startTime = null;
        this.wordCount = 0;
        this.confidenceSum = 0;
        this.confidenceCount = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudioVisualizer();
        this.checkBrowserSupport();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.recordBtn = document.getElementById('record-btn');
        this.recordStatus = document.getElementById('record-status');
        this.transcriptionContainer = document.getElementById('transcription-container');
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.exportOptions = document.getElementById('export-options');
        this.downloadBtn = document.getElementById('download-btn');
        
        // Stats elements
        this.durationCounter = document.getElementById('duration-counter');
        this.wordCounter = document.getElementById('word-counter');
        this.confidenceAvg = document.getElementById('confidence-avg');
        
        // Settings elements
        this.languageSelect = document.getElementById('language-select');
        this.speakerIdentification = document.getElementById('speaker-identification');
        this.autoPunctuation = document.getElementById('auto-punctuation');
        this.profanityFilter = document.getElementById('profanity-filter');
        this.confidenceThreshold = document.getElementById('confidence-threshold');
        this.confidenceValue = document.getElementById('confidence-value');
        
        // Audio visualizer
        this.audioVisualizer = document.getElementById('audio-visualizer');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.clearBtn.addEventListener('click', () => this.clearTranscription());
        this.exportBtn.addEventListener('click', () => this.toggleExportOptions());
        this.downloadBtn.addEventListener('click', () => this.downloadTranscription());
        this.searchBtn.addEventListener('click', () => this.searchTranscription());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTranscription();
        });
        
        // Settings listeners
        this.confidenceThreshold.addEventListener('input', (e) => {
            this.confidenceValue.textContent = Math.round(e.target.value * 100) + '%';
        });
        
        this.languageSelect.addEventListener('change', () => {
            if (this.isRecording) {
                this.showToast('Language change will take effect on next recording', 'info');
            }
        });
    }

    /**
     * Check browser support for speech recognition
     */
    checkBrowserSupport() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showToast('Speech recognition not supported in this browser', 'error');
            this.recordBtn.disabled = true;
            return false;
        }
        return true;
    }

    /**
     * Initialize audio visualizer
     */
    initializeAudioVisualizer() {
        // Create audio bars for visualizer
        for (let i = 0; i < 50; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.left = (i * 6) + 'px';
            bar.style.height = '2px';
            this.audioVisualizer.appendChild(bar);
        }
    }

    /**
     * Toggle recording state
     */
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    /**
     * Start recording and transcription
     */
    async startRecording() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup audio context for visualization
            this.setupAudioContext(stream);
            
            // Setup speech recognition
            this.setupSpeechRecognition();
            
            // Start recognition
            this.recognition.start();
            
            this.isRecording = true;
            this.startTime = Date.now();
            this.updateRecordingUI();
            this.startDurationCounter();
            this.startAudioVisualization();
            
            this.showToast('Recording started', 'success');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showToast('Failed to start recording: ' + error.message, 'error');
        }
    }

    /**
     * Stop recording and transcription
     */
    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
        
        if (this.microphone) {
            this.microphone.getTracks().forEach(track => track.stop());
        }
        
        this.isRecording = false;
        this.updateRecordingUI();
        this.stopAudioVisualization();
        
        this.showToast('Recording stopped', 'info');
    }

    /**
     * Setup audio context for visualization
     */
    setupAudioContext(stream) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.microphone = stream;
        
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        
        this.analyser.fftSize = 256;
    }

    /**
     * Setup speech recognition
     */
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.languageSelect.value;
        
        this.recognition.onresult = (event) => this.handleSpeechResult(event);
        this.recognition.onerror = (event) => this.handleSpeechError(event);
        this.recognition.onend = () => this.handleSpeechEnd();
    }

    /**
     * Handle speech recognition results
     */
    handleSpeechResult(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const confidence = result[0].confidence || 0.8;
            const isFinal = result.isFinal;
            
            // Check confidence threshold
            if (confidence < parseFloat(this.confidenceThreshold.value)) {
                continue;
            }
            
            // Apply profanity filter if enabled
            const filteredText = this.profanityFilter.checked ? 
                this.applyProfanityFilter(transcript) : transcript;
            
            // Apply auto punctuation if enabled
            const finalText = this.autoPunctuation.checked ? 
                this.applyAutoPunctuation(filteredText) : filteredText;
            
            this.addTranscriptionSegment(finalText, confidence, isFinal);
            this.updateStats(finalText, confidence);
        }
    }

    /**
     * Handle speech recognition errors
     */
    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        
        switch (event.error) {
            case 'no-speech':
                this.showToast('No speech detected', 'warning');
                break;
            case 'audio-capture':
                this.showToast('Audio capture failed', 'error');
                break;
            case 'not-allowed':
                this.showToast('Microphone access denied', 'error');
                break;
            default:
                this.showToast('Speech recognition error: ' + event.error, 'error');
        }
    }

    /**
     * Handle speech recognition end
     */
    handleSpeechEnd() {
        if (this.isRecording) {
            // Restart recognition if still recording
            setTimeout(() => {
                if (this.isRecording) {
                    this.recognition.start();
                }
            }, 100);
        }
    }

    /**
     * Add transcription segment to display
     */
    addTranscriptionSegment(text, confidence, isFinal) {
        const timestamp = this.formatTimestamp(Date.now() - this.startTime);
        const confidenceClass = this.getConfidenceClass(confidence);
        
        // Remove existing interim results
        if (!isFinal) {
            const interimElements = this.transcriptionContainer.querySelectorAll('.interim');
            interimElements.forEach(el => el.remove());
        }
        
        // Clear placeholder if this is the first segment
        if (this.transcriptionSegments.length === 0 && isFinal) {
            this.transcriptionContainer.innerHTML = '';
        }
        
        const segmentElement = document.createElement('div');
        segmentElement.className = `transcription-segment ${isFinal ? '' : 'interim'}`;
        segmentElement.innerHTML = `
            <div class="speaker-label">
                ${this.speakerIdentification.checked ? this.currentSpeaker : 'Speaker'}
                <span class="timestamp">${timestamp}</span>
                <span class="confidence-indicator ${confidenceClass}" 
                      title="Confidence: ${Math.round(confidence * 100)}%"></span>
            </div>
            <div class="text-content">${text}</div>
        `;
        
        this.transcriptionContainer.appendChild(segmentElement);
        this.transcriptionContainer.scrollTop = this.transcriptionContainer.scrollHeight;
        
        if (isFinal) {
            this.transcriptionSegments.push({
                speaker: this.currentSpeaker,
                text: text,
                confidence: confidence,
                timestamp: timestamp,
                time: Date.now() - this.startTime
            });
        }
    }

    /**
     * Update recording statistics
     */
    updateStats(text, confidence) {
        this.wordCount += text.split(' ').length;
        this.confidenceSum += confidence;
        this.confidenceCount++;
        
        this.wordCounter.textContent = this.wordCount;
        this.confidenceAvg.textContent = Math.round((this.confidenceSum / this.confidenceCount) * 100) + '%';
    }

    /**
     * Update recording UI
     */
    updateRecordingUI() {
        if (this.isRecording) {
            this.recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            this.recordBtn.classList.add('recording');
            this.recordBtn.title = 'Stop Recording';
            this.recordStatus.textContent = 'Recording in progress...';
        } else {
            this.recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.recordBtn.classList.remove('recording');
            this.recordBtn.title = 'Start Recording';
            this.recordStatus.textContent = 'Click to start recording';
        }
    }

    /**
     * Start duration counter
     */
    startDurationCounter() {
        this.durationInterval = setInterval(() => {
            if (this.isRecording && this.startTime) {
                const elapsed = Date.now() - this.startTime;
                this.durationCounter.textContent = this.formatDuration(elapsed);
            }
        }, 1000);
    }

    /**
     * Start audio visualization
     */
    startAudioVisualization() {
        const bars = this.audioVisualizer.querySelectorAll('.audio-bar');
        
        const animate = () => {
            if (!this.isRecording || !this.analyser) return;
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            
            bars.forEach((bar, index) => {
                const value = dataArray[index * 2] || 0;
                const height = (value / 255) * 60;
                bar.style.height = Math.max(2, height) + 'px';
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Stop audio visualization
     */
    stopAudioVisualization() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
        }
        
        // Reset audio bars
        const bars = this.audioVisualizer.querySelectorAll('.audio-bar');
        bars.forEach(bar => {
            bar.style.height = '2px';
        });
    }

    /**
     * Clear transcription
     */
    clearTranscription() {
        this.transcriptionSegments = [];
        this.wordCount = 0;
        this.confidenceSum = 0;
        this.confidenceCount = 0;
        
        this.transcriptionContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-microphone-slash fa-3x mb-3"></i>
                <h5>Start recording to see live transcription</h5>
                <p>Your speech will appear here in real-time with speaker identification and confidence indicators</p>
            </div>
        `;
        
        this.wordCounter.textContent = '0';
        this.confidenceAvg.textContent = '0%';
        this.durationCounter.textContent = '00:00';
        
        this.showToast('Transcription cleared', 'info');
    }

    /**
     * Search transcription
     */
    searchTranscription() {
        const query = this.searchInput.value.trim();
        if (!query) return;
        
        const segments = this.transcriptionContainer.querySelectorAll('.transcription-segment:not(.interim)');
        let foundCount = 0;
        
        segments.forEach(segment => {
            const textContent = segment.querySelector('.text-content');
            const originalText = textContent.dataset.originalText || textContent.textContent;
            
            if (!textContent.dataset.originalText) {
                textContent.dataset.originalText = originalText;
            }
            
            if (originalText.toLowerCase().includes(query.toLowerCase())) {
                const highlightedText = originalText.replace(
                    new RegExp(query, 'gi'),
                    '<span class="search-highlight">$&</span>'
                );
                textContent.innerHTML = highlightedText;
                segment.style.display = 'block';
                foundCount++;
            } else {
                segment.style.display = 'none';
            }
        });
        
        this.showToast(`Found ${foundCount} results for "${query}"`, 'info');
    }

    /**
     * Toggle export options
     */
    toggleExportOptions() {
        if (this.transcriptionSegments.length === 0) {
            this.showToast('No transcription to export', 'warning');
            return;
        }
        
        this.exportOptions.classList.toggle('d-none');
    }

    /**
     * Download transcription
     */
    downloadTranscription() {
        if (this.transcriptionSegments.length === 0) {
            this.showToast('No transcription to download', 'warning');
            return;
        }
        
        const format = document.getElementById('export-format').value;
        const includeTimestamps = document.getElementById('include-timestamps').checked;
        const includeSpeakers = document.getElementById('include-speakers').checked;
        
        const content = this.formatTranscriptionForExport(format, includeTimestamps, includeSpeakers);
        const filename = `transcription_${new Date().toISOString().split('T')[0]}.${format}`;
        
        this.downloadFile(content, filename);
        this.showToast('Transcription downloaded', 'success');
    }

    /**
     * Apply profanity filter
     */
    applyProfanityFilter(text) {
        const profanityWords = ['damn', 'hell', 'crap']; // Basic list
        let filteredText = text;

        profanityWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '*'.repeat(word.length));
        });

        return filteredText;
    }

    /**
     * Apply auto punctuation
     */
    applyAutoPunctuation(text) {
        let punctuatedText = text;

        // Add periods at the end of sentences
        if (!punctuatedText.match(/[.!?]$/)) {
            punctuatedText += '.';
        }

        // Capitalize first letter
        punctuatedText = punctuatedText.charAt(0).toUpperCase() + punctuatedText.slice(1);

        return punctuatedText;
    }

    /**
     * Get confidence class for styling
     */
    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'confidence-high';
        if (confidence >= 0.6) return 'confidence-medium';
        return 'confidence-low';
    }

    /**
     * Format timestamp
     */
    formatTimestamp(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format duration
     */
    formatDuration(milliseconds) {
        return this.formatTimestamp(milliseconds);
    }

    /**
     * Format transcription for export
     */
    formatTranscriptionForExport(format, includeTimestamps, includeSpeakers) {
        let content = '';

        switch (format) {
            case 'txt':
                this.transcriptionSegments.forEach(segment => {
                    let line = '';

                    if (includeTimestamps) {
                        line += `[${segment.timestamp}] `;
                    }

                    if (includeSpeakers) {
                        line += `${segment.speaker}: `;
                    }

                    line += segment.text + '\n';
                    content += line;
                });
                break;

            case 'srt':
                this.transcriptionSegments.forEach((segment, index) => {
                    const startTime = this.formatSrtTime(segment.time);
                    const endTime = this.formatSrtTime(segment.time + 3000); // Assume 3 second duration

                    content += `${index + 1}\n`;
                    content += `${startTime} --> ${endTime}\n`;

                    if (includeSpeakers) {
                        content += `${segment.speaker}: `;
                    }

                    content += segment.text + '\n\n';
                });
                break;

            case 'vtt':
                content = 'WEBVTT\n\n';
                this.transcriptionSegments.forEach(segment => {
                    const startTime = this.formatVttTime(segment.time);
                    const endTime = this.formatVttTime(segment.time + 3000);

                    content += `${startTime} --> ${endTime}\n`;

                    if (includeSpeakers) {
                        content += `<v ${segment.speaker}>`;
                    }

                    content += segment.text + '\n\n';
                });
                break;

            case 'json':
                const exportData = {
                    metadata: {
                        created_at: new Date().toISOString(),
                        total_segments: this.transcriptionSegments.length,
                        total_words: this.wordCount,
                        average_confidence: this.confidenceSum / this.confidenceCount,
                        language: this.languageSelect.value
                    },
                    segments: this.transcriptionSegments
                };
                content = JSON.stringify(exportData, null, 2);
                break;
        }

        return content;
    }

    /**
     * Format time for SRT
     */
    formatSrtTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ms = milliseconds % 1000;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    /**
     * Format time for VTT
     */
    formatVttTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ms = milliseconds % 1000;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    /**
     * Download file
     */
    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize transcription demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transcriptionDemo = new TranscriptionDemo();
});
