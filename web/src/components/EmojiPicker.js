/**
 * Emoji Picker Component
 * Interactive emoji selection interface with categories, search, and reactions
 */
class EmojiPicker {
    constructor(options = {}) {
        this.container = options.container;
        this.onEmojiSelect = options.onEmojiSelect || (() => {});
        this.onReactionSelect = options.onReactionSelect || (() => {});
        this.websocket = options.websocket || null;
        this.currentRoom = options.currentRoom || null;
        
        this.isVisible = false;
        this.currentCategory = 'popular';
        this.searchQuery = '';
        this.emojiData = {};
        this.popularEmojis = [];
        
        this.init();
    }
    
    init() {
        this.createPickerHTML();
        this.attachEventListeners();
        this.loadEmojiData();
    }
    
    createPickerHTML() {
        const pickerHTML = `
            <div class="emoji-picker" id="emoji-picker" style="display: none;">
                <div class="emoji-picker-header">
                    <div class="emoji-search-container">
                        <input type="text" id="emoji-search" placeholder="Search emojis..." class="emoji-search">
                        <i class="fas fa-search emoji-search-icon"></i>
                    </div>
                    <button class="emoji-picker-close" id="emoji-picker-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="emoji-categories">
                    <button class="emoji-category-btn active" data-category="popular">
                        <i class="fas fa-fire"></i>
                        <span>Popular</span>
                    </button>
                    <button class="emoji-category-btn" data-category="smileys">
                        <i class="fas fa-smile"></i>
                        <span>Smileys</span>
                    </button>
                    <button class="emoji-category-btn" data-category="emotions">
                        <i class="fas fa-heart"></i>
                        <span>Emotions</span>
                    </button>
                    <button class="emoji-category-btn" data-category="gestures">
                        <i class="fas fa-hand-paper"></i>
                        <span>Gestures</span>
                    </button>
                    <button class="emoji-category-btn" data-category="hearts">
                        <i class="fas fa-heart"></i>
                        <span>Hearts</span>
                    </button>
                    <button class="emoji-category-btn" data-category="objects">
                        <i class="fas fa-star"></i>
                        <span>Objects</span>
                    </button>
                </div>
                
                <div class="emoji-content">
                    <div class="emoji-grid" id="emoji-grid">
                        <div class="emoji-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading emojis...</span>
                        </div>
                    </div>
                </div>
                
                <div class="emoji-picker-footer">
                    <div class="emoji-info" id="emoji-info">
                        <span class="emoji-preview"></span>
                        <span class="emoji-name">Hover over an emoji to see its name</span>
                    </div>
                </div>
            </div>
        `;
        
        if (this.container) {
            this.container.innerHTML = pickerHTML;
        } else {
            document.body.insertAdjacentHTML('beforeend', pickerHTML);
        }
        
        this.pickerElement = document.getElementById('emoji-picker');
        this.gridElement = document.getElementById('emoji-grid');
        this.searchInput = document.getElementById('emoji-search');
        this.infoElement = document.getElementById('emoji-info');
    }
    
    attachEventListeners() {
        // Close button
        document.getElementById('emoji-picker-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Category buttons
        document.querySelectorAll('.emoji-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.selectCategory(category);
            });
        });
        
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.debounceSearch();
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.pickerElement.contains(e.target) && !e.target.closest('.emoji-trigger')) {
                this.hide();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isVisible) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'Enter' && this.searchInput === document.activeElement) {
                    this.performSearch();
                }
            }
        });
    }
    
    loadEmojiData() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Request emoji categories
            this.websocket.send(JSON.stringify({
                type: 'get_emojis',
                requestType: 'categories'
            }));
            
            // Request popular emojis
            this.websocket.send(JSON.stringify({
                type: 'get_emojis',
                requestType: 'popular',
                limit: 30
            }));
        } else {
            // Fallback to default emojis
            this.loadDefaultEmojis();
        }
    }
    
    loadDefaultEmojis() {
        this.emojiData = {
            popular: ['😀', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥', '⭐', '✨', '💯', '👏', '🙌', '🤔', '😍', '😘', '😊', '😎'],
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '😍', '🤩', '😘', '😗', '😚', '😙', '😋'],
            emotions: ['😢', '😭', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😓', '🤗', '🥺', '😖', '😣', '😞', '😟', '😕', '🙁', '☹️'],
            gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '👏'],
            hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
            objects: ['🔥', '⭐', '🌟', '✨', '🎉', '🎊', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💤', '👑', '🎯', '🎪', '🎭', '🎨']
        };
        
        this.popularEmojis = this.emojiData.popular;
        this.displayEmojis(this.popularEmojis);
    }
    
    selectCategory(category) {
        // Update active category button
        document.querySelectorAll('.emoji-category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.currentCategory = category;
        this.searchInput.value = '';
        this.searchQuery = '';
        
        if (category === 'popular') {
            this.displayEmojis(this.popularEmojis);
        } else if (this.emojiData[category]) {
            this.displayEmojis(this.emojiData[category]);
        } else {
            // Request category data from server
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'get_emojis',
                    requestType: 'categories'
                }));
            }
        }
    }
    
    displayEmojis(emojis) {
        if (!Array.isArray(emojis)) {
            // Handle emoji object format
            const emojiArray = [];
            for (const [emoji, data] of Object.entries(emojis)) {
                emojiArray.push({
                    emoji: emoji,
                    name: data.name || emoji,
                    shortcode: data.shortcode || ''
                });
            }
            emojis = emojiArray;
        }
        
        const emojiHTML = emojis.map(emojiData => {
            const emoji = typeof emojiData === 'string' ? emojiData : emojiData.emoji;
            const name = typeof emojiData === 'object' ? emojiData.name : emoji;
            const shortcode = typeof emojiData === 'object' ? emojiData.shortcode : '';
            
            return `
                <button class="emoji-btn" 
                        data-emoji="${emoji}" 
                        data-name="${name}"
                        data-shortcode="${shortcode}"
                        title="${name}">
                    ${emoji}
                </button>
            `;
        }).join('');
        
        this.gridElement.innerHTML = emojiHTML;
        
        // Attach click listeners to emoji buttons
        this.gridElement.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emoji = e.currentTarget.dataset.emoji;
                const name = e.currentTarget.dataset.name;
                this.selectEmoji(emoji, name);
            });
            
            btn.addEventListener('mouseenter', (e) => {
                const emoji = e.currentTarget.dataset.emoji;
                const name = e.currentTarget.dataset.name;
                this.showEmojiInfo(emoji, name);
            });
        });
    }
    
    selectEmoji(emoji, name) {
        this.onEmojiSelect(emoji, name);
        this.hide();
    }
    
    showEmojiInfo(emoji, name) {
        const preview = this.infoElement.querySelector('.emoji-preview');
        const nameSpan = this.infoElement.querySelector('.emoji-name');
        
        preview.textContent = emoji;
        nameSpan.textContent = name || emoji;
    }
    
    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }
    
    performSearch() {
        if (this.searchQuery.trim() === '') {
            this.selectCategory(this.currentCategory);
            return;
        }
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_emojis',
                requestType: 'search',
                query: this.searchQuery,
                limit: 50
            }));
        } else {
            // Fallback local search
            this.performLocalSearch();
        }
    }
    
    performLocalSearch() {
        const query = this.searchQuery.toLowerCase();
        const results = [];
        
        for (const [category, emojis] of Object.entries(this.emojiData)) {
            if (Array.isArray(emojis)) {
                results.push(...emojis.filter(emoji => 
                    emoji.toLowerCase().includes(query)
                ));
            } else {
                for (const [emoji, data] of Object.entries(emojis)) {
                    const name = (data.name || '').toLowerCase();
                    const keywords = (data.keywords || []).join(' ').toLowerCase();
                    
                    if (name.includes(query) || keywords.includes(query)) {
                        results.push({
                            emoji: emoji,
                            name: data.name,
                            shortcode: data.shortcode
                        });
                    }
                }
            }
        }
        
        this.displayEmojis(results.slice(0, 50));
    }
    
    show(position = null) {
        this.isVisible = true;
        this.pickerElement.style.display = 'block';
        
        if (position) {
            this.pickerElement.style.position = 'absolute';
            this.pickerElement.style.left = position.x + 'px';
            this.pickerElement.style.top = position.y + 'px';
        }
        
        // Focus search input
        setTimeout(() => {
            this.searchInput.focus();
        }, 100);
        
        // Load fresh popular emojis
        this.loadEmojiData();
    }
    
    hide() {
        this.isVisible = false;
        this.pickerElement.style.display = 'none';
        this.searchInput.value = '';
        this.searchQuery = '';
    }
    
    toggle(position = null) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(position);
        }
    }
    
    // Handle WebSocket emoji data responses
    handleEmojiData(data) {
        switch (data.requestType) {
            case 'categories':
                this.emojiData = { ...this.emojiData, ...data.data };
                if (this.currentCategory !== 'popular' && this.emojiData[this.currentCategory]) {
                    this.displayEmojis(this.emojiData[this.currentCategory]);
                }
                break;
                
            case 'popular':
                this.popularEmojis = data.data;
                if (this.currentCategory === 'popular') {
                    this.displayEmojis(this.popularEmojis);
                }
                break;
                
            case 'search':
                this.displayEmojis(data.data);
                break;
        }
    }
    
    // Add reaction to message
    addReaction(messageId, emoji) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'reaction',
                messageId: messageId,
                emoji: emoji
            }));
        }
        
        this.onReactionSelect(messageId, emoji);
    }
    
    // Update WebSocket connection
    setWebSocket(websocket) {
        this.websocket = websocket;
    }
    
    // Update current room
    setCurrentRoom(roomId) {
        this.currentRoom = roomId;
    }
    
    // Destroy picker
    destroy() {
        if (this.pickerElement) {
            this.pickerElement.remove();
        }
        clearTimeout(this.searchTimeout);
    }
}

// Add CSS styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('emoji-picker-styles')) {
    const styles = `
        <style id="emoji-picker-styles">
            .emoji-picker {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 350px;
                height: 400px;
                background: var(--card-dark, #2a2a2a);
                border: 1px solid #444;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .emoji-picker-header {
                display: flex;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid #444;
                gap: 1rem;
            }

            .emoji-search-container {
                flex: 1;
                position: relative;
            }

            .emoji-search {
                width: 100%;
                padding: 0.5rem 2rem 0.5rem 0.75rem;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid #555;
                border-radius: 6px;
                color: var(--text-light, #ffffff);
                font-size: 0.9rem;
            }

            .emoji-search:focus {
                outline: none;
                border-color: var(--primary-color, #FF0000);
            }

            .emoji-search-icon {
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                color: #888;
                pointer-events: none;
            }

            .emoji-picker-close {
                background: none;
                border: none;
                color: #888;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: color 0.2s ease;
            }

            .emoji-picker-close:hover {
                color: var(--text-light, #ffffff);
            }

            .emoji-categories {
                display: flex;
                border-bottom: 1px solid #444;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
            }

            .emoji-categories::-webkit-scrollbar {
                display: none;
            }

            .emoji-category-btn {
                flex: 1;
                min-width: 60px;
                padding: 0.75rem 0.5rem;
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.25rem;
                font-size: 0.75rem;
                border-bottom: 2px solid transparent;
            }

            .emoji-category-btn:hover {
                color: var(--text-light, #ffffff);
                background: rgba(255, 255, 255, 0.05);
            }

            .emoji-category-btn.active {
                color: var(--primary-color, #FF0000);
                border-bottom-color: var(--primary-color, #FF0000);
            }

            .emoji-category-btn i {
                font-size: 1rem;
            }

            .emoji-content {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .emoji-grid {
                flex: 1;
                padding: 1rem;
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 0.5rem;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #555 transparent;
            }

            .emoji-grid::-webkit-scrollbar {
                width: 6px;
            }

            .emoji-grid::-webkit-scrollbar-track {
                background: transparent;
            }

            .emoji-grid::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 3px;
            }

            .emoji-btn {
                aspect-ratio: 1;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .emoji-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(1.1);
            }

            .emoji-loading {
                grid-column: 1 / -1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1rem;
                color: #888;
                padding: 2rem;
            }

            .emoji-loading i {
                font-size: 2rem;
            }

            .emoji-picker-footer {
                padding: 0.75rem 1rem;
                border-top: 1px solid #444;
                background: rgba(0, 0, 0, 0.2);
            }

            .emoji-info {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: var(--text-light, #ffffff);
            }

            .emoji-preview {
                font-size: 1.5rem;
                min-width: 1.5rem;
                text-align: center;
            }

            .emoji-name {
                font-size: 0.9rem;
                color: #ccc;
            }

            /* Reaction button styles */
            .message-reactions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.25rem;
                margin-top: 0.5rem;
            }

            .reaction-btn {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #444;
                border-radius: 12px;
                color: var(--text-light, #ffffff);
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .reaction-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: #666;
            }

            .reaction-btn.user-reacted {
                background: rgba(255, 0, 0, 0.2);
                border-color: var(--primary-color, #FF0000);
                color: var(--primary-color, #FF0000);
            }

            .reaction-emoji {
                font-size: 1rem;
            }

            .reaction-count {
                font-weight: 500;
                min-width: 1rem;
                text-align: center;
            }

            .add-reaction-btn {
                padding: 0.25rem 0.5rem;
                background: none;
                border: 1px dashed #666;
                border-radius: 12px;
                color: #888;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 1rem;
            }

            .add-reaction-btn:hover {
                color: var(--text-light, #ffffff);
                border-color: #888;
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                .emoji-picker {
                    width: 90vw;
                    height: 70vh;
                    max-width: 350px;
                }

                .emoji-grid {
                    grid-template-columns: repeat(6, 1fr);
                }

                .emoji-category-btn span {
                    display: none;
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmojiPicker;
} else if (typeof window !== 'undefined') {
    window.EmojiPicker = EmojiPicker;
}
