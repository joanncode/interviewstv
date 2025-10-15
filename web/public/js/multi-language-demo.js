/**
 * Multi-Language Demo JavaScript
 * Handles internationalization (i18n) operations and language switching
 */

class MultiLanguageDemo {
    constructor() {
        this.apiBase = '/api/languages';
        this.currentLanguage = 'lang_en_us';
        this.languages = [];
        this.translations = {};
        this.translationGroups = [];
        this.selectedLanguage = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.setupEventListeners();
            await this.loadLanguages();
            await this.loadTranslationGroups();
            await this.loadSampleTranslations();
            this.updateInterface();
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError('Failed to load multi-language system');
        }
    }

    async loadInitialData() {
        try {
            // Detect browser language
            const detectResponse = await fetch(`${this.apiBase}/detect`);
            if (detectResponse.ok) {
                const detectData = await detectResponse.json();
                if (detectData.data.matched_language) {
                    this.currentLanguage = detectData.data.matched_language.language_id;
                }
            }

            // Load demo data for statistics
            const demoResponse = await fetch(`${this.apiBase}/demo-data`);
            if (demoResponse.ok) {
                const demoData = await demoResponse.json();
                this.updateStatistics(demoData.data);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    updateStatistics(data) {
        document.getElementById('totalLanguages').textContent = data.total_languages || 0;
        document.getElementById('totalKeys').textContent = data.total_keys || 0;
        document.getElementById('totalTranslations').textContent = data.total_translations || 0;
        
        const avgCompletion = data.analytics_summary?.avg_completion || 0;
        document.getElementById('avgCompletion').textContent = Math.round(avgCompletion) + '%';
    }

    setupEventListeners() {
        // Language selectors
        const desktopSelector = document.getElementById('currentLanguageSelector');
        const mobileSelector = document.getElementById('mobileLanguageSelector');
        
        if (desktopSelector) {
            desktopSelector.addEventListener('change', (e) => this.switchLanguage(e.target.value));
        }
        
        if (mobileSelector) {
            mobileSelector.addEventListener('change', (e) => this.switchLanguage(e.target.value));
        }

        // Translation filters
        const languageFilter = document.getElementById('translationLanguageFilter');
        const groupFilter = document.getElementById('translationGroupFilter');
        
        if (languageFilter) {
            languageFilter.addEventListener('change', () => this.filterTranslations());
        }
        
        if (groupFilter) {
            groupFilter.addEventListener('change', () => this.filterTranslations());
        }
    }

    async loadLanguages() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBase}/`);
            if (!response.ok) throw new Error('Failed to load languages');
            
            const data = await response.json();
            this.languages = data.data || [];
            this.renderLanguages();
            this.populateLanguageSelectors();
        } catch (error) {
            console.error('Failed to load languages:', error);
            this.showError('Failed to load languages');
        } finally {
            this.showLoading(false);
        }
    }

    renderLanguages() {
        const container = document.getElementById('languagesContainer');
        container.innerHTML = '';

        this.languages.forEach(language => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-4';
            col.innerHTML = this.createLanguageCard(language);
            container.appendChild(col);
        });
    }

    createLanguageCard(language) {
        const isRTL = language.direction === 'rtl';
        const completionPercentage = language.completion_percentage || 0;
        
        return `
            <div class="card language-card h-100" onclick="multiLanguageDemo.viewLanguage('${language.language_id}')">
                <div class="card-body text-center">
                    <div class="language-flag">${language.flag_icon || '🌐'}</div>
                    <h5 class="card-title ${isRTL ? 'rtl-text' : ''}">${language.native_name}</h5>
                    <p class="card-text text-muted">${language.language_name}</p>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">Completion</small>
                            <small class="text-muted">${Math.round(completionPercentage)}%</small>
                        </div>
                        <div class="completion-bar">
                            <div class="completion-progress" style="width: ${completionPercentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="row text-center">
                        <div class="col-6">
                            <small class="text-muted d-block">Code</small>
                            <strong>${language.locale_code}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">Direction</small>
                            <strong>${language.direction.toUpperCase()}</strong>
                        </div>
                    </div>
                    
                    ${language.is_default ? '<div class="mt-2"><span class="badge bg-primary">Default</span></div>' : ''}
                </div>
            </div>
        `;
    }

    populateLanguageSelectors() {
        const selectors = [
            document.getElementById('currentLanguageSelector'),
            document.getElementById('mobileLanguageSelector'),
            document.getElementById('translationLanguageFilter')
        ];

        selectors.forEach(selector => {
            if (selector) {
                selector.innerHTML = '';
                
                if (selector.id === 'translationLanguageFilter') {
                    selector.innerHTML = '<option value="">All Languages</option>';
                }
                
                this.languages.forEach(language => {
                    const option = document.createElement('option');
                    option.value = language.language_id;
                    option.textContent = `${language.flag_icon || '🌐'} ${language.native_name}`;
                    
                    if (language.language_id === this.currentLanguage) {
                        option.selected = true;
                    }
                    
                    selector.appendChild(option);
                });
            }
        });
    }

    async loadTranslationGroups() {
        try {
            const response = await fetch(`${this.apiBase}/translation-groups`);
            if (!response.ok) throw new Error('Failed to load translation groups');
            
            const data = await response.json();
            this.translationGroups = data.data || [];
            this.renderTranslationGroups();
            this.populateGroupFilter();
        } catch (error) {
            console.error('Failed to load translation groups:', error);
        }
    }

    renderTranslationGroups() {
        const container = document.getElementById('translationGroupsContainer');
        container.innerHTML = '';

        this.translationGroups.forEach(group => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-lg-3 mb-3';
            col.innerHTML = `
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-layer-group fa-2x text-primary mb-3"></i>
                        <h6 class="card-title">${group.key_group}</h6>
                        <p class="card-text text-muted">${group.key_count} keys</p>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    }

    populateGroupFilter() {
        const groupFilter = document.getElementById('translationGroupFilter');
        if (groupFilter) {
            groupFilter.innerHTML = '<option value="">All Groups</option>';
            
            this.translationGroups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.key_group;
                option.textContent = group.key_group;
                groupFilter.appendChild(option);
            });
        }
    }

    async loadSampleTranslations() {
        try {
            const params = new URLSearchParams({
                language_id: this.currentLanguage,
                approved_only: 'true'
            });
            
            const response = await fetch(`${this.apiBase}/translations?${params}`);
            if (!response.ok) throw new Error('Failed to load translations');
            
            const data = await response.json();
            this.translations = data.data || {};
            this.renderTranslations();
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    renderTranslations() {
        const container = document.getElementById('translationsContainer');
        container.innerHTML = '';

        const translationEntries = Object.entries(this.translations);
        
        if (translationEntries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No translations found</h4>
                    <p class="text-muted">Try selecting a different language or group</p>
                </div>
            `;
            return;
        }

        translationEntries.forEach(([key, text]) => {
            const translationItem = document.createElement('div');
            translationItem.className = 'translation-item';
            translationItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="translation-key">${key}</div>
                        <div class="translation-text">${text}</div>
                    </div>
                    <div class="ms-3">
                        <span class="badge bg-success">Approved</span>
                    </div>
                </div>
            `;
            container.appendChild(translationItem);
        });
    }

    async switchLanguage(languageId) {
        if (!languageId || languageId === this.currentLanguage) return;
        
        this.currentLanguage = languageId;
        
        // Update all selectors
        const selectors = [
            document.getElementById('currentLanguageSelector'),
            document.getElementById('mobileLanguageSelector')
        ];
        
        selectors.forEach(selector => {
            if (selector && selector.value !== languageId) {
                selector.value = languageId;
            }
        });
        
        // Reload translations for new language
        await this.loadSampleTranslations();
        this.updateInterface();
        
        this.showSuccess(`Language switched to ${this.getLanguageName(languageId)}`);
    }

    getLanguageName(languageId) {
        const language = this.languages.find(lang => lang.language_id === languageId);
        return language ? language.native_name : languageId;
    }

    async viewLanguage(languageId) {
        const language = this.languages.find(lang => lang.language_id === languageId);
        if (!language) return;

        this.selectedLanguage = language;
        
        document.getElementById('languageModalTitle').textContent = language.native_name;
        
        const modalBody = document.getElementById('languageModalBody');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Language Information</h6>
                    <table class="table table-dark table-sm">
                        <tr><td>Native Name:</td><td>${language.native_name}</td></tr>
                        <tr><td>English Name:</td><td>${language.language_name}</td></tr>
                        <tr><td>Language Code:</td><td>${language.language_code}</td></tr>
                        <tr><td>Country Code:</td><td>${language.country_code || 'N/A'}</td></tr>
                        <tr><td>Locale:</td><td>${language.locale_code}</td></tr>
                        <tr><td>Direction:</td><td>${language.direction.toUpperCase()}</td></tr>
                        <tr><td>Completion:</td><td>${Math.round(language.completion_percentage || 0)}%</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Sample Text</h6>
                    <div class="card bg-secondary">
                        <div class="card-body ${language.direction === 'rtl' ? 'rtl-text' : ''}">
                            <p class="mb-2"><strong>Welcome Message:</strong></p>
                            <p class="mb-0">${this.getSampleText(language.language_id)}</p>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <h6>Flag</h6>
                        <div class="text-center">
                            <span style="font-size: 4rem;">${language.flag_icon || '🌐'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('languageModal'));
        modal.show();
    }

    getSampleText(languageId) {
        const sampleTexts = {
            'lang_en_us': 'Welcome to Interviews.tv',
            'lang_es_es': 'Bienvenido a Interviews.tv',
            'lang_fr_fr': 'Bienvenue sur Interviews.tv',
            'lang_de_de': 'Willkommen bei Interviews.tv',
            'lang_it_it': 'Benvenuto su Interviews.tv',
            'lang_pt_br': 'Bem-vindo ao Interviews.tv',
            'lang_ja_jp': 'Interviews.tvへようこそ',
            'lang_ko_kr': 'Interviews.tv에 오신 것을 환영합니다',
            'lang_zh_cn': '欢迎来到Interviews.tv',
            'lang_ar_sa': 'مرحباً بك في Interviews.tv'
        };
        
        return sampleTexts[languageId] || 'Welcome to Interviews.tv';
    }

    async setUserLanguage() {
        if (!this.selectedLanguage) return;
        
        try {
            const response = await fetch(`${this.apiBase}/user-preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: 'demo_user',
                    language_id: this.selectedLanguage.language_id,
                    auto_detect: false
                })
            });
            
            if (response.ok) {
                await this.switchLanguage(this.selectedLanguage.language_id);
                this.showSuccess(`Language preference saved: ${this.selectedLanguage.native_name}`);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('languageModal'));
                modal.hide();
            } else {
                throw new Error('Failed to save language preference');
            }
        } catch (error) {
            console.error('Failed to set user language:', error);
            this.showError('Failed to save language preference');
        }
    }

    async filterTranslations() {
        const languageFilter = document.getElementById('translationLanguageFilter').value;
        const groupFilter = document.getElementById('translationGroupFilter').value;
        
        const targetLanguage = languageFilter || this.currentLanguage;
        
        try {
            const params = new URLSearchParams({
                language_id: targetLanguage,
                approved_only: 'true'
            });
            
            if (groupFilter) {
                params.append('key_group', groupFilter);
            }
            
            const response = await fetch(`${this.apiBase}/translations?${params}`);
            if (!response.ok) throw new Error('Failed to load filtered translations');
            
            const data = await response.json();
            this.translations = data.data || {};
            this.renderTranslations();
        } catch (error) {
            console.error('Failed to filter translations:', error);
            this.showError('Failed to filter translations');
        }
    }

    updateInterface() {
        // Update any interface elements that need language-specific formatting
        const currentLang = this.languages.find(lang => lang.language_id === this.currentLanguage);
        if (currentLang && currentLang.direction === 'rtl') {
            document.body.classList.add('rtl-layout');
        } else {
            document.body.classList.remove('rtl-layout');
        }
    }

    showLoading(show) {
        document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // Simple error display - in production, use a proper notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success display - in production, use a proper notification system
        console.log('Success: ' + message);
        // You could implement a toast notification here
    }
}

// Global functions for onclick handlers
window.loadDemoData = async function() {
    if (window.multiLanguageDemo) {
        await window.multiLanguageDemo.loadInitialData();
        window.multiLanguageDemo.showSuccess('Demo data reloaded successfully');
    }
};

window.detectLanguage = async function() {
    try {
        const response = await fetch('/api/languages/detect');
        if (response.ok) {
            const data = await response.json();
            const detected = data.data.detected_languages;
            const matched = data.data.matched_language;
            
            let message = 'Browser Language Detection:\n\n';
            message += `Detected: ${detected.map(d => d.language_code).join(', ')}\n`;
            message += `Matched: ${matched ? matched.native_name : 'None'}\n`;
            message += `Accept-Language: ${data.data.accept_language_header}`;
            
            alert(message);
            
            if (matched && window.multiLanguageDemo) {
                await window.multiLanguageDemo.switchLanguage(matched.language_id);
            }
        }
    } catch (error) {
        console.error('Failed to detect language:', error);
        alert('Failed to detect browser language');
    }
};

window.setUserLanguage = function() {
    if (window.multiLanguageDemo) {
        window.multiLanguageDemo.setUserLanguage();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.multiLanguageDemo = new MultiLanguageDemo();
});
