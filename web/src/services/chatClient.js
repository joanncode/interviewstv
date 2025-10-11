class ChatClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentRoom = null;
        this.user = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.heartbeatInterval = null;
        
        // Event listeners
        this.listeners = {
            connected: new Set(),
            disconnected: new Set(),
            authenticated: new Set(),
            message: new Set(),
            userJoined: new Set(),
            userLeft: new Set(),
            typing: new Set(),
            error: new Set(),
            roomJoined: new Set(),
            roomLeft: new Set()
        };
        
        // Message queue for when disconnected
        this.messageQueue = [];
        
        // Typing timeout
        this.typingTimeout = null;
        this.isTyping = false;
        
        this.init();
    }

    /**
     * Initialize chat client
     */
    init() {
        console.log('Chat client initialized');
    }

    /**
     * Connect to WebSocket server
     */
    connect(serverUrl = 'ws://localhost:8080') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Already connected to chat server');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                console.log(`Connecting to chat server: ${serverUrl}`);
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    console.log('Connected to chat server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    
                    this.startHeartbeat();
                    this.processMessageQueue();
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onclose = (event) => {
                    console.log('Disconnected from chat server', event);
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    this.stopHeartbeat();
                    this.emit('disconnected', { code: event.code, reason: event.reason });
                    
                    // Attempt reconnection if not a clean close
                    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', { type: 'connection', message: 'Connection error' });
                    reject(error);
                };

            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                this.emit('error', { type: 'connection', message: 'Failed to connect' });
                reject(error);
            }
        });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.stopHeartbeat();
        this.isConnected = false;
        this.isAuthenticated = false;
        this.currentRoom = null;
    }

    /**
     * Authenticate with server
     */
    authenticate(token) {
        if (!this.isConnected) {
            return Promise.reject(new Error('Not connected to server'));
        }

        return new Promise((resolve, reject) => {
            const authTimeout = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, 10000);

            const authHandler = (data) => {
                clearTimeout(authTimeout);
                this.removeListener('authenticated', authHandler);
                this.removeListener('error', errorHandler);
                
                if (data.success) {
                    resolve(data.user);
                } else {
                    reject(new Error(data.message || 'Authentication failed'));
                }
            };

            const errorHandler = (error) => {
                if (error.type === 'auth') {
                    clearTimeout(authTimeout);
                    this.removeListener('authenticated', authHandler);
                    this.removeListener('error', errorHandler);
                    reject(new Error(error.message));
                }
            };

            this.addListener('authenticated', authHandler);
            this.addListener('error', errorHandler);

            this.send({
                type: 'auth',
                token: token
            });
        });
    }

    /**
     * Join a chat room
     */
    joinRoom(roomId) {
        if (!this.isAuthenticated) {
            return Promise.reject(new Error('Not authenticated'));
        }

        return new Promise((resolve, reject) => {
            const joinTimeout = setTimeout(() => {
                reject(new Error('Join room timeout'));
            }, 10000);

            const joinHandler = (data) => {
                if (data.roomId === roomId) {
                    clearTimeout(joinTimeout);
                    this.removeListener('roomJoined', joinHandler);
                    this.removeListener('error', errorHandler);
                    resolve(data);
                }
            };

            const errorHandler = (error) => {
                if (error.type === 'room') {
                    clearTimeout(joinTimeout);
                    this.removeListener('roomJoined', joinHandler);
                    this.removeListener('error', errorHandler);
                    reject(new Error(error.message));
                }
            };

            this.addListener('roomJoined', joinHandler);
            this.addListener('error', errorHandler);

            this.send({
                type: 'join_room',
                roomId: roomId
            });
        });
    }

    /**
     * Leave current room
     */
    leaveRoom() {
        if (!this.currentRoom) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const leaveHandler = () => {
                this.removeListener('roomLeft', leaveHandler);
                resolve();
            };

            this.addListener('roomLeft', leaveHandler);

            this.send({
                type: 'leave_room'
            });
        });
    }

    /**
     * Send a chat message
     */
    sendMessage(message, messageType = 'text') {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        this.send({
            type: 'message',
            message: message,
            messageType: messageType
        });
    }

    /**
     * Send typing indicator
     */
    sendTyping(isTyping) {
        if (!this.currentRoom) {
            return;
        }

        // Debounce typing indicators
        if (isTyping && !this.isTyping) {
            this.isTyping = true;
            this.send({
                type: 'typing',
                isTyping: true
            });
        }

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set timeout to stop typing indicator
        this.typingTimeout = setTimeout(() => {
            if (this.isTyping) {
                this.isTyping = false;
                this.send({
                    type: 'typing',
                    isTyping: false
                });
            }
        }, 3000);
    }

    /**
     * Send message to server
     */
    send(data) {
        if (!this.isConnected || !this.ws) {
            // Queue message for later
            this.messageQueue.push(data);
            console.log('Message queued (not connected):', data);
            return;
        }

        try {
            this.ws.send(JSON.stringify(data));
        } catch (error) {
            console.error('Failed to send message:', error);
            this.messageQueue.push(data);
        }
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'system':
                    this.handleSystemMessage(message);
                    break;
                    
                case 'auth':
                    this.handleAuthMessage(message);
                    break;
                    
                case 'room':
                    this.handleRoomMessage(message);
                    break;
                    
                case 'message':
                    this.emit('message', message);
                    break;
                    
                case 'typing':
                    this.emit('typing', message);
                    break;
                    
                case 'error':
                    this.emit('error', message);
                    break;
                    
                case 'pong':
                    // Heartbeat response
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    /**
     * Handle system messages
     */
    handleSystemMessage(message) {
        if (message.action === 'connected') {
            console.log('System: Connected to server');
        }
    }

    /**
     * Handle authentication messages
     */
    handleAuthMessage(message) {
        if (message.action === 'success') {
            this.isAuthenticated = true;
            this.user = message.user;
            this.emit('authenticated', { success: true, user: message.user });
        } else {
            this.emit('authenticated', { success: false, message: message.message });
        }
    }

    /**
     * Handle room messages
     */
    handleRoomMessage(message) {
        switch (message.action) {
            case 'joined':
                this.currentRoom = message.roomId;
                this.emit('roomJoined', message);
                break;
                
            case 'left':
                this.currentRoom = null;
                this.emit('roomLeft', message);
                break;
                
            case 'user_joined':
                this.emit('userJoined', message);
                break;
                
            case 'user_left':
                this.emit('userLeft', message);
                break;
        }
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    /**
     * Add event listener
     */
    addListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].add(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].delete(callback);
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            currentRoom: this.currentRoom,
            user: this.user,
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length
        };
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Get current room
     */
    getCurrentRoom() {
        return this.currentRoom;
    }

    /**
     * Check if connected
     */
    isConnectedToServer() {
        return this.isConnected;
    }

    /**
     * Check if authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatClient;
}

// Global instance
window.chatClient = new ChatClient();
