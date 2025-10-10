<?php
/**
 * Streams API Proxy - Routes /api/streams calls to stream_api.php
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

// Get request details
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Find streams index and parse the request
$streamsIndex = array_search('streams', $pathParts);
if ($streamsIndex === false) {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit();
}

$streamId = $pathParts[$streamsIndex + 1] ?? '';
$action = $pathParts[$streamsIndex + 2] ?? '';

// Route the request to stream_api.php
try {
    $queryParams = [];
    
    switch ($method) {
        case 'POST':
            if (empty($streamId)) {
                // POST /api/streams - Create stream
                $queryParams['action'] = 'create';
            } elseif ($action === 'start') {
                // POST /api/streams/{id}/start
                $queryParams['action'] = 'start';
                $queryParams['id'] = $streamId;
            } elseif ($action === 'stop') {
                // POST /api/streams/{id}/stop
                $queryParams['action'] = 'stop';
                $queryParams['id'] = $streamId;
            } elseif ($action === 'join') {
                // POST /api/streams/{id}/join
                $queryParams['action'] = 'join';
                $queryParams['id'] = $streamId;
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Invalid action']);
                exit();
            }
            break;
            
        case 'GET':
            if (empty($streamId)) {
                // GET /api/streams - Get all streams
                $queryParams['action'] = 'all';
            } elseif ($streamId === 'live') {
                // GET /api/streams/live - Get live streams
                $queryParams['action'] = 'live';
            } elseif ($action === 'stats') {
                // GET /api/streams/{id}/stats
                $queryParams['action'] = 'stats';
                $queryParams['stream_id'] = $streamId;
            } else {
                // GET /api/streams/{id} - Get specific stream
                $queryParams['action'] = 'get';
                $queryParams['id'] = $streamId;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            exit();
    }
    
    // Build the URL for stream_api.php
    $apiUrl = 'http://localhost:8080/stream_api.php?' . http_build_query($queryParams);
    
    // Prepare the request
    $options = [
        'http' => [
            'method' => $method,
            'header' => [
                'Content-Type: application/json',
                'Accept: application/json'
            ]
        ]
    ];
    
    // Add body for POST requests
    if ($method === 'POST') {
        $input = file_get_contents('php://input');
        if ($input) {
            $options['http']['content'] = $input;
        }
    }
    
    $context = stream_context_create($options);
    
    // Make the request
    $response = file_get_contents($apiUrl, false, $context);
    
    if ($response === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to connect to streaming service']);
        exit();
    }
    
    // Get response headers
    $responseHeaders = $http_response_header ?? [];
    $statusCode = 200;
    
    foreach ($responseHeaders as $header) {
        if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
            $statusCode = (int)$matches[1];
            break;
        }
    }
    
    // Return the response
    http_response_code($statusCode);
    echo $response;
    
} catch (Exception $e) {
    error_log("Streams Proxy Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>
