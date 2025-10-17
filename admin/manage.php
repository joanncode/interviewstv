<?php
/**
 * Video Management Interface - YouTube Interview Curation System
 * Manual Curation Workflow
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once '../includes/youtube_config.php';
require_once '../includes/Database.php';

// Simple session-based authentication
session_start();
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

$db = getDB();
$message = '';
$messageType = '';

// Handle actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $videoId = $_POST['video_id'] ?? '';
    
    switch ($action) {
        case 'approve':
            $db->update('curated_videos', 
                ['status' => 'approved', 'updated_at' => date('Y-m-d H:i:s')], 
                'id = ?', 
                [$videoId]
            );
            $message = "Video approved and published";
            $messageType = 'success';
            break;
            
        case 'reject':
            $db->update('curated_videos', 
                ['status' => 'rejected', 'updated_at' => date('Y-m-d H:i:s')], 
                'id = ?', 
                [$videoId]
            );
            $message = "Video rejected";
            $messageType = 'warning';
            break;
            
        case 'feature':
            $db->update('curated_videos', 
                ['status' => 'featured', 'featured_until' => date('Y-m-d H:i:s', strtotime('+30 days'))], 
                'id = ?', 
                [$videoId]
            );
            $message = "Video featured for 30 days";
            $messageType = 'success';
            break;
            
        case 'update_notes':
            $notes = $_POST['admin_notes'] ?? '';
            $db->update('curated_videos', 
                ['admin_notes' => $notes, 'updated_at' => date('Y-m-d H:i:s')], 
                'id = ?', 
                [$videoId]
            );
            $message = "Editorial notes updated";
            $messageType = 'success';
            break;
    }
}

// Get filter parameters
$status = $_GET['status'] ?? 'all';
$category = $_GET['category'] ?? 'all';
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = 20;
$offset = ($page - 1) * $limit;

// Build where clause
$whereConditions = [];
$params = [];

if ($status !== 'all') {
    $whereConditions[] = 'v.status = ?';
    $params[] = $status;
}

if ($category !== 'all') {
    $whereConditions[] = 'v.category_id = ?';
    $params[] = $category;
}

$whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

// Get videos with pagination
$sql = "SELECT v.*, c.name as category_name, c.color as category_color 
        FROM curated_videos v 
        LEFT JOIN video_categories c ON v.category_id = c.id 
        {$whereClause}
        ORDER BY v.created_at DESC 
        LIMIT {$limit} OFFSET {$offset}";

$videos = $db->query($sql, $params)->fetchAll();

// Get total count for pagination
$countSql = "SELECT COUNT(*) FROM curated_videos v {$whereClause}";
$totalVideos = $db->query($countSql, $params)->fetchColumn();
$totalPages = ceil($totalVideos / $limit);

// Get categories for filter
$categories = $db->getRows('video_categories', 'is_active = 1', [], '*', 'sort_order ASC');

// Get statistics
$stats = [
    'pending' => $db->getCount('curated_videos', 'status = ?', ['pending']),
    'approved' => $db->getCount('curated_videos', 'status = ?', ['approved']),
    'featured' => $db->getCount('curated_videos', 'status = ?', ['featured']),
    'rejected' => $db->getCount('curated_videos', 'status = ?', ['rejected'])
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Videos - Manual Curation</title>
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
        
        .table-dark {
            background-color: var(--card-dark);
        }
        
        .video-thumbnail {
            width: 120px;
            height: 90px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .video-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .video-meta {
            font-size: 0.85rem;
            color: #ccc;
        }
        
        .status-badge {
            font-size: 0.75rem;
            padding: 4px 8px;
        }
        
        .action-buttons .btn {
            margin: 2px;
            padding: 4px 8px;
            font-size: 0.75rem;
        }
        
        .filter-section {
            background-color: var(--input-dark);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .stats-row {
            margin-bottom: 20px;
        }
        
        .stat-card {
            background-color: var(--card-dark);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .pagination .page-link {
            background-color: var(--card-dark);
            border-color: #555;
            color: white;
        }
        
        .pagination .page-link:hover {
            background-color: var(--input-dark);
            border-color: var(--primary-color);
            color: white;
        }
        
        .pagination .page-item.active .page-link {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
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
                        <a class="nav-link" href="import.php">
                            <i class="fas fa-upload"></i> Curate Videos
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="manage.php">
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
                <h1><i class="fas fa-list"></i> Video Management</h1>
                <p class="lead">Review, approve, and manage your curated innovation interviews.</p>
            </div>
        </div>

        <!-- Success/Error Messages -->
        <?php if (!empty($message)): ?>
            <div class="row mb-4">
                <div class="col-12">
                    <div class="alert alert-<?= $messageType ?> alert-dismissible fade show" role="alert">
                        <i class="fas fa-<?= $messageType === 'success' ? 'check-circle' : 'exclamation-triangle' ?>"></i>
                        <?= htmlspecialchars($message) ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <!-- Statistics -->
        <div class="row stats-row">
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number"><?= $stats['pending'] ?></div>
                    <div>Pending Review</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number"><?= $stats['approved'] ?></div>
                    <div>Approved</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number"><?= $stats['featured'] ?></div>
                    <div>Featured</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="stat-number"><?= $stats['rejected'] ?></div>
                    <div>Rejected</div>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="filter-section">
            <form method="GET" action="">
                <div class="row align-items-end">
                    <div class="col-md-3">
                        <label for="status" class="form-label">Status</label>
                        <select class="form-select" id="status" name="status" onchange="this.form.submit()">
                            <option value="all" <?= $status === 'all' ? 'selected' : '' ?>>All Status</option>
                            <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>Pending Review</option>
                            <option value="approved" <?= $status === 'approved' ? 'selected' : '' ?>>Approved</option>
                            <option value="featured" <?= $status === 'featured' ? 'selected' : '' ?>>Featured</option>
                            <option value="rejected" <?= $status === 'rejected' ? 'selected' : '' ?>>Rejected</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="category" class="form-label">Category</label>
                        <select class="form-select" id="category" name="category" onchange="this.form.submit()">
                            <option value="all" <?= $category === 'all' ? 'selected' : '' ?>>All Categories</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?= $cat['id'] ?>" <?= $category == $cat['id'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($cat['name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <div class="text-muted">
                            Showing <?= count($videos) ?> of <?= $totalVideos ?> videos
                        </div>
                    </div>
                    <div class="col-md-3 text-end">
                        <a href="import.php" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add New Video
                        </a>
                    </div>
                </div>
            </form>
        </div>

        <!-- Video List -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-video"></i> Curated Videos</h5>
                    </div>
                    <div class="card-body">
                        <?php if (empty($videos)): ?>
                            <div class="text-center py-5">
                                <i class="fas fa-video fa-3x text-muted mb-3"></i>
                                <h5>No videos found</h5>
                                <p class="text-muted">Start by curating your first innovation interview.</p>
                                <a href="import.php" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> Curate First Video
                                </a>
                            </div>
                        <?php else: ?>
                            <?php foreach ($videos as $video): ?>
                                <div class="row border-bottom border-secondary py-3">
                                    <div class="col-md-2">
                                        <img src="<?= htmlspecialchars($video['thumbnail_url']) ?>"
                                             alt="Video thumbnail" class="video-thumbnail">
                                    </div>
                                    <div class="col-md-6">
                                        <div class="video-title">
                                            <?= htmlspecialchars($video['title']) ?>
                                        </div>
                                        <div class="video-meta">
                                            <strong>Channel:</strong> <?= htmlspecialchars($video['channel_name']) ?><br>
                                            <strong>Duration:</strong> <?= gmdate("H:i:s", $video['duration']) ?><br>
                                            <strong>Views:</strong> <?= number_format($video['view_count']) ?><br>
                                            <strong>Category:</strong>
                                            <span class="badge" style="background-color: <?= $video['category_color'] ?>">
                                                <?= htmlspecialchars($video['category_name']) ?>
                                            </span><br>
                                            <strong>Added:</strong> <?= date('M j, Y', strtotime($video['created_at'])) ?>
                                        </div>
                                        <?php if (!empty($video['admin_notes'])): ?>
                                            <div class="mt-2">
                                                <small class="text-info">
                                                    <strong>Editorial Notes:</strong> <?= htmlspecialchars($video['admin_notes']) ?>
                                                </small>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="col-md-2 text-center">
                                        <div class="mb-2">
                                            <span class="badge status-badge bg-<?=
                                                $video['status'] === 'approved' ? 'success' :
                                                ($video['status'] === 'featured' ? 'danger' :
                                                ($video['status'] === 'pending' ? 'warning' : 'secondary')) ?>">
                                                <?= ucfirst($video['status']) ?>
                                            </span>
                                        </div>
                                        <div class="small text-muted">
                                            Quality: <?= $video['quality_score'] ?>/10<br>
                                            Innovation: <?= $video['innovation_score'] ?>/10
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="action-buttons">
                                            <?php if ($video['status'] === 'pending'): ?>
                                                <form method="POST" style="display: inline;">
                                                    <input type="hidden" name="action" value="approve">
                                                    <input type="hidden" name="video_id" value="<?= $video['id'] ?>">
                                                    <button type="submit" class="btn btn-success btn-sm">
                                                        <i class="fas fa-check"></i> Approve
                                                    </button>
                                                </form>
                                                <form method="POST" style="display: inline;">
                                                    <input type="hidden" name="action" value="reject">
                                                    <input type="hidden" name="video_id" value="<?= $video['id'] ?>">
                                                    <button type="submit" class="btn btn-danger btn-sm">
                                                        <i class="fas fa-times"></i> Reject
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <?php if ($video['status'] === 'approved'): ?>
                                                <form method="POST" style="display: inline;">
                                                    <input type="hidden" name="action" value="feature">
                                                    <input type="hidden" name="video_id" value="<?= $video['id'] ?>">
                                                    <button type="submit" class="btn btn-primary btn-sm">
                                                        <i class="fas fa-star"></i> Feature
                                                    </button>
                                                </form>
                                            <?php endif; ?>

                                            <button type="button" class="btn btn-outline-light btn-sm"
                                                    data-bs-toggle="modal" data-bs-target="#notesModal<?= $video['id'] ?>">
                                                <i class="fas fa-edit"></i> Notes
                                            </button>

                                            <a href="https://www.youtube.com/watch?v=<?= $video['youtube_id'] ?>"
                                               target="_blank" class="btn btn-outline-light btn-sm">
                                                <i class="fab fa-youtube"></i> View
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <!-- Notes Modal -->
                                <div class="modal fade" id="notesModal<?= $video['id'] ?>" tabindex="-1">
                                    <div class="modal-dialog">
                                        <div class="modal-content" style="background-color: var(--card-dark); color: white;">
                                            <div class="modal-header">
                                                <h5 class="modal-title">Editorial Notes</h5>
                                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                            </div>
                                            <form method="POST">
                                                <div class="modal-body">
                                                    <input type="hidden" name="action" value="update_notes">
                                                    <input type="hidden" name="video_id" value="<?= $video['id'] ?>">
                                                    <div class="mb-3">
                                                        <label for="admin_notes<?= $video['id'] ?>" class="form-label">
                                                            Your editorial notes and insights:
                                                        </label>
                                                        <textarea class="form-control" id="admin_notes<?= $video['id'] ?>"
                                                                  name="admin_notes" rows="4"
                                                                  placeholder="Why is this video valuable? What makes it worth featuring? What discussions might it spark?"><?= htmlspecialchars($video['admin_notes']) ?></textarea>
                                                    </div>
                                                </div>
                                                <div class="modal-footer">
                                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                                    <button type="submit" class="btn btn-primary">Save Notes</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <?php if ($totalPages > 1): ?>
            <div class="row mt-4">
                <div class="col-12">
                    <nav aria-label="Video pagination">
                        <ul class="pagination justify-content-center">
                            <?php if ($page > 1): ?>
                                <li class="page-item">
                                    <a class="page-link" href="?page=<?= $page - 1 ?>&status=<?= $status ?>&category=<?= $category ?>">
                                        <i class="fas fa-chevron-left"></i> Previous
                                    </a>
                                </li>
                            <?php endif; ?>

                            <?php for ($i = max(1, $page - 2); $i <= min($totalPages, $page + 2); $i++): ?>
                                <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $i ?>&status=<?= $status ?>&category=<?= $category ?>">
                                        <?= $i ?>
                                    </a>
                                </li>
                            <?php endfor; ?>

                            <?php if ($page < $totalPages): ?>
                                <li class="page-item">
                                    <a class="page-link" href="?page=<?= $page + 1 ?>&status=<?= $status ?>&category=<?= $category ?>">
                                        Next <i class="fas fa-chevron-right"></i>
                                    </a>
                                </li>
                            <?php endif; ?>
                        </ul>
                    </nav>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
