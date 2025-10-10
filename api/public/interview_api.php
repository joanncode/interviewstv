<?php
/**
 * Interview Management API
 * Handles interview rooms, guest invitations, and room management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple file-based storage for development
$dataDir = __DIR__ . '/../../storage';
$roomsFile = $dataDir . '/interview_rooms.json';
$invitationsFile = $dataDir . '/guest_invitations.json';
$participantsFile = $dataDir . '/room_participants.json';

// Ensure storage directory exists
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function loadData($file) {
    if (file_exists($file)) {
        return json_decode(file_get_contents($file), true) ?: [];
    }
    return [];
}

function saveData($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

function generateId($prefix = '') {
    return $prefix . uniqid();
}

function generateCode($length = 8) {
    return strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, $length));
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function sendError($message, $status = 400) {
    sendResponse(['error' => $message], $status);
}

function sendEmail($to, $subject, $htmlContent, $textContent) {
    // For development, just log the email
    $logFile = __DIR__ . '/../../storage/email_log.txt';
    $emailLog = date('Y-m-d H:i:s') . " - TO: $to\n";
    $emailLog .= "SUBJECT: $subject\n";
    $emailLog .= "CONTENT: $htmlContent\n";
    $emailLog .= "---\n\n";
    file_put_contents($logFile, $emailLog, FILE_APPEND);
    
    // In production, integrate with PHPMailer or similar
    return true;
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$action = $_GET['action'] ?? '';
$roomId = $_GET['room_id'] ?? '';
$invitationId = $_GET['invitation_id'] ?? '';

try {
    switch ($method) {
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'create_room') {
                // Create new interview room
                if (!$input || !isset($input['title'])) {
                    sendError('Room title is required');
                }
                
                $roomId = generateId('room_');
                $roomCode = generateCode(8);
                $streamKey = generateCode(16);
                
                $room = [
                    'id' => $roomId,
                    'host_user_id' => $input['host_user_id'] ?? 1,
                    'title' => $input['title'],
                    'description' => $input['description'] ?? '',
                    'scheduled_start' => $input['scheduled_start'] ?? null,
                    'scheduled_end' => $input['scheduled_end'] ?? null,
                    'status' => 'scheduled',
                    'room_code' => $roomCode,
                    'max_guests' => $input['max_guests'] ?? 10,
                    'recording_enabled' => $input['recording_enabled'] ?? true,
                    'chat_enabled' => $input['chat_enabled'] ?? true,
                    'waiting_room_enabled' => $input['waiting_room_enabled'] ?? true,
                    'guest_approval_required' => $input['guest_approval_required'] ?? false,
                    'password_protected' => $input['password_protected'] ?? false,
                    'room_password' => $input['room_password'] ?? null,
                    'stream_key' => $streamKey,
                    'rtmp_url' => "rtmp://localhost:1935/live/$streamKey",
                    'hls_url' => "http://localhost:8080/live/$streamKey/index.m3u8",
                    'webrtc_url' => "wss://localhost:8081/webrtc/$streamKey",
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                    'guests' => [],
                    'participants' => []
                ];
                
                $rooms = loadData($roomsFile);
                $rooms[$roomId] = $room;
                saveData($roomsFile, $rooms);
                
                sendResponse([
                    'success' => true,
                    'data' => $room,
                    'message' => 'Interview room created successfully'
                ], 201);
                
            } elseif ($action === 'invite_guest' && $roomId) {
                // Invite guest to interview room
                if (!$input || !isset($input['email'])) {
                    sendError('Guest email is required');
                }
                
                $rooms = loadData($roomsFile);
                if (!isset($rooms[$roomId])) {
                    sendError('Interview room not found', 404);
                }
                
                $invitationId = generateId('inv_');
                $joinCode = generateCode(6);
                $invitationToken = generateCode(32);
                
                $invitation = [
                    'id' => $invitationId,
                    'room_id' => $roomId,
                    'email' => $input['email'],
                    'guest_name' => $input['guest_name'] ?? '',
                    'join_code' => $joinCode,
                    'invitation_token' => $invitationToken,
                    'role' => $input['role'] ?? 'guest',
                    'status' => 'pending',
                    'invited_at' => date('Y-m-d H:i:s'),
                    'expires_at' => date('Y-m-d H:i:s', strtotime('+7 days')),
                    'email_sent' => false,
                    'join_attempts' => 0,
                    'permissions' => $input['permissions'] ?? [],
                    'custom_message' => $input['custom_message'] ?? ''
                ];
                
                $invitations = loadData($invitationsFile);
                $invitations[$invitationId] = $invitation;
                saveData($invitationsFile, $invitations);
                
                // Add guest to room
                $rooms[$roomId]['guests'][] = $invitationId;
                saveData($roomsFile, $rooms);
                
                // Send invitation email
                $room = $rooms[$roomId];
                $joinUrl = "http://localhost:8080/join?code=$joinCode&token=$invitationToken";
                
                $emailSubject = "You're invited to join an interview on Interviews.tv";
                $emailHtml = "
                    <h2>You're Invited!</h2>
                    <p>You have been invited to join an interview: <strong>{$room['title']}</strong></p>
                    " . ($room['scheduled_start'] ? "<p>Scheduled for: {$room['scheduled_start']}</p>" : "") . "
                    <p><a href='$joinUrl' style='background:#FF0000;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;'>Join Interview</a></p>
                    <p>Or enter this code: <strong>$joinCode</strong></p>
                    " . ($invitation['custom_message'] ? "<p>Message: {$invitation['custom_message']}</p>" : "") . "
                ";
                
                $emailText = "You're invited to join an interview: {$room['title']}\nJoin URL: $joinUrl\nJoin Code: $joinCode";
                
                if (sendEmail($input['email'], $emailSubject, $emailHtml, $emailText)) {
                    $invitation['email_sent'] = true;
                    $invitation['email_sent_at'] = date('Y-m-d H:i:s');
                    $invitations[$invitationId] = $invitation;
                    saveData($invitationsFile, $invitations);
                }
                
                sendResponse([
                    'success' => true,
                    'data' => [
                        'invitation_id' => $invitationId,
                        'join_code' => $joinCode,
                        'join_url' => $joinUrl,
                        'email_sent' => $invitation['email_sent']
                    ],
                    'message' => 'Guest invitation sent successfully'
                ], 201);
                
            } elseif ($action === 'join_room') {
                // Guest joins room with code
                $joinCode = $input['join_code'] ?? '';
                $invitationToken = $input['invitation_token'] ?? '';
                $guestName = $input['guest_name'] ?? '';
                
                if (!$joinCode) {
                    sendError('Join code is required');
                }
                
                // Find invitation by join code
                $invitations = loadData($invitationsFile);
                $invitation = null;
                foreach ($invitations as $inv) {
                    if ($inv['join_code'] === $joinCode) {
                        $invitation = $inv;
                        break;
                    }
                }
                
                if (!$invitation) {
                    sendError('Invalid join code', 404);
                }
                
                if ($invitation['status'] !== 'pending') {
                    sendError('Invitation is no longer valid');
                }
                
                if (strtotime($invitation['expires_at']) < time()) {
                    sendError('Invitation has expired');
                }
                
                // Get room details
                $rooms = loadData($roomsFile);
                $room = $rooms[$invitation['room_id']] ?? null;
                
                if (!$room) {
                    sendError('Interview room not found', 404);
                }
                
                // Create participant
                $participantId = generateId('part_');
                $participant = [
                    'id' => $participantId,
                    'room_id' => $invitation['room_id'],
                    'invitation_id' => $invitation['id'],
                    'guest_name' => $guestName ?: $invitation['guest_name'],
                    'email' => $invitation['email'],
                    'role' => $invitation['role'],
                    'status' => $room['waiting_room_enabled'] ? 'waiting' : 'connected',
                    'joined_at' => date('Y-m-d H:i:s'),
                    'connection_id' => generateCode(16),
                    'peer_id' => generateCode(16),
                    'audio_enabled' => true,
                    'video_enabled' => true,
                    'screen_sharing' => false,
                    'hand_raised' => false,
                    'muted_by_host' => false,
                    'camera_disabled_by_host' => false,
                    'connection_quality' => 'good',
                    'last_activity' => date('Y-m-d H:i:s')
                ];
                
                $participants = loadData($participantsFile);
                $participants[$participantId] = $participant;
                saveData($participantsFile, $participants);
                
                // Update invitation
                $invitation['status'] = 'accepted';
                $invitation['responded_at'] = date('Y-m-d H:i:s');
                $invitation['join_attempts']++;
                $invitation['last_join_attempt'] = date('Y-m-d H:i:s');
                $invitations[$invitation['id']] = $invitation;
                saveData($invitationsFile, $invitations);
                
                // Add participant to room
                $rooms[$invitation['room_id']]['participants'][] = $participantId;
                saveData($roomsFile, $rooms);
                
                sendResponse([
                    'success' => true,
                    'data' => [
                        'participant_id' => $participantId,
                        'room' => $room,
                        'participant' => $participant,
                        'waiting_room' => $room['waiting_room_enabled']
                    ],
                    'message' => 'Successfully joined interview room'
                ]);

            } elseif ($action === 'start_room' && $roomId) {
                // Start interview room
                $rooms = loadData($roomsFile);
                if (!isset($rooms[$roomId])) {
                    sendError('Interview room not found', 404);
                }

                $rooms[$roomId]['status'] = 'live';
                $rooms[$roomId]['actual_start'] = date('Y-m-d H:i:s');
                $rooms[$roomId]['updated_at'] = date('Y-m-d H:i:s');
                saveData($roomsFile, $rooms);

                sendResponse([
                    'success' => true,
                    'data' => $rooms[$roomId],
                    'message' => 'Interview room started'
                ]);

            } elseif ($action === 'end_room' && $roomId) {
                // End interview room
                $rooms = loadData($roomsFile);
                if (!isset($rooms[$roomId])) {
                    sendError('Interview room not found', 404);
                }

                $rooms[$roomId]['status'] = 'ended';
                $rooms[$roomId]['actual_end'] = date('Y-m-d H:i:s');
                $rooms[$roomId]['updated_at'] = date('Y-m-d H:i:s');
                saveData($roomsFile, $rooms);

                sendResponse([
                    'success' => true,
                    'data' => $rooms[$roomId],
                    'message' => 'Interview room ended'
                ]);

            } else {
                sendError('Invalid action', 404);
            }
            break;
            
        case 'GET':
            if ($action === 'room' && $roomId) {
                // Get room details
                $rooms = loadData($roomsFile);
                $room = $rooms[$roomId] ?? null;
                
                if (!$room) {
                    sendError('Room not found', 404);
                }
                
                // Get participants
                $participants = loadData($participantsFile);
                $roomParticipants = array_filter($participants, function($p) use ($roomId) {
                    return $p['room_id'] === $roomId;
                });
                
                $room['active_participants'] = array_values($roomParticipants);
                
                sendResponse([
                    'success' => true,
                    'data' => $room
                ]);
                
            } elseif ($action === 'invitations' && $roomId) {
                // Get room invitations
                $invitations = loadData($invitationsFile);
                $roomInvitations = array_filter($invitations, function($inv) use ($roomId) {
                    return $inv['room_id'] === $roomId;
                });
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($roomInvitations)
                ]);
                
            } else {
                // Get all rooms
                $rooms = loadData($roomsFile);
                sendResponse([
                    'success' => true,
                    'data' => array_values($rooms)
                ]);
            }
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Interview API Error: " . $e->getMessage());
    sendError('Internal server error: ' . $e->getMessage(), 500);
}
?>
