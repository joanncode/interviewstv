<?php

namespace App\Services;

class FileUploadService
{
    protected $allowedImageTypes;
    protected $allowedVideoTypes;
    protected $allowedAudioTypes;
    protected $maxFileSize;
    protected $uploadPath;
    protected $s3Client;
    
    public function __construct()
    {
        $this->allowedImageTypes = explode(',', env('ALLOWED_IMAGE_TYPES', 'jpg,jpeg,png,gif,webp'));
        $this->allowedVideoTypes = explode(',', env('ALLOWED_VIDEO_TYPES', 'mp4,mov,avi,webm'));
        $this->allowedAudioTypes = explode(',', env('ALLOWED_AUDIO_TYPES', 'mp3,wav,m4a,aac'));
        $this->maxFileSize = $this->parseFileSize(env('MAX_FILE_SIZE', '100MB'));
        $this->uploadPath = storage_path('uploads');
        
        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }
    
    public function validateImage($file)
    {
        return $this->validateFile($file, $this->allowedImageTypes, 'image');
    }
    
    public function validateVideo($file)
    {
        return $this->validateFile($file, $this->allowedVideoTypes, 'video');
    }
    
    public function validateAudio($file)
    {
        return $this->validateFile($file, $this->allowedAudioTypes, 'audio');
    }
    
    public function validateMedia($file, $type = 'general')
    {
        $allowedTypes = array_merge(
            $this->allowedImageTypes,
            $this->allowedVideoTypes,
            $this->allowedAudioTypes
        );
        
        return $this->validateFile($file, $allowedTypes, 'media');
    }
    
    protected function validateFile($file, $allowedTypes, $category)
    {
        // Check if file was uploaded
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return [
                'valid' => false,
                'error' => $this->getUploadErrorMessage($file['error'])
            ];
        }
        
        // Check file size
        if ($file['size'] > $this->maxFileSize) {
            $maxSizeMB = round($this->maxFileSize / (1024 * 1024), 2);
            return [
                'valid' => false,
                'error' => "File size exceeds maximum allowed size of {$maxSizeMB}MB"
            ];
        }
        
        // Check file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowedTypes)) {
            return [
                'valid' => false,
                'error' => "File type '{$extension}' is not allowed for {$category} uploads"
            ];
        }
        
        // Check MIME type for additional security
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!$this->isValidMimeType($mimeType, $extension)) {
            return [
                'valid' => false,
                'error' => 'File type does not match file content'
            ];
        }
        
        return ['valid' => true];
    }
    
    public function uploadAvatar($file, $userId)
    {
        try {
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = "avatar_{$userId}_" . time() . ".{$extension}";
            $relativePath = "avatars/{$filename}";
            $fullPath = $this->uploadPath . "/avatars";
            
            // Create avatars directory
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }
            
            $filePath = $fullPath . "/{$filename}";
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception('Failed to move uploaded file');
            }
            
            // Resize image for avatar (optional)
            $this->resizeImage($filePath, 200, 200);
            
            return [
                'success' => true,
                'url' => "/uploads/{$relativePath}",
                'path' => $filePath,
                'filename' => $filename
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function uploadMedia($file, $userId, $type = 'general')
    {
        try {
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = "{$type}_{$userId}_" . time() . "_" . uniqid() . ".{$extension}";
            $relativePath = "media/{$type}/{$filename}";
            $fullPath = $this->uploadPath . "/media/{$type}";
            
            // Create media directory
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }
            
            $filePath = $fullPath . "/{$filename}";
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception('Failed to move uploaded file');
            }

            $fileUrl = "/uploads/{$relativePath}";

            // Upload to S3 if configured
            if (env('STORAGE_DRIVER') === 's3') {
                try {
                    $s3Url = $this->uploadToS3($filePath, $relativePath);
                    $fileUrl = $s3Url;

                    // Optionally delete local file after S3 upload
                    if (env('DELETE_LOCAL_AFTER_S3', false)) {
                        unlink($filePath);
                    }
                } catch (\Exception $e) {
                    error_log('S3 upload failed, using local storage: ' . $e->getMessage());
                }
            }

            $result = [
                'success' => true,
                'url' => $fileUrl,
                'path' => $filePath,
                'filename' => $filename,
                'type' => $this->getFileType($extension),
                'size' => $file['size']
            ];
            
            // Add duration for video/audio files
            if (in_array($extension, $this->allowedVideoTypes) || in_array($extension, $this->allowedAudioTypes)) {
                $result['duration'] = $this->getMediaDuration($filePath);
            }
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function uploadThumbnail($file, $userId)
    {
        try {
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = "thumb_{$userId}_" . time() . ".{$extension}";
            $relativePath = "thumbnails/{$filename}";
            $fullPath = $this->uploadPath . "/thumbnails";

            // Create thumbnails directory
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            $filePath = $fullPath . "/{$filename}";

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception('Failed to move uploaded file');
            }

            // Get image dimensions
            $imageInfo = getimagesize($filePath);

            return [
                'success' => true,
                'url' => "/uploads/{$relativePath}",
                'path' => $filePath,
                'filename' => $filename,
                'width' => $imageInfo[0] ?? null,
                'height' => $imageInfo[1] ?? null
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function uploadHeroBanner($file, $userId)
    {
        try {
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = "hero_{$userId}_" . time() . ".{$extension}";
            $relativePath = "hero-banners/{$filename}";
            $fullPath = $this->uploadPath . "/hero-banners";

            // Create hero-banners directory
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            $filePath = $fullPath . "/{$filename}";

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception('Failed to move uploaded file');
            }

            // Resize image for hero banner (recommended: 1200x400px)
            $this->resizeImage($filePath, 1200, 400);

            // Get image dimensions after resize
            $imageInfo = getimagesize($filePath);

            $fileUrl = "/uploads/{$relativePath}";

            // Upload to S3 if configured
            if (env('STORAGE_DRIVER') === 's3') {
                try {
                    $s3Url = $this->uploadToS3($filePath, $relativePath);
                    $fileUrl = $s3Url;

                    // Optionally delete local file after S3 upload
                    if (env('DELETE_LOCAL_AFTER_S3', false)) {
                        unlink($filePath);
                    }
                } catch (\Exception $e) {
                    error_log('S3 upload failed, using local storage: ' . $e->getMessage());
                }
            }

            return [
                'success' => true,
                'url' => $fileUrl,
                'path' => $filePath,
                'filename' => $filename,
                'width' => $imageInfo[0] ?? null,
                'height' => $imageInfo[1] ?? null
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function uploadBusinessLogo($file, $userId)
    {
        try {
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = "logo_{$userId}_" . time() . ".{$extension}";
            $relativePath = "business-logos/{$filename}";
            $fullPath = $this->uploadPath . "/business-logos";

            // Create business-logos directory
            if (!is_dir($fullPath)) {
                mkdir($fullPath, 0755, true);
            }

            $filePath = $fullPath . "/{$filename}";

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception('Failed to move uploaded file');
            }

            // Resize image for business logo (recommended: 300x300px)
            $this->resizeImage($filePath, 300, 300);

            // Get image dimensions after resize
            $imageInfo = getimagesize($filePath);

            $fileUrl = "/uploads/{$relativePath}";

            // Upload to S3 if configured
            if (env('STORAGE_DRIVER') === 's3') {
                try {
                    $s3Url = $this->uploadToS3($filePath, $relativePath);
                    $fileUrl = $s3Url;

                    // Optionally delete local file after S3 upload
                    if (env('DELETE_LOCAL_AFTER_S3', false)) {
                        unlink($filePath);
                    }
                } catch (\Exception $e) {
                    error_log('S3 upload failed, using local storage: ' . $e->getMessage());
                }
            }

            return [
                'success' => true,
                'url' => $fileUrl,
                'path' => $filePath,
                'filename' => $filename,
                'width' => $imageInfo[0] ?? null,
                'height' => $imageInfo[1] ?? null
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    protected function resizeImage($filePath, $maxWidth, $maxHeight)
    {
        // Simple image resizing (you might want to use a more robust library)
        $imageInfo = getimagesize($filePath);
        if (!$imageInfo) return false;
        
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        $type = $imageInfo[2];
        
        // Calculate new dimensions
        $ratio = min($maxWidth / $width, $maxHeight / $height);
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
    
    protected function getFileType($extension)
    {
        if (in_array($extension, $this->allowedImageTypes)) {
            return 'image';
        } elseif (in_array($extension, $this->allowedVideoTypes)) {
            return 'video';
        } elseif (in_array($extension, $this->allowedAudioTypes)) {
            return 'audio';
        }
        return 'unknown';
    }
    
    protected function getMediaDuration($filePath)
    {
        // This would require ffmpeg or similar tool
        // For now, return null - implement later with proper media processing
        return null;
    }
    
    protected function isValidMimeType($mimeType, $extension)
    {
        $validMimeTypes = [
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'gif' => ['image/gif'],
            'webp' => ['image/webp'],
            'mp4' => ['video/mp4'],
            'mov' => ['video/quicktime'],
            'avi' => ['video/x-msvideo'],
            'webm' => ['video/webm'],
            'mp3' => ['audio/mpeg'],
            'wav' => ['audio/wav', 'audio/x-wav'],
            'm4a' => ['audio/mp4'],
            'aac' => ['audio/aac']
        ];
        
        return isset($validMimeTypes[$extension]) && 
               in_array($mimeType, $validMimeTypes[$extension]);
    }
    
    protected function parseFileSize($size)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $size = trim($size);
        $unit = strtoupper(substr($size, -2));
        $value = (float) substr($size, 0, -2);
        
        $multiplier = array_search($unit, $units);
        if ($multiplier !== false) {
            return $value * pow(1024, $multiplier);
        }
        
        return (float) $size; // Assume bytes if no unit
    }
    
    protected function getUploadErrorMessage($error)
    {
        switch ($error) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'File size exceeds maximum allowed size';
            case UPLOAD_ERR_PARTIAL:
                return 'File was only partially uploaded';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Missing temporary folder';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Failed to write file to disk';
            case UPLOAD_ERR_EXTENSION:
                return 'File upload stopped by extension';
            default:
                return 'Unknown upload error';
        }
    }

    public function deleteFile($fileUrl)
    {
        if (empty($fileUrl)) {
            return true; // Nothing to delete
        }

        // Check if this is a local file or S3 URL
        if (strpos($fileUrl, 'http') === 0) {
            // This is a URL (likely S3), extract the file path
            $parsedUrl = parse_url($fileUrl);
            $filePath = ltrim($parsedUrl['path'], '/');

            // If using S3, delete from S3
            if (env('STORAGE_DRIVER') === 's3') {
                return $this->deleteFromS3($filePath);
            }
        } else {
            // This is a local file path
            $filePath = $this->uploadPath . '/' . ltrim($fileUrl, '/');

            if (file_exists($filePath)) {
                return unlink($filePath);
            }
        }

        return true; // File doesn't exist, consider it deleted
    }

    protected function deleteFromS3($filePath)
    {
        try {
            // Initialize S3 client if not already done
            if (!$this->s3Client) {
                $this->initializeS3Client();
            }

            $this->s3Client->deleteObject([
                'Bucket' => env('AWS_S3_BUCKET'),
                'Key' => $filePath
            ]);

            return true;

        } catch (\Exception $e) {
            error_log('S3 delete error: ' . $e->getMessage());
            return false;
        }
    }

    protected function initializeS3Client()
    {
        if (!class_exists('\Aws\S3\S3Client')) {
            throw new \Exception('AWS SDK not installed. Run: composer require aws/aws-sdk-php');
        }

        $this->s3Client = new \Aws\S3\S3Client([
            'version' => 'latest',
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);
    }

    protected function uploadToS3($localPath, $s3Key)
    {
        try {
            if (!$this->s3Client) {
                $this->initializeS3Client();
            }

            $result = $this->s3Client->putObject([
                'Bucket' => env('AWS_S3_BUCKET'),
                'Key' => $s3Key,
                'SourceFile' => $localPath,
                'ACL' => 'public-read',
                'ContentType' => mime_content_type($localPath)
            ]);

            return $result['ObjectURL'];

        } catch (\Exception $e) {
            error_log('S3 upload error: ' . $e->getMessage());
            throw new \Exception('Failed to upload to S3: ' . $e->getMessage());
        }
    }

    protected function getS3Url($key)
    {
        $bucket = env('AWS_S3_BUCKET');
        $region = env('AWS_DEFAULT_REGION', 'us-east-1');

        if (env('AWS_CLOUDFRONT_DOMAIN')) {
            return 'https://' . env('AWS_CLOUDFRONT_DOMAIN') . '/' . $key;
        }

        return "https://{$bucket}.s3.{$region}.amazonaws.com/{$key}";
    }
}
