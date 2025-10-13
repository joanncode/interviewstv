/**
 * Profanity Filter Management Panel
 * Advanced content filtering interface with configuration, testing, and analytics
 */
class ProfanityFilterPanel {
    constructor(options = {}) {
        this.container = options.container;
        this.websocket = options.websocket || null;
        this.userRole = options.userRole || 'guest';
        this.onUpdate = options.onUpdate || (() => {});
        
        this.filterConfig = {};
        this.profanityLists = {};
        this.whitelist = [];
        this.statistics = {};
        this.falsePositiveReports = [];
        this.isVisible = false;
        
        this.init();
    }
    
    init() {
        if (!this.hasAdminPermissions()) {
            console.warn('User does not have profanity filter management permissions');
            return;
        }
        
        this.createProfanityFilterPanel();
        this.attachEventListeners();
        this.loadFilterConfiguration();
        this.loadStatistics();
    }
    
    hasAdminPermissions() {
        return ['admin', 'moderator'].includes(this.userRole);
    }
    
    createProfanityFilterPanel() {
        if (!this.container) return;
        
        const panelHTML = `
            <div class="profanity-filter-panel" id="profanity-filter-panel" style="display: none;">
                <div class="panel-header">
                    <h4><i class="fas fa-filter me-2"></i>Profanity Filter Management</h4>
                    <button class="close-panel" id="close-profanity-filter">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="panel-content">
                    <!-- Filter Configuration -->
                    <div class="config-section">
                        <h5><i class="fas fa-cogs me-2"></i>Filter Configuration</h5>
                        <div class="config-grid">
                            <div class="config-group">
                                <label class="config-label">
                                    <input type="checkbox" id="filter-enabled" checked>
                                    Enable Profanity Filter
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="strict-mode">
                                    Strict Mode (Block All Violations)
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="preserve-length" checked>
                                    Preserve Word Length in Replacements
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="learning-enabled" checked>
                                    Enable Learning from Reports
                                </label>
                            </div>
                            
                            <div class="config-group">
                                <h6>Filter Methods</h6>
                                <label class="config-label">
                                    <input type="checkbox" id="exact-match" checked>
                                    Exact Word Matching
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="partial-match">
                                    Partial Word Matching
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="leetspeak" checked>
                                    Leetspeak Detection (f4ck, sh1t)
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="phonetic" checked>
                                    Phonetic Detection (fuk, sht)
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="context-analysis" checked>
                                    Context Analysis (threats, harassment)
                                </label>
                                <label class="config-label">
                                    <input type="checkbox" id="pattern-detection" checked>
                                    Pattern Detection (caps, repeated chars)
                                </label>
                            </div>
                            
                            <div class="config-group">
                                <h6>Replacement Method</h6>
                                <label class="config-label">
                                    <input type="radio" name="replacement" value="asterisk" checked>
                                    Replace with Asterisks (***)
                                </label>
                                <label class="config-label">
                                    <input type="radio" name="replacement" value="emoji">
                                    Replace with Emoji (🤬)
                                </label>
                                <label class="config-label">
                                    <input type="radio" name="replacement" value="custom">
                                    Custom Replacement Text
                                </label>
                                <label class="config-label">
                                    <input type="radio" name="replacement" value="remove">
                                    Remove Entirely
                                </label>
                                <div class="custom-replacement-group" style="display: none;">
                                    <input type="text" id="custom-replacement-text" class="form-control" placeholder="[FILTERED]">
                                </div>
                            </div>
                        </div>
                        
                        <div class="config-actions">
                            <button class="btn btn-primary" id="save-config">
                                <i class="fas fa-save me-2"></i>Save Configuration
                            </button>
                            <button class="btn btn-secondary" id="reset-config">
                                <i class="fas fa-undo me-2"></i>Reset to Defaults
                            </button>
                        </div>
                    </div>
                    
                    <!-- Word List Management -->
                    <div class="wordlist-section">
                        <h5><i class="fas fa-list me-2"></i>Word List Management</h5>
                        <div class="wordlist-tabs">
                            <button class="tab-btn active" data-tab="profanity">Profanity Words</button>
                            <button class="tab-btn" data-tab="whitelist">Whitelist</button>
                        </div>
                        
                        <div class="tab-content" id="profanity-tab">
                            <div class="severity-tabs">
                                <button class="severity-btn active" data-severity="mild">Mild</button>
                                <button class="severity-btn" data-severity="moderate">Moderate</button>
                                <button class="severity-btn" data-severity="severe">Severe</button>
                                <button class="severity-btn" data-severity="extreme">Extreme</button>
                            </div>
                            
                            <div class="word-management">
                                <div class="add-word-form">
                                    <input type="text" id="new-profanity-word" class="form-control" placeholder="Add new word...">
                                    <button class="btn btn-primary" id="add-profanity-word">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                </div>
                                
                                <div class="word-list" id="profanity-word-list">
                                    <!-- Words will be populated here -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="tab-content" id="whitelist-tab" style="display: none;">
                            <div class="word-management">
                                <div class="add-word-form">
                                    <input type="text" id="new-whitelist-word" class="form-control" placeholder="Add word to whitelist...">
                                    <button class="btn btn-success" id="add-whitelist-word">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                </div>
                                
                                <div class="word-list" id="whitelist-word-list">
                                    <!-- Whitelist words will be populated here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filter Testing -->
                    <div class="testing-section">
                        <h5><i class="fas fa-vial me-2"></i>Filter Testing</h5>
                        <div class="test-form">
                            <textarea id="test-content" class="form-control" rows="3" placeholder="Enter text to test the filter..."></textarea>
                            <button class="btn btn-info" id="test-filter">
                                <i class="fas fa-play me-2"></i>Test Filter
                            </button>
                        </div>
                        
                        <div class="test-results" id="test-results" style="display: none;">
                            <h6>Test Results</h6>
                            <div class="result-content">
                                <!-- Test results will be displayed here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Statistics -->
                    <div class="statistics-section">
                        <h5><i class="fas fa-chart-bar me-2"></i>Filter Statistics</h5>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value" id="total-filtered">0</div>
                                <div class="stat-label">Total Filtered</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="total-blocked">0</div>
                                <div class="stat-label">Blocked Messages</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="total-replaced">0</div>
                                <div class="stat-label">Replaced Content</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="false-positives">0</div>
                                <div class="stat-label">False Positive Reports</div>
                            </div>
                        </div>
                        
                        <div class="method-breakdown">
                            <h6>Detection Method Breakdown</h6>
                            <div class="method-chart" id="method-chart">
                                <!-- Method breakdown chart will be here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- False Positive Reports -->
                    <div class="reports-section">
                        <h5><i class="fas fa-exclamation-triangle me-2"></i>False Positive Reports</h5>
                        <div class="reports-list" id="reports-list">
                            <!-- Reports will be populated here -->
                        </div>
                    </div>
                    
                    <!-- Import/Export -->
                    <div class="import-export-section">
                        <h5><i class="fas fa-exchange-alt me-2"></i>Import/Export</h5>
                        <div class="import-export-controls">
                            <button class="btn btn-outline-primary" id="export-config">
                                <i class="fas fa-download me-2"></i>Export Configuration
                            </button>
                            <input type="file" id="import-file" accept=".json" style="display: none;">
                            <button class="btn btn-outline-secondary" id="import-config">
                                <i class="fas fa-upload me-2"></i>Import Configuration
                            </button>
                            <button class="btn btn-outline-warning" id="cleanup-logs">
                                <i class="fas fa-broom me-2"></i>Cleanup Old Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = panelHTML;
    }
    
    attachEventListeners() {
        // Close panel
        const closeBtn = this.container.querySelector('#close-profanity-filter');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
        
        // Configuration controls
        const saveConfigBtn = this.container.querySelector('#save-config');
        const resetConfigBtn = this.container.querySelector('#reset-config');
        
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }
        
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => {
                this.resetConfiguration();
            });
        }
        
        // Replacement method radio buttons
        this.container.querySelectorAll('input[name="replacement"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const customGroup = this.container.querySelector('.custom-replacement-group');
                if (e.target.value === 'custom') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        });
        
        // Tab switching
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Severity switching
        this.container.querySelectorAll('.severity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSeverity(e.target.dataset.severity);
            });
        });
        
        // Word management
        const addProfanityBtn = this.container.querySelector('#add-profanity-word');
        const addWhitelistBtn = this.container.querySelector('#add-whitelist-word');
        
        if (addProfanityBtn) {
            addProfanityBtn.addEventListener('click', () => {
                this.addProfanityWord();
            });
        }
        
        if (addWhitelistBtn) {
            addWhitelistBtn.addEventListener('click', () => {
                this.addWhitelistWord();
            });
        }
        
        // Enter key support for word inputs
        const profanityInput = this.container.querySelector('#new-profanity-word');
        const whitelistInput = this.container.querySelector('#new-whitelist-word');
        
        if (profanityInput) {
            profanityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addProfanityWord();
                }
            });
        }
        
        if (whitelistInput) {
            whitelistInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addWhitelistWord();
                }
            });
        }
        
        // Filter testing
        const testBtn = this.container.querySelector('#test-filter');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testFilter();
            });
        }
        
        // Import/Export
        const exportBtn = this.container.querySelector('#export-config');
        const importBtn = this.container.querySelector('#import-config');
        const importFile = this.container.querySelector('#import-file');
        const cleanupBtn = this.container.querySelector('#cleanup-logs');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportConfiguration();
            });
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                importFile.click();
            });
        }
        
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importConfiguration(e.target.files[0]);
            });
        }
        
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => {
                this.cleanupLogs();
            });
        }
        
        // WebSocket message handlers
        if (this.websocket) {
            this.websocket.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            });
        }
    }
    
    loadFilterConfiguration() {
        // Mock configuration for demo
        this.filterConfig = {
            enabled: true,
            strict_mode: false,
            preserve_length: true,
            learning_enabled: true,
            filter_methods: {
                exact_match: true,
                partial_match: false,
                leetspeak: true,
                phonetic: true,
                context_analysis: true,
                pattern_detection: true
            },
            replacement_methods: {
                asterisk: true,
                emoji: false,
                custom: false,
                remove: false
            },
            custom_replacement: '[FILTERED]'
        };
        
        this.profanityLists = {
            mild: ['damn', 'hell', 'crap', 'stupid'],
            moderate: ['ass', 'bitch', 'shit', 'fuck'],
            severe: ['racial slurs', 'hate speech'],
            extreme: ['threats', 'violence']
        };
        
        this.whitelist = ['class', 'classic', 'glass', 'assessment'];
        
        this.updateConfigurationUI();
        this.updateWordLists();
    }
    
    updateConfigurationUI() {
        // Update checkboxes and radio buttons based on current config
        this.container.querySelector('#filter-enabled').checked = this.filterConfig.enabled;
        this.container.querySelector('#strict-mode').checked = this.filterConfig.strict_mode;
        this.container.querySelector('#preserve-length').checked = this.filterConfig.preserve_length;
        this.container.querySelector('#learning-enabled').checked = this.filterConfig.learning_enabled;
        
        // Update filter method checkboxes
        Object.keys(this.filterConfig.filter_methods).forEach(method => {
            const checkbox = this.container.querySelector(`#${method.replace('_', '-')}`);
            if (checkbox) {
                checkbox.checked = this.filterConfig.filter_methods[method];
            }
        });
        
        // Update replacement method radio buttons
        const activeReplacement = Object.keys(this.filterConfig.replacement_methods)
            .find(method => this.filterConfig.replacement_methods[method]);
        
        if (activeReplacement) {
            const radio = this.container.querySelector(`input[name="replacement"][value="${activeReplacement}"]`);
            if (radio) {
                radio.checked = true;
                
                if (activeReplacement === 'custom') {
                    this.container.querySelector('.custom-replacement-group').style.display = 'block';
                    this.container.querySelector('#custom-replacement-text').value = this.filterConfig.custom_replacement;
                }
            }
        }
    }
    
    updateWordLists() {
        this.updateProfanityWordList('mild');
        this.updateWhitelistWordList();
    }
    
    updateProfanityWordList(severity) {
        const wordListContainer = this.container.querySelector('#profanity-word-list');
        if (!wordListContainer) return;
        
        const words = this.profanityLists[severity] || [];
        
        let wordListHTML = '';
        words.forEach(word => {
            wordListHTML += `
                <div class="word-item">
                    <span class="word-text">${word}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="profanityFilterPanel.removeProfanityWord('${word}', '${severity}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        if (words.length === 0) {
            wordListHTML = '<div class="no-words-message">No words in this category</div>';
        }
        
        wordListContainer.innerHTML = wordListHTML;
    }
    
    updateWhitelistWordList() {
        const wordListContainer = this.container.querySelector('#whitelist-word-list');
        if (!wordListContainer) return;
        
        let wordListHTML = '';
        this.whitelist.forEach(word => {
            wordListHTML += `
                <div class="word-item">
                    <span class="word-text">${word}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="profanityFilterPanel.removeWhitelistWord('${word}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        if (this.whitelist.length === 0) {
            wordListHTML = '<div class="no-words-message">No words in whitelist</div>';
        }
        
        wordListContainer.innerHTML = wordListHTML;
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        this.container.querySelector(`#${tabName}-tab`).style.display = 'block';
    }
    
    switchSeverity(severity) {
        // Update severity buttons
        this.container.querySelectorAll('.severity-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.container.querySelector(`[data-severity="${severity}"]`).classList.add('active');
        
        // Update word list
        this.updateProfanityWordList(severity);
    }
    
    getCurrentSeverity() {
        const activeBtn = this.container.querySelector('.severity-btn.active');
        return activeBtn ? activeBtn.dataset.severity : 'mild';
    }
    
    addProfanityWord() {
        const input = this.container.querySelector('#new-profanity-word');
        const word = input.value.trim().toLowerCase();
        
        if (!word) {
            this.showError('Please enter a word');
            return;
        }
        
        const severity = this.getCurrentSeverity();
        
        if (!this.profanityLists[severity]) {
            this.profanityLists[severity] = [];
        }
        
        if (this.profanityLists[severity].includes(word)) {
            this.showError('Word already exists in this category');
            return;
        }
        
        this.profanityLists[severity].push(word);
        input.value = '';
        
        this.updateProfanityWordList(severity);
        this.showSuccess(`Added "${word}" to ${severity} category`);
        
        // Send to server
        this.sendWordListUpdate('add_profanity', { word, severity });
    }
    
    removeProfanityWord(word, severity) {
        if (!this.profanityLists[severity]) return;
        
        const index = this.profanityLists[severity].indexOf(word);
        if (index > -1) {
            this.profanityLists[severity].splice(index, 1);
            this.updateProfanityWordList(severity);
            this.showSuccess(`Removed "${word}" from ${severity} category`);
            
            // Send to server
            this.sendWordListUpdate('remove_profanity', { word, severity });
        }
    }
    
    addWhitelistWord() {
        const input = this.container.querySelector('#new-whitelist-word');
        const word = input.value.trim().toLowerCase();
        
        if (!word) {
            this.showError('Please enter a word');
            return;
        }
        
        if (this.whitelist.includes(word)) {
            this.showError('Word already exists in whitelist');
            return;
        }
        
        this.whitelist.push(word);
        input.value = '';
        
        this.updateWhitelistWordList();
        this.showSuccess(`Added "${word}" to whitelist`);
        
        // Send to server
        this.sendWordListUpdate('add_whitelist', { word });
    }
    
    removeWhitelistWord(word) {
        const index = this.whitelist.indexOf(word);
        if (index > -1) {
            this.whitelist.splice(index, 1);
            this.updateWhitelistWordList();
            this.showSuccess(`Removed "${word}" from whitelist`);
            
            // Send to server
            this.sendWordListUpdate('remove_whitelist', { word });
        }
    }
    
    saveConfiguration() {
        // Collect configuration from UI
        const newConfig = {
            enabled: this.container.querySelector('#filter-enabled').checked,
            strict_mode: this.container.querySelector('#strict-mode').checked,
            preserve_length: this.container.querySelector('#preserve-length').checked,
            learning_enabled: this.container.querySelector('#learning-enabled').checked,
            filter_methods: {},
            replacement_methods: {},
            custom_replacement: this.container.querySelector('#custom-replacement-text').value
        };
        
        // Collect filter methods
        ['exact-match', 'partial-match', 'leetspeak', 'phonetic', 'context-analysis', 'pattern-detection'].forEach(method => {
            const checkbox = this.container.querySelector(`#${method}`);
            if (checkbox) {
                newConfig.filter_methods[method.replace('-', '_')] = checkbox.checked;
            }
        });
        
        // Collect replacement method
        const selectedReplacement = this.container.querySelector('input[name="replacement"]:checked');
        if (selectedReplacement) {
            Object.keys(this.filterConfig.replacement_methods).forEach(method => {
                newConfig.replacement_methods[method] = method === selectedReplacement.value;
            });
        }
        
        this.filterConfig = newConfig;
        
        // Send to server
        this.sendConfigurationUpdate(newConfig);
        
        this.showSuccess('Configuration saved successfully');
    }
    
    resetConfiguration() {
        if (confirm('Are you sure you want to reset to default configuration?')) {
            this.loadFilterConfiguration();
            this.showInfo('Configuration reset to defaults');
        }
    }
    
    testFilter() {
        const testContent = this.container.querySelector('#test-content').value;
        
        if (!testContent.trim()) {
            this.showError('Please enter text to test');
            return;
        }
        
        // Send test request to server
        this.sendFilterTest(testContent);
    }
    
    displayTestResults(results) {
        const resultsContainer = this.container.querySelector('#test-results');
        const resultContent = resultsContainer.querySelector('.result-content');
        
        let resultsHTML = `
            <div class="test-result-summary">
                <div class="result-status ${results.is_clean ? 'clean' : 'violation'}">
                    <i class="fas fa-${results.is_clean ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${results.is_clean ? 'Content is clean' : 'Violations detected'}
                </div>
                <div class="result-score">Severity Score: ${results.severity_score}</div>
                <div class="result-action">Action: ${results.action}</div>
            </div>
        `;
        
        if (results.filtered_content !== results.original_content) {
            resultsHTML += `
                <div class="filtered-content">
                    <h6>Filtered Content:</h6>
                    <div class="content-preview">${results.filtered_content}</div>
                </div>
            `;
        }
        
        if (results.violations.length > 0) {
            resultsHTML += `
                <div class="violations-list">
                    <h6>Violations Found:</h6>
            `;
            
            results.violations.forEach(violation => {
                resultsHTML += `
                    <div class="violation-item">
                        <span class="violation-word">${violation.word}</span>
                        <span class="violation-severity badge bg-${this.getSeverityColor(violation.severity)}">${violation.severity}</span>
                        <span class="violation-method">${violation.method}</span>
                        <span class="violation-confidence">${Math.round(violation.confidence * 100)}% confidence</span>
                    </div>
                `;
            });
            
            resultsHTML += '</div>';
        }
        
        if (results.filter_methods_used.length > 0) {
            resultsHTML += `
                <div class="methods-used">
                    <h6>Detection Methods Used:</h6>
                    <div class="methods-list">
                        ${results.filter_methods_used.map(method => `<span class="method-badge">${method}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        
        resultContent.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
    }
    
    getSeverityColor(severity) {
        const colors = {
            mild: 'info',
            moderate: 'warning',
            severe: 'danger',
            extreme: 'dark'
        };
        return colors[severity] || 'secondary';
    }
    
    loadStatistics() {
        // Mock statistics for demo
        this.statistics = {
            total_filtered: 156,
            total_blocked: 23,
            total_replaced: 133,
            method_breakdown: {
                exact_match: 89,
                leetspeak: 34,
                phonetic: 18,
                context_analysis: 12,
                pattern_detection: 3
            }
        };
        
        this.updateStatisticsDisplay();
    }
    
    updateStatisticsDisplay() {
        this.container.querySelector('#total-filtered').textContent = this.statistics.total_filtered;
        this.container.querySelector('#total-blocked').textContent = this.statistics.total_blocked;
        this.container.querySelector('#total-replaced').textContent = this.statistics.total_replaced;
        this.container.querySelector('#false-positives').textContent = this.falsePositiveReports.length;
        
        // Update method breakdown chart
        this.updateMethodChart();
    }
    
    updateMethodChart() {
        const chartContainer = this.container.querySelector('#method-chart');
        if (!chartContainer) return;
        
        let chartHTML = '';
        const total = Object.values(this.statistics.method_breakdown).reduce((sum, count) => sum + count, 0);
        
        Object.entries(this.statistics.method_breakdown).forEach(([method, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            chartHTML += `
                <div class="method-bar">
                    <div class="method-label">${method.replace('_', ' ')}</div>
                    <div class="method-progress">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                        <span class="progress-text">${count} (${percentage}%)</span>
                    </div>
                </div>
            `;
        });
        
        chartContainer.innerHTML = chartHTML;
    }
    
    exportConfiguration() {
        const exportData = {
            config: this.filterConfig,
            profanity_lists: this.profanityLists,
            whitelist: this.whitelist,
            export_timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `profanity-filter-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Configuration exported successfully');
    }
    
    importConfiguration(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (importData.config) {
                    this.filterConfig = importData.config;
                }
                
                if (importData.profanity_lists) {
                    this.profanityLists = importData.profanity_lists;
                }
                
                if (importData.whitelist) {
                    this.whitelist = importData.whitelist;
                }
                
                this.updateConfigurationUI();
                this.updateWordLists();
                
                this.showSuccess('Configuration imported successfully');
                
                // Send to server
                this.sendConfigurationImport(importData);
                
            } catch (error) {
                this.showError('Invalid configuration file');
            }
        };
        
        reader.readAsText(file);
    }
    
    cleanupLogs() {
        if (confirm('Are you sure you want to cleanup old logs? This will remove logs older than 30 days.')) {
            this.sendCleanupRequest();
            this.showSuccess('Log cleanup initiated');
        }
    }
    
    sendWordListUpdate(action, data) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'profanity_filter_update',
                action: action,
                data: data
            }));
        }
    }
    
    sendConfigurationUpdate(config) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'profanity_filter_config',
                config: config
            }));
        }
    }
    
    sendFilterTest(content) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'profanity_filter_test',
                content: content
            }));
        }
    }
    
    sendConfigurationImport(data) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'profanity_filter_import',
                data: data
            }));
        }
    }
    
    sendCleanupRequest() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'profanity_filter_cleanup'
            }));
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'profanity_filter_test_result':
                this.displayTestResults(data.result);
                break;
            case 'profanity_filter_stats':
                this.statistics = data.stats;
                this.updateStatisticsDisplay();
                break;
            case 'profanity_filter_success':
                this.showSuccess(data.message);
                break;
            case 'profanity_filter_error':
                this.showError(data.message);
                break;
        }
    }
    
    show() {
        if (!this.hasAdminPermissions()) {
            this.showError('You do not have profanity filter management permissions');
            return;
        }
        
        const panel = this.container.querySelector('#profanity-filter-panel');
        if (panel) {
            panel.style.display = 'block';
            this.isVisible = true;
            this.loadFilterConfiguration();
            this.loadStatistics();
        }
    }
    
    hide() {
        const panel = this.container.querySelector('#profanity-filter-panel');
        if (panel) {
            panel.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type) {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `profanity-filter-notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Update WebSocket connection
    setWebSocket(websocket) {
        this.websocket = websocket;
    }
    
    // Update user role
    setUserRole(role) {
        this.userRole = role;
        
        if (!this.hasAdminPermissions() && this.isVisible) {
            this.hide();
        }
    }
    
    // Destroy component
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// CSS Styles for Profanity Filter Panel
const profanityFilterStyles = `
<style>
.profanity-filter-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 95%;
    max-width: 1400px;
    height: 85vh;
    background: var(--card-dark, #2a2a2a);
    border: 1px solid #444;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.profanity-filter-panel .panel-header {
    background: var(--primary-color, #FF0000);
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px 12px 0 0;
}

.profanity-filter-panel .panel-header h4 {
    margin: 0;
    font-size: 1.2rem;
}

.profanity-filter-panel .close-panel {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s ease;
}

.profanity-filter-panel .close-panel:hover {
    background: rgba(255, 255, 255, 0.2);
}

.profanity-filter-panel .panel-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    grid-template-rows: auto auto auto 1fr;
}

.config-section {
    grid-column: 1 / -1;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
}

.config-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 1.5rem;
}

.config-group h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    font-size: 1rem;
}

.config-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-light, #ffffff);
    margin-bottom: 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
}

.config-label input[type="checkbox"],
.config-label input[type="radio"] {
    margin: 0;
}

.custom-replacement-group {
    margin-top: 0.5rem;
    margin-left: 1.5rem;
}

.custom-replacement-group .form-control {
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 6px;
    padding: 0.5rem;
}

.config-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.wordlist-section {
    grid-column: 1;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
}

.wordlist-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.wordlist-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.tab-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: var(--text-light, #ffffff);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.tab-btn.active,
.tab-btn:hover {
    background: var(--primary-color, #FF0000);
}

.severity-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.severity-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: var(--text-light, #ffffff);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 0.8rem;
}

.severity-btn.active {
    background: var(--primary-color, #FF0000);
}

.severity-btn:hover {
    background: rgba(255, 0, 0, 0.7);
}

.add-word-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.add-word-form .form-control {
    flex: 1;
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 6px;
    padding: 0.5rem;
}

.word-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #555;
    border-radius: 6px;
    background: var(--bg-dark, #1a1a1a);
    padding: 0.5rem;
}

.word-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.word-item:last-child {
    margin-bottom: 0;
}

.word-text {
    color: var(--text-light, #ffffff);
    font-family: monospace;
}

.no-words-message {
    text-align: center;
    color: var(--text-muted, #cccccc);
    padding: 2rem;
    font-style: italic;
}

.testing-section {
    grid-column: 2;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
}

.testing-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.test-form {
    margin-bottom: 1rem;
}

.test-form .form-control {
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid #555;
    color: var(--text-light, #ffffff);
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    resize: vertical;
}

.test-results {
    background: var(--bg-dark, #1a1a1a);
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #555;
}

.test-result-summary {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.result-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
}

.result-status.clean {
    color: #28a745;
}

.result-status.violation {
    color: #dc3545;
}

.result-score,
.result-action {
    color: var(--text-light, #ffffff);
    font-size: 0.9rem;
}

.filtered-content {
    margin-bottom: 1rem;
}

.filtered-content h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
}

.content-preview {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0.75rem;
    font-family: monospace;
    color: var(--text-light, #ffffff);
}

.violations-list {
    margin-bottom: 1rem;
}

.violations-list h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
}

.violation-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
}

.violation-word {
    font-family: monospace;
    color: var(--text-light, #ffffff);
    font-weight: 600;
}

.violation-severity {
    font-size: 0.7rem;
}

.violation-method,
.violation-confidence {
    color: var(--text-muted, #cccccc);
}

.methods-used h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
}

.methods-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.method-badge {
    background: var(--primary-color, #FF0000);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
}

.statistics-section {
    grid-column: 1 / -1;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
}

.statistics-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: var(--bg-dark, #1a1a1a);
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #555;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color, #FF0000);
}

.stat-label {
    color: var(--text-muted, #cccccc);
    margin-top: 0.5rem;
    font-size: 0.9rem;
}

.method-breakdown h6 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
}

.method-chart {
    background: var(--bg-dark, #1a1a1a);
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #555;
}

.method-bar {
    margin-bottom: 1rem;
}

.method-bar:last-child {
    margin-bottom: 0;
}

.method-label {
    color: var(--text-light, #ffffff);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    text-transform: capitalize;
}

.method-progress {
    position: relative;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    height: 20px;
    overflow: hidden;
}

.progress-bar {
    background: var(--primary-color, #FF0000);
    height: 100%;
    transition: width 0.3s ease;
}

.progress-text {
    position: absolute;
    top: 50%;
    left: 0.5rem;
    transform: translateY(-50%);
    color: var(--text-light, #ffffff);
    font-size: 0.8rem;
    font-weight: 500;
}

.reports-section {
    grid-column: 1 / -1;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
}

.reports-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.import-export-section {
    grid-column: 1 / -1;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
}

.import-export-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #FF0000);
    padding-bottom: 0.5rem;
}

.import-export-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.profanity-filter-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
}

.profanity-filter-notification.show {
    transform: translateX(0);
}

.notification-success {
    background: #28a745;
}

.notification-error {
    background: #dc3545;
}

.notification-info {
    background: #17a2b8;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .profanity-filter-panel {
        width: 95%;
        height: 90vh;
    }

    .profanity-filter-panel .panel-content {
        grid-template-columns: 1fr;
        gap: 1rem;
        padding: 1rem;
    }

    .config-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .wordlist-section,
    .testing-section {
        grid-column: 1;
    }

    .test-result-summary {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .import-export-controls {
        justify-content: center;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = profanityFilterStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfanityFilterPanel;
} else if (typeof window !== 'undefined') {
    window.ProfanityFilterPanel = ProfanityFilterPanel;
}
