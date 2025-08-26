<?php
/**
 * Hero Banner Upload Endpoint for Interviews.tv API
 * Handles user hero banner image uploads
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../config/json_database.php';
require_once '../models/User.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    // Handle hero banner upload
    if (!isset($_FILES['hero_banner'])) {
        ApiResponse::error('No hero banner file provided', 400);
    }

    $file = $_FILES['hero_banner'];

    // Validate file upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        ApiResponse::error('File upload failed', 400);
    }

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        ApiResponse::error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed', 400);
    }

    // Validate file size (10MB max for hero banners)
    $maxSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxSize) {
        ApiResponse::error('File size too large. Maximum size is 10MB', 400);
    }

    // Create upload directory
    $uploadDir = '../storage/uploads/hero-banners';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = "hero_{$currentUser['id']}_" . time() . ".{$extension}";
    $filePath = $uploadDir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        ApiResponse::error('Failed to save uploaded file', 500);
    }

    // Resize image for hero banner (recommended: 1200x400px)
    resizeImage($filePath, 1200, 400);

    // Get image dimensions after resize
    $imageInfo = getimagesize($filePath);

    // Update user hero banner URL
    $heroBannerUrl = "/api/uploads/hero-banners/{$filename}";
    $updatedUser = User::updateHeroBanner($currentUser['id'], $heroBannerUrl);

    if ($updatedUser) {
        ApiResponse::success([
            'url' => $heroBannerUrl,
            'width' => $imageInfo[0] ?? null,
            'height' => $imageInfo[1] ?? null,
            'user' => User::sanitize($updatedUser)
        ], 'Hero banner uploaded successfully');
    } else {
        ApiResponse::error('Failed to update user hero banner', 500);
    }

} catch (Exception $e) {
    error_log("Hero banner upload error: " . $e->getMessage());
    ApiResponse::error('Hero banner upload failed: ' . $e->getMessage(), 500);
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
    
    // Calculate new dimensions maintaining aspect ratio
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
