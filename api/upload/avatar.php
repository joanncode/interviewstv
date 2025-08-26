<?php
/**
 * Avatar Upload Endpoint for Interviews.tv API
 * Handles user avatar image uploads
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../config/json_database.php';
require_once '../models/User.php';

// Only allow POST and DELETE requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
    ApiResponse::error('Method not allowed', 405);
}

// Check authentication
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
    ApiResponse::error('Authentication required', 401);
}

$token = substr($authHeader, 7);
$currentUser = User::validateToken($token);

if (!$currentUser) {
    ApiResponse::error('Invalid or expired token', 401);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Handle avatar upload
        if (!isset($_FILES['avatar'])) {
            ApiResponse::error('No avatar file provided', 400);
        }

        $file = $_FILES['avatar'];

        // Validate file upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            ApiResponse::error('File upload failed', 400);
        }

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            ApiResponse::error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed', 400);
        }

        // Validate file size (5MB max)
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($file['size'] > $maxSize) {
            ApiResponse::error('File size too large. Maximum size is 5MB', 400);
        }

        // Create upload directory
        $uploadDir = '../storage/uploads/avatars';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Generate unique filename
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = "avatar_{$currentUser['id']}_" . time() . ".{$extension}";
        $filePath = $uploadDir . '/' . $filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            ApiResponse::error('Failed to save uploaded file', 500);
        }

        // Resize image for avatar (optional)
        resizeImage($filePath, 400, 400);

        // Update user avatar URL
        $avatarUrl = "/api/uploads/avatars/{$filename}";
        $updatedUser = User::updateAvatar($currentUser['id'], $avatarUrl);

        if ($updatedUser) {
            ApiResponse::success([
                'url' => $avatarUrl,
                'user' => User::sanitize($updatedUser)
            ], 'Avatar uploaded successfully');
        } else {
            ApiResponse::error('Failed to update user avatar', 500);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Handle avatar removal
        $user = User::findById($currentUser['id']);
        $currentAvatarUrl = $user['avatar_url'];

        // Update user to remove avatar URL
        $updatedUser = User::updateAvatar($currentUser['id'], null);

        // Delete file from storage if it exists
        if ($currentAvatarUrl && strpos($currentAvatarUrl, '/api/uploads/') === 0) {
            $filePath = '../storage/uploads/' . substr($currentAvatarUrl, strlen('/api/uploads/'));
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        if ($updatedUser) {
            ApiResponse::success([
                'user' => User::sanitize($updatedUser)
            ], 'Avatar removed successfully');
        } else {
            ApiResponse::error('Failed to remove avatar', 500);
        }
    }

} catch (Exception $e) {
    error_log("Avatar upload error: " . $e->getMessage());
    ApiResponse::error('Avatar operation failed: ' . $e->getMessage(), 500);
}

/**
 * Simple image resizing function
 */
function resizeImage($filePath, $maxWidth, $maxHeight) {
    $imageInfo = getimagesize($filePath);
    if (!$imageInfo) return false;
    
    $width = $imageInfo[0];
    $height = $imageInfo[1];
    $type = $imageInfo[2];
    
    // Calculate new dimensions
    $ratio = min($maxWidth / $width, $maxHeight / $height);
    if ($ratio >= 1) return true; // No need to resize
    
    $newWidth = round($width * $ratio);
    $newHeight = round($height * $ratio);
    
    // Create new image
    $newImage = imagecreatetruecolor($newWidth, $newHeight);
    
    switch ($type) {
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($filePath);
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            break;
        case IMAGETYPE_GIF:
            $source = imagecreatefromgif($filePath);
            break;
        default:
            return false;
    }
    
    imagecopyresampled($newImage, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    // Save resized image
    switch ($type) {
        case IMAGETYPE_JPEG:
            imagejpeg($newImage, $filePath, 90);
            break;
        case IMAGETYPE_PNG:
            imagepng($newImage, $filePath);
            break;
        case IMAGETYPE_GIF:
            imagegif($newImage, $filePath);
            break;
    }
    
    imagedestroy($source);
    imagedestroy($newImage);
    
    return true;
}
