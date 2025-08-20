export default class MediaPlayer {
    constructor(media, options = {}) {
        this.media = media;
        this.options = {
            autoplay: false,
            controls: true,
            muted: false,
            loop: false,
            preload: 'metadata',
            showTranscript: true,
            showChapters: true,
            showPlaybackSpeed: true,
            showQuality: true,
            ...options
        };
        this.player = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 1;
        this.playbackRate = 1;
        this.chapters = [];
        this.transcript = null;
    }

    render(container) {
        container.innerHTML = this.getHTML();
        this.setupPlayer(container);
        this.setupEventListeners(container);
        
        if (this.media.transcript_url) {
            this.loadTranscript();
        }
        
        if (this.media.chapters) {
            this.chapters = this.media.chapters;
            this.renderChapters();
        }
    }

    getHTML() {
        return `
            <div class="media-player" data-media-type="${this.media.type}">
                <div class="player-container">
                    ${this.getPlayerHTML()}
                    ${this.getCustomControlsHTML()}
                </div>
                
                ${this.options.showTranscript ? this.getTranscriptHTML() : ''}
                ${this.options.showChapters && this.chapters.length > 0 ? this.getChaptersHTML() : ''}
            </div>
        `;
    }

    getPlayerHTML() {
        const { media } = this;
        
        if (media.type === 'video') {
            return `
                <div class="video-player-wrapper position-relative">
                    <video 
                        id="media-player"
                        class="w-100 rounded"
                        ${this.options.controls ? 'controls' : ''}
                        ${this.options.autoplay ? 'autoplay' : ''}
                        ${this.options.muted ? 'muted' : ''}
                        ${this.options.loop ? 'loop' : ''}
                        preload="${this.options.preload}"
                        poster="${media.thumbnail_url || ''}"
                        style="max-height: 500px; background: #000;">
                        <source src="${media.url}" type="${media.mime_type || 'video/mp4'}">
                        ${media.compressed_url ? `<source src="${media.compressed_url}" type="video/mp4">` : ''}
                        <track kind="subtitles" src="${media.subtitle_url || ''}" srclang="en" label="English" default>
                        Your browser does not support the video tag.
                    </video>
                    
                    <div class="video-overlay position-absolute top-0 start-0 w-100 h-100 d-none" id="video-overlay">
                        <div class="d-flex align-items-center justify-content-center h-100">
                            <button class="btn btn-primary btn-lg rounded-circle" id="play-pause-overlay">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (media.type === 'audio') {
            return `
                <div class="audio-player-wrapper">
                    <div class="audio-player-visual bg-dark rounded p-4 mb-3">
                        <div class="row align-items-center">
                            <div class="col-md-3 text-center">
                                <div class="audio-artwork">
                                    ${media.waveform_url ? 
                                        `<img src="${media.waveform_url}" alt="Audio Waveform" class="img-fluid rounded">` :
                                        `<i class="fas fa-music fa-4x text-white mb-2"></i>`
                                    }
                                </div>
                            </div>
                            <div class="col-md-9">
                                <div class="audio-info text-white">
                                    <h5 class="mb-1">${media.title || 'Audio Interview'}</h5>
                                    <p class="mb-2 text-muted">${media.description || ''}</p>
                                    <div class="audio-meta small">
                                        <span class="me-3">
                                            <i class="fas fa-clock me-1"></i>
                                            <span id="audio-duration">${this.formatTime(media.duration || 0)}</span>
                                        </span>
                                        <span class="me-3">
                                            <i class="fas fa-file-audio me-1"></i>
                                            ${media.mime_type || 'Audio'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <audio 
                        id="media-player"
                        class="w-100"
                        ${this.options.controls ? 'controls' : ''}
                        ${this.options.autoplay ? 'autoplay' : ''}
                        ${this.options.loop ? 'loop' : ''}
                        preload="${this.options.preload}">
                        <source src="${media.url}" type="${media.mime_type || 'audio/mp3'}">
                        ${media.compressed_url ? `<source src="${media.compressed_url}" type="audio/mp3">` : ''}
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            `;
        } else {
            return `
                <div class="text-player bg-light rounded p-4">
                    <div class="text-content">
                        <div id="interview-text-content">
                            ${media.content || 'Loading content...'}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    getCustomControlsHTML() {
        if (this.media.type === 'text') {
            return '';
        }

        return `
            <div class="custom-controls mt-3">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <div class="playback-controls d-flex align-items-center gap-2">
                            <button class="btn btn-outline-primary btn-sm" id="rewind-btn" title="Rewind 10s">
                                <i class="fas fa-backward"></i>
                            </button>
                            <button class="btn btn-primary" id="play-pause-btn">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn btn-outline-primary btn-sm" id="forward-btn" title="Forward 10s">
                                <i class="fas fa-forward"></i>
                            </button>
                            
                            <div class="time-display ms-3">
                                <span id="current-time">0:00</span> / <span id="total-time">0:00</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="player-options d-flex align-items-center justify-content-end gap-3">
                            ${this.options.showPlaybackSpeed ? `
                                <div class="playback-speed">
                                    <select class="form-select form-select-sm" id="playback-speed" style="width: auto;">
                                        <option value="0.5">0.5x</option>
                                        <option value="0.75">0.75x</option>
                                        <option value="1" selected>1x</option>
                                        <option value="1.25">1.25x</option>
                                        <option value="1.5">1.5x</option>
                                        <option value="2">2x</option>
                                    </select>
                                </div>
                            ` : ''}
                            
                            <div class="volume-control d-flex align-items-center">
                                <button class="btn btn-sm btn-outline-secondary" id="mute-btn">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                                <input type="range" class="form-range ms-2" id="volume-slider" 
                                       min="0" max="1" step="0.1" value="1" style="width: 80px;">
                            </div>
                            
                            ${this.media.type === 'video' ? `
                                <button class="btn btn-sm btn-outline-secondary" id="fullscreen-btn" title="Fullscreen">
                                    <i class="fas fa-expand"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="progress-container mt-3">
                    <div class="progress" style="height: 8px; cursor: pointer;" id="progress-container">
                        <div class="progress-bar bg-primary" id="progress-bar" style="width: 0%"></div>
                        <div class="progress-buffer bg-secondary opacity-50" id="buffer-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getTranscriptHTML() {
        return `
            <div class="transcript-section mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">
                        <i class="fas fa-file-text me-2"></i>Transcript
                    </h6>
                    <div class="transcript-controls">
                        <button class="btn btn-sm btn-outline-secondary" id="toggle-transcript">
                            <i class="fas fa-eye"></i> Show/Hide
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="download-transcript">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
                
                <div class="transcript-content bg-light rounded p-3" id="transcript-content" style="max-height: 300px; overflow-y: auto;">
                    <div class="text-center text-muted">
                        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading transcript...
                    </div>
                </div>
            </div>
        `;
    }

    getChaptersHTML() {
        return `
            <div class="chapters-section mt-4">
                <h6 class="mb-3">
                    <i class="fas fa-list me-2"></i>Chapters
                </h6>
                
                <div class="chapters-list">
                    ${this.chapters.map((chapter, index) => `
                        <div class="chapter-item d-flex align-items-center p-2 rounded mb-2 cursor-pointer" 
                             data-time="${chapter.time}" data-chapter="${index}">
                            <div class="chapter-thumbnail me-3">
                                <img src="${chapter.thumbnail || this.media.thumbnail_url}" 
                                     alt="Chapter ${index + 1}" 
                                     class="rounded" 
                                     width="60" height="40"
                                     style="object-fit: cover;">
                            </div>
                            <div class="chapter-info flex-grow-1">
                                <div class="chapter-title fw-medium">${chapter.title}</div>
                                <div class="chapter-time text-muted small">${this.formatTime(chapter.time)}</div>
                            </div>
                            <div class="chapter-duration text-muted small">
                                ${this.formatTime(chapter.duration || 0)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupPlayer(container) {
        this.player = container.querySelector('#media-player');
        
        if (!this.player) return;

        // Set up player event listeners
        this.player.addEventListener('loadedmetadata', () => {
            this.duration = this.player.duration;
            this.updateTimeDisplay();
        });

        this.player.addEventListener('timeupdate', () => {
            this.currentTime = this.player.currentTime;
            this.updateProgress();
            this.updateTimeDisplay();
            this.highlightCurrentChapter();
            this.highlightTranscriptSegment();
        });

        this.player.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });

        this.player.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        this.player.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        this.player.addEventListener('progress', () => {
            this.updateBufferProgress();
        });
    }

    setupEventListeners(container) {
        // Play/pause button
        const playPauseBtn = container.querySelector('#play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Overlay play button (for video)
        const overlayBtn = container.querySelector('#play-pause-overlay');
        if (overlayBtn) {
            overlayBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Rewind/forward buttons
        const rewindBtn = container.querySelector('#rewind-btn');
        const forwardBtn = container.querySelector('#forward-btn');

        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => this.seek(this.currentTime - 10));
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => this.seek(this.currentTime + 10));
        }

        // Progress bar
        const progressContainer = container.querySelector('#progress-container');
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.seek(percent * this.duration);
            });
        }

        // Volume controls
        const muteBtn = container.querySelector('#mute-btn');
        const volumeSlider = container.querySelector('#volume-slider');

        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(parseFloat(e.target.value));
            });
        }

        // Playback speed
        const speedSelect = container.querySelector('#playback-speed');
        if (speedSelect) {
            speedSelect.addEventListener('change', (e) => {
                this.setPlaybackRate(parseFloat(e.target.value));
            });
        }

        // Fullscreen
        const fullscreenBtn = container.querySelector('#fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Transcript controls
        const toggleTranscriptBtn = container.querySelector('#toggle-transcript');
        const downloadTranscriptBtn = container.querySelector('#download-transcript');

        if (toggleTranscriptBtn) {
            toggleTranscriptBtn.addEventListener('click', () => this.toggleTranscript());
        }

        if (downloadTranscriptBtn) {
            downloadTranscriptBtn.addEventListener('click', () => this.downloadTranscript());
        }

        // Chapter navigation
        container.addEventListener('click', (e) => {
            const chapterItem = e.target.closest('.chapter-item');
            if (chapterItem) {
                const time = parseFloat(chapterItem.dataset.time);
                this.seek(time);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seek(this.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seek(this.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setVolume(Math.min(1, this.volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.setVolume(Math.max(0, this.volume - 0.1));
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        });
    }

    togglePlayPause() {
        if (!this.player) return;

        if (this.isPlaying) {
            this.player.pause();
        } else {
            this.player.play();
        }
    }

    seek(time) {
        if (!this.player) return;

        this.player.currentTime = Math.max(0, Math.min(time, this.duration));
    }

    setVolume(volume) {
        if (!this.player) return;

        this.volume = Math.max(0, Math.min(1, volume));
        this.player.volume = this.volume;

        const volumeSlider = document.querySelector('#volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.volume;
        }

        this.updateMuteButton();
    }

    toggleMute() {
        if (!this.player) return;

        if (this.player.muted) {
            this.player.muted = false;
            this.setVolume(this.volume);
        } else {
            this.player.muted = true;
        }

        this.updateMuteButton();
    }

    setPlaybackRate(rate) {
        if (!this.player) return;

        this.playbackRate = rate;
        this.player.playbackRate = rate;
    }

    toggleFullscreen() {
        if (!this.player || this.media.type !== 'video') return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.player.requestFullscreen();
        }
    }

    updatePlayButton() {
        const playPauseBtn = document.querySelector('#play-pause-btn');
        const overlayBtn = document.querySelector('#play-pause-overlay');

        const icon = this.isPlaying ? 'fa-pause' : 'fa-play';

        if (playPauseBtn) {
            const iconEl = playPauseBtn.querySelector('i');
            if (iconEl) {
                iconEl.className = `fas ${icon}`;
            }
        }

        if (overlayBtn) {
            const iconEl = overlayBtn.querySelector('i');
            if (iconEl) {
                iconEl.className = `fas ${icon}`;
            }
        }
    }

    updateProgress() {
        if (!this.duration) return;

        const percent = (this.currentTime / this.duration) * 100;
        const progressBar = document.querySelector('#progress-bar');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    updateBufferProgress() {
        if (!this.player || !this.duration) return;

        const buffered = this.player.buffered;
        if (buffered.length > 0) {
            const bufferedEnd = buffered.end(buffered.length - 1);
            const percent = (bufferedEnd / this.duration) * 100;
            const bufferBar = document.querySelector('#buffer-bar');

            if (bufferBar) {
                bufferBar.style.width = `${percent}%`;
            }
        }
    }

    updateTimeDisplay() {
        const currentTimeEl = document.querySelector('#current-time');
        const totalTimeEl = document.querySelector('#total-time');

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.currentTime);
        }

        if (totalTimeEl) {
            totalTimeEl.textContent = this.formatTime(this.duration);
        }
    }

    updateMuteButton() {
        const muteBtn = document.querySelector('#mute-btn');
        if (!muteBtn) return;

        const iconEl = muteBtn.querySelector('i');
        if (!iconEl) return;

        if (this.player.muted || this.volume === 0) {
            iconEl.className = 'fas fa-volume-mute';
        } else if (this.volume < 0.5) {
            iconEl.className = 'fas fa-volume-down';
        } else {
            iconEl.className = 'fas fa-volume-up';
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    async loadTranscript() {
        if (!this.media.transcript_url) return;

        try {
            const response = await fetch(this.media.transcript_url);
            const transcript = await response.text();

            this.transcript = this.parseTranscript(transcript);
            this.renderTranscript();
        } catch (error) {
            console.error('Failed to load transcript:', error);
            this.renderTranscriptError();
        }
    }

    parseTranscript(text) {
        // Parse VTT or SRT format transcript
        const lines = text.split('\n');
        const segments = [];

        // Simple VTT parser
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('-->')) {
                const [start, end] = line.split('-->').map(t => this.parseTimeCode(t.trim()));
                const content = lines[i + 1]?.trim() || '';

                segments.push({ start, end, content });
            }
        }

        return segments;
    }

    parseTimeCode(timeCode) {
        const parts = timeCode.split(':');
        const seconds = parseFloat(parts.pop());
        const minutes = parseInt(parts.pop() || 0);
        const hours = parseInt(parts.pop() || 0);

        return hours * 3600 + minutes * 60 + seconds;
    }

    renderTranscript() {
        const transcriptContent = document.querySelector('#transcript-content');
        if (!transcriptContent || !this.transcript) return;

        const html = this.transcript.map((segment, index) => `
            <div class="transcript-segment p-2 rounded mb-1 cursor-pointer"
                 data-start="${segment.start}"
                 data-end="${segment.end}"
                 data-segment="${index}">
                <span class="transcript-time text-muted small me-2">${this.formatTime(segment.start)}</span>
                <span class="transcript-text">${segment.content}</span>
            </div>
        `).join('');

        transcriptContent.innerHTML = html;

        // Add click listeners for transcript segments
        transcriptContent.addEventListener('click', (e) => {
            const segment = e.target.closest('.transcript-segment');
            if (segment) {
                const startTime = parseFloat(segment.dataset.start);
                this.seek(startTime);
            }
        });
    }

    renderTranscriptError() {
        const transcriptContent = document.querySelector('#transcript-content');
        if (transcriptContent) {
            transcriptContent.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load transcript
                </div>
            `;
        }
    }

    highlightCurrentChapter() {
        if (!this.chapters.length) return;

        const currentChapter = this.chapters.findIndex(chapter =>
            this.currentTime >= chapter.time &&
            this.currentTime < (chapter.time + (chapter.duration || 0))
        );

        document.querySelectorAll('.chapter-item').forEach((item, index) => {
            item.classList.toggle('bg-primary', index === currentChapter);
            item.classList.toggle('text-white', index === currentChapter);
        });
    }

    highlightTranscriptSegment() {
        if (!this.transcript) return;

        const currentSegment = this.transcript.findIndex(segment =>
            this.currentTime >= segment.start && this.currentTime < segment.end
        );

        document.querySelectorAll('.transcript-segment').forEach((segment, index) => {
            segment.classList.toggle('bg-primary', index === currentSegment);
            segment.classList.toggle('text-white', index === currentSegment);
        });

        // Auto-scroll to current segment
        if (currentSegment >= 0) {
            const segmentEl = document.querySelector(`[data-segment="${currentSegment}"]`);
            if (segmentEl) {
                segmentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    toggleTranscript() {
        const transcriptContent = document.querySelector('#transcript-content');
        if (transcriptContent) {
            transcriptContent.style.display =
                transcriptContent.style.display === 'none' ? 'block' : 'none';
        }
    }

    downloadTranscript() {
        if (!this.transcript) return;

        const text = this.transcript.map(segment =>
            `${this.formatTime(segment.start)} - ${segment.content}`
        ).join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.txt';
        a.click();

        URL.revokeObjectURL(url);
    }

    renderChapters() {
        // Chapters are already rendered in getChaptersHTML
        // This method can be used for dynamic chapter updates
    }

    destroy() {
        if (this.player) {
            this.player.pause();
            this.player.removeAttribute('src');
            this.player.load();
        }
    }
}
