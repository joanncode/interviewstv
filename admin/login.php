<?php
/**
 * Admin Login - YouTube Interview Curation System
 * Interviews.tv - Admin-Only Bulk Import & Curation Platform
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once '../includes/youtube_config.php';
require_once '../includes/Database.php';

session_start();

// Redirect if already logged in
if (isset($_SESSION['admin_logged_in'])) {
    header('Location: index.php');
    exit;
}

$error = '';

// Handle login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        $error = 'Please enter both username and password';
    } else {
        $db = getDB();
        $admin = $db->getRow('admin_users', 'username = ? AND is_active = 1', [$username]);
        
        if ($admin && password_verify($password, $admin['password_hash'])) {
            // Successful login
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            $_SESSION['admin_role'] = $admin['role'];
            $_SESSION['admin_name'] = $admin['full_name'];
            
            // Update last login
            $db->update('admin_users', 
                ['last_login' => date('Y-m-d H:i:s')], 
                'id = ?', 
                [$admin['id']]
            );
            
            header('Location: index.php');
            exit;
        } else {
            $error = 'Invalid username or password';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - YouTube Interview Curation</title>
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
            background: linear-gradient(135deg, var(--bg-dark) 0%, #2d2d2d 100%);
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
        }
        
        .login-container {
            max-width: 400px;
            margin: 0 auto;
        }
        
        .login-card {
            background-color: var(--card-dark);
            border: 1px solid #444;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        
        .login-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, #cc0000 100%);
            color: white;
            text-align: center;
            padding: 30px 20px;
            border-radius: 10px 10px 0 0;
        }
        
        .login-header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .login-header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        
        .login-body {
            padding: 30px;
        }
        
        .form-control {
            background-color: var(--input-dark);
            border: 1px solid #555;
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
        }
        
        .form-control:focus {
            background-color: var(--input-dark);
            border-color: var(--primary-color);
            color: white;
            box-shadow: 0 0 0 0.2rem rgba(255, 0, 0, 0.25);
        }
        
        .form-control::placeholder {
            color: #aaa;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color) 0%, #cc0000 100%);
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #cc0000 0%, #aa0000 100%);
            transform: translateY(-1px);
            box-shadow: 0 5px 15px rgba(255, 0, 0, 0.3);
        }
        
        .input-group-text {
            background-color: var(--input-dark);
            border: 1px solid #555;
            color: #ccc;
        }
        
        .alert {
            border: none;
            border-radius: 8px;
        }
        
        .system-info {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            text-align: center;
            font-size: 0.85rem;
            color: #ccc;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 15px 0;
        }
        
        .feature-list li {
            padding: 5px 0;
            font-size: 0.85rem;
            color: #ccc;
        }
        
        .feature-list li i {
            color: var(--primary-color);
            margin-right: 8px;
            width: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <h1>
                        <i class="fas fa-video"></i>
                        YouTube Curation Admin
                    </h1>
                    <p>Innovation Interview Management System</p>
                </div>
                
                <div class="login-body">
                    <?php if (!empty($error)): ?>
                        <div class="alert alert-danger" role="alert">
                            <i class="fas fa-exclamation-triangle"></i>
                            <?= htmlspecialchars($error) ?>
                        </div>
                    <?php endif; ?>
                    
                    <form method="POST" action="">
                        <div class="mb-3">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fas fa-user"></i>
                                </span>
                                <input type="text" class="form-control" name="username" 
                                       placeholder="Username" required autofocus>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fas fa-lock"></i>
                                </span>
                                <input type="password" class="form-control" name="password" 
                                       placeholder="Password" required>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-sign-in-alt"></i>
                            Login to Admin Panel
                        </button>
                    </form>
                    
                    <div class="system-info">
                        <h6><i class="fas fa-shield-alt"></i> Admin Features</h6>
                        <ul class="feature-list">
                            <li><i class="fas fa-upload"></i> Bulk YouTube video import</li>
                            <li><i class="fas fa-robot"></i> AI-powered categorization</li>
                            <li><i class="fas fa-comments"></i> Uncensored discussion platform</li>
                            <li><i class="fas fa-chart-line"></i> Content analytics & insights</li>
                            <li><i class="fas fa-cogs"></i> Advanced curation workflow</li>
                        </ul>
                        
                        <div class="mt-3 pt-3" style="border-top: 1px solid #444;">
                            <small>
                                <i class="fas fa-info-circle"></i>
                                Default login: <strong>admin</strong> / <strong>admin123</strong><br>
                                <span style="color: var(--primary-color);">Change password after first login!</span>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Additional Info -->
            <div class="text-center mt-4">
                <p class="text-muted">
                    <i class="fas fa-globe"></i>
                    <a href="../public/browse.php" class="text-decoration-none" style="color: var(--primary-color);">
                        View Public Site
                    </a>
                    &nbsp;|&nbsp;
                    <i class="fas fa-code"></i>
                    <span>Interviews.tv v<?= SYSTEM_VERSION ?></span>
                </p>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-focus username field
        document.addEventListener('DOMContentLoaded', function() {
            const usernameField = document.querySelector('input[name="username"]');
            if (usernameField) {
                usernameField.focus();
            }
        });
        
        // Add some visual feedback on form submission
        document.querySelector('form').addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
        });
    </script>
</body>
</html>
