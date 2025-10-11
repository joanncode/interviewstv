<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\User;
use App\Services\FileUploadService;

class UploadController
{
    protected $uploadService;
    
    public function __construct()
    {
        $this->uploadService = new FileUploadService();
    }
    
    public function avatar(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$request->hasFile('avatar')) {
                return Response::error('No avatar file provided', 400);
            }
            
            $file = $request->file('avatar');
            
            // Validate file
            $validation = $this->uploadService->validateImage($file);
            if (!$validation['valid']) {
                return Response::error($validation['error'], 400);
            }
            
            // Upload to storage
            $uploadResult = $this->uploadService->uploadAvatar($file, $currentUser['id']);
            
            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }
            
            // Update user avatar URL
            $updatedUser = User::update($currentUser['id'], [
                'avatar_url' => $uploadResult['url']
            ]);
            
            return Response::success([
                'url' => $uploadResult['url'],
                'user' => User::sanitize($updatedUser)
            ], 'Avatar uploaded successfully');
            
        } catch (\Exception $e) {
            return Response::error('Avatar upload failed: ' . $e->getMessage());
        }
    }
    
    public function media(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$request->hasFile('media')) {
                return Response::error('No media file provided', 400);
            }
            
            $file = $request->file('media');
            $type = $request->input('type', 'general'); // interview, gallery, etc.
            
            // Validate file based on type
            $validation = $this->uploadService->validateMedia($file, $type);
            if (!$validation['valid']) {
                return Response::error($validation['error'], 400);
            }
            
            // Upload to storage
            $uploadResult = $this->uploadService->uploadMedia($file, $currentUser['id'], $type);

            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }

            // Process media if it's video or audio
            $processedData = null;
            if (in_array($uploadResult['type'], ['video', 'audio'])) {
                $mediaProcessor = new \App\Services\MediaProcessingService();
                if ($mediaProcessor->isAvailable()) {
                    if ($uploadResult['type'] === 'video') {
                        $processedData = $mediaProcessor->processVideo($uploadResult['path']);
                    } else {
                        $processedData = $mediaProcessor->processAudio($uploadResult['path']);
                    }
                }
            }

            $responseData = [
                'url' => $uploadResult['url'],
                'type' => $uploadResult['type'],
                'size' => $uploadResult['size'],
                'duration' => $uploadResult['duration'] ?? null
            ];

            // Add processed media data
            if ($processedData && $processedData['success']) {
                $responseData['processed'] = [
                    'thumbnail' => $processedData['thumbnail'] ?? null,
                    'waveform' => $processedData['waveform'] ?? null,
                    'preview' => $processedData['preview'] ?? null,
                    'compressed' => $processedData['compressed'] ?? null,
                    'metadata' => $processedData['metadata'] ?? null
                ];
            }

            return Response::success($responseData, 'Media uploaded successfully');
            
        } catch (\Exception $e) {
            return Response::error('Media upload failed: ' . $e->getMessage());
        }
    }
    
    public function thumbnail(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$request->hasFile('thumbnail')) {
                return Response::error('No thumbnail file provided', 400);
            }
            
            $file = $request->file('thumbnail');
            
            // Validate image
            $validation = $this->uploadService->validateImage($file);
            if (!$validation['valid']) {
                return Response::error($validation['error'], 400);
            }
            
            // Upload thumbnail
            $uploadResult = $this->uploadService->uploadThumbnail($file, $currentUser['id']);
            
            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }
            
            return Response::success([
                'url' => $uploadResult['url'],
                'width' => $uploadResult['width'],
                'height' => $uploadResult['height']
            ], 'Thumbnail uploaded successfully');
            
        } catch (\Exception $e) {
            return Response::error('Thumbnail upload failed: ' . $e->getMessage());
        }
    }

    public function removeAvatar(Request $request)
    {
        try {
            $currentUser = $request->user();

            // Get current avatar URL to delete from storage
            $user = User::findById($currentUser['id']);
            $currentAvatarUrl = $user['avatar_url'];

            // Update user to remove avatar URL
            $updatedUser = User::update($currentUser['id'], [
                'avatar_url' => null
            ]);

            // Delete file from storage if it exists
            if ($currentAvatarUrl) {
                try {
                    $this->uploadService->deleteFile($currentAvatarUrl);
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    error_log('Failed to delete avatar file: ' . $e->getMessage());
                }
            }

            return Response::success([
                'user' => User::sanitize($updatedUser)
            ], 'Avatar removed successfully');

        } catch (\Exception $e) {
            return Response::error('Avatar removal failed: ' . $e->getMessage());
        }
    }

    public function heroBanner(Request $request)
    {
        try {
            $currentUser = $request->user();

            if (!$request->hasFile('hero_banner')) {
                return Response::error('No hero banner file provided', 400);
            }

            $file = $request->file('hero_banner');

            // Validate file
            $validation = $this->uploadService->validateImage($file);
            if (!$validation['valid']) {
                return Response::error($validation['error'], 400);
            }

            // Upload to storage
            $uploadResult = $this->uploadService->uploadHeroBanner($file, $currentUser['id']);

            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }

            // Update user hero banner URL
            $updatedUser = User::update($currentUser['id'], [
                'hero_banner_url' => $uploadResult['url']
            ]);

            return Response::success([
                'url' => $uploadResult['url'],
                'width' => $uploadResult['width'],
                'height' => $uploadResult['height'],
                'user' => User::sanitize($updatedUser)
            ], 'Hero banner uploaded successfully');

        } catch (\Exception $e) {
            return Response::error('Hero banner upload failed: ' . $e->getMessage());
        }
    }

    public function businessLogo(Request $request)
    {
        try {
            $currentUser = $request->user();

            if (!$request->hasFile('business_logo')) {
                return Response::error('No business logo file provided', 400);
            }

            $file = $request->file('business_logo');

            // Validate file
            $validation = $this->uploadService->validateImage($file);
            if (!$validation['valid']) {
                return Response::error($validation['error'], 400);
            }

            // Upload to storage
            $uploadResult = $this->uploadService->uploadBusinessLogo($file, $currentUser['id']);

            if (!$uploadResult['success']) {
                return Response::error($uploadResult['error'], 500);
            }

            return Response::success([
                'url' => $uploadResult['url'],
                'width' => $uploadResult['width'],
                'height' => $uploadResult['height']
            ], 'Business logo uploaded successfully');

        } catch (\Exception $e) {
            return Response::error('Business logo upload failed: ' . $e->getMessage());
        }
    }
}
