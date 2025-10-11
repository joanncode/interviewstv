class VideoPlayer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.video = this.container.querySelector('#videoElement');
        this.thumbnailOverlay = this.container.querySelector('#thumbnailOverlay');
        this.videoOverlay = this.container.querySelector('#videoOverlay');
        this.playOverlay = this.container.querySelector('#playOverlay');
        this.loadingSpinner = this.container.querySelector('#loadingSpinner');
        this.errorMessage = this.container.querySelector('#errorMessage');
        this.controls = this.container.querySelector('#videoControls');
        
        // Control elements
        this.playPauseBtn = this.container.querySelector('#playPauseBtn');
        this.muteBtn = this.container.querySelector('#muteBtn');
        this.volumeSlider = this.container.querySelector('#volumeSlider');
        this.timeDisplay = this.container.querySelector('#timeDisplay');
        this.progressContainer = this.container.querySelector('#progressContainer');
        this.progressBar = this.container.querySelector('#progressBar');
        this.progressBuffer = this.container.querySelector('#progressBuffer');
        this.progressHandle = this.container.querySelector('#progressHandle');
        this.speedBtn = this.container.querySelector('#speedBtn');
        this.speedMenu = this.container.querySelector('#speedMenu');
        this.speedText = this.container.querySelector('#speedText');
        this.qualityBtn = this.container.querySelector('#qualityBtn');
        this.qualityMenu = this.container.querySelector('#qualityMenu');
        this.qualityText = this.container.querySelector('#qualityText');
        this.fullscreenBtn = this.container.querySelector('#fullscreenBtn');
        
        // Info elements
        this.videoTitle = this.container.querySelector('#videoTitle');
        this.videoDate = this.container.querySelector('#videoDate');
        this.videoDuration = this.container.querySelector('#videoDuration');
        this.videoViews = this.container.querySelector('#videoViews');
        this.videoSize = this.container.querySelector('#videoSize');

        // State
        this.isPlaying = false;
        this.isMuted = false;
        this.currentQuality = 'auto';
        this.currentSpeed = 1;
        this.videoData = null;
        this.controlsTimeout = null;
        this.isDragging = false;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Video events
        this.video.addEventListener('loadstart', () => this.showLoading());
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('canplay', () => this.hideLoading());
        this.video.addEventListener('play', () => this.onPlay());
        this.video.addEventListener('pause', () => this.onPause());
        this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.video.addEventListener('progress', () => this.onProgress());
        this.video.addEventListener('ended', () => this.onEnded());
        this.video.addEventListener('error', () => this.onError());
        this.video.addEventListener('waiting', () => this.showLoading());
        this.video.addEventListener('playing', () => this.hideLoading());

        // Thumbnail overlay click
        this.thumbnailOverlay.addEventListener('click', () => this.playVideo());

        // Play/pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        // Volume controls
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Progress bar
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        this.progressContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Speed control
        this.speedBtn.addEventListener('click', () => this.toggleSpeedMenu());
        this.speedMenu.addEventListener('click', (e) => this.selectSpeed(e));

        // Quality control
        this.qualityBtn.addEventListener('click', () => this.toggleQualityMenu());
        this.qualityMenu.addEventListener('click', (e) => this.selectQuality(e));

        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Mouse movement for controls
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('mouseleave', () => this.hideControls());

        // Click to play/pause
        this.video.addEventListener('click', () => this.togglePlayPause());

        // Close menus when clicking outside
        document.addEventListener('click', (e) => this.closeMenus(e));
    }

    loadVideo(videoData) {
        this.videoData = videoData;
        
        // Update video info
        this.videoTitle.textContent = videoData.title;
        this.videoDate.textContent = videoData.date;
        this.videoViews.textContent = `${videoData.views} views`;
        this.videoSize.textContent = videoData.size;

        // Set thumbnail
        if (videoData.thumbnail) {
            this.thumbnailOverlay.style.backgroundImage = `url(${videoData.thumbnail})`;
            this.thumbnailOverlay.style.display = 'flex';
        }

        // Set video sources
        this.video.innerHTML = '';
        videoData.sources.forEach(source => {
            const sourceElement = document.createElement('source');
            sourceElement.src = source.src;
            sourceElement.type = source.type;
            sourceElement.setAttribute('data-quality', source.quality);
            this.video.appendChild(sourceElement);
        });

        // Update quality menu
        this.updateQualityMenu(videoData.sources);
    }

    async loadRecording(recordingId) {
        try {
            this.showLoading();

            // Fetch recording data from API
            const response = await fetch(`/api/videos/${recordingId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recording');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }

            const recording = result.data;

            // Fetch available qualities
            const qualitiesResponse = await fetch(`/api/videos/${recordingId}/qualities`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            let sources = [];
            if (qualitiesResponse.ok) {
                const qualitiesResult = await qualitiesResponse.json();
                if (qualitiesResult.success) {
                    sources = qualitiesResult.data.qualities.map(quality => ({
                        src: quality.src,
                        quality: quality.quality,
                        type: quality.type,
                        label: quality.label,
                        bitrate: quality.bitrate
                    }));
                }
            }

            // Fallback to single source if qualities not available
            if (sources.length === 0) {
                sources = [
                    {
                        src: recording.url || `/api/videos/stream/${btoa(recording.storage_path)}`,
                        quality: this.getQualityFromResolution(recording.width, recording.height),
                        type: recording.mime_type || 'video/mp4'
                    }
                ];
            }

            // Convert to video data format
            const videoData = {
                title: recording.title || `Recording ${recordingId}`,
                sources: sources,
                thumbnail: recording.thumbnail_url,
                duration: recording.duration,
                date: new Date(recording.created_at).toLocaleDateString(),
                views: recording.views || 0,
                size: this.formatFileSize(recording.file_size),
                recordingId: recordingId
            };

            this.loadVideo(videoData);

            // Initialize quality selector if available
            if (window.QualitySelector && sources.length > 1) {
                setTimeout(() => {
                    if (this.qualitySelector) {
                        this.qualitySelector.loadAvailableQualities(recordingId);
                    }
                }, 100);
            }

        } catch (error) {
            console.error('Error loading recording:', error);
            this.showError(error.message);
        }
    }

    playVideo() {
        this.thumbnailOverlay.style.display = 'none';
        this.video.play();
    }

    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.hideOverlay();
    }

    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.showOverlay();
    }

    onTimeUpdate() {
        if (!this.isDragging) {
            const progress = (this.video.currentTime / this.video.duration) * 100;
            this.progressBar.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
        }
        
        this.updateTimeDisplay();
    }

    onProgress() {
        if (this.video.buffered.length > 0) {
            const buffered = (this.video.buffered.end(0) / this.video.duration) * 100;
            this.progressBuffer.style.width = `${buffered}%`;
        }
    }

    onVideoLoaded() {
        this.hideLoading();
        this.updateTimeDisplay();
        
        if (this.videoData && this.videoData.duration) {
            this.videoDuration.textContent = this.formatTime(this.videoData.duration);
        }
    }

    onEnded() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-replay"></i>';
        this.showOverlay();
    }

    onError() {
        this.hideLoading();
        this.showError('Failed to load video. Please try again.');
    }

    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = percent * this.video.duration;
    }

    startDrag(e) {
        this.isDragging = true;
        this.seek(e);
    }

    drag(e) {
        if (this.isDragging) {
            this.seek(e);
        }
    }

    endDrag() {
        this.isDragging = false;
    }

    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
            this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.volumeSlider.value = this.video.volume * 100;
        } else {
            this.video.muted = true;
            this.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    }

    setVolume(value) {
        this.video.volume = value / 100;
        this.video.muted = value == 0;
        
        if (value == 0) {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (value < 50) {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }

    toggleSpeedMenu() {
        this.speedMenu.classList.toggle('show');
        this.qualityMenu.classList.remove('show');
    }

    selectSpeed(e) {
        if (e.target.classList.contains('speed-option')) {
            const speed = parseFloat(e.target.dataset.speed);
            this.video.playbackRate = speed;
            this.currentSpeed = speed;
            this.speedText.textContent = `${speed}x`;
            
            // Update active state
            this.speedMenu.querySelectorAll('.speed-option').forEach(option => {
                option.classList.remove('active');
            });
            e.target.classList.add('active');
            
            this.speedMenu.classList.remove('show');
        }
    }

    toggleQualityMenu() {
        this.qualityMenu.classList.toggle('show');
        this.speedMenu.classList.remove('show');
    }

    selectQuality(e) {
        if (e.target.classList.contains('quality-option')) {
            const quality = e.target.dataset.quality;
            this.switchQuality(quality);
            
            // Update active state
            this.qualityMenu.querySelectorAll('.quality-option').forEach(option => {
                option.classList.remove('active');
            });
            e.target.classList.add('active');
            
            this.qualityText.textContent = quality;
            this.qualityMenu.classList.remove('show');
        }
    }

    switchQuality(quality) {
        // Implementation for quality switching would go here
        // For now, just update the current quality
        this.currentQuality = quality;
        console.log(`Switched to ${quality} quality`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().then(() => {
                this.container.classList.add('fullscreen');
                this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            });
        } else {
            document.exitFullscreen().then(() => {
                this.container.classList.remove('fullscreen');
                this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            });
        }
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.video.currentTime -= 10;
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.video.currentTime += 10;
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.setVolume(Math.min(100, this.video.volume * 100 + 10));
                this.volumeSlider.value = this.video.volume * 100;
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume * 100 - 10));
                this.volumeSlider.value = this.video.volume * 100;
                break;
            case 'KeyM':
                this.toggleMute();
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
        }
    }

    showControls() {
        this.controls.classList.add('show');
        clearTimeout(this.controlsTimeout);
        
        if (this.isPlaying) {
            this.controlsTimeout = setTimeout(() => {
                this.hideControls();
            }, 3000);
        }
    }

    hideControls() {
        if (!this.speedMenu.classList.contains('show') && 
            !this.qualityMenu.classList.contains('show')) {
            this.controls.classList.remove('show');
        }
    }

    showOverlay() {
        this.videoOverlay.classList.add('show');
        this.playOverlay.style.display = 'block';
        this.loadingSpinner.style.display = 'none';
    }

    hideOverlay() {
        this.videoOverlay.classList.remove('show');
    }

    showLoading() {
        this.videoOverlay.classList.add('show');
        this.playOverlay.style.display = 'none';
        this.loadingSpinner.style.display = 'block';
    }

    hideLoading() {
        this.loadingSpinner.style.display = 'none';
        if (!this.video.paused) {
            this.hideOverlay();
        }
    }

    showError(message) {
        this.errorMessage.querySelector('div').textContent = message;
        this.errorMessage.style.display = 'block';
        this.hideLoading();
    }

    closeMenus(e) {
        if (!this.speedBtn.contains(e.target) && !this.speedMenu.contains(e.target)) {
            this.speedMenu.classList.remove('show');
        }
        if (!this.qualityBtn.contains(e.target) && !this.qualityMenu.contains(e.target)) {
            this.qualityMenu.classList.remove('show');
        }
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.video.currentTime);
        const duration = this.formatTime(this.video.duration);
        this.timeDisplay.textContent = `${current} / ${duration}`;
    }

    updateQualityMenu(sources) {
        // Clear existing options except Auto
        const qualityOptions = this.qualityMenu.querySelectorAll('.quality-option:not([data-quality="auto"])');
        qualityOptions.forEach(option => option.remove());

        // Add options for available qualities
        sources.forEach(source => {
            if (source.quality && source.quality !== 'auto') {
                const option = document.createElement('div');
                option.className = 'quality-option';
                option.dataset.quality = source.quality;
                option.textContent = source.quality;
                this.qualityMenu.appendChild(option);
            }
        });
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '-- MB';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    getQualityFromResolution(width, height) {
        if (height >= 1080) return '1080p';
        if (height >= 720) return '720p';
        if (height >= 480) return '480p';
        if (height >= 360) return '360p';
        return '240p';
    }

    getAuthToken() {
        // Get JWT token from localStorage or cookie
        return localStorage.getItem('auth_token') || 'demo_token';
    }
}
