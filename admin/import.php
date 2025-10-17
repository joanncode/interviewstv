<?php
/**
 * Video Import Interface - YouTube Interview Curation System
 * Interviews.tv - Admin-Only Bulk Import & Curation Platform
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once '../includes/youtube_config.php';
require_once '../includes/Database.php';
require_once '../includes/YouTubeAPI.php';

// Simple session-based authentication
session_start();
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

$db = getDB();
$youtube = new YouTubeAPI();
$message = '';
$messageType = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (isset($_POST['action'])) {
            switch ($_POST['action']) {
                case 'import_single':
                    $result = importSingleVideo($_POST['youtube_url'], $_POST);
                    $message = $result['message'];
                    $messageType = $result['type'];
                    break;
                    
                case 'import_bulk':
                    $result = importBulkVideos($_POST['bulk_urls'], $_POST);
                    $message = $result['message'];
                    $messageType = $result['type'];
                    break;
                    
                case 'upload_csv':
                    $result = processCsvUpload($_FILES['csv_file'], $_POST);
                    $message = $result['message'];
                    $messageType = $result['type'];
                    break;
            }
        }
    } catch (Exception $e) {
        $message = "Error: " . $e->getMessage();
        $messageType = 'danger';
    }
}

// Get categories for dropdown
$categories = $db->getRows('video_categories', 'is_active = 1', [], '*', 'sort_order ASC');

/**
 * Import single video
 */
function importSingleVideo($url, $data) {
    global $db, $youtube;
    
    if (empty($url)) {
        return ['message' => 'Please provide a YouTube URL', 'type' => 'danger'];
    }
    
    $videoId = $youtube->extractVideoId($url);
    if (!$videoId) {
        return ['message' => 'Invalid YouTube URL format', 'type' => 'danger'];
    }
    
    // Check if video already exists
    if ($db->exists('curated_videos', 'youtube_id = ?', [$videoId])) {
        return ['message' => 'Video already exists in the system', 'type' => 'warning'];
    }
    
    // Get video details from YouTube
    $videoData = $youtube->getVideoDetails($videoId);
    if (!$videoData) {
        return ['message' => 'Could not fetch video details from YouTube', 'type' => 'danger'];
    }
    
    // Add to curation queue first
    $queueId = $db->insert('curation_queue', [
        'youtube_url' => $url,
        'youtube_id' => $videoId,
        'suggested_category_id' => !empty($data['category_id']) ? $data['category_id'] : null,
        'suggested_tags' => !empty($data['tags']) ? $data['tags'] : '',
        'priority' => $data['priority'] ?? 'medium',
        'status' => 'pending',
        'notes' => $data['notes'] ?? '',
        'source' => 'manual'
    ]);
    
    if (!$queueId) {
        return ['message' => 'Failed to add video to queue', 'type' => 'danger'];
    }
    
    // Process immediately if auto-process is enabled
    if (isset($data['auto_process']) && $data['auto_process'] === '1') {
        $processResult = processQueueItem($queueId, $videoData);
        if ($processResult['success']) {
            return ['message' => 'Video imported and processed successfully', 'type' => 'success'];
        } else {
            return ['message' => 'Video queued but processing failed: ' . $processResult['error'], 'type' => 'warning'];
        }
    }
    
    return ['message' => 'Video added to import queue successfully', 'type' => 'success'];
}

/**
 * Import bulk videos from textarea
 */
function importBulkVideos($urls, $data) {
    global $db;
    
    if (empty($urls)) {
        return ['message' => 'Please provide YouTube URLs', 'type' => 'danger'];
    }
    
    $urlList = array_filter(array_map('trim', explode("\n", $urls)));
    if (empty($urlList)) {
        return ['message' => 'No valid URLs found', 'type' => 'danger'];
    }
    
    $batchId = 'bulk_' . date('YmdHis') . '_' . uniqid();
    $successCount = 0;
    $errorCount = 0;
    $duplicateCount = 0;
    
    foreach ($urlList as $url) {
        try {
            $result = processBulkUrl($url, $data, $batchId);
            if ($result === 'success') $successCount++;
            elseif ($result === 'duplicate') $duplicateCount++;
            else $errorCount++;
        } catch (Exception $e) {
            $errorCount++;
        }
    }
    
    $message = "Bulk import completed: {$successCount} added, {$duplicateCount} duplicates, {$errorCount} errors";
    $type = $errorCount > 0 ? 'warning' : 'success';
    
    return ['message' => $message, 'type' => $type];
}

/**
 * Process CSV file upload
 */
function processCsvUpload($file, $data) {
    if (!isset($file['tmp_name']) || empty($file['tmp_name'])) {
        return ['message' => 'Please select a CSV file', 'type' => 'danger'];
    }
    
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ['csv', 'txt'])) {
        return ['message' => 'Only CSV and TXT files are allowed', 'type' => 'danger'];
    }
    
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return ['message' => 'File size exceeds limit', 'type' => 'danger'];
    }
    
    $handle = fopen($file['tmp_name'], 'r');
    if (!$handle) {
        return ['message' => 'Could not read uploaded file', 'type' => 'danger'];
    }
    
    $batchId = 'csv_' . date('YmdHis') . '_' . uniqid();
    $successCount = 0;
    $errorCount = 0;
    $duplicateCount = 0;
    
    while (($row = fgetcsv($handle)) !== false) {
        if (empty($row[0])) continue;
        
        $url = trim($row[0]);
        $customData = array_merge($data, [
            'category_id' => !empty($row[1]) ? $row[1] : $data['category_id'],
            'tags' => !empty($row[2]) ? $row[2] : $data['tags'],
            'notes' => !empty($row[3]) ? $row[3] : $data['notes']
        ]);
        
        try {
            $result = processBulkUrl($url, $customData, $batchId);
            if ($result === 'success') $successCount++;
            elseif ($result === 'duplicate') $duplicateCount++;
            else $errorCount++;
        } catch (Exception $e) {
            $errorCount++;
        }
    }
    
    fclose($handle);
    
    $message = "CSV import completed: {$successCount} added, {$duplicateCount} duplicates, {$errorCount} errors";
    $type = $errorCount > 0 ? 'warning' : 'success';
    
    return ['message' => $message, 'type' => $type];
}

/**
 * Process single URL for bulk import
 */
function processBulkUrl($url, $data, $batchId) {
    global $db, $youtube;
    
    $videoId = $youtube->extractVideoId($url);
    if (!$videoId) {
        return 'error';
    }
    
    // Check if video already exists
    if ($db->exists('curated_videos', 'youtube_id = ?', [$videoId]) || 
        $db->exists('curation_queue', 'youtube_id = ?', [$videoId])) {
        return 'duplicate';
    }
    
    // Add to queue
    $queueId = $db->insert('curation_queue', [
        'youtube_url' => $url,
        'youtube_id' => $videoId,
        'suggested_category_id' => !empty($data['category_id']) ? $data['category_id'] : null,
        'suggested_tags' => $data['tags'] ?? '',
        'priority' => $data['priority'] ?? 'medium',
        'status' => 'pending',
        'batch_id' => $batchId,
        'notes' => $data['notes'] ?? '',
        'source' => 'bulk'
    ]);
    
    return $queueId ? 'success' : 'error';
}

/**
 * Process queue item immediately
 */
function processQueueItem($queueId, $videoData = null) {
    global $db, $youtube;
    
    $queueItem = $db->getRow('curation_queue', 'id = ?', [$queueId]);
    if (!$queueItem) {
        return ['success' => false, 'error' => 'Queue item not found'];
    }
    
    try {
        // Get video data if not provided
        if (!$videoData) {
            $videoData = $youtube->getVideoDetails($queueItem['youtube_id']);
            if (!$videoData) {
                throw new Exception('Could not fetch video details');
            }
        }
        
        // Calculate scores (simplified for now)
        $qualityScore = min(10.0, ($videoData['view_count'] / 10000) + ($videoData['like_count'] / 1000));
        $innovationScore = 5.0; // Default, will enhance with keyword analysis
        
        // Determine category if not suggested
        $categoryId = $queueItem['suggested_category_id'] ?: 1; // Default to first category
        
        // Insert video
        $videoId = $db->insert('curated_videos', array_merge($videoData, [
            'category_id' => $categoryId,
            'quality_score' => $qualityScore,
            'innovation_score' => $innovationScore,
            'status' => $qualityScore >= 7.0 ? 'approved' : 'pending',
            'admin_notes' => $queueItem['notes']
        ]));
        
        if (!$videoId) {
            throw new Exception('Failed to insert video');
        }
        
        // Update queue status
        $db->update('curation_queue', 
            ['status' => 'completed', 'processed_at' => date('Y-m-d H:i:s')],
            'id = ?', 
            [$queueId]
        );
        
        return ['success' => true, 'video_id' => $videoId];
        
    } catch (Exception $e) {
        // Update queue with error
        $db->update('curation_queue', 
            ['status' => 'failed', 'error_message' => $e->getMessage()],
            'id = ?', 
            [$queueId]
        );
        
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import Videos - YouTube Interview Curation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #FF0000;
            --bg-dark: #1a1a1a;
            --card-dark: #2a2a2a;
            --input-dark: #3a3a3a;
        }

        body {
            background-color: var(--bg-dark);
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .navbar {
            background-color: var(--card-dark) !important;
            border-bottom: 2px solid var(--primary-color);
        }

        .navbar-brand {
            color: var(--primary-color) !important;
            font-weight: bold;
        }

        .card {
            background-color: var(--card-dark);
            border: 1px solid #444;
            color: white;
        }

        .card-header {
            background-color: var(--input-dark);
            border-bottom: 1px solid #444;
        }

        .form-control, .form-select {
            background-color: var(--input-dark);
            border: 1px solid #555;
            color: white;
        }

        .form-control:focus, .form-select:focus {
            background-color: var(--input-dark);
            border-color: var(--primary-color);
            color: white;
            box-shadow: 0 0 0 0.2rem rgba(255, 0, 0, 0.25);
        }

        .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        .btn-primary:hover {
            background-color: #cc0000;
            border-color: #cc0000;
        }

        .nav-tabs .nav-link {
            color: #ccc;
            background-color: var(--input-dark);
            border: 1px solid #555;
        }

        .nav-tabs .nav-link.active {
            color: white;
            background-color: var(--card-dark);
            border-color: var(--primary-color) var(--primary-color) var(--card-dark);
        }

        .tab-content {
            background-color: var(--card-dark);
            border: 1px solid #555;
            border-top: none;
            padding: 20px;
        }

        .form-text {
            color: #ccc;
        }

        .alert {
            border: none;
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="index.php">
                <i class="fas fa-video"></i> YouTube Curation Admin
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="index.php">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="import.php">
                            <i class="fas fa-upload"></i> Import Videos
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="manage.php">
                            <i class="fas fa-list"></i> Manage Videos
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="categories.php">
                            <i class="fas fa-tags"></i> Categories
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="analytics.php">
                            <i class="fas fa-chart-bar"></i> Analytics
                        </a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="../public/browse.php" target="_blank">
                            <i class="fas fa-external-link-alt"></i> View Public Site
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="logout.php">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <!-- Page Header -->
        <div class="row mb-4">
            <div class="col-12">
                <h1><i class="fas fa-hand-paper"></i> Manual Video Curation</h1>
                <p class="lead">Carefully select and curate high-quality innovation interviews. Focus on quality over quantity with thoughtful editorial review.</p>
            </div>
        </div>

        <!-- Success/Error Messages -->
        <?php if (!empty($message)): ?>
            <div class="row mb-4">
                <div class="col-12">
                    <div class="alert alert-<?= $messageType ?> alert-dismissible fade show" role="alert">
                        <i class="fas fa-<?= $messageType === 'success' ? 'check-circle' : ($messageType === 'warning' ? 'exclamation-triangle' : 'times-circle') ?>"></i>
                        <?= htmlspecialchars($message) ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <!-- Import Tabs -->
        <div class="row">
            <div class="col-12">
                <ul class="nav nav-tabs" id="importTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="single-tab" data-bs-toggle="tab" data-bs-target="#single" type="button" role="tab">
                            <i class="fas fa-plus"></i> Single Video
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="bulk-tab" data-bs-toggle="tab" data-bs-target="#bulk" type="button" role="tab">
                            <i class="fas fa-clipboard-list"></i> Curated Batch
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="csv-tab" data-bs-toggle="tab" data-bs-target="#csv" type="button" role="tab">
                            <i class="fas fa-search"></i> Research Tools
                        </button>
                    </li>
                </ul>

                <div class="tab-content" id="importTabContent">
                    <!-- Single Video Import -->
                    <div class="tab-pane fade show active" id="single" role="tabpanel">
                        <form method="POST" action="">
                            <input type="hidden" name="action" value="import_single">

                            <div class="row">
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label for="youtube_url" class="form-label">
                                            <i class="fab fa-youtube"></i> YouTube URL
                                        </label>
                                        <input type="url" class="form-control" id="youtube_url" name="youtube_url"
                                               placeholder="https://www.youtube.com/watch?v=..." required>
                                        <div class="form-text">
                                            Paste any YouTube video URL (watch, embed, or short format)
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label for="priority" class="form-label">Priority</label>
                                        <select class="form-select" id="priority" name="priority">
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="low">Low</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="category_id" class="form-label">Category</label>
                                        <select class="form-select" id="category_id" name="category_id">
                                            <option value="">Auto-detect category</option>
                                            <?php foreach ($categories as $category): ?>
                                                <option value="<?= $category['id'] ?>">
                                                    <?= htmlspecialchars($category['name']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="tags" class="form-label">Tags</label>
                                        <input type="text" class="form-control" id="tags" name="tags"
                                               placeholder="innovation, ai, startup">
                                        <div class="form-text">
                                            Comma-separated tags (optional)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="notes" class="form-label">Notes</label>
                                <textarea class="form-control" id="notes" name="notes" rows="3"
                                          placeholder="Any additional notes about this video..."></textarea>
                            </div>

                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="auto_process" name="auto_process" value="1" checked>
                                    <label class="form-check-label" for="auto_process">
                                        Add to curation queue for manual review
                                    </label>
                                    <div class="form-text">Recommended: All videos go through editorial review process</div>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Import Video
                            </button>
                        </form>
                    </div>

                    <!-- Bulk URL Import -->
                    <div class="tab-pane fade" id="bulk" role="tabpanel">
                        <div class="alert alert-info">
                            <h6><i class="fas fa-hand-paper"></i> Manual Curation Approach</h6>
                            <p class="mb-2">We focus on <strong>quality over quantity</strong> with careful manual review:</p>
                            <ul class="mb-0">
                                <li><strong>Individual Review:</strong> Each video is personally evaluated</li>
                                <li><strong>Editorial Control:</strong> Maintain high standards for innovation content</li>
                                <li><strong>Contextual Curation:</strong> Add meaningful descriptions and insights</li>
                                <li><strong>Community Value:</strong> Select videos that spark meaningful discussions</li>
                            </ul>
                        </div>

                        <form method="POST" action="">
                            <input type="hidden" name="action" value="import_bulk">

                            <div class="mb-3">
                                <label for="bulk_urls" class="form-label">
                                    <i class="fas fa-clipboard-list"></i> Curated Video List (one per line)
                                </label>
                                <textarea class="form-control" id="bulk_urls" name="bulk_urls" rows="8"
                                          placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=...&#10;https://youtu.be/..." required></textarea>
                                <div class="form-text">
                                    Add YouTube URLs for videos you've personally reviewed. Recommended: 5-10 videos per batch for quality control.
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="bulk_category_id" class="form-label">Content Category</label>
                                        <select class="form-select" id="bulk_category_id" name="category_id" required>
                                            <option value="">Select category for this batch</option>
                                            <?php foreach ($categories as $category): ?>
                                                <option value="<?= $category['id'] ?>">
                                                    <?= htmlspecialchars($category['name']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="bulk_tags" class="form-label">Content Tags</label>
                                        <input type="text" class="form-control" id="bulk_tags" name="tags"
                                               placeholder="innovation, startup, engineering" required>
                                        <div class="form-text">Describe the common themes in this batch</div>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="bulk_notes" class="form-label">Curation Notes</label>
                                <textarea class="form-control" id="bulk_notes" name="notes" rows="3"
                                          placeholder="Why did you select these videos? What makes them valuable for the community? What discussions might they spark?" required></textarea>
                                <div class="form-text">Explain your editorial reasoning for this batch</div>
                            </div>

                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check-circle"></i> Submit Curated Batch
                            </button>
                        </form>
                    </div>

                    <!-- Research & Discovery -->
                    <div class="tab-pane fade" id="csv" role="tabpanel">
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-search"></i> Research & Discovery Tools</h6>
                            <p class="mb-2">Use these resources to find high-quality innovation interviews:</p>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-header">
                                        <h6><i class="fas fa-microscope"></i> Research Channels</h6>
                                    </div>
                                    <div class="card-body">
                                        <ul class="list-unstyled">
                                            <li><strong>Innovation:</strong> TED Talks, Y Combinator, Stanford eCorner</li>
                                            <li><strong>Engineering:</strong> IEEE Spectrum, MIT OpenCourseWare</li>
                                            <li><strong>AI/ML:</strong> DeepMind, OpenAI, Lex Fridman</li>
                                            <li><strong>Hardware:</strong> EEVblog, Ben Eater, Andreas Spiess</li>
                                            <li><strong>Startups:</strong> This Week in Startups, Masters of Scale</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-header">
                                        <h6><i class="fas fa-star"></i> Quality Criteria</h6>
                                    </div>
                                    <div class="card-body">
                                        <ul class="list-unstyled">
                                            <li>✅ <strong>Technical Depth:</strong> Real insights, not marketing</li>
                                            <li>✅ <strong>Innovation Focus:</strong> Breakthrough ideas or methods</li>
                                            <li>✅ <strong>Uncensored:</strong> Honest, unfiltered discussions</li>
                                            <li>✅ <strong>Educational:</strong> Teaches something valuable</li>
                                            <li>✅ <strong>Discussion-worthy:</strong> Will spark community debate</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form method="POST" action="" enctype="multipart/form-data">
                            <input type="hidden" name="action" value="upload_csv">

                            <div class="mb-3">
                                <label for="csv_file" class="form-label">
                                    <i class="fas fa-file-csv"></i> Research Notes File (Optional)
                                </label>
                                <input type="file" class="form-control" id="csv_file" name="csv_file"
                                       accept=".csv,.txt">
                                <div class="form-text">
                                    Upload a CSV with your research notes. Format: URL, Category, Tags, Your Notes
                                </div>
                            </div>

                            <div class="alert alert-info">
                                <h6><i class="fas fa-info-circle"></i> CSV Format for Research Notes:</h6>
                                <p class="mb-2">If you keep research notes in spreadsheets:</p>
                                <ul class="mb-0">
                                    <li><strong>Column 1:</strong> YouTube URL</li>
                                    <li><strong>Column 2:</strong> Category (Innovation, Engineering, AI, etc.)</li>
                                    <li><strong>Column 3:</strong> Tags (your keywords)</li>
                                    <li><strong>Column 4:</strong> Your research notes and why it's valuable</li>
                                </ul>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="csv_category_id" class="form-label">Default Category</label>
                                        <select class="form-select" id="csv_category_id" name="category_id">
                                            <option value="">Select from your research</option>
                                            <?php foreach ($categories as $category): ?>
                                                <option value="<?= $category['id'] ?>">
                                                    <?= htmlspecialchars($category['name']) ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="csv_tags" class="form-label">Research Tags</label>
                                        <input type="text" class="form-control" id="csv_tags" name="tags"
                                               placeholder="research, curated, high-quality">
                                    </div>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-file-upload"></i> Import Research Notes
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Tips -->
        <div class="row mt-5">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-lightbulb"></i> Manual Curation Guidelines</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <h6><i class="fas fa-target"></i> Target Content</h6>
                                <ul class="small">
                                    <li>Innovation & invention interviews</li>
                                    <li>Engineering deep-dives</li>
                                    <li>Microcomputing & hardware</li>
                                    <li>AI & machine learning</li>
                                    <li>Startup founder stories</li>
                                </ul>
                            </div>
                            <div class="col-md-4">
                                <h6><i class="fas fa-check-circle"></i> Quality Guidelines</h6>
                                <ul class="small">
                                    <li>Minimum 10 minutes duration</li>
                                    <li>Clear audio quality</li>
                                    <li>Technical depth preferred</li>
                                    <li>Educational value</li>
                                    <li>Uncensored discussions</li>
                                </ul>
                            </div>
                            <div class="col-md-4">
                                <h6><i class="fas fa-user-edit"></i> Editorial Process</h6>
                                <ul class="small">
                                    <li>Manual review for every video</li>
                                    <li>Editorial notes and context</li>
                                    <li>Quality over quantity approach</li>
                                    <li>Community value assessment</li>
                                    <li>Thoughtful categorization</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-switch to bulk tab if bulk parameter is present
        if (window.location.search.includes('bulk=1')) {
            document.getElementById('bulk-tab').click();
        }

        // URL validation for single import
        document.getElementById('youtube_url').addEventListener('input', function() {
            const url = this.value;
            const isValid = url.includes('youtube.com') || url.includes('youtu.be');

            if (url && !isValid) {
                this.setCustomValidity('Please enter a valid YouTube URL');
            } else {
                this.setCustomValidity('');
            }
        });

        // Count URLs in bulk import
        document.getElementById('bulk_urls').addEventListener('input', function() {
            const urls = this.value.split('\n').filter(line => line.trim());
            const count = urls.length;

            if (count > 100) {
                this.setCustomValidity('Maximum 100 URLs allowed per batch');
            } else {
                this.setCustomValidity('');
            }

            // Update placeholder with count
            if (count > 0) {
                this.setAttribute('placeholder', `${count} URLs entered...`);
            }
        });
    </script>
</body>
</html>
