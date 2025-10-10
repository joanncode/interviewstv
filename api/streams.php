<?php
/**
 * Live Streaming API Router for /api/streams/ endpoints
 * Routes requests to the main streaming.php handler
 */

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the request path and method
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Find the streams part and get the action/id
$streamsIndex = array_search('streams', $pathParts);
if ($streamsIndex === false) {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit();
}

// Get action and stream ID
$actionPart = $pathParts[$streamsIndex + 1] ?? '';
$subAction = $pathParts[$streamsIndex + 2] ?? '';

// Route the request based on the pattern
try {
    switch ($method) {
        case 'POST':
            if (empty($actionPart)) {
                // POST /api/streams/ - Create stream
                routeToStreaming('create');
            } elseif ($subAction === 'start') {
                // POST /api/streams/{id}/start
                routeToStreaming('start', $actionPart);
            } elseif ($subAction === 'stop') {
                // POST /api/streams/{id}/stop
                routeToStreaming('stop', $actionPart);
            } elseif ($subAction === 'join') {
                // POST /api/streams/{id}/join
                routeToStreaming('join', $actionPart);
            } elseif ($subAction === 'leave') {
                // POST /api/streams/{id}/leave
                routeToStreaming('leave', $actionPart);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Invalid action']);
            }
            break;
            
        case 'GET':
            if (empty($actionPart)) {
                // GET /api/streams/ - Get all streams
                routeToStreaming('all');
            } elseif ($actionPart === 'live') {
                // GET /api/streams/live - Get live streams
                routeToStreaming('live');
            } elseif ($subAction === 'stats') {
                // GET /api/streams/{id}/stats
                routeToStreaming('stats', $actionPart);
            } else {
                // GET /api/streams/{id} - Get specific stream
                routeToStreaming('get', $actionPart);
            }
            break;
            
        case 'PUT':
            if ($actionPart) {
                // PUT /api/streams/{id} - Update stream
                routeToStreaming('update', $actionPart);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Stream ID required']);
            }
            break;
            
        case 'DELETE':
            if ($actionPart) {
                // DELETE /api/streams/{id} - Delete stream
                routeToStreaming('delete', $actionPart);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Stream ID required']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Streams API Router Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

/**
 * Route request to the main streaming.php handler
 */
function routeToStreaming($action, $streamId = null) {
    // Modify the request URI to match streaming.php expectations
    $originalUri = $_SERVER['REQUEST_URI'];
    
    if ($streamId) {
        $_SERVER['REQUEST_URI'] = "/api/streaming.php/$action/$streamId";
    } else {
        $_SERVER['REQUEST_URI'] = "/api/streaming.php/$action";
    }
    
    // Include the main streaming handler
    include __DIR__ . '/streaming.php';
    
    // Restore original URI
    $_SERVER['REQUEST_URI'] = $originalUri;
}
?>
