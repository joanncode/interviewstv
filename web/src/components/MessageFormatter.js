/**
 * Message Formatter Component
 * Handles rich text formatting, preview, and formatting toolbar
 */
class MessageFormatter {
    constructor(options = {}) {
        this.textArea = options.textArea;
        this.previewContainer = options.previewContainer;
        this.toolbarContainer = options.toolbarContainer;
        this.websocket = options.websocket || null;
        this.onFormatChange = options.onFormatChange || (() => {});
        
        this.isPreviewMode = false;
        this.formattingHelp = null;
        
        this.init();
    }
    
    init() {
        this.createToolbar();
        this.attachEventListeners();
        this.loadFormattingHelp();
    }
    
    createToolbar() {
        if (!this.toolbarContainer) return;
        
        const toolbarHTML = `
            <div class="formatting-toolbar">
                <div class="formatting-buttons">
                    <button type="button" class="format-btn" data-format="bold" title="Bold (**text**)">
                        <i class="fas fa-bold"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="italic" title="Italic (*text*)">
                        <i class="fas fa-italic"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="underline" title="Underline (__text__)">
                        <i class="fas fa-underline"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="strikethrough" title="Strikethrough (~~text~~)">
                        <i class="fas fa-strikethrough"></i>
                    </button>
                    <div class="toolbar-separator"></div>
                    <button type="button" class="format-btn" data-format="code" title="Inline Code (`code`)">
                        <i class="fas fa-code"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="code_block" title="Code Block (```code```)">
                        <i class="fas fa-file-code"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="quote" title="Quote (> text)">
                        <i class="fas fa-quote-left"></i>
                    </button>
                    <div class="toolbar-separator"></div>
                    <button type="button" class="format-btn" data-format="link" title="Add Link">
                        <i class="fas fa-link"></i>
                    </button>
                    <button type="button" class="format-btn" data-format="mention" title="Mention (@user)">
                        <i class="fas fa-at"></i>
                    </button>
                </div>
                <div class="formatting-controls">
                    <button type="button" class="control-btn" id="preview-toggle" title="Toggle Preview">
                        <i class="fas fa-eye"></i>
                        <span>Preview</span>
                    </button>
                    <button type="button" class="control-btn" id="formatting-help" title="Formatting Help">
                        <i class="fas fa-question-circle"></i>
                        <span>Help</span>
                    </button>
                </div>
            </div>
        `;
        
        this.toolbarContainer.innerHTML = toolbarHTML;
    }
    
    attachEventListeners() {
        // Format buttons
        if (this.toolbarContainer) {
            this.toolbarContainer.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const format = e.currentTarget.dataset.format;
                    this.applyFormatting(format);
                });
            });
            
            // Preview toggle
            const previewToggle = this.toolbarContainer.querySelector('#preview-toggle');
            if (previewToggle) {
                previewToggle.addEventListener('click', () => {
                    this.togglePreview();
                });
            }
            
            // Help button
            const helpBtn = this.toolbarContainer.querySelector('#formatting-help');
            if (helpBtn) {
                helpBtn.addEventListener('click', () => {
                    this.showFormattingHelp();
                });
            }
        }
        
        // Text area events
        if (this.textArea) {
            this.textArea.addEventListener('input', () => {
                this.updatePreview();
                this.onFormatChange(this.textArea.value);
            });
            
            this.textArea.addEventListener('keydown', (e) => {
                this.handleKeyboardShortcuts(e);
            });
            
            this.textArea.addEventListener('paste', (e) => {
                setTimeout(() => this.updatePreview(), 10);
            });
        }
    }
    
    applyFormatting(format) {
        if (!this.textArea) return;
        
        const start = this.textArea.selectionStart;
        const end = this.textArea.selectionEnd;
        const selectedText = this.textArea.value.substring(start, end);
        const beforeText = this.textArea.value.substring(0, start);
        const afterText = this.textArea.value.substring(end);
        
        let formattedText = '';
        let cursorOffset = 0;
        
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'underline':
                formattedText = `__${selectedText}__`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'code':
                formattedText = `\`${selectedText}\``;
                cursorOffset = selectedText ? 0 : 1;
                break;
            case 'code_block':
                formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
                cursorOffset = selectedText ? 0 : 4;
                break;
            case 'quote':
                const lines = selectedText.split('\n');
                formattedText = lines.map(line => `> ${line}`).join('\n');
                cursorOffset = selectedText ? 0 : 2;
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    const linkText = selectedText || 'Link Text';
                    formattedText = `[${linkText}](${url})`;
                }
                break;
            case 'mention':
                const username = prompt('Enter username:');
                if (username) {
                    formattedText = `@${username}`;
                }
                break;
            default:
                return;
        }
        
        if (formattedText) {
            this.textArea.value = beforeText + formattedText + afterText;
            
            // Set cursor position
            const newCursorPos = start + formattedText.length - cursorOffset;
            this.textArea.setSelectionRange(newCursorPos, newCursorPos);
            this.textArea.focus();
            
            this.updatePreview();
            this.onFormatChange(this.textArea.value);
        }
    }
    
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    this.applyFormatting('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.applyFormatting('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.applyFormatting('underline');
                    break;
                case 'k':
                    e.preventDefault();
                    this.applyFormatting('link');
                    break;
                case 'Enter':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.togglePreview();
                    }
                    break;
            }
        }
    }
    
    updatePreview() {
        if (!this.previewContainer || !this.isPreviewMode) return;
        
        const text = this.textArea.value;
        const formattedText = this.parseMarkdown(text);
        
        this.previewContainer.innerHTML = formattedText || '<em class="text-muted">Preview will appear here...</em>';
    }
    
    parseMarkdown(text) {
        if (!text.trim()) return '';
        
        let html = text;
        
        // Escape HTML first
        html = html.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
        
        // Apply formatting rules
        const rules = [
            // Code blocks (must be first)
            { pattern: /```([\s\S]*?)```/g, replacement: '<pre><code>$1</code></pre>' },
            // Inline code
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },
            // Bold
            { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            // Italic
            { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
            // Underline
            { pattern: /__(.*?)__/g, replacement: '<u>$1</u>' },
            // Strikethrough
            { pattern: /~~(.*?)~~/g, replacement: '<span class="strikethrough">$1</span>' },
            // Quotes
            { pattern: /^> (.+)$/gm, replacement: '<blockquote>$1</blockquote>' },
            // Links
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener">$1</a>' },
            // Mentions
            { pattern: /@([a-zA-Z0-9_]+)/g, replacement: '<span class="mention">@$1</span>' },
            // Line breaks
            { pattern: /\n/g, replacement: '<br>' }
        ];
        
        rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });
        
        return html;
    }
    
    togglePreview() {
        if (!this.previewContainer) return;
        
        this.isPreviewMode = !this.isPreviewMode;
        const previewToggle = this.toolbarContainer?.querySelector('#preview-toggle');
        
        if (this.isPreviewMode) {
            this.previewContainer.style.display = 'block';
            this.updatePreview();
            if (previewToggle) {
                previewToggle.classList.add('active');
                previewToggle.querySelector('span').textContent = 'Edit';
                previewToggle.querySelector('i').className = 'fas fa-edit';
            }
        } else {
            this.previewContainer.style.display = 'none';
            if (previewToggle) {
                previewToggle.classList.remove('active');
                previewToggle.querySelector('span').textContent = 'Preview';
                previewToggle.querySelector('i').className = 'fas fa-eye';
            }
        }
    }
    
    showFormattingHelp() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_formatting_help'
            }));
        } else {
            this.showLocalFormattingHelp();
        }
    }
    
    showLocalFormattingHelp() {
        const helpContent = `
            <div class="formatting-help-modal">
                <div class="help-header">
                    <h4>Message Formatting Guide</h4>
                    <button class="close-help">&times;</button>
                </div>
                <div class="help-content">
                    <div class="help-section">
                        <h5>Text Formatting</h5>
                        <div class="help-item">
                            <code>**bold text**</code> → <strong>bold text</strong>
                        </div>
                        <div class="help-item">
                            <code>*italic text*</code> → <em>italic text</em>
                        </div>
                        <div class="help-item">
                            <code>__underlined text__</code> → <u>underlined text</u>
                        </div>
                        <div class="help-item">
                            <code>~~strikethrough~~</code> → <span class="strikethrough">strikethrough</span>
                        </div>
                    </div>
                    <div class="help-section">
                        <h5>Code & Quotes</h5>
                        <div class="help-item">
                            <code>\`inline code\`</code> → <code>inline code</code>
                        </div>
                        <div class="help-item">
                            <code>\`\`\`code block\`\`\`</code> → Code block
                        </div>
                        <div class="help-item">
                            <code>> quoted text</code> → <blockquote>quoted text</blockquote>
                        </div>
                    </div>
                    <div class="help-section">
                        <h5>Links & Mentions</h5>
                        <div class="help-item">
                            <code>@username</code> → <span class="mention">@username</span>
                        </div>
                        <div class="help-item">
                            URLs are automatically linked
                        </div>
                    </div>
                    <div class="help-section">
                        <h5>Keyboard Shortcuts</h5>
                        <div class="help-item">
                            <kbd>Ctrl+B</kbd> → Bold
                        </div>
                        <div class="help-item">
                            <kbd>Ctrl+I</kbd> → Italic
                        </div>
                        <div class="help-item">
                            <kbd>Ctrl+U</kbd> → Underline
                        </div>
                        <div class="help-item">
                            <kbd>Ctrl+K</kbd> → Add Link
                        </div>
                        <div class="help-item">
                            <kbd>Ctrl+Shift+Enter</kbd> → Toggle Preview
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'formatting-help-overlay';
        overlay.innerHTML = helpContent;
        document.body.appendChild(overlay);
        
        // Close handlers
        const closeBtn = overlay.querySelector('.close-help');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }
    
    loadFormattingHelp() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_formatting_help'
            }));
        }
    }
    
    handleFormattingHelp(data) {
        this.formattingHelp = data;
    }
    
    // Utility methods
    insertText(text) {
        if (!this.textArea) return;
        
        const start = this.textArea.selectionStart;
        const end = this.textArea.selectionEnd;
        const beforeText = this.textArea.value.substring(0, start);
        const afterText = this.textArea.value.substring(end);
        
        this.textArea.value = beforeText + text + afterText;
        this.textArea.setSelectionRange(start + text.length, start + text.length);
        this.textArea.focus();
        
        this.updatePreview();
        this.onFormatChange(this.textArea.value);
    }
    
    getText() {
        return this.textArea ? this.textArea.value : '';
    }
    
    setText(text) {
        if (this.textArea) {
            this.textArea.value = text;
            this.updatePreview();
            this.onFormatChange(text);
        }
    }
    
    clear() {
        this.setText('');
    }
    
    focus() {
        if (this.textArea) {
            this.textArea.focus();
        }
    }
    
    // Update WebSocket connection
    setWebSocket(websocket) {
        this.websocket = websocket;
    }
    
    // Destroy component
    destroy() {
        // Remove event listeners and clean up
        if (this.toolbarContainer) {
            this.toolbarContainer.innerHTML = '';
        }
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
        }
    }
}

// Add CSS styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('message-formatter-styles')) {
    const styles = `
        <style id="message-formatter-styles">
            .formatting-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem;
                background: var(--input-dark, #3a3a3a);
                border: 1px solid #555;
                border-bottom: none;
                border-radius: 8px 8px 0 0;
                gap: 1rem;
            }

            .formatting-buttons {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .format-btn {
                background: none;
                border: 1px solid transparent;
                color: var(--text-light, #ffffff);
                padding: 0.375rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .format-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: #666;
            }

            .format-btn:active,
            .format-btn.active {
                background: var(--primary-color, #FF0000);
                border-color: var(--primary-color, #FF0000);
            }

            .toolbar-separator {
                width: 1px;
                height: 24px;
                background: #555;
                margin: 0 0.25rem;
            }

            .formatting-controls {
                display: flex;
                gap: 0.5rem;
            }

            .control-btn {
                background: none;
                border: 1px solid #666;
                color: var(--text-light, #ffffff);
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .control-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: #888;
            }

            .control-btn.active {
                background: var(--primary-color, #FF0000);
                border-color: var(--primary-color, #FF0000);
            }

            .message-preview {
                background: var(--card-dark, #2a2a2a);
                border: 1px solid #555;
                border-top: none;
                border-radius: 0 0 8px 8px;
                padding: 1rem;
                min-height: 100px;
                max-height: 200px;
                overflow-y: auto;
                display: none;
            }

            .message-preview strong {
                font-weight: bold;
            }

            .message-preview em {
                font-style: italic;
            }

            .message-preview u {
                text-decoration: underline;
            }

            .message-preview .strikethrough {
                text-decoration: line-through;
            }

            .message-preview code {
                background: rgba(255, 255, 255, 0.1);
                padding: 0.125rem 0.25rem;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }

            .message-preview pre {
                background: rgba(255, 255, 255, 0.1);
                padding: 0.75rem;
                border-radius: 6px;
                overflow-x: auto;
                margin: 0.5rem 0;
            }

            .message-preview pre code {
                background: none;
                padding: 0;
            }

            .message-preview blockquote {
                border-left: 3px solid var(--primary-color, #FF0000);
                padding-left: 1rem;
                margin: 0.5rem 0;
                font-style: italic;
                color: #ccc;
            }

            .message-preview .mention {
                color: var(--primary-color, #FF0000);
                font-weight: 500;
            }

            .message-preview a {
                color: #4dabf7;
                text-decoration: none;
            }

            .message-preview a:hover {
                text-decoration: underline;
            }

            .formatting-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }

            .formatting-help-modal {
                background: var(--card-dark, #2a2a2a);
                border-radius: 12px;
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }

            .help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #444;
            }

            .help-header h4 {
                margin: 0;
                color: var(--text-light, #ffffff);
            }

            .close-help {
                background: none;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .close-help:hover {
                color: var(--text-light, #ffffff);
                background: rgba(255, 255, 255, 0.1);
            }

            .help-content {
                padding: 1.5rem;
            }

            .help-section {
                margin-bottom: 2rem;
            }

            .help-section:last-child {
                margin-bottom: 0;
            }

            .help-section h5 {
                color: var(--primary-color, #FF0000);
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }

            .help-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 0.75rem;
                padding: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
            }

            .help-item code {
                background: rgba(255, 255, 255, 0.1);
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                min-width: 120px;
            }

            .help-item kbd {
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                padding: 0.25rem 0.5rem;
                font-family: 'Courier New', monospace;
                font-size: 0.8em;
                min-width: 80px;
                text-align: center;
            }

            /* Enhanced message display */
            .chat-message .message-content {
                line-height: 1.4;
            }

            .chat-message .message-content strong {
                font-weight: bold;
            }

            .chat-message .message-content em {
                font-style: italic;
            }

            .chat-message .message-content u {
                text-decoration: underline;
            }

            .chat-message .message-content .strikethrough {
                text-decoration: line-through;
                opacity: 0.7;
            }

            .chat-message .message-content code {
                background: rgba(255, 255, 255, 0.1);
                padding: 0.125rem 0.25rem;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }

            .chat-message .message-content pre {
                background: rgba(255, 255, 255, 0.1);
                padding: 0.75rem;
                border-radius: 6px;
                overflow-x: auto;
                margin: 0.5rem 0;
                border-left: 3px solid var(--primary-color, #FF0000);
            }

            .chat-message .message-content blockquote {
                border-left: 3px solid var(--primary-color, #FF0000);
                padding-left: 1rem;
                margin: 0.5rem 0;
                font-style: italic;
                color: #ccc;
            }

            .chat-message .message-content .mention {
                color: var(--primary-color, #FF0000);
                font-weight: 500;
                cursor: pointer;
            }

            .chat-message .message-content .mention:hover {
                text-decoration: underline;
            }

            .chat-message .message-content .message-link {
                color: #4dabf7;
                text-decoration: none;
            }

            .chat-message .message-content .message-link:hover {
                text-decoration: underline;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .formatting-toolbar {
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0.75rem;
                }

                .formatting-buttons {
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .formatting-controls {
                    width: 100%;
                    justify-content: center;
                }

                .formatting-help-modal {
                    margin: 1rem;
                    max-height: 90vh;
                }

                .help-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .help-item code,
                .help-item kbd {
                    min-width: auto;
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageFormatter;
} else if (typeof window !== 'undefined') {
    window.MessageFormatter = MessageFormatter;
}
