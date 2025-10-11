<?php

namespace App\Services;

use PDO;
use Exception;
use DateTime;
use DateInterval;

/**
 * Guest Invitation Service
 * Handles guest invitations, join codes, and room participation
 */
class GuestInvitationService
{
    private PDO $pdo;
    private EmailNotificationService $emailService;
    private array $config;

    public function __construct()
    {
        // Get database connection
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $this->pdo = $database->getConnection();

        $this->emailService = new EmailNotificationService();

        $this->config = [
            'invitation_expiry_hours' => 24,
            'max_join_attempts' => 5,
            'join_code_length' => 12,
            'invitation_token_length' => 64
        ];
    }

    /**
     * Invite guests to a room
     */
    public function inviteGuests(string $roomId, array $guests, array $options = []): array
    {
        try {
            $invitations = [];
            $sendEmail = $options['send_email'] ?? true;

            foreach ($guests as $guest) {
                $invitation = $this->createInvitation($roomId, $guest);
                
                if ($sendEmail) {
                    $this->sendInvitationEmail($invitation, $options);
                }

                $invitations[] = $invitation;
            }

            return $invitations;

        } catch (Exception $e) {
            throw new Exception('Failed to invite guests: ' . $e->getMessage());
        }
    }

    /**
     * Create a single invitation
     */
    private function createInvitation(string $roomId, array $guestData): array
    {
        try {
            $invitationId = $this->generateInvitationId();
            $joinCode = $this->generateJoinCode();
            $invitationToken = $this->generateInvitationToken();
            
            $expiresAt = new DateTime();
            $expiresAt->add(new DateInterval('PT' . $this->config['invitation_expiry_hours'] . 'H'));

            $stmt = $this->pdo->prepare("
                INSERT INTO guest_invitations (
                    id, room_id, email, guest_name, join_code, invitation_token,
                    role, status, invited_at, expires_at, permissions, custom_message,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $invitationId,
                $roomId,
                $guestData['email'],
                $guestData['name'] ?? '',
                $joinCode,
                $invitationToken,
                $guestData['role'] ?? 'guest',
                $expiresAt->format('Y-m-d H:i:s'),
                json_encode($guestData['permissions'] ?? []),
                $guestData['custom_message'] ?? ''
            ]);

            return $this->getInvitationById($invitationId);

        } catch (Exception $e) {
            throw new Exception('Failed to create invitation: ' . $e->getMessage());
        }
    }

    /**
     * Send invitation email
     */
    private function sendInvitationEmail(array $invitation, array $options): void
    {
        try {
            $joinUrl = $this->generateJoinUrl($invitation['invitation_token']);
            
            $emailData = [
                'to' => $invitation['email'],
                'template' => 'guest_invitation',
                'variables' => [
                    'host_name' => $options['host_name'] ?? 'Host',
                    'room_title' => $options['room_title'] ?? 'Interview',
                    'guest_name' => $invitation['guest_name'] ?: 'Guest',
                    'join_url' => $joinUrl,
                    'join_code' => $invitation['join_code'],
                    'scheduled_time' => $this->formatScheduledTime($invitation['room_id']),
                    'custom_message' => $invitation['custom_message']
                ]
            ];

            $this->emailService->sendTemplatedEmail($emailData);

            // Update invitation as email sent
            $this->markEmailSent($invitation['id']);

        } catch (Exception $e) {
            error_log('Failed to send invitation email: ' . $e->getMessage());
        }
    }

    /**
     * Verify join code
     */
    public function verifyJoinCode(string $joinCode): ?array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT gi.*, ir.title as room_title, ir.status as room_status,
                       ir.scheduled_start, ir.waiting_room_enabled
                FROM guest_invitations gi
                JOIN interview_rooms ir ON gi.room_id = ir.id
                WHERE gi.join_code = ? AND gi.status = 'pending' AND gi.expires_at > NOW()
            ");
            $stmt->execute([$joinCode]);
            
            return $stmt->fetch() ?: null;

        } catch (Exception $e) {
            throw new Exception('Failed to verify join code: ' . $e->getMessage());
        }
    }

    /**
     * Get invitation by token
     */
    public function getInvitationByToken(string $token): ?array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT gi.*, ir.title as room_title, ir.status as room_status,
                       ir.scheduled_start, ir.waiting_room_enabled, ir.host_user_id,
                       u.name as host_name
                FROM guest_invitations gi
                JOIN interview_rooms ir ON gi.room_id = ir.id
                LEFT JOIN users u ON ir.host_user_id = u.id
                WHERE gi.invitation_token = ? AND gi.expires_at > NOW()
            ");
            $stmt->execute([$token]);
            
            return $stmt->fetch() ?: null;

        } catch (Exception $e) {
            throw new Exception('Failed to get invitation: ' . $e->getMessage());
        }
    }

    /**
     * Join room with invitation
     */
    public function joinRoom(string $invitationToken, string $guestName, array $deviceInfo = []): array
    {
        try {
            $invitation = $this->getInvitationByToken($invitationToken);
            
            if (!$invitation) {
                throw new Exception('Invalid or expired invitation');
            }

            if ($invitation['status'] !== 'pending') {
                throw new Exception('Invitation already used or cancelled');
            }

            // Check join attempts
            if ($invitation['join_attempts'] >= $this->config['max_join_attempts']) {
                throw new Exception('Maximum join attempts exceeded');
            }

            // Create participant record
            $participantId = $this->createParticipant($invitation, $guestName, $deviceInfo);

            // Update invitation status
            $this->updateInvitationStatus($invitation['id'], 'accepted', $guestName);

            return [
                'participant_id' => $participantId,
                'room_id' => $invitation['room_id'],
                'waiting_room' => $invitation['waiting_room_enabled'],
                'status' => $invitation['waiting_room_enabled'] ? 'waiting' : 'connected'
            ];

        } catch (Exception $e) {
            // Increment join attempts
            if (isset($invitation['id'])) {
                $this->incrementJoinAttempts($invitation['id']);
            }
            throw new Exception('Failed to join room: ' . $e->getMessage());
        }
    }

    /**
     * Create participant record
     */
    private function createParticipant(array $invitation, string $guestName, array $deviceInfo): string
    {
        try {
            $participantId = $this->generateParticipantId();
            $connectionId = $this->generateConnectionId();

            $stmt = $this->pdo->prepare("
                INSERT INTO room_participants (
                    id, room_id, invitation_id, guest_name, email, role, status,
                    connection_id, audio_enabled, video_enabled, joined_at,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
            ");

            $stmt->execute([
                $participantId,
                $invitation['room_id'],
                $invitation['id'],
                $guestName,
                $invitation['email'],
                $invitation['role'],
                $invitation['waiting_room_enabled'] ? 'waiting' : 'connected',
                $connectionId,
                $deviceInfo['audio_enabled'] ?? true,
                $deviceInfo['video_enabled'] ?? true
            ]);

            return $participantId;

        } catch (Exception $e) {
            throw new Exception('Failed to create participant: ' . $e->getMessage());
        }
    }

    /**
     * Accept invitation
     */
    public function acceptInvitation(string $token, string $guestName): array
    {
        try {
            $invitation = $this->getInvitationByToken($token);
            
            if (!$invitation) {
                throw new Exception('Invalid or expired invitation');
            }

            $this->updateInvitationStatus($invitation['id'], 'accepted', $guestName);

            return [
                'invitation_id' => $invitation['id'],
                'room_id' => $invitation['room_id'],
                'join_url' => $this->generateJoinUrl($token),
                'message' => 'Invitation accepted successfully'
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to accept invitation: ' . $e->getMessage());
        }
    }

    /**
     * Decline invitation
     */
    public function declineInvitation(string $token): void
    {
        try {
            $invitation = $this->getInvitationByToken($token);
            
            if (!$invitation) {
                throw new Exception('Invalid or expired invitation');
            }

            $this->updateInvitationStatus($invitation['id'], 'declined');

        } catch (Exception $e) {
            throw new Exception('Failed to decline invitation: ' . $e->getMessage());
        }
    }

    /**
     * Get room invitations
     */
    public function getRoomInvitations(string $roomId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT gi.*, 
                       CASE WHEN gi.expires_at < NOW() THEN 'expired' ELSE gi.status END as current_status
                FROM guest_invitations gi
                WHERE gi.room_id = ?
                ORDER BY gi.created_at DESC
            ");
            $stmt->execute([$roomId]);
            
            return $stmt->fetchAll();

        } catch (Exception $e) {
            throw new Exception('Failed to get room invitations: ' . $e->getMessage());
        }
    }

    /**
     * Cancel invitation
     */
    public function cancelInvitation(string $invitationId): void
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE guest_invitations 
                SET status = 'cancelled', updated_at = NOW()
                WHERE id = ? AND status = 'pending'
            ");
            $stmt->execute([$invitationId]);

        } catch (Exception $e) {
            throw new Exception('Failed to cancel invitation: ' . $e->getMessage());
        }
    }

    /**
     * Resend invitation
     */
    public function resendInvitation(string $invitationId, array $options = []): void
    {
        try {
            $invitation = $this->getInvitationById($invitationId);
            
            if (!$invitation) {
                throw new Exception('Invitation not found');
            }

            // Extend expiry
            $newExpiry = new DateTime();
            $newExpiry->add(new DateInterval('PT' . $this->config['invitation_expiry_hours'] . 'H'));

            $stmt = $this->pdo->prepare("
                UPDATE guest_invitations 
                SET expires_at = ?, reminder_sent = 1, reminder_sent_at = NOW(), updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$newExpiry->format('Y-m-d H:i:s'), $invitationId]);

            // Send email
            $this->sendInvitationEmail($invitation, $options);

        } catch (Exception $e) {
            throw new Exception('Failed to resend invitation: ' . $e->getMessage());
        }
    }

    /**
     * Check if can join room
     */
    public function canJoinRoom(string $invitationId): bool
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT gi.status, gi.expires_at, gi.join_attempts, ir.status as room_status
                FROM guest_invitations gi
                JOIN interview_rooms ir ON gi.room_id = ir.id
                WHERE gi.id = ?
            ");
            $stmt->execute([$invitationId]);
            
            $result = $stmt->fetch();
            
            if (!$result) {
                return false;
            }

            return $result['status'] === 'pending' &&
                   $result['expires_at'] > date('Y-m-d H:i:s') &&
                   $result['join_attempts'] < $this->config['max_join_attempts'] &&
                   in_array($result['room_status'], ['scheduled', 'waiting', 'live']);

        } catch (Exception $e) {
            return false;
        }
    }

    // Helper methods for generating IDs and codes
    private function generateInvitationId(): string
    {
        return 'inv_' . bin2hex(random_bytes(16));
    }

    private function generateJoinCode(): string
    {
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';
        for ($i = 0; $i < $this->config['join_code_length']; $i++) {
            $code .= $characters[random_int(0, strlen($characters) - 1)];
        }
        return $code;
    }

    private function generateInvitationToken(): string
    {
        return bin2hex(random_bytes($this->config['invitation_token_length'] / 2));
    }

    private function generateParticipantId(): string
    {
        return 'part_' . bin2hex(random_bytes(16));
    }

    private function generateConnectionId(): string
    {
        return 'conn_' . bin2hex(random_bytes(16));
    }

    private function generateJoinUrl(string $token): string
    {
        $baseUrl = $_ENV['APP_URL'] ?? 'https://interviews.tv';
        return "$baseUrl/join/$token";
    }

    /**
     * Get invitation by ID
     */
    private function getInvitationById(string $invitationId): ?array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT gi.*, ir.title as room_title, ir.scheduled_start
                FROM guest_invitations gi
                JOIN interview_rooms ir ON gi.room_id = ir.id
                WHERE gi.id = ?
            ");
            $stmt->execute([$invitationId]);

            return $stmt->fetch() ?: null;

        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Update invitation status
     */
    private function updateInvitationStatus(string $invitationId, string $status, ?string $guestName = null): void
    {
        try {
            $sql = "UPDATE guest_invitations SET status = ?, responded_at = NOW(), updated_at = NOW()";
            $params = [$status];

            if ($guestName) {
                $sql .= ", guest_name = ?";
                $params[] = $guestName;
            }

            $sql .= " WHERE id = ?";
            $params[] = $invitationId;

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

        } catch (Exception $e) {
            throw new Exception('Failed to update invitation status: ' . $e->getMessage());
        }
    }

    /**
     * Mark email as sent
     */
    private function markEmailSent(string $invitationId): void
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE guest_invitations
                SET email_sent = 1, email_sent_at = NOW(), updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$invitationId]);

        } catch (Exception $e) {
            error_log('Failed to mark email as sent: ' . $e->getMessage());
        }
    }

    /**
     * Increment join attempts
     */
    private function incrementJoinAttempts(string $invitationId): void
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE guest_invitations
                SET join_attempts = join_attempts + 1, last_join_attempt = NOW(), updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$invitationId]);

        } catch (Exception $e) {
            error_log('Failed to increment join attempts: ' . $e->getMessage());
        }
    }

    /**
     * Format scheduled time for email
     */
    private function formatScheduledTime(string $roomId): string
    {
        try {
            $stmt = $this->pdo->prepare("SELECT scheduled_start FROM interview_rooms WHERE id = ?");
            $stmt->execute([$roomId]);
            $result = $stmt->fetch();

            if ($result && $result['scheduled_start']) {
                $date = new DateTime($result['scheduled_start']);
                return $date->format('F j, Y \a\t g:i A T');
            }

            return 'TBD';

        } catch (Exception $e) {
            return 'TBD';
        }
    }

    /**
     * Get waiting room status
     */
    public function getWaitingRoomStatus(string $participantId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT rp.*, ir.title as room_title, ir.status as room_status,
                       ir.host_user_id, u.name as host_name
                FROM room_participants rp
                JOIN interview_rooms ir ON rp.room_id = ir.id
                LEFT JOIN users u ON ir.host_user_id = u.id
                WHERE rp.id = ?
            ");
            $stmt->execute([$participantId]);

            $participant = $stmt->fetch();

            if (!$participant) {
                throw new Exception('Participant not found');
            }

            return [
                'status' => $participant['status'],
                'room_title' => $participant['room_title'],
                'room_status' => $participant['room_status'],
                'host_name' => $participant['host_name'],
                'waiting_since' => $participant['joined_at'],
                'can_join' => $participant['status'] === 'connected' || $participant['room_status'] === 'live'
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to get waiting room status: ' . $e->getMessage());
        }
    }

    /**
     * Update participant settings
     */
    public function updateParticipantSettings(string $participantId, array $settings): void
    {
        try {
            $updateFields = [];
            $updateValues = [];

            $allowedFields = ['audio_enabled', 'video_enabled'];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $settings)) {
                    $updateFields[] = "$field = ?";
                    $updateValues[] = $settings[$field] ? 1 : 0;
                }
            }

            if (empty($updateFields)) {
                return;
            }

            $updateValues[] = $participantId;

            $stmt = $this->pdo->prepare("
                UPDATE room_participants
                SET " . implode(', ', $updateFields) . ", last_activity = NOW(), updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute($updateValues);

        } catch (Exception $e) {
            throw new Exception('Failed to update participant settings: ' . $e->getMessage());
        }
    }

    /**
     * Leave room
     */
    public function leaveRoom(string $participantId): void
    {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE room_participants
                SET status = 'left', left_at = NOW(), updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$participantId]);

        } catch (Exception $e) {
            throw new Exception('Failed to leave room: ' . $e->getMessage());
        }
    }

    /**
     * Test device capabilities
     */
    public function testDeviceCapabilities(array $testData): array
    {
        // This would typically interface with WebRTC APIs
        // For now, return a mock response
        return [
            'audio_test' => [
                'available' => $testData['audio_test'] ?? true,
                'quality' => 'good',
                'devices' => []
            ],
            'video_test' => [
                'available' => $testData['video_test'] ?? true,
                'quality' => 'good',
                'devices' => []
            ],
            'network_test' => [
                'latency' => 50,
                'bandwidth' => 'sufficient',
                'quality' => 'good'
            ]
        ];
    }
}
