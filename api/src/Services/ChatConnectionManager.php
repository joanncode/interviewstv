<?php

namespace InterviewsTV\Services;

/**
 * Chat Connection Management Service
 * Handles WebSocket connections, reconnection, heartbeat, and error handling
 */
class ChatConnectionManager {
    private $storage;
    private $connections;
    private $heartbeatInterval;
    private $connectionTimeout;
    private $maxReconnectAttempts;
    private $reconnectDelay;
    
    public function __construct() {
        $this->storage = new FileStorageService();
        $this->connections = [];
        $this->heartbeatInterval = 30; // 30 seconds
        $this->connectionTimeout = 60; // 60 seconds
        $this->maxReconnectAttempts = 5;
        $this->reconnectDelay = [1, 2, 4, 8, 16]; // Exponential backoff in seconds
    }
    
    /**
     * Register new WebSocket connection
     */
    public function registerConnection($connection, array $connectionData) {
        try {
            $connectionId = uniqid('conn_', true);
            $now = time();
            
            $connectionInfo = [
                'id' => $connectionId,
                'user_id' => $connectionData['user_id'],
                'user_name' => $connectionData['user_name'],
                'room_id' => $connectionData['room_id'],
                'session_id' => $connectionData['session_id'],
                'connected_at' => $now,
                'last_heartbeat' => $now,
                'last_activity' => $now,
                'status' => 'connected',
                'ip_address' => $connectionData['ip_address'] ?? 'unknown',
                'user_agent' => $connectionData['user_agent'] ?? 'unknown',
                'protocol_version' => $connectionData['protocol_version'] ?? '1.0',
                'reconnect_count' => 0,
                'total_messages_sent' => 0,
                'total_messages_received' => 0,
                'connection_quality' => 'good',
                'latency' => 0,
                'metadata' => $connectionData['metadata'] ?? []
            ];
            
            // Store connection info
            $this->connections[$connectionId] = $connectionInfo;
            $this->storage->save('chat/connections', $connectionId, $connectionInfo);
            
            // Add to room connections index
            $this->addToRoomIndex($connectionData['room_id'], $connectionId);
            
            // Add to user connections index
            $this->addToUserIndex($connectionData['user_id'], $connectionId);
            
            // Set connection properties
            $connection->connectionId = $connectionId;
            $connection->userId = $connectionData['user_id'];
            $connection->userName = $connectionData['user_name'];
            $connection->roomId = $connectionData['room_id'];
            $connection->sessionId = $connectionData['session_id'];
            $connection->lastHeartbeat = $now;
            
            // Start heartbeat monitoring
            $this->startHeartbeatMonitoring($connectionId);
            
            // Broadcast user joined event
            $this->broadcastUserEvent($connectionData['room_id'], $connectionData['user_id'], 'joined');
            
            $this->logConnection("Connection registered: $connectionId for user {$connectionData['user_id']}");
            
            return $connectionId;
            
        } catch (\Exception $e) {
            $this->logConnection("Failed to register connection: " . $e->getMessage(), 'error');
            throw new \Exception("Failed to register connection: " . $e->getMessage());
        }
    }
    
    /**
     * Handle connection disconnection
     */
    public function handleDisconnection($connection, string $reason = 'unknown') {
        try {
            $connectionId = $connection->connectionId ?? null;
            
            if (!$connectionId) {
                return;
            }
            
            $connectionInfo = $this->connections[$connectionId] ?? null;
            
            if ($connectionInfo) {
                // Update connection status
                $connectionInfo['status'] = 'disconnected';
                $connectionInfo['disconnected_at'] = time();
                $connectionInfo['disconnect_reason'] = $reason;
                
                // Save final connection state
                $this->storage->save('chat/connections', $connectionId, $connectionInfo);
                
                // Remove from active connections
                unset($this->connections[$connectionId]);
                
                // Remove from indexes
                $this->removeFromRoomIndex($connectionInfo['room_id'], $connectionId);
                $this->removeFromUserIndex($connectionInfo['user_id'], $connectionId);
                
                // Broadcast user left event
                $this->broadcastUserEvent($connectionInfo['room_id'], $connectionInfo['user_id'], 'left');
                
                $this->logConnection("Connection disconnected: $connectionId (reason: $reason)");
            }
            
        } catch (\Exception $e) {
            $this->logConnection("Error handling disconnection: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Handle heartbeat from connection
     */
    public function handleHeartbeat($connection, array $heartbeatData = []) {
        try {
            $connectionId = $connection->connectionId ?? null;
            
            if (!$connectionId || !isset($this->connections[$connectionId])) {
                return false;
            }
            
            $now = time();
            $connectionInfo = &$this->connections[$connectionId];
            
            // Update heartbeat timestamp
            $connectionInfo['last_heartbeat'] = $now;
            $connectionInfo['last_activity'] = $now;
            $connection->lastHeartbeat = $now;
            
            // Update latency if provided
            if (isset($heartbeatData['client_timestamp'])) {
                $latency = ($now * 1000) - $heartbeatData['client_timestamp'];
                $connectionInfo['latency'] = $latency;
                
                // Update connection quality based on latency
                $connectionInfo['connection_quality'] = $this->assessConnectionQuality($latency);
            }
            
            // Update connection statistics
            if (isset($heartbeatData['stats'])) {
                $connectionInfo['client_stats'] = $heartbeatData['stats'];
            }
            
            // Save updated connection info
            $this->storage->save('chat/connections', $connectionId, $connectionInfo);
            
            // Send heartbeat response
            $this->sendHeartbeatResponse($connection, [
                'server_timestamp' => $now * 1000,
                'connection_quality' => $connectionInfo['connection_quality'],
                'next_heartbeat' => $this->heartbeatInterval
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            $this->logConnection("Heartbeat handling failed: " . $e->getMessage(), 'error');
            return false;
        }
    }
    
    /**
     * Check for stale connections and clean them up
     */
    public function cleanupStaleConnections() {
        try {
            $now = time();
            $staleThreshold = $now - $this->connectionTimeout;
            $cleanedCount = 0;
            
            foreach ($this->connections as $connectionId => $connectionInfo) {
                $lastHeartbeat = $connectionInfo['last_heartbeat'] ?? 0;
                
                if ($lastHeartbeat < $staleThreshold) {
                    // Connection is stale
                    $this->logConnection("Cleaning up stale connection: $connectionId");
                    
                    // Mark as disconnected
                    $connectionInfo['status'] = 'timeout';
                    $connectionInfo['disconnected_at'] = $now;
                    $connectionInfo['disconnect_reason'] = 'heartbeat_timeout';
                    
                    // Save final state
                    $this->storage->save('chat/connections', $connectionId, $connectionInfo);
                    
                    // Remove from active connections
                    unset($this->connections[$connectionId]);
                    
                    // Remove from indexes
                    $this->removeFromRoomIndex($connectionInfo['room_id'], $connectionId);
                    $this->removeFromUserIndex($connectionInfo['user_id'], $connectionId);
                    
                    // Broadcast user left event
                    $this->broadcastUserEvent($connectionInfo['room_id'], $connectionInfo['user_id'], 'timeout');
                    
                    $cleanedCount++;
                }
            }
            
            if ($cleanedCount > 0) {
                $this->logConnection("Cleaned up $cleanedCount stale connections");
            }
            
            return $cleanedCount;
            
        } catch (\Exception $e) {
            $this->logConnection("Stale connection cleanup failed: " . $e->getMessage(), 'error');
            return 0;
        }
    }
    
    /**
     * Get connection statistics
     */
    public function getConnectionStats(string $roomId = null) {
        try {
            $stats = [
                'total_connections' => count($this->connections),
                'connections_by_room' => [],
                'connections_by_quality' => ['good' => 0, 'fair' => 0, 'poor' => 0],
                'average_latency' => 0,
                'uptime_stats' => []
            ];
            
            $totalLatency = 0;
            $latencyCount = 0;
            
            foreach ($this->connections as $connectionInfo) {
                // Filter by room if specified
                if ($roomId && $connectionInfo['room_id'] !== $roomId) {
                    continue;
                }
                
                // Count by room
                $room = $connectionInfo['room_id'];
                $stats['connections_by_room'][$room] = ($stats['connections_by_room'][$room] ?? 0) + 1;
                
                // Count by quality
                $quality = $connectionInfo['connection_quality'] ?? 'good';
                $stats['connections_by_quality'][$quality]++;
                
                // Calculate average latency
                if ($connectionInfo['latency'] > 0) {
                    $totalLatency += $connectionInfo['latency'];
                    $latencyCount++;
                }
            }
            
            if ($latencyCount > 0) {
                $stats['average_latency'] = round($totalLatency / $latencyCount, 2);
            }
            
            return $stats;
            
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
    
    /**
     * Get connections for a specific room
     */
    public function getRoomConnections(string $roomId) {
        try {
            $roomIndex = $this->storage->load('chat/room_connections', $roomId) ?? [];
            $connections = [];
            
            foreach ($roomIndex as $connectionId) {
                if (isset($this->connections[$connectionId])) {
                    $connections[] = $this->connections[$connectionId];
                }
            }
            
            return $connections;
            
        } catch (\Exception $e) {
            return [];
        }
    }
    
    /**
     * Get connections for a specific user
     */
    public function getUserConnections(string $userId) {
        try {
            $userIndex = $this->storage->load('chat/user_connections', $userId) ?? [];
            $connections = [];
            
            foreach ($userIndex as $connectionId) {
                if (isset($this->connections[$connectionId])) {
                    $connections[] = $this->connections[$connectionId];
                }
            }
            
            return $connections;
            
        } catch (\Exception $e) {
            return [];
        }
    }
    
    /**
     * Update connection activity
     */
    public function updateActivity($connection, string $activity = 'message') {
        try {
            $connectionId = $connection->connectionId ?? null;
            
            if ($connectionId && isset($this->connections[$connectionId])) {
                $this->connections[$connectionId]['last_activity'] = time();
                
                // Increment activity counters
                switch ($activity) {
                    case 'message_sent':
                        $this->connections[$connectionId]['total_messages_sent']++;
                        break;
                    case 'message_received':
                        $this->connections[$connectionId]['total_messages_received']++;
                        break;
                }
                
                // Periodically save to storage
                if (rand(1, 10) === 1) { // 10% chance
                    $this->storage->save('chat/connections', $connectionId, $this->connections[$connectionId]);
                }
            }
            
        } catch (\Exception $e) {
            $this->logConnection("Failed to update activity: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Start heartbeat monitoring for connection
     */
    private function startHeartbeatMonitoring(string $connectionId) {
        // In a real implementation, this would set up a timer/scheduler
        // For now, we'll rely on periodic cleanup calls
        $this->logConnection("Heartbeat monitoring started for connection: $connectionId");
    }
    
    /**
     * Send heartbeat response to connection
     */
    private function sendHeartbeatResponse($connection, array $data) {
        try {
            $response = [
                'type' => 'heartbeat_response',
                'data' => $data
            ];
            
            // In a real WebSocket implementation, you would send this to the connection
            // $connection->send(json_encode($response));
            
        } catch (\Exception $e) {
            $this->logConnection("Failed to send heartbeat response: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Assess connection quality based on latency
     */
    private function assessConnectionQuality(int $latency) {
        if ($latency < 100) {
            return 'good';
        } elseif ($latency < 300) {
            return 'fair';
        } else {
            return 'poor';
        }
    }
    
    /**
     * Add connection to room index
     */
    private function addToRoomIndex(string $roomId, string $connectionId) {
        try {
            $roomIndex = $this->storage->load('chat/room_connections', $roomId) ?? [];
            $roomIndex[] = $connectionId;
            $this->storage->save('chat/room_connections', $roomId, array_unique($roomIndex));
        } catch (\Exception $e) {
            $this->logConnection("Failed to add to room index: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Remove connection from room index
     */
    private function removeFromRoomIndex(string $roomId, string $connectionId) {
        try {
            $roomIndex = $this->storage->load('chat/room_connections', $roomId) ?? [];
            $roomIndex = array_filter($roomIndex, function($id) use ($connectionId) {
                return $id !== $connectionId;
            });
            $this->storage->save('chat/room_connections', $roomId, array_values($roomIndex));
        } catch (\Exception $e) {
            $this->logConnection("Failed to remove from room index: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Add connection to user index
     */
    private function addToUserIndex(string $userId, string $connectionId) {
        try {
            $userIndex = $this->storage->load('chat/user_connections', $userId) ?? [];
            $userIndex[] = $connectionId;
            $this->storage->save('chat/user_connections', $userId, array_unique($userIndex));
        } catch (\Exception $e) {
            $this->logConnection("Failed to add to user index: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Remove connection from user index
     */
    private function removeFromUserIndex(string $userId, string $connectionId) {
        try {
            $userIndex = $this->storage->load('chat/user_connections', $userId) ?? [];
            $userIndex = array_filter($userIndex, function($id) use ($connectionId) {
                return $id !== $connectionId;
            });
            $this->storage->save('chat/user_connections', $userId, array_values($userIndex));
        } catch (\Exception $e) {
            $this->logConnection("Failed to remove from user index: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Broadcast user event to room
     */
    private function broadcastUserEvent(string $roomId, string $userId, string $event) {
        try {
            // This would integrate with the message broadcaster
            $eventData = [
                'type' => 'user_event',
                'room_id' => $roomId,
                'user_id' => $userId,
                'event' => $event,
                'timestamp' => time()
            ];
            
            // Log the event for now
            $this->logConnection("User event: $event for user $userId in room $roomId");
            
        } catch (\Exception $e) {
            $this->logConnection("Failed to broadcast user event: " . $e->getMessage(), 'error');
        }
    }
    
    /**
     * Log connection events
     */
    private function logConnection(string $message, string $level = 'info') {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[$timestamp] [$level] $message";
        
        error_log($logEntry);
        
        // Also save to connection log file
        try {
            $this->storage->append('chat/connection_logs', date('Y-m-d'), [
                'timestamp' => time(),
                'level' => $level,
                'message' => $message
            ]);
        } catch (\Exception $e) {
            // Silently fail log storage
        }
    }
}
