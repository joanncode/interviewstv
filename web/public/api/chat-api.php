<?php

// Chat API endpoints for Interviews.tv
require_once __DIR__ . '/vendor/autoload.php';

use InterviewsTV\Controllers\ChatController;

// Set headers for CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api/chat-api.php', '', $path);

// Remove leading slash
$path = ltrim($path, '/');

// Split path into segments
$segments = explode('/', $path);

try {
    $controller = new ChatController();
    
    // Route the request
    switch ($method) {
        case 'GET':
            handleGetRequest($controller, $segments);
            break;
            
        case 'POST':
            handlePostRequest($controller, $segments);
            break;
            
        case 'PUT':
            handlePutRequest($controller, $segments);
            break;
            
        case 'DELETE':
            handleDeleteRequest($controller, $segments);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}

/**
 * Handle GET requests
 */
function handleGetRequest($controller, $segments) {
    if (empty($segments[0])) {
        // GET /api/chat/
        echo json_encode([
            'message' => 'Chat API v1.0',
            'endpoints' => [
                'GET /rooms/{roomId}/messages' => 'Get messages for a room',
                'POST /rooms/{roomId}/messages' => 'Send a message',
                'GET /rooms/{roomId}' => 'Get room information',
                'POST /rooms' => 'Create a room',
                'POST /rooms/{roomId}/join' => 'Join a room',
                'POST /rooms/{roomId}/leave' => 'Leave a room',
                'GET /stats' => 'Get chat statistics',
                'DELETE /messages/{messageId}' => 'Delete a message',
                'PUT /messages/{messageId}' => 'Edit a message'
            ]
        ]);
        return;
    }
    
    switch ($segments[0]) {
        case 'rooms':
            if (isset($segments[1])) {
                $roomId = $segments[1];
                
                if (isset($segments[2]) && $segments[2] === 'messages') {
                    // GET /rooms/{roomId}/messages
                    echo $controller->getMessages($roomId);
                } else {
                    // GET /rooms/{roomId}
                    echo $controller->getRoom($roomId);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Room ID required']);
            }
            break;
            
        case 'stats':
            // GET /stats
            echo $controller->getStats();
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

/**
 * Handle POST requests
 */
function handlePostRequest($controller, $segments) {
    switch ($segments[0]) {
        case 'rooms':
            if (isset($segments[1])) {
                $roomId = $segments[1];
                
                if (isset($segments[2])) {
                    switch ($segments[2]) {
                        case 'messages':
                            // POST /rooms/{roomId}/messages
                            echo $controller->sendMessage($roomId);
                            break;
                            
                        case 'join':
                            // POST /rooms/{roomId}/join
                            echo $controller->joinRoom($roomId);
                            break;
                            
                        case 'leave':
                            // POST /rooms/{roomId}/leave
                            echo $controller->leaveRoom($roomId);
                            break;
                            
                        default:
                            http_response_code(404);
                            echo json_encode(['error' => 'Endpoint not found']);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Action required']);
                }
            } else {
                // POST /rooms
                echo $controller->createRoom();
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

/**
 * Handle PUT requests
 */
function handlePutRequest($controller, $segments) {
    switch ($segments[0]) {
        case 'messages':
            if (isset($segments[1])) {
                $messageId = $segments[1];
                // PUT /messages/{messageId}
                echo $controller->editMessage($messageId);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Message ID required']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

/**
 * Handle DELETE requests
 */
function handleDeleteRequest($controller, $segments) {
    switch ($segments[0]) {
        case 'messages':
            if (isset($segments[1])) {
                $messageId = $segments[1];
                // DELETE /messages/{messageId}
                echo $controller->deleteMessage($messageId);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Message ID required']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

/**
 * Log API request for debugging
 */
function logRequest() {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    $logFile = __DIR__ . '/logs/chat-api.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    file_put_contents($logFile, json_encode($logData) . "\n", FILE_APPEND | LOCK_EX);
}

// Log the request (optional)
if (isset($_GET['debug'])) {
    logRequest();
}
