/**
 * Chat Export Interface
 * Handles exporting chat messages, private messages, and moderation logs
 */
class ChatExportInterface {
    constructor(options = {}) {
        this.websocket = options.websocket || null;
        this.currentUserId = options.currentUserId || null;
        this.currentUserRole = options.currentUserRole || 'guest';
        this.roomId = options.roomId || 'default';
        this.onExportReady = options.onExportReady || (() => {});
        this.onExportError = options.onExportError || (() => {});
        
        this.activeExports = new Map();
        this.exportHistory = [];
        this.supportedFormats = ['json', 'csv', 'txt', 'html', 'pdf'];
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        if (this.websocket) {
            this.attachWebSocketListeners();
        }
        this.isInitialized = true;
    }
    
    /**
     * Attach WebSocket event listeners
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
        switch (data.type) {
            case 'chat_export_ready':
                this.handleExportReady(data, 'room_chat');
                break;
                
            case 'private_messages_export_ready':
                this.handleExportReady(data, 'private_messages');
                break;
                
            case 'moderation_logs_export_ready':
                this.handleExportReady(data, 'moderation_logs');
                break;
                
            case 'export_statistics':
                this.handleExportStatistics(data.statistics, data.days);
                break;
        }
    }
    
    /**
     * Export room chat messages
     */
    exportRoomChat(roomId, options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        if (!roomId) {
            throw new Error('Room ID is required');
        }
        
        const exportData = {
            type: 'export_room_chat',
            room_id: roomId,
            format: options.format || 'json',
            limit: options.limit || 1000,
            start_date: options.startDate || null,
            end_date: options.endDate || null,
            include_deleted: options.includeDeleted || false,
            include_moderated: options.includeModerated !== false
        };
        
        // Validate format
        if (!this.supportedFormats.includes(exportData.format)) {
            throw new Error(`Unsupported format: ${exportData.format}`);
        }
        
        // Track export request
        const requestId = this.generateRequestId();
        this.activeExports.set(requestId, {
            type: 'room_chat',
            roomId: roomId,
            options: options,
            startTime: Date.now(),
            status: 'pending'
        });
        
        this.websocket.send(JSON.stringify(exportData));
        
        this.showNotification('Export Started', 'Room chat export is being prepared...', 'info');
        
        return requestId;
    }
    
    /**
     * Export private messages
     */
    exportPrivateMessages(userId = null, options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        const targetUserId = userId || this.currentUserId;
        
        const exportData = {
            type: 'export_private_messages',
            user_id: targetUserId,
            format: options.format || 'json',
            limit: options.limit || 1000,
            start_date: options.startDate || null,
            end_date: options.endDate || null
        };
        
        // Validate format
        if (!this.supportedFormats.includes(exportData.format)) {
            throw new Error(`Unsupported format: ${exportData.format}`);
        }
        
        // Track export request
        const requestId = this.generateRequestId();
        this.activeExports.set(requestId, {
            type: 'private_messages',
            userId: targetUserId,
            options: options,
            startTime: Date.now(),
            status: 'pending'
        });
        
        this.websocket.send(JSON.stringify(exportData));
        
        this.showNotification('Export Started', 'Private messages export is being prepared...', 'info');
        
        return requestId;
    }
    
    /**
     * Export moderation logs (admin/moderator only)
     */
    exportModerationLogs(options = {}) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        
        if (!['admin', 'moderator'].includes(this.currentUserRole)) {
            throw new Error('Admin or moderator access required');
        }
        
        const exportData = {
            type: 'export_moderation_logs',
            format: options.format || 'json',
            limit: options.limit || 1000,
            start_date: options.startDate || null,
            end_date: options.endDate || null,
            action_type: options.actionType || null,
            moderator_id: options.moderatorId || null
        };
        
        // Validate format
        if (!this.supportedFormats.includes(exportData.format)) {
            throw new Error(`Unsupported format: ${exportData.format}`);
        }
        
        // Track export request
        const requestId = this.generateRequestId();
        this.activeExports.set(requestId, {
            type: 'moderation_logs',
            options: options,
            startTime: Date.now(),
            status: 'pending'
        });
        
        this.websocket.send(JSON.stringify(exportData));
        
        this.showNotification('Export Started', 'Moderation logs export is being prepared...', 'info');
        
        return requestId;
    }
    
    /**
     * Get export statistics (admin/moderator only)
     */
    getExportStatistics(days = 30) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        if (!['admin', 'moderator'].includes(this.currentUserRole)) {
            throw new Error('Admin or moderator access required');
        }
        
        const requestData = {
            type: 'get_export_statistics',
            days: days
        };
        
        this.websocket.send(JSON.stringify(requestData));
        return true;
    }
    
    /**
     * Handle export ready
     */
    handleExportReady(data, exportType) {
        // Find matching active export
        let matchingRequestId = null;
        for (const [requestId, exportInfo] of this.activeExports) {
            if (exportInfo.type === exportType && exportInfo.status === 'pending') {
                matchingRequestId = requestId;
                break;
            }
        }
        
        if (matchingRequestId) {
            const exportInfo = this.activeExports.get(matchingRequestId);
            exportInfo.status = 'ready';
            exportInfo.endTime = Date.now();
            exportInfo.duration = exportInfo.endTime - exportInfo.startTime;
            exportInfo.exportData = data;
            
            // Move to history
            this.exportHistory.unshift({
                ...exportInfo,
                requestId: matchingRequestId,
                completedAt: new Date()
            });
            
            // Keep only last 50 exports in history
            if (this.exportHistory.length > 50) {
                this.exportHistory = this.exportHistory.slice(0, 50);
            }
            
            this.activeExports.delete(matchingRequestId);
        }
        
        // Show success notification
        this.showNotification(
            'Export Ready',
            `${this.formatExportType(exportType)} export is ready for download (${this.formatFileSize(data.file_size)})`,
            'success'
        );
        
        // Notify callback
        this.onExportReady({
            type: exportType,
            exportId: data.export_id,
            filename: data.filename,
            fileSize: data.file_size,
            recordCount: data.record_count,
            format: data.format,
            downloadUrl: data.download_url,
            expiresAt: data.expires_at
        });
    }
    
    /**
     * Handle export statistics
     */
    handleExportStatistics(statistics, days) {
        console.log('Export statistics received:', statistics);
        
        // This would typically update an admin dashboard
        // For now, we'll just log it
    }
    
    /**
     * Download export file
     */
    downloadExport(downloadUrl, filename) {
        // Create temporary download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Download Started', `Downloading ${filename}...`, 'info');
    }
    
    /**
     * Get active exports
     */
    getActiveExports() {
        return Array.from(this.activeExports.entries()).map(([requestId, exportInfo]) => ({
            requestId,
            ...exportInfo
        }));
    }
    
    /**
     * Get export history
     */
    getExportHistory() {
        return [...this.exportHistory];
    }
    
    /**
     * Cancel active export
     */
    cancelExport(requestId) {
        if (this.activeExports.has(requestId)) {
            const exportInfo = this.activeExports.get(requestId);
            exportInfo.status = 'cancelled';
            this.activeExports.delete(requestId);
            
            this.showNotification('Export Cancelled', 'Export request has been cancelled', 'warning');
            return true;
        }
        return false;
    }
    
    /**
     * Clear export history
     */
    clearHistory() {
        this.exportHistory = [];
        this.showNotification('History Cleared', 'Export history has been cleared', 'info');
    }
    
    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Format export type for display
     */
    formatExportType(type) {
        switch (type) {
            case 'room_chat':
                return 'Room Chat';
            case 'private_messages':
                return 'Private Messages';
            case 'moderation_logs':
                return 'Moderation Logs';
            default:
                return 'Export';
        }
    }
    
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Format duration for display
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }
    
    /**
     * Validate export options
     */
    validateExportOptions(options) {
        const errors = [];
        
        // Validate format
        if (options.format && !this.supportedFormats.includes(options.format)) {
            errors.push(`Unsupported format: ${options.format}`);
        }
        
        // Validate limit
        if (options.limit && (options.limit < 1 || options.limit > 10000)) {
            errors.push('Limit must be between 1 and 10,000');
        }
        
        // Validate dates
        if (options.startDate && options.endDate) {
            const start = new Date(options.startDate);
            const end = new Date(options.endDate);
            
            if (start >= end) {
                errors.push('Start date must be before end date');
            }
        }
        
        return errors;
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `export-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${title}</strong>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Add close handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }
    
    /**
     * Update WebSocket connection
     */
    setWebSocket(websocket) {
        this.websocket = websocket;
        if (websocket) {
            this.attachWebSocketListeners();
        }
    }
    
    /**
     * Update user information
     */
    setUserInfo(userId, userRole) {
        this.currentUserId = userId;
        this.currentUserRole = userRole;
    }
    
    /**
     * Update room ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    /**
     * Check if user can export data
     */
    canExport(exportType) {
        switch (exportType) {
            case 'room_chat':
                return ['admin', 'moderator', 'host'].includes(this.currentUserRole);
            case 'private_messages':
                return true; // Users can export their own messages
            case 'moderation_logs':
                return ['admin', 'moderator'].includes(this.currentUserRole);
            default:
                return false;
        }
    }
    
    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }
    
    /**
     * Destroy the interface
     */
    destroy() {
        this.activeExports.clear();
        this.exportHistory = [];
        this.websocket = null;
        
        // Remove any notifications
        document.querySelectorAll('.export-notification').forEach(notification => {
            notification.remove();
        });
    }
}

// CSS Styles for Chat Export Interface
const chatExportStyles = `
<style>
.export-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    padding: 1rem;
    max-width: 350px;
    z-index: 2000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.export-notification.show {
    transform: translateX(0);
}

.export-notification.notification-info {
    border-left: 4px solid #17a2b8;
}

.export-notification.notification-success {
    border-left: 4px solid #28a745;
}

.export-notification.notification-warning {
    border-left: 4px solid #ffc107;
}

.export-notification.notification-error {
    border-left: 4px solid #dc3545;
}

.notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.notification-header strong {
    color: var(--text-light, #ffffff);
    font-size: 0.9rem;
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-muted, #cccccc);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: background 0.2s ease;
}

.notification-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-light, #ffffff);
}

.notification-body {
    color: var(--text-muted, #cccccc);
    font-size: 0.8rem;
    line-height: 1.4;
}

.export-container {
    background: var(--card-dark, #2a2a2a);
    border: 1px solid var(--border-color, #444);
    border-radius: 12px;
    overflow: hidden;
}

.export-header {
    background: var(--input-dark, #3a3a3a);
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, #444);
}

.export-header h3 {
    color: var(--primary-color, #FF0000);
    margin: 0 0 0.5rem 0;
    font-size: 1.3rem;
}

.export-header p {
    color: var(--text-muted, #cccccc);
    margin: 0;
    font-size: 0.9rem;
}

.export-content {
    padding: 1.5rem;
}

.export-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--input-dark, #3a3a3a);
    border-radius: 8px;
    border: 1px solid var(--border-color, #444);
}

.export-section h4 {
    color: var(--text-light, #ffffff);
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.export-section p {
    color: var(--text-muted, #cccccc);
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
}

.export-form {
    display: grid;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    color: var(--text-light, #ffffff);
    font-weight: 500;
    font-size: 0.9rem;
}

.form-control {
    background: var(--bg-dark, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    color: var(--text-light, #ffffff);
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.9rem;
    transition: border-color 0.2s ease;
}

.form-control:focus {
    outline: none;
    border-color: var(--primary-color, #FF0000);
}

.form-control::placeholder {
    color: var(--text-muted, #cccccc);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.checkbox-group input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--primary-color, #FF0000);
}

.checkbox-group label {
    margin: 0;
    font-size: 0.9rem;
    cursor: pointer;
}

.export-btn {
    background: var(--primary-color, #FF0000);
    border: none;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.export-btn:hover:not(:disabled) {
    background: #cc0000;
    transform: translateY(-1px);
}

.export-btn:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
}

.export-btn.secondary {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid var(--border-color, #444);
}

.export-btn.secondary:hover:not(:disabled) {
    background: #4a4a4a;
}

.export-status {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-dark, #1a1a1a);
    border-radius: 6px;
    border: 1px solid var(--border-color, #444);
}

.export-status h5 {
    color: var(--text-light, #ffffff);
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
}

.export-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--card-dark, #2a2a2a);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color, #444);
}

.export-item:last-child {
    margin-bottom: 0;
}

.export-item-info {
    flex: 1;
}

.export-item-title {
    color: var(--text-light, #ffffff);
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.export-item-details {
    color: var(--text-muted, #cccccc);
    font-size: 0.8rem;
}

.export-item-actions {
    display: flex;
    gap: 0.5rem;
}

.export-item-btn {
    background: var(--primary-color, #FF0000);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s ease;
}

.export-item-btn:hover {
    background: #cc0000;
}

.export-item-btn.secondary {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid var(--border-color, #444);
}

.export-item-btn.secondary:hover {
    background: #4a4a4a;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
}

.status-badge.pending {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid #ffc107;
}

.status-badge.ready {
    background: rgba(40, 167, 69, 0.2);
    color: #28a745;
    border: 1px solid #28a745;
}

.status-badge.cancelled {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    border: 1px solid #dc3545;
}

.export-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: var(--input-dark, #3a3a3a);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
}

.stat-value {
    color: var(--primary-color, #FF0000);
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.stat-label {
    color: var(--text-muted, #cccccc);
    font-size: 0.9rem;
}

.empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted, #cccccc);
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state h4 {
    color: var(--text-light, #ffffff);
    margin-bottom: 0.5rem;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .export-content {
        padding: 1rem;
    }

    .export-section {
        padding: 1rem;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .export-stats {
        grid-template-columns: 1fr;
    }

    .export-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
    }

    .export-item-actions {
        justify-content: center;
    }

    .export-notification {
        right: 10px;
        left: 10px;
        max-width: none;
        transform: translateY(-100%);
    }

    .export-notification.show {
        transform: translateY(0);
    }
}
</style>
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('div');
    styleElement.innerHTML = chatExportStyles;
    document.head.appendChild(styleElement.firstElementChild);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatExportInterface;
} else if (typeof window !== 'undefined') {
    window.ChatExportInterface = ChatExportInterface;
}
