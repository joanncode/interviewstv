/**
 * Real-time Translation Demo
 * Multi-language translation system for interviews and conversations
 */
class TranslationDemo {
    constructor() {
        this.sessionId = null;
        this.isSessionActive = false;
        this.translations = [];
        this.totalTranslations = 0;
        this.confidenceSum = 0;
        this.sessionStartTime = null;
        this.durationInterval = null;
        this.recognition = null;
        this.isListening = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSupportedLanguages();
        this.checkBrowserSupport();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.sourceLanguageSelect = document.getElementById('source-language');
        this.targetLanguagesSelect = document.getElementById('target-languages');
        this.translationEngineSelect = document.getElementById('translation-engine');
        this.startSessionBtn = document.getElementById('start-session-btn');
        this.autoDetectBtn = document.getElementById('auto-detect-btn');
        this.realTimeModeToggle = document.getElementById('real-time-mode');
        
        this.inputText = document.getElementById('input-text');
        this.translateBtn = document.getElementById('translate-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.voiceInputBtn = document.getElementById('voice-input-btn');
        
        this.translationResults = document.getElementById('translation-results');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Stats elements
        this.totalTranslationsCounter = document.getElementById('total-translations');
        this.activeLanguagesCounter = document.getElementById('active-languages');
        this.avgConfidenceCounter = document.getElementById('avg-confidence');
        this.sessionDurationCounter = document.getElementById('session-duration');
        
        this.toastContainer = document.getElementById('toast-container');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.startSessionBtn.addEventListener('click', () => this.toggleSession());
        this.translateBtn.addEventListener('click', () => this.translateText());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.voiceInputBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.autoDetectBtn.addEventListener('click', () => this.detectLanguage());
        
        this.inputText.addEventListener('input', () => {
            if (this.realTimeModeToggle.checked && this.isSessionActive) {
                this.debounceTranslate();
            }
        });
        
        this.inputText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.translateText();
            }
        });
        
        this.sourceLanguageSelect.addEventListener('change', () => {
            this.updateTargetLanguageOptions();
        });
    }

    /**
     * Check browser support for speech recognition
     */
    checkBrowserSupport() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.voiceInputBtn.disabled = true;
            this.voiceInputBtn.title = 'Speech recognition not supported in this browser';
        }
    }

    /**
     * Load supported languages from API
     */
    async loadSupportedLanguages() {
        try {
            const response = await fetch('/interviews-tv/api/translation/languages');
            const data = await response.json();
            
            if (data.success) {
                this.populateLanguageSelectors(data.languages);
            }
        } catch (error) {
            console.error('Failed to load supported languages:', error);
            this.showToast('Failed to load supported languages', 'error');
        }
    }

    /**
     * Populate language selector options
     */
    populateLanguageSelectors(languages) {
        // Clear existing options except the first one
        this.sourceLanguageSelect.innerHTML = '';
        this.targetLanguagesSelect.innerHTML = '';
        
        languages.forEach(lang => {
            const sourceOption = new Option(lang.language_name, lang.language_code);
            const targetOption = new Option(lang.language_name, lang.language_code);
            
            this.sourceLanguageSelect.appendChild(sourceOption);
            this.targetLanguagesSelect.appendChild(targetOption);
        });
        
        // Set default selections
        this.sourceLanguageSelect.value = 'en';
        this.updateTargetLanguageOptions();
    }

    /**
     * Update target language options based on source language
     */
    updateTargetLanguageOptions() {
        const sourceLanguage = this.sourceLanguageSelect.value;
        
        // Disable source language in target languages
        Array.from(this.targetLanguagesSelect.options).forEach(option => {
            option.disabled = option.value === sourceLanguage;
            if (option.value === sourceLanguage && option.selected) {
                option.selected = false;
            }
        });
        
        // Auto-select some target languages if none selected
        if (this.targetLanguagesSelect.selectedOptions.length === 0) {
            const defaultTargets = sourceLanguage === 'en' ? ['es', 'fr'] : ['en'];
            defaultTargets.forEach(lang => {
                const option = this.targetLanguagesSelect.querySelector(`option[value="${lang}"]`);
                if (option && !option.disabled) {
                    option.selected = true;
                }
            });
        }
    }

    /**
     * Toggle translation session
     */
    async toggleSession() {
        if (this.isSessionActive) {
            await this.stopSession();
        } else {
            await this.startSession();
        }
    }

    /**
     * Start translation session
     */
    async startSession() {
        try {
            const targetLanguages = Array.from(this.targetLanguagesSelect.selectedOptions)
                .map(option => option.value);
            
            if (targetLanguages.length === 0) {
                this.showToast('Please select at least one target language', 'warning');
                return;
            }
            
            const sessionData = {
                interview_id: 'demo_' + Date.now(),
                source_language: this.sourceLanguageSelect.value,
                target_languages: targetLanguages,
                translation_engine: this.translationEngineSelect.value,
                auto_translate: this.realTimeModeToggle.checked,
                translate_transcription: true,
                translate_chat: true
            };
            
            const response = await fetch('/interviews-tv/api/translation/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session.session_id;
                this.isSessionActive = true;
                this.sessionStartTime = Date.now();
                this.startDurationCounter();
                this.updateSessionUI();
                this.showToast('Translation session started successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to start session');
            }
            
        } catch (error) {
            console.error('Failed to start translation session:', error);
            this.showToast('Failed to start translation session: ' + error.message, 'error');
        }
    }

    /**
     * Stop translation session
     */
    async stopSession() {
        try {
            if (this.sessionId) {
                await fetch(`/interviews-tv/api/translation/session/${this.sessionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'stopped' })
                });
            }
            
            this.isSessionActive = false;
            this.sessionId = null;
            this.stopDurationCounter();
            this.updateSessionUI();
            this.showToast('Translation session stopped', 'info');
            
        } catch (error) {
            console.error('Failed to stop translation session:', error);
            this.showToast('Failed to stop translation session: ' + error.message, 'error');
        }
    }

    /**
     * Translate text
     */
    async translateText() {
        const text = this.inputText.value.trim();
        
        if (!text) {
            this.showToast('Please enter text to translate', 'warning');
            return;
        }
        
        const targetLanguages = Array.from(this.targetLanguagesSelect.selectedOptions)
            .map(option => option.value);
        
        if (targetLanguages.length === 0) {
            this.showToast('Please select at least one target language', 'warning');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const sourceLanguage = this.sourceLanguageSelect.value;
            const engine = this.translationEngineSelect.value;
            
            // Translate to each target language
            const translationPromises = targetLanguages.map(targetLanguage => 
                this.performTranslation(text, sourceLanguage, targetLanguage, engine)
            );
            
            const translations = await Promise.all(translationPromises);
            
            // Display results
            this.displayTranslations(text, sourceLanguage, translations);
            this.updateStats(translations);
            
        } catch (error) {
            console.error('Translation failed:', error);
            this.showToast('Translation failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Perform single translation
     */
    async performTranslation(text, sourceLanguage, targetLanguage, engine) {
        const response = await fetch('/interviews-tv/api/translation/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                source_language: sourceLanguage,
                target_language: targetLanguage,
                engine: engine,
                source_type: 'demo',
                interview_id: this.sessionId || 'demo_session'
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Translation failed');
        }
        
        return data.translation;
    }

    /**
     * Display translation results
     */
    displayTranslations(originalText, sourceLanguage, translations) {
        // Clear placeholder if this is the first translation
        if (this.translations.length === 0) {
            this.translationResults.innerHTML = '';
        }
        
        const translationGroup = document.createElement('div');
        translationGroup.className = 'translation-item';
        translationGroup.innerHTML = `
            <div class="original-text">
                <span class="language-badge">${this.getLanguageName(sourceLanguage)}</span>
                ${originalText}
                <span class="text-muted small float-end">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="translations">
                ${translations.map(translation => `
                    <div class="translated-text mt-2">
                        <span class="language-badge">${this.getLanguageName(translation.target_language)}</span>
                        ${translation.translated_text}
                        <span class="confidence-indicator ${this.getConfidenceClass(translation.confidence_score)}"
                              title="Confidence: ${Math.round(translation.confidence_score * 100)}%">
                            ${Math.round(translation.confidence_score * 100)}%
                        </span>
                        ${translation.cached ? '<i class="fas fa-bolt text-warning ms-2" title="Cached result"></i>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        this.translationResults.appendChild(translationGroup);
        this.translationResults.scrollTop = this.translationResults.scrollHeight;
        
        // Store translations
        this.translations.push({
            original: originalText,
            source_language: sourceLanguage,
            translations: translations,
            timestamp: Date.now()
        });
    }

    /**
     * Update statistics
     */
    updateStats(translations) {
        this.totalTranslations += translations.length;
        this.confidenceSum += translations.reduce((sum, t) => sum + t.confidence_score, 0);

        const activeLanguages = new Set();
        activeLanguages.add(this.sourceLanguageSelect.value);
        translations.forEach(t => activeLanguages.add(t.target_language));

        this.totalTranslationsCounter.textContent = this.totalTranslations;
        this.activeLanguagesCounter.textContent = activeLanguages.size;
        this.avgConfidenceCounter.textContent = Math.round((this.confidenceSum / this.totalTranslations) * 100) + '%';
    }

    /**
     * Get language name from code
     */
    getLanguageName(code) {
        const option = this.sourceLanguageSelect.querySelector(`option[value="${code}"]`);
        return option ? option.textContent : code.toUpperCase();
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
     * Debounced translate for real-time mode
     */
    debounceTranslate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (this.inputText.value.trim()) {
                this.translateText();
            }
        }, 1000);
    }

    /**
     * Toggle voice input
     */
    toggleVoiceInput() {
        if (this.isListening) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    /**
     * Start voice input
     */
    startVoiceInput() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.sourceLanguageSelect.value;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.voiceInputBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Listening';
                this.voiceInputBtn.classList.add('btn-danger');
                this.voiceInputBtn.classList.remove('btn-outline-light');
                this.showToast('Voice input started', 'info');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.inputText.value = finalTranscript + interimTranscript;

                if (finalTranscript && this.realTimeModeToggle.checked && this.isSessionActive) {
                    this.translateText();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showToast('Voice input error: ' + event.error, 'error');
                this.stopVoiceInput();
            };

            this.recognition.onend = () => {
                this.stopVoiceInput();
            };

            this.recognition.start();

        } catch (error) {
            console.error('Failed to start voice input:', error);
            this.showToast('Failed to start voice input: ' + error.message, 'error');
        }
    }

    /**
     * Stop voice input
     */
    stopVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }

        this.isListening = false;
        this.voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice Input';
        this.voiceInputBtn.classList.remove('btn-danger');
        this.voiceInputBtn.classList.add('btn-outline-light');
    }

    /**
     * Detect language of input text
     */
    async detectLanguage() {
        const text = this.inputText.value.trim();

        if (!text) {
            this.showToast('Please enter text for language detection', 'warning');
            return;
        }

        try {
            const response = await fetch('/interviews-tv/api/translation/detect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (data.success) {
                const detectedLanguage = data.detection.detected_language;
                const confidence = Math.round(data.detection.confidence * 100);

                this.sourceLanguageSelect.value = detectedLanguage;
                this.updateTargetLanguageOptions();

                this.showToast(`Language detected: ${this.getLanguageName(detectedLanguage)} (${confidence}% confidence)`, 'success');
            } else {
                throw new Error(data.error || 'Language detection failed');
            }

        } catch (error) {
            console.error('Language detection failed:', error);
            this.showToast('Language detection failed: ' + error.message, 'error');
        }
    }

    /**
     * Clear translation results
     */
    clearResults() {
        this.translations = [];
        this.totalTranslations = 0;
        this.confidenceSum = 0;

        this.translationResults.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-language fa-3x mb-3"></i>
                <h5>Start translating to see results</h5>
                <p>Enter text above or start a translation session to see real-time translations</p>
            </div>
        `;

        this.totalTranslationsCounter.textContent = '0';
        this.activeLanguagesCounter.textContent = '0';
        this.avgConfidenceCounter.textContent = '0%';

        this.inputText.value = '';
        this.showToast('Results cleared', 'info');
    }

    /**
     * Update session UI
     */
    updateSessionUI() {
        if (this.isSessionActive) {
            this.startSessionBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Session';
            this.startSessionBtn.classList.add('btn-danger');
            this.startSessionBtn.classList.remove('btn-primary');
        } else {
            this.startSessionBtn.innerHTML = '<i class="fas fa-play"></i> Start Translation Session';
            this.startSessionBtn.classList.remove('btn-danger');
            this.startSessionBtn.classList.add('btn-primary');
        }
    }

    /**
     * Start duration counter
     */
    startDurationCounter() {
        this.durationInterval = setInterval(() => {
            if (this.sessionStartTime) {
                const elapsed = Date.now() - this.sessionStartTime;
                this.sessionDurationCounter.textContent = this.formatDuration(elapsed);
            }
        }, 1000);
    }

    /**
     * Stop duration counter
     */
    stopDurationCounter() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    /**
     * Format duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Show/hide loading spinner
     */
    showLoading(show) {
        this.loadingSpinner.style.display = show ? 'block' : 'none';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Initialize translation demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.translationDemo = new TranslationDemo();
});
