<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Media;

class MediaController
{
    public function show(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $media = Media::findById($id);
            
            if (!$media) {
                return Response::notFound('Media not found');
            }
            
            // Check if current user liked this media
            $media['is_liked'] = false;
            if ($currentUser) {
                $media['is_liked'] = $this->isLikedByUser($id, $currentUser['id']);
            }
            
            return Response::success($media, 'Media retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve media: ' . $e->getMessage());
        }
    }
    
    public function update(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $media = Media::findById($id);
            
            if (!$media) {
                return Response::notFound('Media not found');
            }
            
            // Check if user owns this media or has permission
            if (!$this->canEditMedia($media, $currentUser)) {
                return Response::forbidden('You do not have permission to edit this media');
            }
            
            $data = $request->validate([
                'title' => 'string|max:255',
                'description' => 'string|max:1000',
                'caption' => 'string|max:500',
                'order' => 'integer|min:0'
            ]);
            
            $updated = Media::update($id, $data);
            
            if ($updated) {
                $media = Media::findById($id);
                return Response::success($media, 'Media updated successfully');
            } else {
                return Response::error('Failed to update media');
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to update media: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $media = Media::findById($id);
            
            if (!$media) {
                return Response::notFound('Media not found');
            }
            
            // Check if user owns this media or has permission
            if (!$this->canEditMedia($media, $currentUser)) {
                return Response::forbidden('You do not have permission to delete this media');
            }
            
            $deleted = Media::delete($id);
            
            if ($deleted) {
                return Response::success(null, 'Media deleted successfully');
            } else {
                return Response::error('Failed to delete media');
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete media: ' . $e->getMessage());
        }
    }
    
    public function like(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $media = Media::findById($id);
            
            if (!$media) {
                return Response::notFound('Media not found');
            }
            
            // Check if already liked
            if ($this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have already liked this media', 400);
            }
            
            // Add like
            $this->addLike($id, $currentUser['id']);

            // Update like count
            Media::updateLikeCount($id);

            // Get updated media
            $updatedMedia = Media::findById($id);

            // Create activity for like
            \App\Models\Activity::createMediaLikedActivity(
                $currentUser['id'],
                $id,
                $media
            );

            return Response::success([
                'liked' => true,
                'like_count' => $updatedMedia['like_count']
            ], 'Media liked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to like media: ' . $e->getMessage());
        }
    }
    
    public function unlike(Request $request)
    {
        try {
            $id = $request->route('id');
            $currentUser = $request->user();
            
            $media = Media::findById($id);
            
            if (!$media) {
                return Response::notFound('Media not found');
            }
            
            // Check if actually liked
            if (!$this->isLikedByUser($id, $currentUser['id'])) {
                return Response::error('You have not liked this media', 400);
            }
            
            // Remove like
            $this->removeLike($id, $currentUser['id']);
            
            // Update like count
            Media::updateLikeCount($id);
            
            // Get updated media
            $updatedMedia = Media::findById($id);
            
            return Response::success([
                'liked' => false,
                'like_count' => $updatedMedia['like_count']
            ], 'Media unliked successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to unlike media: ' . $e->getMessage());
        }
    }
    
    protected function isLikedByUser($mediaId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT COUNT(*) FROM likes WHERE likeable_type = 'media' AND likeable_id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$mediaId, $userId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    protected function addLike($mediaId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "INSERT INTO likes (user_id, likeable_type, likeable_id, created_at) VALUES (?, 'media', ?, NOW())";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $mediaId]);
    }
    
    protected function removeLike($mediaId, $userId)
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "DELETE FROM likes WHERE user_id = ? AND likeable_type = 'media' AND likeable_id = ?";
        $stmt = $pdo->prepare($sql);
        
        return $stmt->execute([$userId, $mediaId]);
    }
    
    protected function canEditMedia($media, $user)
    {
        // User can edit if they own the media or are admin
        if ($user['role'] === 'admin') {
            return true;
        }
        
        // Check if user owns the gallery that contains this media
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new \PDO($dsn, $config['username'], $config['password'], $config['options']);
        
        $sql = "SELECT g.user_id FROM galleries g 
                INNER JOIN gallery_media gm ON g.id = gm.gallery_id 
                WHERE gm.id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$media['id']]);
        $galleryOwnerId = $stmt->fetchColumn();
        
        return $galleryOwnerId == $user['id'];
    }
}
