<?php
/**
 * Simple Streaming API for Interviews.tv
 * Works without complex framework dependencies
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

// Simple file-based storage
$dataDir = __DIR__ . '/../../storage';
$streamsFile = $dataDir . '/streams.json';

// Ensure storage directory exists
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function loadStreams() {
    global $streamsFile;
    if (file_exists($streamsFile)) {
        return json_decode(file_get_contents($streamsFile), true) ?: [];
    }
    return [];
}

function saveStreams($streams) {
    global $streamsFile;
    file_put_contents($streamsFile, json_encode($streams, JSON_PRETTY_PRINT));
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

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query = $_GET['action'] ?? '';
$streamId = $_GET['id'] ?? '';

try {
    switch ($method) {
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($query === 'create' || empty($query)) {
                // Create new stream
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
                
            } elseif ($query === 'start' && $streamId) {
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
                
            } elseif ($query === 'stop' && $streamId) {
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
                
            } elseif ($query === 'join' && $streamId) {
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
            if ($query === 'live') {
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
                
            } elseif ($query === 'stats' && isset($_GET['stream_id'])) {
                // Get stream stats
                $streamId = $_GET['stream_id'];
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
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Stream API Error: " . $e->getMessage());
    sendError('Internal server error: ' . $e->getMessage(), 500);
}
?>
