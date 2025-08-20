<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Activity;
use App\Models\User;

class FeedController
{
    public function personalFeed(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $result = Activity::getUserFeed($currentUser['id'], $page, $limit);
            
            return Response::paginated(
                $result['activities'],
                $result['total'],
                $page,
                $limit,
                'Personal feed retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve personal feed: ' . $e->getMessage());
        }
    }
    
    public function publicFeed(Request $request)
    {
        try {
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $result = Activity::getPublicFeed($page, $limit);
            
            return Response::paginated(
                $result['activities'],
                $result['total'],
                $page,
                $limit,
                'Public feed retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve public feed: ' . $e->getMessage());
        }
    }
    
    public function userFeed(Request $request)
    {
        try {
            $username = $request->route('username');
            $currentUser = $request->user();
            
            if (!$username) {
                return Response::error('Username is required', 400);
            }
            
            $user = User::findByUsername($username);
            if (!$user) {
                return Response::error('User not found', 404);
            }
            
            // Check if user can view this feed
            if (!$this->canViewUserFeed($user, $currentUser)) {
                return Response::error('Access denied', 403);
            }
            
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            
            $result = $this->getUserActivities($user['id'], $page, $limit);
            
            return Response::paginated(
                $result['activities'],
                $result['total'],
                $page,
                $limit,
                'User feed retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve user feed: ' . $e->getMessage());
        }
    }
    
    public function getFeedPreferences(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $preferences = $this->getUserFeedPreferences($currentUser['id']);
            
            return Response::success($preferences, 'Feed preferences retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve feed preferences: ' . $e->getMessage());
        }
    }
    
    public function updateFeedPreferences(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $validTypes = ['interview_published', 'interview_liked', 'comment_created', 'user_followed', 'gallery_uploaded', 'profile_updated'];
            $preferences = [];
            
            foreach ($data as $type => $enabled) {
                if (in_array($type, $validTypes)) {
                    $preferences[$type] = (bool) $enabled;
                }
            }
            
            if (empty($preferences)) {
                return Response::error('No valid preferences provided', 400);
            }
            
            $success = $this->updateUserFeedPreferences($currentUser['id'], $preferences);
            
            if ($success) {
                $updatedPreferences = $this->getUserFeedPreferences($currentUser['id']);
                return Response::success($updatedPreferences, 'Feed preferences updated successfully');
            } else {
                return Response::error('Failed to update preferences', 500);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to update feed preferences: ' . $e->getMessage());
        }
    }
    
    protected function canViewUserFeed($user, $currentUser)
    {
        // Public profiles can be viewed by anyone
        if ($user['profile_visibility'] === 'public') {
            return true;
        }
        
        // Private profiles require authentication
        if (!$currentUser) {
            return false;
        }
        
        // Own profile
        if ($currentUser['id'] === $user['id']) {
            return true;
        }
        
        // Followers can view follower-only profiles
        if ($user['profile_visibility'] === 'followers') {
            return User::isFollowing($currentUser['id'], $user['id']);
        }
        
        return false;
    }
    
    protected function getUserActivities($userId, $page = 1, $limit = 20)
    {
        $pdo = \App\Models\Activity::getConnection();
        $offset = ($page - 1) * $limit;
        
        $sql = "SELECT a.*, u.username, u.avatar_url
                FROM activities a
                JOIN users u ON a.user_id = u.id
                WHERE a.user_id = ? AND a.is_public = 1
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId, $limit, $offset]);
        
        $activities = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Enrich activities
        foreach ($activities as &$activity) {
            if ($activity['metadata']) {
                $activity['metadata'] = json_decode($activity['metadata'], true);
            }
            $activity = \App\Models\Activity::enrichActivity($activity);
        }
        
        // Get total count
        $countSql = "SELECT COUNT(*) FROM activities WHERE user_id = ? AND is_public = 1";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$userId]);
        $total = $countStmt->fetchColumn();
        
        return [
            'activities' => $activities,
            'total' => (int) $total
        ];
    }
    
    protected function getUserFeedPreferences($userId)
    {
        $pdo = \App\Models\Activity::getConnection();
        
        $sql = "SELECT activity_type, enabled FROM feed_preferences WHERE user_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        $preferences = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $preferences[$row['activity_type']] = (bool) $row['enabled'];
        }
        
        // Ensure all types are present
        $defaultTypes = ['interview_published', 'interview_liked', 'comment_created', 'user_followed', 'gallery_uploaded', 'profile_updated'];
        foreach ($defaultTypes as $type) {
            if (!isset($preferences[$type])) {
                $preferences[$type] = true;
            }
        }
        
        return $preferences;
    }
    
    protected function updateUserFeedPreferences($userId, $preferences)
    {
        $pdo = \App\Models\Activity::getConnection();
        
        foreach ($preferences as $type => $enabled) {
            $sql = "INSERT INTO feed_preferences (user_id, activity_type, enabled) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    enabled = VALUES(enabled),
                    updated_at = NOW()";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId, $type, $enabled ? 1 : 0]);
        }
        
        return true;
    }
}
