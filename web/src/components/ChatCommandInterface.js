/**
 * Chat Command Interface
 * Provides command autocomplete, help, and management features
 */
class ChatCommandInterface {
    constructor(options = {}) {
        this.chatInput = options.chatInput;
        this.websocket = options.websocket || null;
        this.userRole = options.userRole || 'guest';
        this.onCommandExecuted = options.onCommandExecuted || (() => {});
        
        this.availableCommands = [];
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isAutocompleteVisible = false;
        this.currentSuggestions = [];
        
        this.init();
    }
    
    init() {
        if (!this.chatInput) {
            console.warn('Chat input element not provided');
            return;
        }
        
        this.createAutocompleteContainer();
        this.attachEventListeners();
        this.loadAvailableCommands();
    }
    
    createAutocompleteContainer() {
        // Create autocomplete dropdown
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.className = 'command-autocomplete';
        this.autocompleteContainer.style.display = 'none';
        
        // Position relative to chat input
        const inputRect = this.chatInput.getBoundingClientRect();
        this.autocompleteContainer.style.position = 'absolute';
        this.autocompleteContainer.style.width = this.chatInput.offsetWidth + 'px';
        this.autocompleteContainer.style.maxHeight = '200px';
        this.autocompleteContainer.style.overflowY = 'auto';
        this.autocompleteContainer.style.zIndex = '1000';
        
        // Insert after chat input
        this.chatInput.parentNode.insertBefore(this.autocompleteContainer, this.chatInput.nextSibling);
    }
    
    attachEventListeners() {
        // Input event for autocomplete
        this.chatInput.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        // Keydown for navigation and command execution
        this.chatInput.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Focus events
        this.chatInput.addEventListener('focus', () => {
            this.handleFocus();
        });
        
        this.chatInput.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                this.hideAutocomplete();
            }, 150);
        });
        
        // WebSocket message handlers
        if (this.websocket) {
            this.websocket.addEventListener('message', (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            });
        }
    }
    
    handleInput(e) {
        const value = e.target.value;
        
        if (value.startsWith('/')) {
            this.showCommandAutocomplete(value);
        } else {
            this.hideAutocomplete();
        }
    }
    
    handleKeydown(e) {
        const value = this.chatInput.value;
        
        switch (e.key) {
            case 'Enter':
                if (this.isAutocompleteVisible && this.currentSuggestions.length > 0) {
                    e.preventDefault();
                    this.selectSuggestion(0);
                } else if (value.startsWith('/')) {
                    e.preventDefault();
                    this.executeCommand(value);
                }
                break;
                
            case 'Tab':
                if (this.isAutocompleteVisible && this.currentSuggestions.length > 0) {
                    e.preventDefault();
                    this.selectSuggestion(0);
                }
                break;
                
            case 'ArrowUp':
                if (this.isAutocompleteVisible) {
                    e.preventDefault();
                    this.navigateAutocomplete(-1);
                } else {
                    e.preventDefault();
                    this.navigateHistory(-1);
                }
                break;
                
            case 'ArrowDown':
                if (this.isAutocompleteVisible) {
                    e.preventDefault();
                    this.navigateAutocomplete(1);
                } else {
                    e.preventDefault();
                    this.navigateHistory(1);
                }
                break;
                
            case 'Escape':
                this.hideAutocomplete();
                break;
                
            case 'F1':
                if (value.startsWith('/')) {
                    e.preventDefault();
                    this.showCommandHelp(value);
                }
                break;
        }
    }
    
    handleFocus() {
        const value = this.chatInput.value;
        if (value.startsWith('/')) {
            this.showCommandAutocomplete(value);
        }
    }
    
    showCommandAutocomplete(input) {
        const commandPart = input.substring(1).toLowerCase();
        
        // Filter commands based on input
        this.currentSuggestions = this.availableCommands.filter(command => {
            return command.name.toLowerCase().startsWith(commandPart) ||
                   (command.aliases && command.aliases.some(alias => alias.toLowerCase().startsWith(commandPart)));
        });
        
        if (this.currentSuggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        // Build autocomplete HTML
        let html = '';
        this.currentSuggestions.forEach((command, index) => {
            const isActive = index === 0 ? 'active' : '';
            html += `
                <div class="command-suggestion ${isActive}" data-index="${index}">
                    <div class="command-name">/${command.name}</div>
                    <div class="command-description">${command.description}</div>
                    <div class="command-usage">${command.usage}</div>
                </div>
            `;
        });
        
        this.autocompleteContainer.innerHTML = html;
        this.autocompleteContainer.style.display = 'block';
        this.isAutocompleteVisible = true;
        
        // Add click handlers
        this.autocompleteContainer.querySelectorAll('.command-suggestion').forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectSuggestion(index);
            });
        });
    }
    
    hideAutocomplete() {
        this.autocompleteContainer.style.display = 'none';
        this.isAutocompleteVisible = false;
        this.currentSuggestions = [];
    }
    
    navigateAutocomplete(direction) {
        const suggestions = this.autocompleteContainer.querySelectorAll('.command-suggestion');
        const currentActive = this.autocompleteContainer.querySelector('.command-suggestion.active');
        
        if (!currentActive) return;
        
        const currentIndex = parseInt(currentActive.dataset.index);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = suggestions.length - 1;
        if (newIndex >= suggestions.length) newIndex = 0;
        
        // Update active state
        currentActive.classList.remove('active');
        suggestions[newIndex].classList.add('active');
    }
    
    selectSuggestion(index) {
        if (index >= this.currentSuggestions.length) return;
        
        const command = this.currentSuggestions[index];
        this.chatInput.value = `/${command.name} `;
        this.chatInput.focus();
        this.hideAutocomplete();
        
        // Position cursor at end
        this.chatInput.setSelectionRange(this.chatInput.value.length, this.chatInput.value.length);
    }
    
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < 0) {
            this.historyIndex = -1;
            this.chatInput.value = '';
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length - 1;
        }
        
        if (this.historyIndex >= 0) {
            this.chatInput.value = this.commandHistory[this.historyIndex];
        }
    }
    
    executeCommand(commandText) {
        // Add to history
        if (commandText.trim() && !this.commandHistory.includes(commandText)) {
            this.commandHistory.unshift(commandText);
            if (this.commandHistory.length > 50) {
                this.commandHistory.pop();
            }
        }
        this.historyIndex = -1;
        
        // Clear input
        this.chatInput.value = '';
        
        // Send command via WebSocket (this will be handled by the chat message handler)
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'message',
                message: commandText,
                room_id: this.getCurrentRoomId()
            }));
        }
        
        // Notify callback
        this.onCommandExecuted(commandText);
    }
    
    showCommandHelp(input) {
        const commandName = input.substring(1).split(' ')[0];
        const command = this.availableCommands.find(cmd => 
            cmd.name === commandName || (cmd.aliases && cmd.aliases.includes(commandName))
        );
        
        if (command) {
            this.displayCommandHelp(command);
        } else {
            this.displayGeneralHelp();
        }
    }
    
    displayCommandHelp(command) {
        const helpModal = this.createHelpModal();
        
        let helpContent = `
            <div class="command-help-content">
                <h4>/${command.name}</h4>
                <p class="command-description">${command.description}</p>
                
                <div class="help-section">
                    <h5>Usage</h5>
                    <code>${command.usage}</code>
                </div>
        `;
        
        if (command.examples && command.examples.length > 0) {
            helpContent += `
                <div class="help-section">
                    <h5>Examples</h5>
                    ${command.examples.map(example => `<code>${example}</code>`).join('<br>')}
                </div>
            `;
        }
        
        if (command.aliases && command.aliases.length > 0) {
            helpContent += `
                <div class="help-section">
                    <h5>Aliases</h5>
                    <p>${command.aliases.map(alias => `/${alias}`).join(', ')}</p>
                </div>
            `;
        }
        
        helpContent += '</div>';
        
        helpModal.querySelector('.modal-body').innerHTML = helpContent;
        helpModal.style.display = 'block';
    }
    
    displayGeneralHelp() {
        const helpModal = this.createHelpModal();
        
        // Group commands by category
        const commandsByCategory = {};
        this.availableCommands.forEach(command => {
            if (!commandsByCategory[command.category]) {
                commandsByCategory[command.category] = [];
            }
            commandsByCategory[command.category].push(command);
        });
        
        let helpContent = `
            <div class="command-help-content">
                <h4>Available Commands</h4>
                <p>Commands available for your role: <strong>${this.userRole}</strong></p>
        `;
        
        Object.keys(commandsByCategory).forEach(category => {
            helpContent += `
                <div class="help-section">
                    <h5>${category.charAt(0).toUpperCase() + category.slice(1)} Commands</h5>
                    <div class="command-list">
            `;
            
            commandsByCategory[category].forEach(command => {
                helpContent += `
                    <div class="command-item">
                        <strong>/${command.name}</strong> - ${command.description}
                    </div>
                `;
            });
            
            helpContent += '</div></div>';
        });
        
        helpContent += `
                <div class="help-section">
                    <h5>Tips</h5>
                    <ul>
                        <li>Type <code>/</code> to see command suggestions</li>
                        <li>Use <kbd>Tab</kbd> or <kbd>Enter</kbd> to autocomplete</li>
                        <li>Press <kbd>F1</kbd> while typing a command for specific help</li>
                        <li>Use <kbd>↑</kbd> and <kbd>↓</kbd> arrows to navigate command history</li>
                    </ul>
                </div>
            </div>
        `;
        
        helpModal.querySelector('.modal-body').innerHTML = helpContent;
        helpModal.style.display = 'block';
    }
    
    createHelpModal() {
        let modal = document.getElementById('command-help-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'command-help-modal';
            modal.className = 'command-help-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Command Help</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add close handlers
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        return modal;
    }
    
    loadAvailableCommands() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_available_commands'
            }));
        } else {
            // Load default commands for demo
            this.availableCommands = [
                {
                    name: 'help',
                    description: 'Show available commands',
                    usage: '/help [command]',
                    category: 'information',
                    aliases: ['commands', '?']
                },
                {
                    name: 'me',
                    description: 'Send an action message',
                    usage: '/me <action>',
                    category: 'engagement',
                    aliases: ['action']
                }
            ];
            
            // Add moderation commands if user has permissions
            if (['admin', 'moderator', 'host'].includes(this.userRole)) {
                this.availableCommands.push(
                    {
                        name: 'mute',
                        description: 'Mute a user',
                        usage: '/mute <username> [duration] [reason]',
                        category: 'moderation',
                        aliases: ['silence', 'quiet']
                    },
                    {
                        name: 'kick',
                        description: 'Remove a user from chat',
                        usage: '/kick <username> [reason]',
                        category: 'moderation',
                        aliases: ['remove']
                    },
                    {
                        name: 'warn',
                        description: 'Issue a warning',
                        usage: '/warn <username> <reason>',
                        category: 'moderation',
                        aliases: ['warning']
                    }
                );
            }
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'available_commands':
                this.availableCommands = data.commands;
                break;
                
            case 'command_result':
                this.handleCommandResult(data);
                break;
        }
    }
    
    handleCommandResult(data) {
        // Display command result in chat or as notification
        if (data.success) {
            this.showCommandSuccess(data.message);
        } else {
            this.showCommandError(data.error || 'Command failed');
        }
    }
    
    showCommandSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showCommandError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `command-notification notification-${type}`;
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
    
    getCurrentRoomId() {
        // This should be provided by the parent chat component
        return 'default_room';
    }
    
    // Update WebSocket connection
    setWebSocket(websocket) {
        this.websocket = websocket;
        this.loadAvailableCommands();
    }
    
    // Update user role
    setUserRole(role) {
        this.userRole = role;
        this.loadAvailableCommands();
    }
    
    // Get command statistics (for admin/moderator)
    getCommandStatistics(days = 7) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'get_command_statistics',
                days: days
            }));
        }
    }
    
    // Destroy component
    destroy() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.remove();
        }
        
        const modal = document.getElementById('command-help-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// CSS Styles for Chat Command Interface
const commandInterfaceStyles = `
<style>
.command-autocomplete {
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    margin-top: 4px;
}

.command-suggestion {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color, #444);
    cursor: pointer;
    transition: background 0.2s ease;
}

.command-suggestion:last-child {
    border-bottom: none;
}

.command-suggestion:hover,
.command-suggestion.active {
    background: var(--primary-color, #FF0000);
    color: white;
}

.command-name {
    font-weight: bold;
    font-family: monospace;
    color: var(--primary-color, #FF0000);
    margin-bottom: 0.25rem;
}

.command-suggestion:hover .command-name,
.command-suggestion.active .command-name {
    color: white;
}

.command-description {
    color: var(--text-light, #ffffff);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
}

.command-usage {
    color: var(--text-muted, #cccccc);
    font-size: 0.8rem;
    font-family: monospace;
}

.command-help-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.command-help-modal .modal-content {
    background: var(--card-dark, #2a2a2a);
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--border-color, #444);
}

.command-help-modal .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, #444);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.command-help-modal .modal-header h3 {
    margin: 0;
    color: var(--primary-color, #FF0000);
}

.command-help-modal .close-modal {
    background: none;
    border: none;
    color: var(--text-light, #ffffff);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s ease;
}

.command-help-modal .close-modal:hover {
    background: rgba(255, 255, 255, 0.1);
}

.command-help-modal .modal-body {
    padding: 1.5rem;
}

.command-help-content h4 {
    color: var(--primary-color, #FF0000);
    margin-bottom: 1rem;
    font-family: monospace;
}

.command-help-content .command-description {
    color: var(--text-light, #ffffff);
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
}

.help-section {
    margin-bottom: 1.5rem;
}

.help-section h5 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color, #444);
    padding-bottom: 0.5rem;
}

.help-section code {
    background: var(--input-dark, #3a3a3a);
    color: var(--text-light, #ffffff);
    padding: 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    display: block;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color, #444);
}

.help-section p {
    color: var(--text-muted, #cccccc);
    margin-bottom: 0.5rem;
}

.command-list {
    display: grid;
    gap: 0.5rem;
}

.command-item {
    background: var(--input-dark, #3a3a3a);
    padding: 0.75rem;
    border-radius: 6px;
    border: 1px solid var(--border-color, #444);
}

.command-item strong {
    color: var(--primary-color, #FF0000);
    font-family: monospace;
}

.help-section ul {
    color: var(--text-muted, #cccccc);
    padding-left: 1.5rem;
}

.help-section li {
    margin-bottom: 0.5rem;
}

.help-section kbd {
    background: var(--bg-dark, #1a1a1a);
    color: var(--text-light, #ffffff);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.8rem;
    border: 1px solid var(--border-color, #444);
}

.command-notification {
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
    max-width: 300px;
}

.command-notification.show {
    transform: translateX(0);
}

.notification-success {
    background: #28a745;
    border: 1px solid #1e7e34;
}

.notification-error {
    background: #dc3545;
    border: 1px solid #c82333;
}

.notification-info {
    background: #17a2b8;
    border: 1px solid #138496;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .command-help-modal .modal-content {
        width: 95%;
        margin: 1rem;
    }

    .command-help-modal .modal-header,
    .command-help-modal .modal-body {
        padding: 1rem;
    }

    .command-autocomplete {
        font-size: 0.9rem;
    }

    .command-suggestion {
        padding: 0.5rem;
    }

    .command-notification {
        right: 10px;
        left: 10px;
        max-width: none;
        transform: translateY(-100%);
    }

    .command-notification.show {
        transform: translateY(0);
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = commandInterfaceStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatCommandInterface;
} else if (typeof window !== 'undefined') {
    window.ChatCommandInterface = ChatCommandInterface;
}
