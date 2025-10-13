<?php

namespace InterviewsTV\Services;

/**
 * Chat Export Service
 * Handles exporting chat messages, private messages, and conversation data
 */
class ChatExportService {
    
    private $fileStorageService;
    private $chatService;
    private $privateMessageService;
    private $exportConfig;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->chatService = new ChatService();
        $this->privateMessageService = new PrivateMessageService();
        $this->initializeExportConfig();
    }
    
    /**
     * Initialize export configuration
     */
    private function initializeExportConfig() {
        $this->exportConfig = [
            'enabled' => true,
            'max_messages_per_export' => 10000,
            'supported_formats' => ['json', 'csv', 'txt', 'html', 'pdf'],
            'include_metadata' => true,
            'include_private_messages' => true,
            'include_moderation_logs' => true,
            'anonymize_users' => false,
            'compression' => [
                'enabled' => true,
                'format' => 'zip',
                'level' => 6
            ],
            'rate_limiting' => [
                'enabled' => true,
                'max_exports_per_hour' => 5,
                'max_exports_per_day' => 20
            ],
            'retention' => [
                'keep_exports_days' => 7,
                'auto_cleanup' => true
            ],
            'security' => [
                'require_authentication' => true,
                'admin_only_full_export' => true,
                'encrypt_exports' => true,
                'watermark_exports' => true
            ]
        ];
    }
    
    /**
     * Export chat messages from a room
     */
    public function exportRoomChat(string $roomId, array $options = []) {
        if (!$this->exportConfig['enabled']) {
            return [
                'success' => false,
                'error' => 'Chat export is currently disabled',
                'error_code' => 'EXPORT_DISABLED'
            ];
        }
        
        // Validate permissions
        $userId = $options['user_id'] ?? null;
        $userRole = $options['user_role'] ?? 'guest';
        
        if (!$this->hasExportPermission($userId, $userRole, 'room_chat')) {
            return [
                'success' => false,
                'error' => 'Insufficient permissions for chat export',
                'error_code' => 'PERMISSION_DENIED'
            ];
        }
        
        // Check rate limiting
        if (!$this->checkExportRateLimit($userId)) {
            return [
                'success' => false,
                'error' => 'Export rate limit exceeded',
                'error_code' => 'RATE_LIMIT'
            ];
        }
        
        try {
            // Load chat messages
            $messages = $this->loadRoomMessages($roomId, $options);
            
            if (empty($messages)) {
                return [
                    'success' => false,
                    'error' => 'No messages found for export',
                    'error_code' => 'NO_DATA'
                ];
            }
            
            // Apply filters and transformations
            $processedMessages = $this->processMessagesForExport($messages, $options);
            
            // Generate export
            $exportResult = $this->generateExport($processedMessages, [
                'type' => 'room_chat',
                'room_id' => $roomId,
                'format' => $options['format'] ?? 'json',
                'user_id' => $userId,
                'user_role' => $userRole,
                'options' => $options
            ]);
            
            if ($exportResult['success']) {
                // Update rate limiting
                $this->updateExportRateLimit($userId);
                
                // Log export activity
                $this->logExportActivity($userId, 'room_chat', $roomId, $exportResult['export_id']);
            }
            
            return $exportResult;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Export failed: ' . $e->getMessage(),
                'error_code' => 'EXPORT_ERROR'
            ];
        }
    }
    
    /**
     * Export private messages for a user
     */
    public function exportPrivateMessages(string $userId, array $options = []) {
        if (!$this->exportConfig['enabled'] || !$this->exportConfig['include_private_messages']) {
            return [
                'success' => false,
                'error' => 'Private message export is not available',
                'error_code' => 'EXPORT_DISABLED'
            ];
        }
        
        // Validate permissions
        $requestingUserId = $options['requesting_user_id'] ?? $userId;
        $requestingUserRole = $options['requesting_user_role'] ?? 'participant';
        
        // Users can export their own messages, admins can export any
        if ($requestingUserId !== $userId && !in_array($requestingUserRole, ['admin', 'moderator'])) {
            return [
                'success' => false,
                'error' => 'Can only export your own private messages',
                'error_code' => 'PERMISSION_DENIED'
            ];
        }
        
        // Check rate limiting
        if (!$this->checkExportRateLimit($requestingUserId)) {
            return [
                'success' => false,
                'error' => 'Export rate limit exceeded',
                'error_code' => 'RATE_LIMIT'
            ];
        }
        
        try {
            // Load private messages
            $conversations = $this->loadUserPrivateMessages($userId, $options);
            
            if (empty($conversations)) {
                return [
                    'success' => false,
                    'error' => 'No private messages found for export',
                    'error_code' => 'NO_DATA'
                ];
            }
            
            // Process messages for export
            $processedData = $this->processPrivateMessagesForExport($conversations, $options);
            
            // Generate export
            $exportResult = $this->generateExport($processedData, [
                'type' => 'private_messages',
                'user_id' => $userId,
                'format' => $options['format'] ?? 'json',
                'requesting_user_id' => $requestingUserId,
                'requesting_user_role' => $requestingUserRole,
                'options' => $options
            ]);
            
            if ($exportResult['success']) {
                // Update rate limiting
                $this->updateExportRateLimit($requestingUserId);
                
                // Log export activity
                $this->logExportActivity($requestingUserId, 'private_messages', $userId, $exportResult['export_id']);
            }
            
            return $exportResult;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Export failed: ' . $e->getMessage(),
                'error_code' => 'EXPORT_ERROR'
            ];
        }
    }
    
    /**
     * Export moderation logs
     */
    public function exportModerationLogs(array $options = []) {
        if (!$this->exportConfig['enabled'] || !$this->exportConfig['include_moderation_logs']) {
            return [
                'success' => false,
                'error' => 'Moderation log export is not available',
                'error_code' => 'EXPORT_DISABLED'
            ];
        }
        
        // Validate permissions (admin/moderator only)
        $userId = $options['user_id'] ?? null;
        $userRole = $options['user_role'] ?? 'guest';
        
        if (!in_array($userRole, ['admin', 'moderator'])) {
            return [
                'success' => false,
                'error' => 'Admin or moderator access required',
                'error_code' => 'PERMISSION_DENIED'
            ];
        }
        
        // Check rate limiting
        if (!$this->checkExportRateLimit($userId)) {
            return [
                'success' => false,
                'error' => 'Export rate limit exceeded',
                'error_code' => 'RATE_LIMIT'
            ];
        }
        
        try {
            // Load moderation logs
            $logs = $this->loadModerationLogs($options);
            
            if (empty($logs)) {
                return [
                    'success' => false,
                    'error' => 'No moderation logs found for export',
                    'error_code' => 'NO_DATA'
                ];
            }
            
            // Process logs for export
            $processedLogs = $this->processModerationLogsForExport($logs, $options);
            
            // Generate export
            $exportResult = $this->generateExport($processedLogs, [
                'type' => 'moderation_logs',
                'format' => $options['format'] ?? 'json',
                'user_id' => $userId,
                'user_role' => $userRole,
                'options' => $options
            ]);
            
            if ($exportResult['success']) {
                // Update rate limiting
                $this->updateExportRateLimit($userId);
                
                // Log export activity
                $this->logExportActivity($userId, 'moderation_logs', 'system', $exportResult['export_id']);
            }
            
            return $exportResult;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Export failed: ' . $e->getMessage(),
                'error_code' => 'EXPORT_ERROR'
            ];
        }
    }
    
    /**
     * Generate export in specified format
     */
    private function generateExport(array $data, array $metadata) {
        $exportId = $this->generateExportId();
        $format = $metadata['format'] ?? 'json';
        $timestamp = time();
        
        // Validate format
        if (!in_array($format, $this->exportConfig['supported_formats'])) {
            return [
                'success' => false,
                'error' => 'Unsupported export format: ' . $format,
                'error_code' => 'INVALID_FORMAT'
            ];
        }
        
        // Create export directory
        $exportDir = $this->getExportDirectory($exportId);
        if (!is_dir($exportDir)) {
            mkdir($exportDir, 0755, true);
        }
        
        // Generate export content
        $exportContent = $this->formatExportData($data, $format, $metadata);
        $filename = $this->generateExportFilename($metadata['type'], $format, $timestamp);
        $filepath = $exportDir . '/' . $filename;
        
        // Save export file
        file_put_contents($filepath, $exportContent);
        
        // Add metadata file
        $metadataFile = $exportDir . '/metadata.json';
        $exportMetadata = [
            'export_id' => $exportId,
            'type' => $metadata['type'],
            'format' => $format,
            'created_at' => $timestamp,
            'created_by' => $metadata['user_id'] ?? 'system',
            'user_role' => $metadata['user_role'] ?? 'unknown',
            'record_count' => count($data),
            'file_size' => filesize($filepath),
            'filename' => $filename,
            'options' => $metadata['options'] ?? []
        ];
        
        file_put_contents($metadataFile, json_encode($exportMetadata, JSON_PRETTY_PRINT));
        
        // Compress if enabled
        $finalPath = $filepath;
        if ($this->exportConfig['compression']['enabled']) {
            $finalPath = $this->compressExport($exportDir, $exportId);
        }
        
        // Encrypt if enabled
        if ($this->exportConfig['security']['encrypt_exports']) {
            $finalPath = $this->encryptExport($finalPath, $exportId);
        }
        
        // Generate download URL/token
        $downloadToken = $this->generateDownloadToken($exportId, $metadata['user_id'] ?? 'system');
        
        return [
            'success' => true,
            'export_id' => $exportId,
            'filename' => basename($finalPath),
            'file_size' => filesize($finalPath),
            'record_count' => count($data),
            'format' => $format,
            'download_token' => $downloadToken,
            'download_url' => $this->generateDownloadUrl($exportId, $downloadToken),
            'expires_at' => $timestamp + (24 * 3600), // 24 hours
            'metadata' => $exportMetadata
        ];
    }
    
    /**
     * Format export data based on format
     */
    private function formatExportData(array $data, string $format, array $metadata) {
        switch ($format) {
            case 'json':
                return $this->formatAsJson($data, $metadata);
                
            case 'csv':
                return $this->formatAsCsv($data, $metadata);
                
            case 'txt':
                return $this->formatAsText($data, $metadata);
                
            case 'html':
                return $this->formatAsHtml($data, $metadata);
                
            case 'pdf':
                return $this->formatAsPdf($data, $metadata);
                
            default:
                throw new \Exception('Unsupported export format: ' . $format);
        }
    }
    
    /**
     * Format data as JSON
     */
    private function formatAsJson(array $data, array $metadata) {
        $export = [
            'export_info' => [
                'type' => $metadata['type'],
                'generated_at' => date('Y-m-d H:i:s'),
                'generated_by' => $metadata['user_id'] ?? 'system',
                'record_count' => count($data),
                'version' => '1.0'
            ],
            'data' => $data
        ];
        
        if ($this->exportConfig['security']['watermark_exports']) {
            $export['export_info']['watermark'] = 'Generated by Interviews.tv Chat Export System';
        }
        
        return json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Format data as CSV
     */
    private function formatAsCsv(array $data, array $metadata) {
        if (empty($data)) {
            return '';
        }
        
        $output = fopen('php://temp', 'r+');
        
        // Add header comment
        if ($this->exportConfig['security']['watermark_exports']) {
            fputcsv($output, ['# Generated by Interviews.tv Chat Export System']);
            fputcsv($output, ['# Export Type: ' . $metadata['type']]);
            fputcsv($output, ['# Generated At: ' . date('Y-m-d H:i:s')]);
            fputcsv($output, ['# Record Count: ' . count($data)]);
            fputcsv($output, []);
        }
        
        // Determine headers based on data type
        $headers = $this->getCsvHeaders($metadata['type']);
        fputcsv($output, $headers);
        
        // Add data rows
        foreach ($data as $record) {
            $row = $this->formatRecordForCsv($record, $headers);
            fputcsv($output, $row);
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        return $csv;
    }
    
    /**
     * Format data as plain text
     */
    private function formatAsText(array $data, array $metadata) {
        $output = '';
        
        // Header
        if ($this->exportConfig['security']['watermark_exports']) {
            $output .= "=== Interviews.tv Chat Export ===\n";
            $output .= "Export Type: " . $metadata['type'] . "\n";
            $output .= "Generated At: " . date('Y-m-d H:i:s') . "\n";
            $output .= "Record Count: " . count($data) . "\n";
            $output .= str_repeat("=", 50) . "\n\n";
        }
        
        // Format based on type
        switch ($metadata['type']) {
            case 'room_chat':
                $output .= $this->formatChatMessagesAsText($data);
                break;
                
            case 'private_messages':
                $output .= $this->formatPrivateMessagesAsText($data);
                break;
                
            case 'moderation_logs':
                $output .= $this->formatModerationLogsAsText($data);
                break;
        }
        
        return $output;
    }
    
    /**
     * Format data as HTML
     */
    private function formatAsHtml(array $data, array $metadata) {
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Export - ' . htmlspecialchars($metadata['type']) . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #FF0000; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #FF0000; margin: 0; }
        .meta { color: #666; font-size: 14px; }
        .message { margin-bottom: 15px; padding: 10px; border-left: 3px solid #FF0000; background: #f9f9f9; }
        .message-header { font-weight: bold; color: #333; margin-bottom: 5px; }
        .message-content { color: #555; line-height: 1.4; }
        .message-time { color: #999; font-size: 12px; margin-top: 5px; }
        .watermark { text-align: center; color: #ccc; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Chat Export</h1>
            <div class="meta">
                <p><strong>Type:</strong> ' . htmlspecialchars($metadata['type']) . '</p>
                <p><strong>Generated:</strong> ' . date('Y-m-d H:i:s') . '</p>
                <p><strong>Records:</strong> ' . count($data) . '</p>
            </div>
        </div>
        <div class="content">';
        
        // Format content based on type
        switch ($metadata['type']) {
            case 'room_chat':
                $html .= $this->formatChatMessagesAsHtml($data);
                break;
                
            case 'private_messages':
                $html .= $this->formatPrivateMessagesAsHtml($data);
                break;
                
            case 'moderation_logs':
                $html .= $this->formatModerationLogsAsHtml($data);
                break;
        }
        
        $html .= '</div>';
        
        if ($this->exportConfig['security']['watermark_exports']) {
            $html .= '<div class="watermark">Generated by Interviews.tv Chat Export System</div>';
        }
        
        $html .= '</div></body></html>';
        
        return $html;
    }
    
    /**
     * Format data as PDF (simplified - would use a PDF library in production)
     */
    private function formatAsPdf(array $data, array $metadata) {
        // For this demo, we'll return HTML that could be converted to PDF
        // In production, you'd use a library like TCPDF, FPDF, or wkhtmltopdf
        return $this->formatAsHtml($data, $metadata);
    }
    
    /**
     * Load room messages for export
     */
    private function loadRoomMessages(string $roomId, array $options) {
        $messages = $this->chatService->getRoomMessages($roomId, [
            'limit' => $options['limit'] ?? $this->exportConfig['max_messages_per_export'],
            'start_date' => $options['start_date'] ?? null,
            'end_date' => $options['end_date'] ?? null,
            'include_deleted' => $options['include_deleted'] ?? false,
            'include_moderated' => $options['include_moderated'] ?? true
        ]);
        
        return $messages;
    }
    
    /**
     * Load user private messages for export
     */
    private function loadUserPrivateMessages(string $userId, array $options) {
        // Get user conversations
        $conversationsResult = $this->privateMessageService->getUserConversations($userId, [
            'limit' => 1000 // Get all conversations
        ]);
        
        if (!$conversationsResult['success']) {
            return [];
        }
        
        $allMessages = [];
        
        // Load messages for each conversation
        foreach ($conversationsResult['conversations'] as $conversation) {
            $historyResult = $this->privateMessageService->getConversationHistory(
                $userId,
                $conversation['participant_id'],
                [
                    'limit' => $options['limit'] ?? $this->exportConfig['max_messages_per_export'],
                    'start_date' => $options['start_date'] ?? null,
                    'end_date' => $options['end_date'] ?? null
                ]
            );
            
            if ($historyResult['success']) {
                $allMessages = array_merge($allMessages, $historyResult['messages']);
            }
        }
        
        return $allMessages;
    }
    
    /**
     * Load moderation logs for export
     */
    private function loadModerationLogs(array $options) {
        // This would load from moderation service logs
        // For now, return empty array as placeholder
        return [];
    }
    
    /**
     * Process messages for export
     */
    private function processMessagesForExport(array $messages, array $options) {
        $processed = [];
        
        foreach ($messages as $message) {
            $processedMessage = [
                'id' => $message['id'] ?? $message['message_id'] ?? 'unknown',
                'timestamp' => $message['timestamp'],
                'date_time' => date('Y-m-d H:i:s', $message['timestamp']),
                'user_id' => $this->exportConfig['anonymize_users'] ? 'user_' . substr(md5($message['user_id']), 0, 8) : $message['user_id'],
                'user_name' => $this->exportConfig['anonymize_users'] ? 'User ' . substr(md5($message['user_name'] ?? 'unknown'), 0, 8) : ($message['user_name'] ?? 'Unknown'),
                'message' => $message['message'],
                'message_type' => $message['message_type'] ?? 'text'
            ];
            
            // Include metadata if enabled
            if ($this->exportConfig['include_metadata']) {
                $processedMessage['metadata'] = [
                    'room_id' => $message['room_id'] ?? 'unknown',
                    'user_role' => $message['user_role'] ?? 'unknown',
                    'ip_address' => $this->exportConfig['anonymize_users'] ? 'xxx.xxx.xxx.xxx' : ($message['ip_address'] ?? 'unknown'),
                    'edited' => $message['edited'] ?? false,
                    'deleted' => $message['deleted'] ?? false,
                    'moderated' => $message['moderated'] ?? false
                ];
            }
            
            $processed[] = $processedMessage;
        }
        
        return $processed;
    }
    
    /**
     * Process private messages for export
     */
    private function processPrivateMessagesForExport(array $messages, array $options) {
        $processed = [];
        
        foreach ($messages as $message) {
            $processedMessage = [
                'id' => $message['message_id'],
                'conversation_id' => $message['conversation_id'],
                'timestamp' => $message['timestamp'],
                'date_time' => date('Y-m-d H:i:s', $message['timestamp']),
                'sender_id' => $this->exportConfig['anonymize_users'] ? 'user_' . substr(md5($message['sender_id']), 0, 8) : $message['sender_id'],
                'recipient_id' => $this->exportConfig['anonymize_users'] ? 'user_' . substr(md5($message['recipient_id']), 0, 8) : $message['recipient_id'],
                'sender_name' => $this->exportConfig['anonymize_users'] ? 'User ' . substr(md5($message['metadata']['sender_name'] ?? 'unknown'), 0, 8) : ($message['metadata']['sender_name'] ?? 'Unknown'),
                'recipient_name' => $this->exportConfig['anonymize_users'] ? 'User ' . substr(md5($message['metadata']['recipient_name'] ?? 'unknown'), 0, 8) : ($message['metadata']['recipient_name'] ?? 'Unknown'),
                'message' => $message['message'],
                'message_type' => $message['message_type'] ?? 'text',
                'read' => $message['read'] ?? false,
                'deleted' => $message['deleted'] ?? false
            ];
            
            $processed[] = $processedMessage;
        }
        
        return $processed;
    }
    
    /**
     * Process moderation logs for export
     */
    private function processModerationLogsForExport(array $logs, array $options) {
        // Process moderation logs similar to messages
        return $logs;
    }
    
    /**
     * Check if user has export permission
     */
    private function hasExportPermission(string $userId, string $userRole, string $exportType) {
        // Basic permission check
        if ($exportType === 'moderation_logs' && !in_array($userRole, ['admin', 'moderator'])) {
            return false;
        }
        
        if ($this->exportConfig['security']['admin_only_full_export'] && $exportType === 'room_chat' && $userRole !== 'admin') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check export rate limiting
     */
    private function checkExportRateLimit(string $userId) {
        if (!$this->exportConfig['rate_limiting']['enabled']) {
            return true;
        }
        
        $rateLimitData = $this->fileStorageService->load("export_rate_limits/{$userId}.json") ?? [
            'hourly_exports' => [],
            'daily_exports' => [],
            'last_reset_hour' => date('Y-m-d-H'),
            'last_reset_day' => date('Y-m-d')
        ];
        
        $currentHour = date('Y-m-d-H');
        $currentDay = date('Y-m-d');
        
        // Reset hourly counter
        if ($rateLimitData['last_reset_hour'] !== $currentHour) {
            $rateLimitData['hourly_exports'] = [];
            $rateLimitData['last_reset_hour'] = $currentHour;
        }
        
        // Reset daily counter
        if ($rateLimitData['last_reset_day'] !== $currentDay) {
            $rateLimitData['daily_exports'] = [];
            $rateLimitData['last_reset_day'] = $currentDay;
        }
        
        // Check limits
        $hourlyCount = count($rateLimitData['hourly_exports']);
        $dailyCount = count($rateLimitData['daily_exports']);
        
        if ($hourlyCount >= $this->exportConfig['rate_limiting']['max_exports_per_hour']) {
            return false;
        }
        
        if ($dailyCount >= $this->exportConfig['rate_limiting']['max_exports_per_day']) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Update export rate limiting
     */
    private function updateExportRateLimit(string $userId) {
        if (!$this->exportConfig['rate_limiting']['enabled']) {
            return;
        }
        
        $rateLimitData = $this->fileStorageService->load("export_rate_limits/{$userId}.json") ?? [
            'hourly_exports' => [],
            'daily_exports' => [],
            'last_reset_hour' => date('Y-m-d-H'),
            'last_reset_day' => date('Y-m-d')
        ];
        
        $currentTime = time();
        $rateLimitData['hourly_exports'][] = $currentTime;
        $rateLimitData['daily_exports'][] = $currentTime;
        
        $this->fileStorageService->save("export_rate_limits/{$userId}.json", $rateLimitData);
    }
    
    /**
     * Generate unique export ID
     */
    private function generateExportId() {
        return 'export_' . time() . '_' . uniqid();
    }
    
    /**
     * Get export directory path
     */
    private function getExportDirectory(string $exportId) {
        return $this->fileStorageService->getStoragePath() . '/exports/' . $exportId;
    }
    
    /**
     * Generate export filename
     */
    private function generateExportFilename(string $type, string $format, int $timestamp) {
        $date = date('Y-m-d_H-i-s', $timestamp);
        return "interviews_tv_{$type}_{$date}.{$format}";
    }
    
    /**
     * Compress export directory
     */
    private function compressExport(string $exportDir, string $exportId) {
        $zipFile = $exportDir . '.zip';
        
        $zip = new \ZipArchive();
        if ($zip->open($zipFile, \ZipArchive::CREATE) === TRUE) {
            $files = glob($exportDir . '/*');
            foreach ($files as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();
            
            // Remove original directory
            $this->removeDirectory($exportDir);
            
            return $zipFile;
        }
        
        return $exportDir;
    }
    
    /**
     * Encrypt export file
     */
    private function encryptExport(string $filePath, string $exportId) {
        // Simple encryption implementation
        // In production, use proper encryption libraries
        $encryptedPath = $filePath . '.encrypted';
        $key = hash('sha256', 'interviews_tv_export_key_' . $exportId);
        
        $data = file_get_contents($filePath);
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        file_put_contents($encryptedPath, base64_encode($iv . $encrypted));
        unlink($filePath);
        
        return $encryptedPath;
    }
    
    /**
     * Generate download token
     */
    private function generateDownloadToken(string $exportId, string $userId) {
        $tokenData = [
            'export_id' => $exportId,
            'user_id' => $userId,
            'expires_at' => time() + (24 * 3600), // 24 hours
            'created_at' => time()
        ];
        
        $token = base64_encode(json_encode($tokenData));
        
        // Store token
        $this->fileStorageService->save("export_tokens/{$token}.json", $tokenData);
        
        return $token;
    }
    
    /**
     * Generate download URL
     */
    private function generateDownloadUrl(string $exportId, string $token) {
        return "/api/exports/download/{$exportId}?token={$token}";
    }
    
    /**
     * Log export activity
     */
    private function logExportActivity(string $userId, string $type, string $target, string $exportId) {
        $logEntry = [
            'timestamp' => time(),
            'user_id' => $userId,
            'export_type' => $type,
            'target' => $target,
            'export_id' => $exportId,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        $logs = $this->fileStorageService->load('export_activity_logs.json') ?? [];
        $logs[] = $logEntry;
        
        // Keep only last 1000 entries
        if (count($logs) > 1000) {
            $logs = array_slice($logs, -1000);
        }
        
        $this->fileStorageService->save('export_activity_logs.json', $logs);
    }
    
    /**
     * Get CSV headers for different export types
     */
    private function getCsvHeaders(string $type) {
        switch ($type) {
            case 'room_chat':
                return ['ID', 'Timestamp', 'DateTime', 'UserID', 'UserName', 'Message', 'MessageType', 'RoomID', 'UserRole', 'Edited', 'Deleted', 'Moderated'];
                
            case 'private_messages':
                return ['ID', 'ConversationID', 'Timestamp', 'DateTime', 'SenderID', 'RecipientID', 'SenderName', 'RecipientName', 'Message', 'MessageType', 'Read', 'Deleted'];
                
            case 'moderation_logs':
                return ['Timestamp', 'DateTime', 'Action', 'ModeratorID', 'TargetUserID', 'Reason', 'Details'];
                
            default:
                return ['Data'];
        }
    }
    
    /**
     * Format record for CSV
     */
    private function formatRecordForCsv(array $record, array $headers) {
        $row = [];
        
        foreach ($headers as $header) {
            $key = strtolower(str_replace(' ', '_', $header));
            $value = $record[$key] ?? ($record['metadata'][$key] ?? '');
            
            // Handle special formatting
            if (is_bool($value)) {
                $value = $value ? 'Yes' : 'No';
            } elseif (is_array($value)) {
                $value = json_encode($value);
            }
            
            $row[] = $value;
        }
        
        return $row;
    }
    
    /**
     * Format chat messages as text
     */
    private function formatChatMessagesAsText(array $messages) {
        $output = '';
        
        foreach ($messages as $message) {
            $time = date('Y-m-d H:i:s', $message['timestamp']);
            $user = $message['user_name'] ?? 'Unknown';
            $content = $message['message'];
            
            $output .= "[{$time}] {$user}: {$content}\n";
        }
        
        return $output;
    }
    
    /**
     * Format private messages as text
     */
    private function formatPrivateMessagesAsText(array $messages) {
        $output = '';
        $currentConversation = null;
        
        foreach ($messages as $message) {
            if ($currentConversation !== $message['conversation_id']) {
                $currentConversation = $message['conversation_id'];
                $output .= "\n=== Conversation between {$message['sender_name']} and {$message['recipient_name']} ===\n\n";
            }
            
            $time = date('Y-m-d H:i:s', $message['timestamp']);
            $sender = $message['sender_name'];
            $content = $message['message'];
            
            $output .= "[{$time}] {$sender}: {$content}\n";
        }
        
        return $output;
    }
    
    /**
     * Format moderation logs as text
     */
    private function formatModerationLogsAsText(array $logs) {
        $output = '';
        
        foreach ($logs as $log) {
            $time = date('Y-m-d H:i:s', $log['timestamp']);
            $action = $log['action'] ?? 'Unknown';
            $moderator = $log['moderator_id'] ?? 'System';
            $target = $log['target_user_id'] ?? 'Unknown';
            $reason = $log['reason'] ?? 'No reason provided';
            
            $output .= "[{$time}] {$moderator} performed {$action} on {$target}: {$reason}\n";
        }
        
        return $output;
    }
    
    /**
     * Format chat messages as HTML
     */
    private function formatChatMessagesAsHtml(array $messages) {
        $html = '';
        
        foreach ($messages as $message) {
            $time = date('Y-m-d H:i:s', $message['timestamp']);
            $user = htmlspecialchars($message['user_name'] ?? 'Unknown');
            $content = htmlspecialchars($message['message']);
            
            $html .= '<div class="message">
                <div class="message-header">' . $user . '</div>
                <div class="message-content">' . $content . '</div>
                <div class="message-time">' . $time . '</div>
            </div>';
        }
        
        return $html;
    }
    
    /**
     * Format private messages as HTML
     */
    private function formatPrivateMessagesAsHtml(array $messages) {
        $html = '';
        $currentConversation = null;
        
        foreach ($messages as $message) {
            if ($currentConversation !== $message['conversation_id']) {
                $currentConversation = $message['conversation_id'];
                $html .= '<h3>Conversation between ' . htmlspecialchars($message['sender_name']) . ' and ' . htmlspecialchars($message['recipient_name']) . '</h3>';
            }
            
            $time = date('Y-m-d H:i:s', $message['timestamp']);
            $sender = htmlspecialchars($message['sender_name']);
            $content = htmlspecialchars($message['message']);
            
            $html .= '<div class="message">
                <div class="message-header">' . $sender . '</div>
                <div class="message-content">' . $content . '</div>
                <div class="message-time">' . $time . '</div>
            </div>';
        }
        
        return $html;
    }
    
    /**
     * Format moderation logs as HTML
     */
    private function formatModerationLogsAsHtml(array $logs) {
        $html = '';
        
        foreach ($logs as $log) {
            $time = date('Y-m-d H:i:s', $log['timestamp']);
            $action = htmlspecialchars($log['action'] ?? 'Unknown');
            $moderator = htmlspecialchars($log['moderator_id'] ?? 'System');
            $target = htmlspecialchars($log['target_user_id'] ?? 'Unknown');
            $reason = htmlspecialchars($log['reason'] ?? 'No reason provided');
            
            $html .= '<div class="message">
                <div class="message-header">Action: ' . $action . '</div>
                <div class="message-content">Moderator: ' . $moderator . ' | Target: ' . $target . ' | Reason: ' . $reason . '</div>
                <div class="message-time">' . $time . '</div>
            </div>';
        }
        
        return $html;
    }
    
    /**
     * Remove directory recursively
     */
    private function removeDirectory(string $dir) {
        if (is_dir($dir)) {
            $files = array_diff(scandir($dir), ['.', '..']);
            foreach ($files as $file) {
                $path = $dir . '/' . $file;
                is_dir($path) ? $this->removeDirectory($path) : unlink($path);
            }
            rmdir($dir);
        }
    }
    
    /**
     * Get export statistics
     */
    public function getExportStatistics(int $days = 30) {
        $logs = $this->fileStorageService->load('export_activity_logs.json') ?? [];
        $startTime = time() - ($days * 86400);
        
        $stats = [
            'total_exports' => 0,
            'exports_by_type' => [],
            'exports_by_user' => [],
            'exports_by_day' => [],
            'most_active_users' => [],
            'popular_formats' => []
        ];
        
        foreach ($logs as $log) {
            if ($log['timestamp'] < $startTime) {
                continue;
            }
            
            $stats['total_exports']++;
            
            // By type
            $type = $log['export_type'];
            if (!isset($stats['exports_by_type'][$type])) {
                $stats['exports_by_type'][$type] = 0;
            }
            $stats['exports_by_type'][$type]++;
            
            // By user
            $userId = $log['user_id'];
            if (!isset($stats['exports_by_user'][$userId])) {
                $stats['exports_by_user'][$userId] = 0;
            }
            $stats['exports_by_user'][$userId]++;
            
            // By day
            $day = date('Y-m-d', $log['timestamp']);
            if (!isset($stats['exports_by_day'][$day])) {
                $stats['exports_by_day'][$day] = 0;
            }
            $stats['exports_by_day'][$day]++;
        }
        
        // Sort most active users
        arsort($stats['exports_by_user']);
        $stats['most_active_users'] = array_slice($stats['exports_by_user'], 0, 10, true);
        
        return $stats;
    }
    
    /**
     * Clean up old exports
     */
    public function cleanupOldExports(int $daysToKeep = null) {
        $daysToKeep = $daysToKeep ?? $this->exportConfig['retention']['keep_exports_days'];
        $cutoffTime = time() - ($daysToKeep * 86400);
        $cleanedCount = 0;
        
        $exportsDir = $this->fileStorageService->getStoragePath() . '/exports';
        if (!is_dir($exportsDir)) {
            return $cleanedCount;
        }
        
        $exportDirs = glob($exportsDir . '/export_*');
        
        foreach ($exportDirs as $exportDir) {
            $metadataFile = $exportDir . '/metadata.json';
            if (file_exists($metadataFile)) {
                $metadata = json_decode(file_get_contents($metadataFile), true);
                if ($metadata && $metadata['created_at'] < $cutoffTime) {
                    $this->removeDirectory($exportDir);
                    $cleanedCount++;
                }
            }
        }
        
        // Clean up zip files
        $zipFiles = glob($exportsDir . '/*.zip');
        foreach ($zipFiles as $zipFile) {
            if (filemtime($zipFile) < $cutoffTime) {
                unlink($zipFile);
                $cleanedCount++;
            }
        }
        
        return $cleanedCount;
    }
}
