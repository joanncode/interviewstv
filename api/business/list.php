<?php
/**
 * Business Directory List Endpoint for Interviews.tv API
 * Handles business directory listing with pagination and filtering
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../models/User.php';

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ApiResponse::error('Method not allowed', 405);
}

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    // Get query parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 12;
    $industry = isset($_GET['industry']) ? Validator::sanitizeString($_GET['industry']) : null;
    $search = isset($_GET['search']) ? Validator::sanitizeString($_GET['search']) : null;

    // Create business object
    $business = new Business($db);

    // Get businesses
    $businesses = $business->getAll($page, $limit, $industry, $search);

    // Get total count for pagination
    $count_query = "SELECT COUNT(*) as total FROM businesses WHERE is_active = 1";
    $count_params = [];

    if ($industry) {
        $count_query .= " AND industry = :industry";
        $count_params[':industry'] = $industry;
    }

    if ($search) {
        $count_query .= " AND (name LIKE :search OR description LIKE :search OR location LIKE :search)";
        $count_params[':search'] = '%' . $search . '%';
    }

    $count_stmt = $db->prepare($count_query);
    foreach ($count_params as $key => $value) {
        $count_stmt->bindValue($key, $value);
    }
    $count_stmt->execute();
    $total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Calculate pagination info
    $total_pages = ceil($total_count / $limit);
    $has_next = $page < $total_pages;
    $has_prev = $page > 1;

    // Prepare response
    $response_data = [
        'businesses' => $businesses,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => $total_count,
            'limit' => $limit,
            'has_next' => $has_next,
            'has_prev' => $has_prev
        ],
        'filters' => [
            'industry' => $industry,
            'search' => $search
        ]
    ];

    ApiResponse::success($response_data, 'Businesses retrieved successfully');

} catch (Exception $e) {
    error_log("Business list error: " . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve businesses');
}
?>
