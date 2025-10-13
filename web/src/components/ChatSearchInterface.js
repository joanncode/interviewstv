/**
 * Chat Search Interface
 * Advanced search functionality with filters, highlighting, and navigation
 */
class ChatSearchInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.container = options.container || null;
        this.onSearchResult = options.onSearchResult || (() => {});
        this.onSearchNavigation = options.onSearchNavigation || (() => {});
        
        // Search state
        this.searchQuery = '';
        this.searchResults = [];
        this.currentResultIndex = -1;
        this.highlightedElements = new Set();
        this.searchHistory = [];
        this.isSearchActive = false;
        
        // Message data
        this.messages = new Map(); // messageId -> message data
        this.messageElements = new Map(); // messageId -> DOM element
        this.searchIndex = new Map(); // word -> Set of messageIds
        
        // UI elements
        this.searchContainer = null;
        this.searchInput = null;
        this.searchResults = null;
        this.searchNavigation = null;
        
        // Settings
        this.settings = {
            // Search behavior
            caseSensitive: false,
            wholeWords: false,
            useRegex: false,
            searchInUsernames: true,
            searchInTimestamps: false,
            
            // Display settings
            highlightResults: true,
            showResultCount: true,
            showSearchHistory: true,
            maxSearchHistory: 10,
            
            // Filter settings
            filterByUser: '',
            filterByRole: '',
            filterByDateRange: { start: null, end: null },
            filterByMessageType: 'all', // 'all', 'text', 'system', 'private'
            
            // Advanced settings
            fuzzySearch: false,
            searchDelay: 300, // ms
            maxResults: 100,
            contextLines: 2,
            
            ...options.settings
        };
        
        // Search types
        this.searchTypes = {
            TEXT: 'text',
            USER: 'user',
            DATE: 'date',
            REGEX: 'regex',
            FUZZY: 'fuzzy'
        };
        
        // Debounce timer
        this.searchTimer = null;
        
        this.init();
    }
    
    /**
     * Initialize the search interface
     */
    init() {
        if (this.container) {
            this.createSearchInterface();
            this.attachEventListeners();
        }
        
        this.loadSearchSettings();
        this.buildSearchIndex();
        
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Create search interface
     */
    createSearchInterface() {
        // Find or create search container
        this.searchContainer = this.container.querySelector('#chat-search-container');
        
        if (!this.searchContainer) {
            this.searchContainer = document.createElement('div');
            this.searchContainer.id = 'chat-search-container';
            this.searchContainer.className = 'chat-search-container';
            this.searchContainer.style.display = 'none';
            
            // Add to chat interface
            const chatHeader = this.container.querySelector('.chat-header');
            if (chatHeader) {
                chatHeader.appendChild(this.searchContainer);
            } else {
                this.container.insertBefore(this.searchContainer, this.container.firstChild);
            }
        }
        
        this.createSearchContent();
    }
    
    /**
     * Create search content
     */
    createSearchContent() {
        this.searchContainer.innerHTML = `
            <div class="search-header">
                <div class="search-input-container">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input 
                            type="text" 
                            class="search-input" 
                            id="chat-search-input" 
                            placeholder="Search messages..."
                            autocomplete="off"
                        >
                        <button class="search-clear-btn" id="search-clear-btn" title="Clear search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="search-controls">
                        <button class="search-control-btn" id="search-options-btn" title="Search Options">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="search-control-btn" id="search-close-btn" title="Close Search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="search-navigation" id="search-navigation" style="display: none;">
                    <div class="search-results-info">
                        <span class="search-results-count" id="search-results-count">0 results</span>
                        <span class="search-current-result" id="search-current-result"></span>
                    </div>
                    <div class="search-nav-controls">
                        <button class="search-nav-btn" id="search-prev-btn" title="Previous result" disabled>
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button class="search-nav-btn" id="search-next-btn" title="Next result" disabled>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="search-options-panel" id="search-options-panel" style="display: none;">
                <div class="search-options-content">
                    <div class="search-option-group">
                        <h6>Search Options</h6>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="case-sensitive" ${this.settings.caseSensitive ? 'checked' : ''}>
                                <span>Case sensitive</span>
                            </label>
                        </div>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="whole-words" ${this.settings.wholeWords ? 'checked' : ''}>
                                <span>Whole words only</span>
                            </label>
                        </div>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="use-regex" ${this.settings.useRegex ? 'checked' : ''}>
                                <span>Use regular expressions</span>
                            </label>
                        </div>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="fuzzy-search" ${this.settings.fuzzySearch ? 'checked' : ''}>
                                <span>Fuzzy search</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="search-option-group">
                        <h6>Search In</h6>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="search-usernames" ${this.settings.searchInUsernames ? 'checked' : ''}>
                                <span>Usernames</span>
                            </label>
                        </div>
                        <div class="search-option">
                            <label class="search-checkbox">
                                <input type="checkbox" id="search-timestamps" ${this.settings.searchInTimestamps ? 'checked' : ''}>
                                <span>Timestamps</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="search-option-group">
                        <h6>Filters</h6>
                        <div class="search-option">
                            <label>Filter by user</label>
                            <input type="text" class="search-filter-input" id="filter-user" placeholder="Username" value="${this.settings.filterByUser}">
                        </div>
                        <div class="search-option">
                            <label>Filter by role</label>
                            <select class="search-filter-select" id="filter-role">
                                <option value="">All roles</option>
                                <option value="admin" ${this.settings.filterByRole === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="moderator" ${this.settings.filterByRole === 'moderator' ? 'selected' : ''}>Moderator</option>
                                <option value="host" ${this.settings.filterByRole === 'host' ? 'selected' : ''}>Host</option>
                                <option value="participant" ${this.settings.filterByRole === 'participant' ? 'selected' : ''}>Participant</option>
                                <option value="guest" ${this.settings.filterByRole === 'guest' ? 'selected' : ''}>Guest</option>
                            </select>
                        </div>
                        <div class="search-option">
                            <label>Message type</label>
                            <select class="search-filter-select" id="filter-message-type">
                                <option value="all" ${this.settings.filterByMessageType === 'all' ? 'selected' : ''}>All messages</option>
                                <option value="text" ${this.settings.filterByMessageType === 'text' ? 'selected' : ''}>Text messages</option>
                                <option value="system" ${this.settings.filterByMessageType === 'system' ? 'selected' : ''}>System messages</option>
                                <option value="private" ${this.settings.filterByMessageType === 'private' ? 'selected' : ''}>Private messages</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="search-option-group">
                        <h6>Date Range</h6>
                        <div class="search-option">
                            <label>From date</label>
                            <input type="date" class="search-filter-input" id="filter-date-start">
                        </div>
                        <div class="search-option">
                            <label>To date</label>
                            <input type="date" class="search-filter-input" id="filter-date-end">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="search-history-panel" id="search-history-panel" style="display: none;">
                <div class="search-history-header">
                    <h6>Search History</h6>
                    <button class="search-history-clear" id="clear-search-history">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="search-history-list" id="search-history-list">
                    <!-- Search history items will be added here -->
                </div>
            </div>
        `;
        
        // Store references
        this.searchInput = this.searchContainer.querySelector('#chat-search-input');
        this.searchNavigation = this.searchContainer.querySelector('#search-navigation');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        this.searchInput.addEventListener('focus', () => this.showSearchHistory());
        
        // Search controls
        this.searchContainer.querySelector('#search-clear-btn').addEventListener('click', () => this.clearSearch());
        this.searchContainer.querySelector('#search-options-btn').addEventListener('click', () => this.toggleSearchOptions());
        this.searchContainer.querySelector('#search-close-btn').addEventListener('click', () => this.closeSearch());
        
        // Navigation controls
        this.searchContainer.querySelector('#search-prev-btn').addEventListener('click', () => this.navigateToPrevious());
        this.searchContainer.querySelector('#search-next-btn').addEventListener('click', () => this.navigateToNext());
        
        // Search options
        this.attachSearchOptionsListeners();
        
        // Search history
        this.searchContainer.querySelector('#clear-search-history').addEventListener('click', () => this.clearSearchHistory());
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
    }
    
    /**
     * Attach search options listeners
     */
    attachSearchOptionsListeners() {
        const caseSensitive = this.searchContainer.querySelector('#case-sensitive');
        const wholeWords = this.searchContainer.querySelector('#whole-words');
        const useRegex = this.searchContainer.querySelector('#use-regex');
        const fuzzySearch = this.searchContainer.querySelector('#fuzzy-search');
        const searchUsernames = this.searchContainer.querySelector('#search-usernames');
        const searchTimestamps = this.searchContainer.querySelector('#search-timestamps');
        const filterUser = this.searchContainer.querySelector('#filter-user');
        const filterRole = this.searchContainer.querySelector('#filter-role');
        const filterMessageType = this.searchContainer.querySelector('#filter-message-type');
        const filterDateStart = this.searchContainer.querySelector('#filter-date-start');
        const filterDateEnd = this.searchContainer.querySelector('#filter-date-end');
        
        caseSensitive.addEventListener('change', (e) => this.updateSearchSetting('caseSensitive', e.target.checked));
        wholeWords.addEventListener('change', (e) => this.updateSearchSetting('wholeWords', e.target.checked));
        useRegex.addEventListener('change', (e) => this.updateSearchSetting('useRegex', e.target.checked));
        fuzzySearch.addEventListener('change', (e) => this.updateSearchSetting('fuzzySearch', e.target.checked));
        searchUsernames.addEventListener('change', (e) => this.updateSearchSetting('searchInUsernames', e.target.checked));
        searchTimestamps.addEventListener('change', (e) => this.updateSearchSetting('searchInTimestamps', e.target.checked));
        
        filterUser.addEventListener('input', (e) => this.updateSearchSetting('filterByUser', e.target.value));
        filterRole.addEventListener('change', (e) => this.updateSearchSetting('filterByRole', e.target.value));
        filterMessageType.addEventListener('change', (e) => this.updateSearchSetting('filterByMessageType', e.target.value));
        filterDateStart.addEventListener('change', (e) => this.updateDateFilter('start', e.target.value));
        filterDateEnd.addEventListener('change', (e) => this.updateDateFilter('end', e.target.value));
    }
    
    /**
     * Update search setting
     */
    updateSearchSetting(key, value) {
        this.settings[key] = value;
        this.saveSearchSettings();
        
        // Re-run search if active
        if (this.isSearchActive && this.searchQuery) {
            this.performSearch(this.searchQuery);
        }
    }
    
    /**
     * Update date filter
     */
    updateDateFilter(type, value) {
        if (!this.settings.filterByDateRange) {
            this.settings.filterByDateRange = { start: null, end: null };
        }
        
        this.settings.filterByDateRange[type] = value ? new Date(value) : null;
        this.saveSearchSettings();
        
        // Re-run search if active
        if (this.isSearchActive && this.searchQuery) {
            this.performSearch(this.searchQuery);
        }
    }
    
    /**
     * Save search settings
     */
    saveSearchSettings() {
        localStorage.setItem('chatSearchSettings', JSON.stringify(this.settings));
    }
    
    /**
     * Load search settings
     */
    loadSearchSettings() {
        const saved = localStorage.getItem('chatSearchSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Load search history
        const history = localStorage.getItem('chatSearchHistory');
        if (history) {
            this.searchHistory = JSON.parse(history);
        }
    }
    
    /**
     * Handle search input
     */
    handleSearchInput(event) {
        const query = event.target.value;
        
        // Clear previous timer
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        
        // Debounce search
        this.searchTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.settings.searchDelay);
    }
    
    /**
     * Handle search keydown
     */
    handleSearchKeydown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (event.shiftKey) {
                    this.navigateToPrevious();
                } else {
                    this.navigateToNext();
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                this.closeSearch();
                break;
                
            case 'ArrowDown':
                if (this.searchResults.length > 0) {
                    event.preventDefault();
                    this.navigateToNext();
                }
                break;
                
            case 'ArrowUp':
                if (this.searchResults.length > 0) {
                    event.preventDefault();
                    this.navigateToPrevious();
                }
                break;
        }
    }
    
    /**
     * Handle global keydown
     */
    handleGlobalKeydown(event) {
        // Ctrl+F or Cmd+F to open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            this.openSearch();
        }
        
        // Escape to close search
        if (event.key === 'Escape' && this.isSearchActive) {
            this.closeSearch();
        }
    }
    
    /**
     * Open search
     */
    openSearch() {
        this.isSearchActive = true;
        this.searchContainer.style.display = 'block';
        this.searchInput.focus();
        this.searchInput.select();
        
        // Add search-active class to container
        this.container.classList.add('search-active');
    }
    
    /**
     * Close search
     */
    closeSearch() {
        this.isSearchActive = false;
        this.searchContainer.style.display = 'none';
        this.clearHighlights();
        this.hideSearchHistory();
        
        // Remove search-active class from container
        this.container.classList.remove('search-active');
        
        // Clear search query
        this.searchQuery = '';
        this.searchInput.value = '';
        this.updateSearchNavigation();
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.searchResults = [];
        this.currentResultIndex = -1;
        this.clearHighlights();
        this.updateSearchNavigation();
    }
    
    /**
     * Toggle search options
     */
    toggleSearchOptions() {
        const optionsPanel = this.searchContainer.querySelector('#search-options-panel');
        const isVisible = optionsPanel.style.display !== 'none';
        optionsPanel.style.display = isVisible ? 'none' : 'block';
        
        // Hide search history when showing options
        if (!isVisible) {
            this.hideSearchHistory();
        }
    }
    
    /**
     * Perform search
     */
    performSearch(query) {
        this.searchQuery = query.trim();
        
        if (!this.searchQuery) {
            this.searchResults = [];
            this.currentResultIndex = -1;
            this.clearHighlights();
            this.updateSearchNavigation();
            return;
        }
        
        // Add to search history
        this.addToSearchHistory(this.searchQuery);
        
        // Perform the search
        this.searchResults = this.searchMessages(this.searchQuery);
        this.currentResultIndex = this.searchResults.length > 0 ? 0 : -1;
        
        // Highlight results
        this.highlightSearchResults();
        
        // Update navigation
        this.updateSearchNavigation();
        
        // Navigate to first result
        if (this.searchResults.length > 0) {
            this.navigateToResult(0);
        }
        
        // Callback
        this.onSearchResult(this.searchResults, this.searchQuery);
    }
    
    /**
     * Search messages
     */
    searchMessages(query) {
        const results = [];
        const searchTerms = this.parseSearchQuery(query);
        
        for (const [messageId, message] of this.messages) {
            if (this.matchesFilters(message) && this.matchesSearchTerms(message, searchTerms)) {
                results.push({
                    messageId: messageId,
                    message: message,
                    element: this.messageElements.get(messageId),
                    matches: this.getMatches(message, searchTerms)
                });
            }
        }
        
        // Sort by timestamp (newest first)
        results.sort((a, b) => b.message.timestamp - a.message.timestamp);
        
        // Limit results
        return results.slice(0, this.settings.maxResults);
    }
    
    /**
     * Parse search query
     */
    parseSearchQuery(query) {
        if (this.settings.useRegex) {
            try {
                const flags = this.settings.caseSensitive ? 'g' : 'gi';
                return [new RegExp(query, flags)];
            } catch (error) {
                console.warn('Invalid regex:', error);
                return [query];
            }
        }
        
        if (this.settings.wholeWords) {
            const flags = this.settings.caseSensitive ? 'g' : 'gi';
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return [new RegExp(`\\b${escapedQuery}\\b`, flags)];
        }
        
        // Split into terms for fuzzy search
        if (this.settings.fuzzySearch) {
            return query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        }
        
        return [this.settings.caseSensitive ? query : query.toLowerCase()];
    }
    
    /**
     * Check if message matches filters
     */
    matchesFilters(message) {
        // User filter
        if (this.settings.filterByUser) {
            const userName = (message.user_name || '').toLowerCase();
            const filterUser = this.settings.filterByUser.toLowerCase();
            if (!userName.includes(filterUser)) {
                return false;
            }
        }
        
        // Role filter
        if (this.settings.filterByRole) {
            if (message.user_role !== this.settings.filterByRole) {
                return false;
            }
        }
        
        // Message type filter
        if (this.settings.filterByMessageType !== 'all') {
            const messageType = this.getMessageType(message);
            if (messageType !== this.settings.filterByMessageType) {
                return false;
            }
        }
        
        // Date range filter
        if (this.settings.filterByDateRange.start || this.settings.filterByDateRange.end) {
            const messageDate = new Date(message.timestamp);
            
            if (this.settings.filterByDateRange.start && messageDate < this.settings.filterByDateRange.start) {
                return false;
            }
            
            if (this.settings.filterByDateRange.end && messageDate > this.settings.filterByDateRange.end) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get message type
     */
    getMessageType(message) {
        if (message.type === 'system_message' || message.is_system) {
            return 'system';
        }
        
        if (message.type === 'private_message' || message.is_private) {
            return 'private';
        }
        
        return 'text';
    }
    
    /**
     * Check if message matches search terms
     */
    matchesSearchTerms(message, searchTerms) {
        const searchableText = this.getSearchableText(message);
        
        if (this.settings.fuzzySearch) {
            return this.fuzzyMatch(searchableText, searchTerms);
        }
        
        for (const term of searchTerms) {
            if (term instanceof RegExp) {
                if (term.test(searchableText)) {
                    return true;
                }
            } else {
                const text = this.settings.caseSensitive ? searchableText : searchableText.toLowerCase();
                if (text.includes(term)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get searchable text from message
     */
    getSearchableText(message) {
        let text = message.message || message.text || '';
        
        if (this.settings.searchInUsernames) {
            text += ' ' + (message.user_name || '');
        }
        
        if (this.settings.searchInTimestamps) {
            text += ' ' + new Date(message.timestamp).toLocaleString();
        }
        
        return text;
    }
    
    /**
     * Fuzzy match
     */
    fuzzyMatch(text, terms) {
        const lowerText = text.toLowerCase();
        
        for (const term of terms) {
            if (!lowerText.includes(term)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get matches in message
     */
    getMatches(message, searchTerms) {
        const matches = [];
        const searchableText = this.getSearchableText(message);
        
        for (const term of searchTerms) {
            if (term instanceof RegExp) {
                let match;
                while ((match = term.exec(searchableText)) !== null) {
                    matches.push({
                        text: match[0],
                        index: match.index,
                        length: match[0].length
                    });
                }
            } else {
                const text = this.settings.caseSensitive ? searchableText : searchableText.toLowerCase();
                let index = text.indexOf(term);
                
                while (index !== -1) {
                    matches.push({
                        text: searchableText.substr(index, term.length),
                        index: index,
                        length: term.length
                    });
                    index = text.indexOf(term, index + 1);
                }
            }
        }
        
        return matches;
    }
    
    /**
     * Highlight search results
     */
    highlightSearchResults() {
        this.clearHighlights();
        
        if (!this.settings.highlightResults) return;
        
        for (const result of this.searchResults) {
            if (result.element) {
                this.highlightElement(result.element, result.matches);
            }
        }
    }
    
    /**
     * Highlight element
     */
    highlightElement(element, matches) {
        const messageContent = element.querySelector('.message-content, .message-text');
        if (!messageContent) return;
        
        const originalText = messageContent.textContent;
        let highlightedText = originalText;
        
        // Sort matches by index (descending) to avoid index shifting
        matches.sort((a, b) => b.index - a.index);
        
        for (const match of matches) {
            const before = highlightedText.substring(0, match.index);
            const highlighted = `<mark class="search-highlight">${match.text}</mark>`;
            const after = highlightedText.substring(match.index + match.length);
            highlightedText = before + highlighted + after;
        }
        
        messageContent.innerHTML = highlightedText;
        this.highlightedElements.add(element);
    }
    
    /**
     * Clear highlights
     */
    clearHighlights() {
        for (const element of this.highlightedElements) {
            const messageContent = element.querySelector('.message-content, .message-text');
            if (messageContent) {
                // Remove highlight marks
                const highlights = messageContent.querySelectorAll('.search-highlight');
                highlights.forEach(highlight => {
                    highlight.outerHTML = highlight.textContent;
                });
            }
        }
        
        this.highlightedElements.clear();
    }
    
    /**
     * Navigate to next result
     */
    navigateToNext() {
        if (this.searchResults.length === 0) return;
        
        this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
        this.navigateToResult(this.currentResultIndex);
    }
    
    /**
     * Navigate to previous result
     */
    navigateToPrevious() {
        if (this.searchResults.length === 0) return;
        
        this.currentResultIndex = this.currentResultIndex <= 0 
            ? this.searchResults.length - 1 
            : this.currentResultIndex - 1;
        this.navigateToResult(this.currentResultIndex);
    }
    
    /**
     * Navigate to specific result
     */
    navigateToResult(index) {
        if (index < 0 || index >= this.searchResults.length) return;
        
        const result = this.searchResults[index];
        if (result.element) {
            // Scroll to element
            result.element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add current result highlight
            this.clearCurrentResultHighlight();
            result.element.classList.add('search-current-result');
            
            // Update navigation
            this.updateSearchNavigation();
            
            // Callback
            this.onSearchNavigation(result, index);
        }
    }
    
    /**
     * Clear current result highlight
     */
    clearCurrentResultHighlight() {
        const currentResults = this.container.querySelectorAll('.search-current-result');
        currentResults.forEach(element => {
            element.classList.remove('search-current-result');
        });
    }
    
    /**
     * Update search navigation
     */
    updateSearchNavigation() {
        const resultsCount = this.searchContainer.querySelector('#search-results-count');
        const currentResult = this.searchContainer.querySelector('#search-current-result');
        const prevBtn = this.searchContainer.querySelector('#search-prev-btn');
        const nextBtn = this.searchContainer.querySelector('#search-next-btn');
        
        if (this.searchResults.length === 0) {
            resultsCount.textContent = this.searchQuery ? 'No results' : '0 results';
            currentResult.textContent = '';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            this.searchNavigation.style.display = 'none';
        } else {
            resultsCount.textContent = `${this.searchResults.length} result${this.searchResults.length === 1 ? '' : 's'}`;
            currentResult.textContent = `${this.currentResultIndex + 1} of ${this.searchResults.length}`;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
            this.searchNavigation.style.display = 'flex';
        }
    }
    
    /**
     * Add to search history
     */
    addToSearchHistory(query) {
        if (!this.settings.showSearchHistory || !query) return;
        
        // Remove if already exists
        const existingIndex = this.searchHistory.indexOf(query);
        if (existingIndex !== -1) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Limit history size
        if (this.searchHistory.length > this.settings.maxSearchHistory) {
            this.searchHistory = this.searchHistory.slice(0, this.settings.maxSearchHistory);
        }
        
        // Save to localStorage
        localStorage.setItem('chatSearchHistory', JSON.stringify(this.searchHistory));
        
        // Update history display
        this.updateSearchHistoryDisplay();
    }
    
    /**
     * Show search history
     */
    showSearchHistory() {
        if (!this.settings.showSearchHistory || this.searchHistory.length === 0) return;
        
        const historyPanel = this.searchContainer.querySelector('#search-history-panel');
        historyPanel.style.display = 'block';
        this.updateSearchHistoryDisplay();
    }
    
    /**
     * Hide search history
     */
    hideSearchHistory() {
        const historyPanel = this.searchContainer.querySelector('#search-history-panel');
        historyPanel.style.display = 'none';
    }
    
    /**
     * Update search history display
     */
    updateSearchHistoryDisplay() {
        const historyList = this.searchContainer.querySelector('#search-history-list');
        
        historyList.innerHTML = this.searchHistory.map(query => `
            <div class="search-history-item" onclick="chatSearch.selectHistoryItem('${query.replace(/'/g, "\\'")}')">
                <i class="fas fa-history"></i>
                <span>${query}</span>
            </div>
        `).join('');
    }
    
    /**
     * Select history item
     */
    selectHistoryItem(query) {
        this.searchInput.value = query;
        this.performSearch(query);
        this.hideSearchHistory();
    }
    
    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('chatSearchHistory');
        this.updateSearchHistoryDisplay();
        this.hideSearchHistory();
    }
    
    /**
     * Build search index
     */
    buildSearchIndex() {
        this.searchIndex.clear();
        
        for (const [messageId, message] of this.messages) {
            const words = this.extractWords(this.getSearchableText(message));
            
            for (const word of words) {
                if (!this.searchIndex.has(word)) {
                    this.searchIndex.set(word, new Set());
                }
                this.searchIndex.get(word).add(messageId);
            }
        }
    }
    
    /**
     * Extract words from text
     */
    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }
    
    /**
     * Add message to search
     */
    addMessage(messageId, messageData, messageElement) {
        this.messages.set(messageId, messageData);
        this.messageElements.set(messageId, messageElement);
        
        // Update search index
        const words = this.extractWords(this.getSearchableText(messageData));
        for (const word of words) {
            if (!this.searchIndex.has(word)) {
                this.searchIndex.set(word, new Set());
            }
            this.searchIndex.get(word).add(messageId);
        }
        
        // Re-run search if active
        if (this.isSearchActive && this.searchQuery) {
            this.performSearch(this.searchQuery);
        }
    }
    
    /**
     * Remove message from search
     */
    removeMessage(messageId) {
        const messageData = this.messages.get(messageId);
        if (messageData) {
            // Remove from search index
            const words = this.extractWords(this.getSearchableText(messageData));
            for (const word of words) {
                const messageSet = this.searchIndex.get(word);
                if (messageSet) {
                    messageSet.delete(messageId);
                    if (messageSet.size === 0) {
                        this.searchIndex.delete(word);
                    }
                }
            }
        }
        
        this.messages.delete(messageId);
        this.messageElements.delete(messageId);
        
        // Re-run search if active
        if (this.isSearchActive && this.searchQuery) {
            this.performSearch(this.searchQuery);
        }
    }
    
    /**
     * Get search statistics
     */
    getSearchStatistics() {
        return {
            totalMessages: this.messages.size,
            indexedWords: this.searchIndex.size,
            searchHistory: this.searchHistory.length,
            currentResults: this.searchResults.length,
            isSearchActive: this.isSearchActive,
            currentQuery: this.searchQuery
        };
    }
    
    /**
     * Attach WebSocket listeners
     */
    attachWebSocketListeners() {
        if (!this.websocket) return;
        
        this.websocket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        });
    }
    
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        // Search interface doesn't need to handle WebSocket messages directly
        // Messages are added via the addMessage method from the main chat interface
    }
    
    /**
     * Set WebSocket connection
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Set user info
     */
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
    }
    
    /**
     * Set room ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
        
        // Clear search when changing rooms
        this.clearSearch();
        this.messages.clear();
        this.messageElements.clear();
        this.buildSearchIndex();
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        // Clear search
        this.clearSearch();
        this.clearHighlights();
        
        // Clear data
        this.messages.clear();
        this.messageElements.clear();
        this.searchIndex.clear();
        this.highlightedElements.clear();
        
        // Remove UI elements
        if (this.searchContainer) {
            this.searchContainer.remove();
        }
        
        // Remove global event listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
    }
}

// CSS Styles for Chat Search Interface
const searchStyles = `
<style>
/* Chat Search Interface Styles */
.chat-search-container {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    border-radius: 8px;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    position: relative;
    z-index: 100;
}

.search-header {
    padding: 1rem;
    border-bottom: 1px solid var(--chat-border, #444);
}

.search-input-container {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.9rem;
    z-index: 1;
}

.search-input {
    width: 100%;
    background: var(--chat-input, #3a3a3a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.6rem 2.5rem 0.6rem 2.25rem;
    border-radius: 6px;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
    box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
}

.search-input::placeholder {
    color: var(--chat-text-muted, #cccccc);
}

.search-clear-btn {
    position: absolute;
    right: 0.5rem;
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    font-size: 0.8rem;
}

.search-clear-btn:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.search-controls {
    display: flex;
    gap: 0.5rem;
}

.search-control-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
}

.search-control-btn:hover {
    background: var(--chat-input, #3a3a3a);
    color: var(--chat-text, #ffffff);
    border-color: var(--chat-primary, #FF0000);
}

.search-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem 0;
    margin-top: 0.75rem;
    border-top: 1px solid var(--chat-border, #444);
}

.search-results-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.85rem;
}

.search-results-count {
    font-weight: 500;
}

.search-current-result {
    color: var(--chat-primary, #FF0000);
    font-weight: 600;
}

.search-nav-controls {
    display: flex;
    gap: 0.25rem;
}

.search-nav-btn {
    background: transparent;
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text-muted, #cccccc);
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.7rem;
}

.search-nav-btn:hover:not(:disabled) {
    background: var(--chat-primary, #FF0000);
    color: white;
    border-color: var(--chat-primary, #FF0000);
}

.search-nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Search Options Panel */
.search-options-panel {
    background: var(--chat-input, #3a3a3a);
    border-top: 1px solid var(--chat-border, #444);
    padding: 1rem;
    max-height: 400px;
    overflow-y: auto;
}

.search-options-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.search-option-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.search-option-group h6 {
    color: var(--chat-primary, #FF0000);
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.search-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.search-option label {
    color: var(--chat-text, #ffffff);
    font-size: 0.8rem;
    font-weight: 500;
}

.search-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    margin-bottom: 0;
    padding: 0.25rem 0;
}

.search-checkbox input[type="checkbox"] {
    accent-color: var(--chat-primary, #FF0000);
    width: 14px;
    height: 14px;
}

.search-checkbox span {
    font-size: 0.8rem;
    color: var(--chat-text, #ffffff);
}

.search-filter-input,
.search-filter-select {
    background: var(--chat-card, #2a2a2a);
    border: 1px solid var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.search-filter-input:focus,
.search-filter-select:focus {
    outline: none;
    border-color: var(--chat-primary, #FF0000);
}

/* Search History Panel */
.search-history-panel {
    background: var(--chat-input, #3a3a3a);
    border-top: 1px solid var(--chat-border, #444);
    max-height: 200px;
    overflow-y: auto;
}

.search-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--chat-border, #444);
}

.search-history-header h6 {
    color: var(--chat-text, #ffffff);
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
}

.search-history-clear {
    background: transparent;
    border: none;
    color: var(--chat-text-muted, #cccccc);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    font-size: 0.7rem;
}

.search-history-clear:hover {
    background: var(--chat-border, #444);
    color: var(--chat-text, #ffffff);
}

.search-history-list {
    padding: 0.5rem 0;
}

.search-history-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--chat-text-muted, #cccccc);
    font-size: 0.8rem;
}

.search-history-item:hover {
    background: var(--chat-card, #2a2a2a);
    color: var(--chat-text, #ffffff);
}

.search-history-item i {
    color: var(--chat-primary, #FF0000);
    font-size: 0.7rem;
}

/* Search Highlights */
.search-highlight {
    background: var(--chat-primary, #FF0000);
    color: white;
    padding: 0.1rem 0.2rem;
    border-radius: 2px;
    font-weight: 600;
}

.search-current-result {
    background: rgba(255, 0, 0, 0.2) !important;
    border: 1px solid var(--chat-primary, #FF0000) !important;
    animation: search-pulse 2s ease-in-out infinite;
}

@keyframes search-pulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.1);
    }
}

/* Search Active State */
.search-active .chat-messages {
    /* Add any styles for when search is active */
}

/* Responsive Design */
@media (max-width: 768px) {
    .search-header {
        padding: 0.75rem;
    }

    .search-input-container {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }

    .search-controls {
        justify-content: flex-end;
    }

    .search-control-btn {
        width: 32px;
        height: 32px;
        font-size: 0.8rem;
    }

    .search-navigation {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }

    .search-results-info {
        justify-content: center;
    }

    .search-nav-controls {
        justify-content: center;
    }

    .search-options-content {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .search-input {
        padding: 0.5rem 2.25rem 0.5rem 2rem;
        font-size: 0.85rem;
    }

    .search-icon {
        left: 0.6rem;
        font-size: 0.8rem;
    }

    .search-clear-btn {
        right: 0.4rem;
        font-size: 0.7rem;
    }
}

@media (max-width: 480px) {
    .search-header {
        padding: 0.5rem;
    }

    .search-input {
        padding: 0.45rem 2rem 0.45rem 1.75rem;
        font-size: 0.8rem;
    }

    .search-icon {
        left: 0.5rem;
        font-size: 0.75rem;
    }

    .search-clear-btn {
        right: 0.3rem;
        font-size: 0.65rem;
    }

    .search-control-btn {
        width: 28px;
        height: 28px;
        font-size: 0.75rem;
    }

    .search-nav-btn {
        width: 24px;
        height: 24px;
        font-size: 0.65rem;
    }

    .search-results-info {
        font-size: 0.8rem;
    }

    .search-option-group h6 {
        font-size: 0.8rem;
    }

    .search-checkbox span,
    .search-filter-input,
    .search-filter-select {
        font-size: 0.75rem;
    }

    .search-history-item {
        font-size: 0.75rem;
        padding: 0.4rem 0.75rem;
    }
}

/* Dark/Light Theme Support */
.light-theme .chat-search-container {
    background: #ffffff;
    border-color: #dee2e6;
}

.light-theme .search-header {
    border-bottom-color: #dee2e6;
}

.light-theme .search-input {
    background: #ffffff;
    border-color: #ced4da;
    color: #495057;
}

.light-theme .search-input::placeholder {
    color: #6c757d;
}

.light-theme .search-control-btn,
.light-theme .search-nav-btn {
    border-color: #ced4da;
    color: #6c757d;
}

.light-theme .search-control-btn:hover,
.light-theme .search-nav-btn:hover:not(:disabled) {
    background: #f8f9fa;
    color: #212529;
    border-color: var(--chat-primary, #FF0000);
}

.light-theme .search-options-panel,
.light-theme .search-history-panel {
    background: #f8f9fa;
    border-top-color: #dee2e6;
}

.light-theme .search-filter-input,
.light-theme .search-filter-select {
    background: #ffffff;
    border-color: #ced4da;
    color: #495057;
}

.light-theme .search-history-item {
    color: #6c757d;
}

.light-theme .search-history-item:hover {
    background: #ffffff;
    color: #212529;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
    .search-highlight {
        border: 1px solid currentColor;
    }

    .search-current-result {
        border-width: 2px !important;
    }

    .search-control-btn,
    .search-nav-btn {
        border-width: 2px;
    }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
    .search-current-result {
        animation: none;
    }

    .search-control-btn,
    .search-nav-btn,
    .search-clear-btn,
    .search-history-clear,
    .search-history-item {
        transition: none;
    }
}

/* Print Styles */
@media print {
    .chat-search-container {
        display: none !important;
    }

    .search-highlight {
        background: transparent !important;
        color: inherit !important;
        border: 1px solid #000 !important;
    }
}

/* Focus Styles for Accessibility */
.search-input:focus {
    box-shadow: 0 0 0 2px var(--chat-primary, #FF0000);
}

.search-control-btn:focus,
.search-nav-btn:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

.search-checkbox input:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: 2px;
}

.search-filter-input:focus,
.search-filter-select:focus {
    box-shadow: 0 0 0 2px var(--chat-primary, #FF0000);
}

.search-history-item:focus {
    outline: 2px solid var(--chat-primary, #FF0000);
    outline-offset: -2px;
}

/* Scrollbar Styles */
.search-options-panel::-webkit-scrollbar,
.search-history-panel::-webkit-scrollbar {
    width: 6px;
}

.search-options-panel::-webkit-scrollbar-track,
.search-history-panel::-webkit-scrollbar-track {
    background: var(--chat-bg, #1a1a1a);
}

.search-options-panel::-webkit-scrollbar-thumb,
.search-history-panel::-webkit-scrollbar-thumb {
    background: var(--chat-border, #444);
    border-radius: 3px;
}

/* Animation for search results */
@keyframes search-result-appear {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.search-navigation {
    animation: search-result-appear 0.3s ease-out;
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = searchStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Global reference for onclick handlers
let chatSearch = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatSearchInterface;
} else if (typeof window !== 'undefined') {
    window.ChatSearchInterface = ChatSearchInterface;
}
