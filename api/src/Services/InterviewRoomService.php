<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Interview Room Service
 * Handles interview room creation, management, and access control
 */
class InterviewRoomService
{
    private PDO $pdo;
    private array $config;

    public function __construct()
    {
        // Get database connection
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $this->pdo = $database->getConnection();

        $this->config = [
            'max_guests_default' => 10,
            'max_guests_limit' => 50,
            'default_duration_hours' => 2,
            'max_duration_hours' => 8
        ];
    }

    /**
     * Create a new interview room
     */
    public function createRoom(int $hostUserId, array $data): array
    {
        try {
            $roomId = $this->generateRoomId();
            $roomCode = $this->generateRoomCode();
            $streamKey = $this->generateStreamKey();

            // Set defaults
            $data = array_merge([
                'max_guests' => $this->config['max_guests_default'],
                'recording_enabled' => true,
                'auto_recording_enabled' => false,
                'chat_enabled' => true,
                'waiting_room_enabled' => true,
                'guest_approval_required' => false,
                'password_protected' => false
            ], $data);

            // Calculate scheduled_end if not provided
            if (!isset($data['scheduled_end']) && isset($data['scheduled_start'])) {
                $scheduledStart = new \DateTime($data['scheduled_start']);
                $scheduledEnd = clone $scheduledStart;
                $scheduledEnd->add(new \DateInterval('PT' . $this->config['default_duration_hours'] . 'H'));
                $data['scheduled_end'] = $scheduledEnd->format('Y-m-d H:i:s');
            }

            // Hash password if provided
            if ($data['password_protected'] && !empty($data['room_password'])) {
                $data['room_password'] = password_hash($data['room_password'], PASSWORD_DEFAULT);
            } else {
                $data['room_password'] = null;
            }

            $stmt = $this->pdo->prepare("
                INSERT INTO interview_rooms (
                    id, host_user_id, title, description, scheduled_start, scheduled_end,
                    status, room_code, max_guests, recording_enabled, auto_recording_enabled,
                    chat_enabled, waiting_room_enabled, guest_approval_required, password_protected,
                    room_password, stream_key, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $roomId,
                $hostUserId,
                $data['title'],
                $data['description'] ?? '',
                $data['scheduled_start'],
                $data['scheduled_end'],
                $roomCode,
                $data['max_guests'],
                $data['recording_enabled'] ? 1 : 0,
                $data['auto_recording_enabled'] ? 1 : 0,
                $data['chat_enabled'] ? 1 : 0,
                $data['waiting_room_enabled'] ? 1 : 0,
                $data['guest_approval_required'] ? 1 : 0,
                $data['password_protected'] ? 1 : 0,
                $data['room_password'],
                $streamKey
            ]);

            // Generate streaming URLs
            $streamingUrls = $this->generateStreamingUrls($roomId, $streamKey);

            // Update room with streaming URLs
            $this->updateStreamingUrls($roomId, $streamingUrls);

            return $this->getRoomById($roomId);

        } catch (Exception $e) {
            throw new Exception('Failed to create interview room: ' . $e->getMessage());
        }
    }

    /**
     * Get room by ID
     */
    public function getRoomById(string $roomId): ?array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT ir.*, u.name as host_name, u.email as host_email
                FROM interview_rooms ir
                LEFT JOIN users u ON ir.host_user_id = u.id
                WHERE ir.id = ?
            ");
            $stmt->execute([$roomId]);
            
            $room = $stmt->fetch();
            if (!$room) {
                return null;
            }

            // Convert boolean fields
            $booleanFields = ['recording_enabled', 'auto_recording_enabled', 'chat_enabled', 'waiting_room_enabled',
                             'guest_approval_required', 'password_protected'];
            foreach ($booleanFields as $field) {
                $room[$field] = (bool) $room[$field];
            }

            // Don't expose password hash
            unset($room['room_password']);

            return $room;

        } catch (Exception $e) {
            throw new Exception('Failed to retrieve room: ' . $e->getMessage());
        }
    }

    /**
     * Update interview room
     */
    public function updateRoom(string $roomId, array $data): array
    {
        try {
            $updateFields = [];
            $updateValues = [];

            $allowedFields = [
                'title', 'description', 'scheduled_start', 'scheduled_end',
                'max_guests', 'recording_enabled', 'auto_recording_enabled', 'chat_enabled',
                'waiting_room_enabled', 'guest_approval_required',
                'password_protected', 'room_password'
            ];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    if ($field === 'room_password' && !empty($data[$field])) {
                        $updateFields[] = "$field = ?";
                        $updateValues[] = password_hash($data[$field], PASSWORD_DEFAULT);
                    } elseif (in_array($field, ['recording_enabled', 'auto_recording_enabled', 'chat_enabled', 'waiting_room_enabled',
                                               'guest_approval_required', 'password_protected'])) {
                        $updateFields[] = "$field = ?";
                        $updateValues[] = $data[$field] ? 1 : 0;
                    } else {
                        $updateFields[] = "$field = ?";
                        $updateValues[] = $data[$field];
                    }
                }
            }

            if (empty($updateFields)) {
                return $this->getRoomById($roomId);
            }

            $updateValues[] = $roomId;

            $stmt = $this->pdo->prepare("
                UPDATE interview_rooms 
                SET " . implode(', ', $updateFields) . ", updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute($updateValues);

            return $this->getRoomById($roomId);

        } catch (Exception $e) {
            throw new Exception('Failed to update room: ' . $e->getMessage());
        }
    }

    /**
     * Delete interview room
     */
    public function deleteRoom(string $roomId): bool
    {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM interview_rooms WHERE id = ?");
            $stmt->execute([$roomId]);

            return $stmt->rowCount() > 0;

        } catch (Exception $e) {
            throw new Exception('Failed to delete room: ' . $e->getMessage());
        }
    }

    /**
     * Get user's rooms
     */
    public function getUserRooms(int $userId, int $page = 1, int $limit = 20, ?string $status = null): array
    {
        try {
            $offset = ($page - 1) * $limit;
            
            $whereClause = "WHERE ir.host_user_id = ?";
            $params = [$userId];

            if ($status) {
                $whereClause .= " AND ir.status = ?";
                $params[] = $status;
            }

            // Get total count
            $countStmt = $this->pdo->prepare("
                SELECT COUNT(*) as total 
                FROM interview_rooms ir 
                $whereClause
            ");
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];

            // Get rooms
            $stmt = $this->pdo->prepare("
                SELECT ir.*, 
                       COUNT(gi.id) as invited_guests,
                       COUNT(CASE WHEN gi.status = 'accepted' THEN 1 END) as accepted_guests
                FROM interview_rooms ir
                LEFT JOIN guest_invitations gi ON ir.id = gi.room_id
                $whereClause
                GROUP BY ir.id
                ORDER BY ir.scheduled_start DESC
                LIMIT ? OFFSET ?
            ");
            
            $params[] = $limit;
            $params[] = $offset;
            $stmt->execute($params);
            
            $rooms = $stmt->fetchAll();

            // Convert boolean fields
            foreach ($rooms as &$room) {
                $booleanFields = ['recording_enabled', 'auto_recording_enabled', 'chat_enabled', 'waiting_room_enabled',
                                 'guest_approval_required', 'password_protected'];
                foreach ($booleanFields as $field) {
                    $room[$field] = (bool) $room[$field];
                }
                unset($room['room_password']);
            }

            return [
                'rooms' => $rooms,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to retrieve user rooms: ' . $e->getMessage());
        }
    }

    /**
     * Check if user has access to room
     */
    public function hasAccess(?int $userId, string $roomId): bool
    {
        try {
            if (!$userId) {
                return false;
            }

            // Check if user is host
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as count 
                FROM interview_rooms 
                WHERE id = ? AND host_user_id = ?
            ");
            $stmt->execute([$roomId, $userId]);
            
            if ($stmt->fetch()['count'] > 0) {
                return true;
            }

            // Check if user has invitation
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as count 
                FROM guest_invitations gi
                JOIN users u ON gi.email = u.email
                WHERE gi.room_id = ? AND u.id = ? AND gi.status IN ('pending', 'accepted')
            ");
            $stmt->execute([$roomId, $userId]);
            
            return $stmt->fetch()['count'] > 0;

        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Generate unique room ID
     */
    private function generateRoomId(): string
    {
        return 'room_' . bin2hex(random_bytes(16));
    }

    /**
     * Generate unique room code
     */
    private function generateRoomCode(): string
    {
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= $characters[random_int(0, strlen($characters) - 1)];
        }
        return $code;
    }

    /**
     * Generate stream key
     */
    private function generateStreamKey(): string
    {
        return 'sk_' . bin2hex(random_bytes(24));
    }

    /**
     * Generate streaming URLs
     */
    private function generateStreamingUrls(string $roomId, string $streamKey): array
    {
        $baseUrl = $_ENV['STREAMING_BASE_URL'] ?? 'https://stream.interviews.tv';
        
        return [
            'rtmp_url' => "$baseUrl/live/$streamKey",
            'hls_url' => "$baseUrl/hls/$streamKey/index.m3u8",
            'webrtc_url' => "$baseUrl/webrtc/$roomId"
        ];
    }

    /**
     * Update streaming URLs in database
     */
    private function updateStreamingUrls(string $roomId, array $urls): void
    {
        $stmt = $this->pdo->prepare("
            UPDATE interview_rooms 
            SET rtmp_url = ?, hls_url = ?, webrtc_url = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $urls['rtmp_url'],
            $urls['hls_url'],
            $urls['webrtc_url'],
            $roomId
        ]);
    }
}
