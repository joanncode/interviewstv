class PlaybackControls {
    constructor(videoPlayer) {
        this.player = videoPlayer;
        this.video = videoPlayer.video;
        this.container = videoPlayer.container;
        
        // Control state
        this.isControlsVisible = false;
        this.controlsTimeout = null;
        this.isDragging = false;
        this.wasPlayingBeforeDrag = false;
        
        // Keyboard shortcuts
        this.shortcuts = {
            'Space': () => this.player.togglePlayPause(),
            'KeyK': () => this.player.togglePlayPause(),
            'ArrowLeft': () => this.seekRelative(-10),
            'ArrowRight': () => this.seekRelative(10),
            'ArrowUp': () => this.adjustVolume(0.1),
            'ArrowDown': () => this.adjustVolume(-0.1),
            'KeyM': () => this.player.toggleMute(),
            'KeyF': () => this.player.toggleFullscreen(),
            'Digit0': () => this.seekToPercent(0),
            'Digit1': () => this.seekToPercent(10),
            'Digit2': () => this.seekToPercent(20),
            'Digit3': () => this.seekToPercent(30),
            'Digit4': () => this.seekToPercent(40),
            'Digit5': () => this.seekToPercent(50),
            'Digit6': () => this.seekToPercent(60),
            'Digit7': () => this.seekToPercent(70),
            'Digit8': () => this.seekToPercent(80),
            'Digit9': () => this.seekToPercent(90),
            'Home': () => this.seekToPercent(0),
            'End': () => this.seekToPercent(100),
            'Comma': () => this.frameStep(-1),
            'Period': () => this.frameStep(1),
            'KeyJ': () => this.seekRelative(-10),
            'KeyL': () => this.seekRelative(10),
            'Minus': () => this.adjustSpeed(-0.25),
            'Equal': () => this.adjustSpeed(0.25),
            'Backspace': () => this.resetSpeed()
        };

        this.initializeAdvancedControls();
    }

    initializeAdvancedControls() {
        // Enhanced progress bar with preview thumbnails
        this.createProgressPreview();
        
        // Picture-in-picture support
        this.addPictureInPictureSupport();
        
        // Enhanced keyboard shortcuts
        this.enhanceKeyboardControls();
        
        // Touch controls for mobile
        this.addTouchControls();
        
        // Auto-hide controls
        this.setupAutoHideControls();
        
        // Volume wheel control
        this.addVolumeWheelControl();
        
        // Double-click fullscreen
        this.addDoubleClickFullscreen();
    }

    createProgressPreview() {
        // Create preview thumbnail container
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'progress-preview';
        this.previewContainer.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border-radius: 4px;
            padding: 8px;
            display: none;
            z-index: 1000;
            pointer-events: none;
        `;

        this.previewThumbnail = document.createElement('img');
        this.previewThumbnail.style.cssText = `
            width: 160px;
            height: 90px;
            object-fit: cover;
            border-radius: 2px;
            display: block;
        `;

        this.previewTime = document.createElement('div');
        this.previewTime.style.cssText = `
            color: white;
            font-size: 12px;
            text-align: center;
            margin-top: 4px;
        `;

        this.previewContainer.appendChild(this.previewThumbnail);
        this.previewContainer.appendChild(this.previewTime);
        this.player.progressContainer.appendChild(this.previewContainer);

        // Add hover events for preview
        this.player.progressContainer.addEventListener('mousemove', (e) => {
            this.showProgressPreview(e);
        });

        this.player.progressContainer.addEventListener('mouseleave', () => {
            this.hideProgressPreview();
        });
    }

    showProgressPreview(e) {
        if (!this.video.duration) return;

        const rect = this.player.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.video.duration;

        // Update preview position
        this.previewContainer.style.left = `${percent * 100}%`;
        this.previewContainer.style.display = 'block';

        // Update preview time
        this.previewTime.textContent = this.player.formatTime(time);

        // Generate thumbnail for this time (simplified - in real implementation, 
        // you'd use pre-generated timeline thumbnails)
        this.updatePreviewThumbnail(time);
    }

    hideProgressPreview() {
        this.previewContainer.style.display = 'none';
    }

    updatePreviewThumbnail(time) {
        // In a real implementation, you would:
        // 1. Use pre-generated timeline thumbnails
        // 2. Calculate which thumbnail sprite to use
        // 3. Set the background position accordingly
        
        // For now, just use a placeholder
        if (this.player.videoData && this.player.videoData.thumbnail) {
            this.previewThumbnail.src = this.player.videoData.thumbnail;
        }
    }

    addPictureInPictureSupport() {
        if ('pictureInPictureEnabled' in document) {
            const pipBtn = document.createElement('button');
            pipBtn.className = 'control-btn';
            pipBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
            pipBtn.title = 'Picture in Picture';
            
            pipBtn.addEventListener('click', () => {
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                } else {
                    this.video.requestPictureInPicture();
                }
            });

            // Add to controls
            const controlsRight = this.container.querySelector('.controls-right');
            controlsRight.insertBefore(pipBtn, this.player.fullscreenBtn);
        }
    }

    enhanceKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when video player is focused or no input is focused
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Prevent default for handled shortcuts
            if (this.shortcuts[e.code]) {
                e.preventDefault();
                this.shortcuts[e.code]();
                this.showControlsFeedback(e.code);
            }
        });
    }

    addTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSeeking = false;
        let isVolumeAdjusting = false;

        this.video.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = this.video.currentTime;
            isSeeking = false;
            isVolumeAdjusting = false;
        });

        this.video.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;

            // Horizontal swipe for seeking
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
                if (!isSeeking) {
                    isSeeking = true;
                    this.showSeekFeedback();
                }
                
                const seekDelta = (deltaX / this.video.offsetWidth) * this.video.duration;
                const newTime = Math.max(0, Math.min(this.video.duration, touchStartTime + seekDelta));
                this.video.currentTime = newTime;
                this.updateSeekFeedback(newTime);
            }
            
            // Vertical swipe for volume (right side) or brightness (left side)
            else if (Math.abs(deltaY) > 20) {
                const isRightSide = touchStartX > this.video.offsetWidth / 2;
                
                if (isRightSide && !isVolumeAdjusting) {
                    isVolumeAdjusting = true;
                    this.showVolumeFeedback();
                }
                
                if (isRightSide) {
                    const volumeDelta = -(deltaY / this.video.offsetHeight);
                    const newVolume = Math.max(0, Math.min(1, this.video.volume + volumeDelta));
                    this.video.volume = newVolume;
                    this.player.volumeSlider.value = newVolume * 100;
                    this.updateVolumeFeedback(newVolume);
                }
            }
        });

        this.video.addEventListener('touchend', () => {
            if (isSeeking) {
                this.hideSeekFeedback();
            }
            if (isVolumeAdjusting) {
                this.hideVolumeFeedback();
            }
        });

        // Double tap to seek
        let lastTap = 0;
        this.video.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                const rect = this.video.getBoundingClientRect();
                const tapX = e.changedTouches[0].clientX - rect.left;
                const isLeftSide = tapX < rect.width / 2;
                
                if (isLeftSide) {
                    this.seekRelative(-10);
                } else {
                    this.seekRelative(10);
                }
                
                this.showSeekAnimation(isLeftSide ? 'backward' : 'forward');
            }
            
            lastTap = currentTime;
        });
    }

    setupAutoHideControls() {
        let mouseIdleTimer = null;
        
        const resetMouseIdleTimer = () => {
            clearTimeout(mouseIdleTimer);
            this.container.style.cursor = 'default';
            this.player.showControls();
            
            if (this.player.isPlaying) {
                mouseIdleTimer = setTimeout(() => {
                    this.container.style.cursor = 'none';
                    this.player.hideControls();
                }, 3000);
            }
        };

        this.container.addEventListener('mousemove', resetMouseIdleTimer);
        this.container.addEventListener('mouseenter', resetMouseIdleTimer);
        this.container.addEventListener('mouseleave', () => {
            clearTimeout(mouseIdleTimer);
            this.container.style.cursor = 'default';
        });
    }

    addVolumeWheelControl() {
        this.video.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            this.adjustVolume(delta);
            this.showVolumeFeedback();
            
            clearTimeout(this.volumeFeedbackTimeout);
            this.volumeFeedbackTimeout = setTimeout(() => {
                this.hideVolumeFeedback();
            }, 1000);
        });
    }

    addDoubleClickFullscreen() {
        let clickCount = 0;
        
        this.video.addEventListener('click', (e) => {
            clickCount++;
            
            if (clickCount === 1) {
                setTimeout(() => {
                    if (clickCount === 1) {
                        this.player.togglePlayPause();
                    } else if (clickCount === 2) {
                        this.player.toggleFullscreen();
                    }
                    clickCount = 0;
                }, 300);
            }
        });
    }

    // Utility methods
    seekRelative(seconds) {
        this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
        this.showSeekAnimation(seconds > 0 ? 'forward' : 'backward');
    }

    seekToPercent(percent) {
        this.video.currentTime = (percent / 100) * this.video.duration;
    }

    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, this.video.volume + delta));
        this.video.volume = newVolume;
        this.player.volumeSlider.value = newVolume * 100;
        this.player.setVolume(newVolume * 100);
    }

    adjustSpeed(delta) {
        const newSpeed = Math.max(0.25, Math.min(4, this.video.playbackRate + delta));
        this.video.playbackRate = newSpeed;
        this.player.currentSpeed = newSpeed;
        this.player.speedText.textContent = `${newSpeed}x`;
        this.showSpeedFeedback(newSpeed);
    }

    resetSpeed() {
        this.video.playbackRate = 1;
        this.player.currentSpeed = 1;
        this.player.speedText.textContent = '1x';
        this.showSpeedFeedback(1);
    }

    frameStep(direction) {
        if (this.video.paused) {
            // Approximate frame step (assuming 30fps)
            const frameTime = 1 / 30;
            this.video.currentTime += direction * frameTime;
        }
    }

    // Feedback methods
    showControlsFeedback(keyCode) {
        // Show visual feedback for keyboard shortcuts
        const feedback = this.getKeyboardFeedback(keyCode);
        if (feedback) {
            this.showTemporaryFeedback(feedback);
        }
    }

    getKeyboardFeedback(keyCode) {
        const feedbackMap = {
            'Space': 'Play/Pause',
            'KeyK': 'Play/Pause',
            'ArrowLeft': 'Seek -10s',
            'ArrowRight': 'Seek +10s',
            'ArrowUp': 'Volume Up',
            'ArrowDown': 'Volume Down',
            'KeyM': 'Mute/Unmute',
            'KeyF': 'Fullscreen',
            'KeyJ': 'Seek -10s',
            'KeyL': 'Seek +10s',
            'Comma': 'Previous Frame',
            'Period': 'Next Frame'
        };
        
        return feedbackMap[keyCode];
    }

    showTemporaryFeedback(text) {
        // Create or update feedback element
        let feedback = this.container.querySelector('.keyboard-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'keyboard-feedback';
            feedback.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            this.container.appendChild(feedback);
        }

        feedback.textContent = text;
        feedback.style.opacity = '1';

        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => {
            feedback.style.opacity = '0';
        }, 1000);
    }

    showSeekAnimation(direction) {
        const animation = document.createElement('div');
        animation.className = 'seek-animation';
        animation.innerHTML = direction === 'forward' ? 
            '<i class="fas fa-forward"></i> +10s' : 
            '<i class="fas fa-backward"></i> -10s';
        
        animation.style.cssText = `
            position: absolute;
            top: 50%;
            ${direction === 'forward' ? 'right: 20px' : 'left: 20px'};
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 16px;
            z-index: 1000;
            pointer-events: none;
            animation: seekFade 1s ease forwards;
        `;

        // Add CSS animation
        if (!document.querySelector('#seek-animation-style')) {
            const style = document.createElement('style');
            style.id = 'seek-animation-style';
            style.textContent = `
                @keyframes seekFade {
                    0% { opacity: 0; transform: translateY(-50%) scale(0.8); }
                    20% { opacity: 1; transform: translateY(-50%) scale(1); }
                    80% { opacity: 1; transform: translateY(-50%) scale(1); }
                    100% { opacity: 0; transform: translateY(-50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }

        this.container.appendChild(animation);
        
        setTimeout(() => {
            animation.remove();
        }, 1000);
    }

    showSeekFeedback() {
        // Implementation for touch seek feedback
    }

    updateSeekFeedback(time) {
        // Implementation for updating seek feedback
    }

    hideSeekFeedback() {
        // Implementation for hiding seek feedback
    }

    showVolumeFeedback() {
        // Implementation for volume feedback
    }

    updateVolumeFeedback(volume) {
        // Implementation for updating volume feedback
    }

    hideVolumeFeedback() {
        // Implementation for hiding volume feedback
    }

    showSpeedFeedback(speed) {
        this.showTemporaryFeedback(`Speed: ${speed}x`);
    }
}
