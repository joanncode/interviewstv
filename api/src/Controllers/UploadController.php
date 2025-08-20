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
            
            return Response::success([
                'url' => $uploadResult['url'],
                'type' => $uploadResult['type'],
                'size' => $uploadResult['size'],
                'duration' => $uploadResult['duration'] ?? null
            ], 'Media uploaded successfully');
            
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
}
