<?php
/**
 * Real-time Chat Server for Interview Platform
 * Handles WebSocket connections and message broadcasting
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
$messagesFile = $dataDir . '/chat_messages.json';
$participantsFile = $dataDir . '/chat_participants.json';
$roomsFile = $dataDir . '/chat_rooms.json';

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

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function sendError($message, $status = 400) {
    sendResponse(['error' => $message], $status);
}

function broadcastMessage($roomId, $message) {
    // In a real implementation, this would use WebSocket broadcasting
    // For now, we'll store the message and simulate real-time updates
    $messages = loadData($GLOBALS['messagesFile']);
    $messages[] = $message;
    saveData($GLOBALS['messagesFile'], $messages);
    
    // Log broadcast for development
    error_log("Broadcasting message to room $roomId: " . json_encode($message));
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$roomId = $_GET['room_id'] ?? '';
$participantId = $_GET['participant_id'] ?? '';

try {
    switch ($method) {
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'join_chat' && $roomId) {
                // Join chat room
                if (!$input || !isset($input['participant_name'])) {
                    sendError('Participant name is required');
                }
                
                $participantId = generateId('part_');
                $participant = [
                    'id' => $participantId,
                    'room_id' => $roomId,
                    'name' => $input['participant_name'],
                    'role' => $input['role'] ?? 'guest',
                    'joined_at' => date('Y-m-d H:i:s'),
                    'last_activity' => date('Y-m-d H:i:s'),
                    'is_online' => true,
                    'is_muted' => false,
                    'avatar' => $input['avatar'] ?? null
                ];
                
                $participants = loadData($participantsFile);
                $participants[$participantId] = $participant;
                saveData($participantsFile, $participants);
                
                // Send system message
                $systemMessage = [
                    'id' => generateId('msg_'),
                    'room_id' => $roomId,
                    'participant_id' => 'system',
                    'participant_name' => 'System',
                    'message_type' => 'system',
                    'content' => $input['participant_name'] . ' joined the chat',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'is_private' => false
                ];
                
                broadcastMessage($roomId, $systemMessage);
                
                sendResponse([
                    'success' => true,
                    'data' => [
                        'participant_id' => $participantId,
                        'participant' => $participant
                    ],
                    'message' => 'Joined chat successfully'
                ], 201);
                
            } elseif ($action === 'send_message' && $roomId && $participantId) {
                // Send chat message
                if (!$input || !isset($input['content'])) {
                    sendError('Message content is required');
                }
                
                // Get participant info
                $participants = loadData($participantsFile);
                $participant = $participants[$participantId] ?? null;
                
                if (!$participant) {
                    sendError('Participant not found', 404);
                }
                
                // Check if participant is muted
                if ($participant['is_muted']) {
                    sendError('You are muted and cannot send messages', 403);
                }
                
                $messageId = generateId('msg_');
                $message = [
                    'id' => $messageId,
                    'room_id' => $roomId,
                    'participant_id' => $participantId,
                    'participant_name' => $participant['name'],
                    'participant_role' => $participant['role'],
                    'message_type' => $input['message_type'] ?? 'text',
                    'content' => $input['content'],
                    'reply_to_id' => $input['reply_to_id'] ?? null,
                    'is_private' => $input['is_private'] ?? false,
                    'private_to_participant_id' => $input['private_to_participant_id'] ?? null,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'edited_at' => null,
                    'reactions' => [],
                    'attachments' => $input['attachments'] ?? []
                ];
                
                // Update participant activity
                $participants[$participantId]['last_activity'] = date('Y-m-d H:i:s');
                saveData($participantsFile, $participants);
                
                // Broadcast message
                broadcastMessage($roomId, $message);
                
                sendResponse([
                    'success' => true,
                    'data' => $message,
                    'message' => 'Message sent successfully'
                ], 201);
                
            } elseif ($action === 'react_message') {
                // Add reaction to message
                $messageId = $input['message_id'] ?? '';
                $reaction = $input['reaction'] ?? '';
                
                if (!$messageId || !$reaction) {
                    sendError('Message ID and reaction are required');
                }
                
                $messages = loadData($messagesFile);
                $messageFound = false;
                
                foreach ($messages as &$msg) {
                    if ($msg['id'] === $messageId) {
                        if (!isset($msg['reactions'])) {
                            $msg['reactions'] = [];
                        }
                        
                        // Toggle reaction
                        $userReacted = false;
                        foreach ($msg['reactions'] as $key => $react) {
                            if ($react['participant_id'] === $participantId && $react['reaction'] === $reaction) {
                                unset($msg['reactions'][$key]);
                                $userReacted = true;
                                break;
                            }
                        }
                        
                        if (!$userReacted) {
                            $msg['reactions'][] = [
                                'participant_id' => $participantId,
                                'reaction' => $reaction,
                                'timestamp' => date('Y-m-d H:i:s')
                            ];
                        }
                        
                        $msg['reactions'] = array_values($msg['reactions']);
                        $messageFound = true;
                        break;
                    }
                }
                
                if (!$messageFound) {
                    sendError('Message not found', 404);
                }
                
                saveData($messagesFile, $messages);
                
                sendResponse([
                    'success' => true,
                    'message' => 'Reaction updated successfully'
                ]);
                
            } else {
                sendError('Invalid action', 404);
            }
            break;
            
        case 'GET':
            if ($action === 'messages' && $roomId) {
                // Get chat messages for room
                $messages = loadData($messagesFile);
                $roomMessages = array_filter($messages, function($msg) use ($roomId) {
                    return $msg['room_id'] === $roomId;
                });
                
                // Sort by timestamp
                usort($roomMessages, function($a, $b) {
                    return strtotime($a['timestamp']) - strtotime($b['timestamp']);
                });
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($roomMessages)
                ]);
                
            } elseif ($action === 'participants' && $roomId) {
                // Get chat participants for room
                $participants = loadData($participantsFile);
                $roomParticipants = array_filter($participants, function($p) use ($roomId) {
                    return $p['room_id'] === $roomId && $p['is_online'];
                });
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($roomParticipants)
                ]);
                
            } elseif ($action === 'poll_updates' && $roomId) {
                // Simple polling for new messages (simulates WebSocket)
                $since = $_GET['since'] ?? '';
                $messages = loadData($messagesFile);
                
                $newMessages = array_filter($messages, function($msg) use ($roomId, $since) {
                    return $msg['room_id'] === $roomId && 
                           (!$since || strtotime($msg['timestamp']) > strtotime($since));
                });
                
                // Sort by timestamp
                usort($newMessages, function($a, $b) {
                    return strtotime($a['timestamp']) - strtotime($b['timestamp']);
                });
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($newMessages),
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                
            } else {
                sendError('Invalid action', 404);
            }
            break;
            
        case 'PUT':
            if ($action === 'mute_participant' && $participantId) {
                // Mute/unmute participant
                $participants = loadData($participantsFile);
                if (!isset($participants[$participantId])) {
                    sendError('Participant not found', 404);
                }
                
                $participants[$participantId]['is_muted'] = !$participants[$participantId]['is_muted'];
                saveData($participantsFile, $participants);
                
                $status = $participants[$participantId]['is_muted'] ? 'muted' : 'unmuted';
                
                sendResponse([
                    'success' => true,
                    'data' => $participants[$participantId],
                    'message' => "Participant $status successfully"
                ]);
                
            } else {
                sendError('Invalid action', 404);
            }
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Chat Server Error: " . $e->getMessage());
    sendError('Internal server error: ' . $e->getMessage(), 500);
}
?>
