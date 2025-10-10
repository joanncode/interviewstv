<?php
/**
 * Simple Live Streaming API Endpoint
 * Handles basic streaming operations without complex database setup
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

// Simple in-memory storage (replace with database in production)
$dataFile = __DIR__ . '/../storage/streams.json';

function loadStreams() {
    global $dataFile;
    if (file_exists($dataFile)) {
        return json_decode(file_get_contents($dataFile), true) ?: [];
    }
    return [];
}

function saveStreams($streams) {
    global $dataFile;
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents($dataFile, json_encode($streams, JSON_PRETTY_PRINT));
}

function generateId() {
    return 'stream_' . uniqid();
}

function generateStreamKey() {
    return 'sk_' . bin2hex(random_bytes(16));
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

function sendError($message, $status = 400) {
    sendResponse(['error' => $message], $status);
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Handle different URL patterns
if (in_array('api', $pathParts)) {
    $apiIndex = array_search('api', $pathParts);
    $pathParts = array_slice($pathParts, $apiIndex + 1);
}

// Remove 'streaming.php' if present
if (in_array('streaming.php', $pathParts)) {
    $streamingIndex = array_search('streaming.php', $pathParts);
    $pathParts = array_slice($pathParts, $streamingIndex + 1);
}

// Handle /api/streams/ pattern (from main app)
if (in_array('streams', $pathParts)) {
    $streamsIndex = array_search('streams', $pathParts);
    $pathParts = array_slice($pathParts, $streamsIndex + 1);
}

$action = $pathParts[0] ?? '';
$streamId = $pathParts[1] ?? '';

// Handle specific actions from main app
if (empty($action) && $method === 'POST') {
    $action = 'create';
} elseif ($action && in_array($action, ['start', 'stop', 'join', 'leave'])) {
    $streamId = $action;
    $action = $pathParts[1] ?? '';
}

// Debug logging
error_log("Streaming API - Method: $method, Path: $path, Action: $action, StreamID: $streamId");

try {
    switch ($method) {
        case 'POST':
            if ($action === 'create' || empty($action)) {
                // Create new stream
                $input = json_decode(file_get_contents('php://input'), true);

                // Debug logging
                error_log("Create stream input: " . print_r($input, true));

                if (!$input || !isset($input['title']) || empty($input['title'])) {
                    sendError('Title is required');
                }
                
                $streamId = generateId();
                $streamKey = generateStreamKey();
                
                $stream = [
                    'id' => $streamId,
                    'title' => $input['title'],
                    'description' => $input['description'] ?? '',
                    'category' => $input['category'] ?? 'interview',
                    'stream_key' => $streamKey,
                    'status' => 'scheduled',
                    'quality' => $input['quality'] ?? '720p',
                    'max_viewers' => $input['max_viewers'] ?? 1000,
                    'recording_enabled' => $input['recording_enabled'] ?? true,
                    'chat_enabled' => $input['chat_enabled'] ?? true,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                    'rtmp_url' => 'rtmp://localhost:1935/live/' . $streamKey,
                    'hls_url' => 'http://localhost:8080/live/' . $streamKey . '/index.m3u8',
                    'webrtc_url' => 'wss://localhost:8081/webrtc/' . $streamKey,
                    'viewers' => 0,
                    'total_viewers' => 0
                ];
                
                $streams = loadStreams();
                $streams[$streamId] = $stream;
                saveStreams($streams);
                
                sendResponse([
                    'success' => true,
                    'data' => $stream,
                    'message' => 'Stream created successfully'
                ], 201);
                
            } elseif ($action === 'start' && $streamId) {
                // Start stream
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                $streams[$streamId]['status'] = 'live';
                $streams[$streamId]['started_at'] = date('Y-m-d H:i:s');
                $streams[$streamId]['updated_at'] = date('Y-m-d H:i:s');
                
                saveStreams($streams);
                
                sendResponse([
                    'success' => true,
                    'data' => $streams[$streamId],
                    'message' => 'Stream started successfully'
                ]);
                
            } elseif ($action === 'stop' && $streamId) {
                // Stop stream
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                $startTime = strtotime($streams[$streamId]['started_at'] ?? 'now');
                $duration = time() - $startTime;
                
                $streams[$streamId]['status'] = 'ended';
                $streams[$streamId]['ended_at'] = date('Y-m-d H:i:s');
                $streams[$streamId]['duration'] = $duration;
                $streams[$streamId]['updated_at'] = date('Y-m-d H:i:s');
                
                saveStreams($streams);
                
                sendResponse([
                    'success' => true,
                    'data' => $streams[$streamId],
                    'message' => 'Stream stopped successfully'
                ]);
                
            } elseif ($action === 'join' && $streamId) {
                // Join stream as viewer
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                if ($streams[$streamId]['status'] !== 'live') {
                    sendError('Stream is not live');
                }
                
                $streams[$streamId]['viewers']++;
                $streams[$streamId]['total_viewers']++;
                $streams[$streamId]['updated_at'] = date('Y-m-d H:i:s');
                
                saveStreams($streams);
                
                $viewerId = 'viewer_' . uniqid();
                
                sendResponse([
                    'success' => true,
                    'data' => [
                        'viewer_id' => $viewerId,
                        'stream_urls' => [
                            'hls' => $streams[$streamId]['hls_url'],
                            'webrtc' => $streams[$streamId]['webrtc_url']
                        ],
                        'current_viewers' => $streams[$streamId]['viewers']
                    ],
                    'message' => 'Joined stream successfully'
                ]);
                
            } else {
                sendError('Invalid action', 404);
            }
            break;
            
        case 'GET':
            if ($action === 'live') {
                // Get live streams
                $streams = loadStreams();
                $liveStreams = array_filter($streams, function($stream) {
                    return $stream['status'] === 'live';
                });
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($liveStreams)
                ]);
                
            } elseif ($streamId) {
                // Get specific stream
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                sendResponse([
                    'success' => true,
                    'data' => $streams[$streamId]
                ]);
                
            } elseif ($action === 'stats' && isset($pathParts[1])) {
                // Get stream stats
                $streamId = $pathParts[1];
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                $stream = $streams[$streamId];
                $stats = [
                    'current_viewers' => $stream['viewers'],
                    'total_viewers' => $stream['total_viewers'],
                    'duration' => $stream['duration'] ?? 0,
                    'status' => $stream['status'],
                    'quality' => $stream['quality'],
                    'started_at' => $stream['started_at'] ?? null,
                    'ended_at' => $stream['ended_at'] ?? null
                ];
                
                sendResponse([
                    'success' => true,
                    'data' => $stats
                ]);
                
            } else {
                // Get all streams
                $streams = loadStreams();
                
                sendResponse([
                    'success' => true,
                    'data' => array_values($streams)
                ]);
            }
            break;
            
        case 'PUT':
            if ($streamId) {
                // Update stream
                $input = json_decode(file_get_contents('php://input'), true);
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                // Update allowed fields
                $allowedFields = ['title', 'description', 'category', 'quality', 'max_viewers'];
                foreach ($allowedFields as $field) {
                    if (isset($input[$field])) {
                        $streams[$streamId][$field] = $input[$field];
                    }
                }
                
                $streams[$streamId]['updated_at'] = date('Y-m-d H:i:s');
                saveStreams($streams);
                
                sendResponse([
                    'success' => true,
                    'data' => $streams[$streamId],
                    'message' => 'Stream updated successfully'
                ]);
                
            } else {
                sendError('Stream ID required', 400);
            }
            break;
            
        case 'DELETE':
            if ($streamId) {
                // Delete stream
                $streams = loadStreams();
                
                if (!isset($streams[$streamId])) {
                    sendError('Stream not found', 404);
                }
                
                unset($streams[$streamId]);
                saveStreams($streams);
                
                sendResponse([
                    'success' => true,
                    'message' => 'Stream deleted successfully'
                ]);
                
            } else {
                sendError('Stream ID required', 400);
            }
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Streaming API Error: " . $e->getMessage());
    sendError('Internal server error: ' . $e->getMessage(), 500);
}
?>
