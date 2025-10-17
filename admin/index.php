<?php
/**
 * Admin Dashboard - YouTube Interview Curation System
 * Interviews.tv - Admin-Only Bulk Import & Curation Platform
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once '../includes/youtube_config.php';
require_once '../includes/Database.php';

// Simple session-based authentication (enhance later)
session_start();
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

$db = getDB();

// Get dashboard statistics
$stats = [
    'total_videos' => $db->getCount('curated_videos'),
    'pending_videos' => $db->getCount('curated_videos', 'status = ?', ['pending']),
    'approved_videos' => $db->getCount('curated_videos', 'status = ?', ['approved']),
    'featured_videos' => $db->getCount('curated_videos', 'status = ?', ['featured']),
    'total_comments' => $db->getCount('video_comments'),
    'queue_items' => $db->getCount('curation_queue', 'status = ?', ['pending'])
];

// Get recent activity
$recent_videos = $db->getRows(
    'curated_videos', 
    '1=1', 
    [], 
    'id, title, status, created_at', 
    'created_at DESC', 
    '10'
);

$recent_queue = $db->getRows(
    'curation_queue', 
    '1=1', 
    [], 
    'id, youtube_url, status, priority, created_at', 
    'created_at DESC', 
    '10'
);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - YouTube Interview Curation</title>
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
        
        .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }
        
        .btn-primary:hover {
            background-color: #cc0000;
            border-color: #cc0000;
        }
        
        .stat-card {
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .table-dark {
            background-color: var(--card-dark);
        }
        
        .badge-pending {
            background-color: #ffc107;
            color: #000;
        }
        
        .badge-approved {
            background-color: #28a745;
        }
        
        .badge-featured {
            background-color: var(--primary-color);
        }
        
        .badge-rejected {
            background-color: #dc3545;
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
                        <a class="nav-link active" href="index.php">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="import.php">
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
        <!-- Welcome Message -->
        <div class="row mb-4">
            <div class="col-12">
                <h1><i class="fas fa-tachometer-alt"></i> Curation Dashboard</h1>
                <p class="lead">Welcome to the manual curation system. Carefully select and curate high-quality innovation interviews for uncensored community discovery and discussion.</p>
            </div>
        </div>

        <!-- Statistics Cards -->
        <div class="row mb-4">
            <div class="col-md-3 mb-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <i class="fas fa-video fa-2x mb-2" style="color: var(--primary-color);"></i>
                        <div class="stat-number"><?= number_format($stats['total_videos']) ?></div>
                        <div>Total Videos</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <i class="fas fa-clock fa-2x mb-2" style="color: #ffc107;"></i>
                        <div class="stat-number"><?= number_format($stats['pending_videos']) ?></div>
                        <div>Pending Review</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <i class="fas fa-check-circle fa-2x mb-2" style="color: #28a745;"></i>
                        <div class="stat-number"><?= number_format($stats['approved_videos']) ?></div>
                        <div>Approved</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <i class="fas fa-star fa-2x mb-2" style="color: var(--primary-color);"></i>
                        <div class="stat-number"><?= number_format($stats['featured_videos']) ?></div>
                        <div>Featured</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-bolt"></i> Quick Actions</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3 mb-2">
                                <a href="import.php" class="btn btn-primary w-100">
                                    <i class="fas fa-plus"></i> Curate Single Video
                                </a>
                            </div>
                            <div class="col-md-3 mb-2">
                                <a href="import.php?bulk=1" class="btn btn-outline-primary w-100">
                                    <i class="fas fa-clipboard-list"></i> Curated Batch
                                </a>
                            </div>
                            <div class="col-md-3 mb-2">
                                <a href="manage.php?status=pending" class="btn btn-warning w-100">
                                    <i class="fas fa-eye"></i> Review Queue
                                </a>
                            </div>
                            <div class="col-md-3 mb-2">
                                <a href="categories.php" class="btn btn-info w-100">
                                    <i class="fas fa-tags"></i> Manage Categories
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-history"></i> Recent Videos</h5>
                    </div>
                    <div class="card-body">
                        <?php if (empty($recent_videos)): ?>
                            <p class="text-muted">No videos imported yet.</p>
                            <a href="import.php" class="btn btn-primary">Import Your First Video</a>
                        <?php else: ?>
                            <div class="table-responsive">
                                <table class="table table-dark table-sm">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($recent_videos as $video): ?>
                                            <tr>
                                                <td>
                                                    <a href="manage.php?id=<?= $video['id'] ?>" class="text-white text-decoration-none">
                                                        <?= htmlspecialchars(substr($video['title'], 0, 50)) ?>...
                                                    </a>
                                                </td>
                                                <td>
                                                    <span class="badge badge-<?= $video['status'] ?>">
                                                        <?= ucfirst($video['status']) ?>
                                                    </span>
                                                </td>
                                                <td><?= date('M j', strtotime($video['created_at'])) ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-list"></i> Import Queue</h5>
                    </div>
                    <div class="card-body">
                        <?php if (empty($recent_queue)): ?>
                            <p class="text-muted">No items in queue.</p>
                        <?php else: ?>
                            <div class="table-responsive">
                                <table class="table table-dark table-sm">
                                    <thead>
                                        <tr>
                                            <th>URL</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($recent_queue as $item): ?>
                                            <tr>
                                                <td>
                                                    <?= htmlspecialchars(substr($item['youtube_url'], 0, 30)) ?>...
                                                </td>
                                                <td>
                                                    <span class="badge bg-<?= $item['priority'] === 'high' ? 'danger' : ($item['priority'] === 'medium' ? 'warning' : 'secondary') ?>">
                                                        <?= ucfirst($item['priority']) ?>
                                                    </span>
                                                </td>
                                                <td>
                                                    <span class="badge bg-<?= $item['status'] === 'completed' ? 'success' : 'warning' ?>">
                                                        <?= ucfirst($item['status']) ?>
                                                    </span>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
