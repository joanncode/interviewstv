<?php

namespace InterviewsTV\Services;

/**
 * Message Broadcasting Service
 * Handles real-time message broadcasting between REST API and WebSocket server
 */
class MessageBroadcaster {
    private $websocketHost;
    private $websocketPort;
    private $broadcastEndpoint;
    private $storage;
    
    public function __construct($websocketHost = '127.0.0.1', $websocketPort = 8080) {
        $this->websocketHost = $websocketHost;
        $this->websocketPort = $websocketPort;
        $this->broadcastEndpoint = "http://{$websocketHost}:8081/broadcast"; // Separate broadcast port
        $this->storage = new FileStorageService();
    }
    
    /**
     * Broadcast message to all WebSocket clients in a room
     */
    public function broadcastMessage($roomId, $messageData) {
        try {
            // Prepare broadcast data
            $broadcastData = [
                'type' => 'message',
                'room_id' => $roomId,
                'data' => $messageData
            ];
            
            // Try HTTP broadcast first (if broadcast server is running)
            if ($this->sendHttpBroadcast($broadcastData)) {
                $this->logBroadcast('HTTP broadcast successful', $roomId, $messageData['user_id'] ?? null);
                return true;
            }
            
            // Fallback to file-based notification system
            $this->createBroadcastNotification($broadcastData);
            $this->logBroadcast('File-based broadcast notification created', $roomId, $messageData['user_id'] ?? null);
            
            return true;
            
        } catch (\Exception $e) {
            $this->logBroadcast('Broadcast failed: ' . $e->getMessage(), $roomId, $messageData['user_id'] ?? null);
            return false;
        }
    }
    
    /**
     * Broadcast user join event
     */
    public function broadcastUserJoin($roomId, $userData) {
        $broadcastData = [
            'type' => 'user_joined',
            'room_id' => $roomId,
            'data' => [
                'user_id' => $userData['user_id'],
                'user_name' => $userData['user_name'],
                'role' => $userData['role'] ?? 'participant',
                'timestamp' => time()
            ]
        ];
        
        return $this->sendBroadcast($broadcastData);
    }
    
    /**
     * Broadcast user leave event
     */
    public function broadcastUserLeave($roomId, $userData) {
        $broadcastData = [
            'type' => 'user_left',
            'room_id' => $roomId,
            'data' => [
                'user_id' => $userData['user_id'],
                'user_name' => $userData['user_name'],
                'timestamp' => time()
            ]
        ];
        
        return $this->sendBroadcast($broadcastData);
    }
    
    /**
     * Broadcast typing indicator
     */
    public function broadcastTyping($roomId, $userData, $isTyping = true) {
        $broadcastData = [
            'type' => 'typing',
            'room_id' => $roomId,
            'data' => [
                'user_id' => $userData['user_id'],
                'user_name' => $userData['user_name'],
                'is_typing' => $isTyping,
                'timestamp' => time()
            ]
        ];
        
        return $this->sendBroadcast($broadcastData);
    }
    
    /**
     * Broadcast room update event
     */
    public function broadcastRoomUpdate($roomId, $updateData) {
        $broadcastData = [
            'type' => 'room_updated',
            'room_id' => $roomId,
            'data' => $updateData
        ];
        
        return $this->sendBroadcast($broadcastData);
    }
    
    /**
     * Send broadcast via HTTP to WebSocket server
     */
    private function sendHttpBroadcast($data) {
        try {
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => [
                        'Content-Type: application/json',
                        'X-Broadcast-Token: ' . $this->getBroadcastToken()
                    ],
                    'content' => json_encode($data),
                    'timeout' => 5
                ]
            ]);
            
            $result = @file_get_contents($this->broadcastEndpoint, false, $context);
            
            if ($result !== false) {
                $response = json_decode($result, true);
                return isset($response['success']) && $response['success'];
            }
            
            return false;
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Generic broadcast method
     */
    private function sendBroadcast($data) {
        try {
            if ($this->sendHttpBroadcast($data)) {
                $this->logBroadcast('HTTP broadcast successful', $data['room_id'], $data['data']['user_id'] ?? null);
                return true;
            }
            
            $this->createBroadcastNotification($data);
            $this->logBroadcast('File-based broadcast notification created', $data['room_id'], $data['data']['user_id'] ?? null);
            
            return true;
            
        } catch (\Exception $e) {
            $this->logBroadcast('Broadcast failed: ' . $e->getMessage(), $data['room_id'], $data['data']['user_id'] ?? null);
            return false;
        }
    }
    
    /**
     * Create file-based broadcast notification for WebSocket server to pick up
     */
    private function createBroadcastNotification($data) {
        $notificationId = uniqid('broadcast_', true);
        $notification = [
            'id' => $notificationId,
            'type' => $data['type'],
            'room_id' => $data['room_id'],
            'data' => $data['data'],
            'created_at' => time(),
            'processed' => false
        ];
        
        $this->storage->save('broadcast/notifications', $notificationId, $notification);
    }
    
    /**
     * Get pending broadcast notifications (for WebSocket server to process)
     */
    public function getPendingNotifications($limit = 50) {
        try {
            $notifications = $this->storage->list('broadcast/notifications', $limit);
            
            // Filter unprocessed notifications
            $pending = array_filter($notifications, function($notification) {
                return !($notification['processed'] ?? false);
            });
            
            // Sort by created_at
            usort($pending, function($a, $b) {
                return ($a['created_at'] ?? 0) - ($b['created_at'] ?? 0);
            });
            
            return $pending;
            
        } catch (\Exception $e) {
            $this->logBroadcast('Failed to get pending notifications: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Mark notification as processed
     */
    public function markNotificationProcessed($notificationId) {
        try {
            $notification = $this->storage->load('broadcast/notifications', $notificationId);
            
            if ($notification) {
                $notification['processed'] = true;
                $notification['processed_at'] = time();
                $this->storage->save('broadcast/notifications', $notificationId, $notification);
                return true;
            }
            
            return false;
            
        } catch (\Exception $e) {
            $this->logBroadcast('Failed to mark notification as processed: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Clean up old processed notifications
     */
    public function cleanupNotifications($olderThanHours = 24) {
        try {
            $cutoffTime = time() - ($olderThanHours * 3600);
            $notifications = $this->storage->list('broadcast/notifications');
            $deletedCount = 0;
            
            foreach ($notifications as $notification) {
                if (($notification['processed'] ?? false) && 
                    ($notification['created_at'] ?? 0) < $cutoffTime) {
                    
                    if ($this->storage->delete('broadcast/notifications', $notification['id'])) {
                        $deletedCount++;
                    }
                }
            }
            
            $this->logBroadcast("Cleaned up {$deletedCount} old notifications");
            return $deletedCount;
            
        } catch (\Exception $e) {
            $this->logBroadcast('Failed to cleanup notifications: ' . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Get broadcast statistics
     */
    public function getBroadcastStats() {
        try {
            $notifications = $this->storage->list('broadcast/notifications');
            $logs = $this->getBroadcastLogs(100);
            
            $stats = [
                'total_notifications' => count($notifications),
                'pending_notifications' => count(array_filter($notifications, function($n) {
                    return !($n['processed'] ?? false);
                })),
                'processed_notifications' => count(array_filter($notifications, function($n) {
                    return $n['processed'] ?? false;
                })),
                'recent_broadcasts' => count($logs),
                'last_broadcast' => !empty($logs) ? $logs[0]['timestamp'] : null,
                'websocket_endpoint' => $this->broadcastEndpoint,
                'status' => $this->checkBroadcastHealth() ? 'healthy' : 'degraded'
            ];
            
            return $stats;
            
        } catch (\Exception $e) {
            return [
                'error' => 'Failed to get broadcast stats: ' . $e->getMessage(),
                'status' => 'error'
            ];
        }
    }
    
    /**
     * Check broadcast system health
     */
    public function checkBroadcastHealth() {
        try {
            // Test HTTP broadcast endpoint
            $testData = [
                'type' => 'health_check',
                'room_id' => 'test',
                'data' => ['timestamp' => time()]
            ];
            
            return $this->sendHttpBroadcast($testData);
            
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * Get broadcast token for authentication
     */
    private function getBroadcastToken() {
        return hash('sha256', 'interviews-tv-broadcast-' . date('Y-m-d'));
    }
    
    /**
     * Log broadcast activity
     */
    private function logBroadcast($message, $roomId = null, $userId = null) {
        $logEntry = [
            'timestamp' => time(),
            'message' => $message,
            'room_id' => $roomId,
            'user_id' => $userId,
            'datetime' => date('Y-m-d H:i:s')
        ];
        
        $this->storage->append('broadcast/logs', date('Y-m-d'), $logEntry);
    }
    
    /**
     * Get recent broadcast logs
     */
    public function getBroadcastLogs($limit = 100) {
        try {
            $today = date('Y-m-d');
            $logs = $this->storage->getArray('broadcast/logs', $today);
            
            // Sort by timestamp (newest first)
            usort($logs, function($a, $b) {
                return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
            });
            
            return array_slice($logs, 0, $limit);
            
        } catch (\Exception $e) {
            return [];
        }
    }
}
