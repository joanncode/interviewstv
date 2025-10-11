<?php

namespace App\Controllers;

use App\Http\Request;
use App\Http\Response;
use App\Models\Notification;
use App\Services\Validator;
use App\Exceptions\ValidationException;

class NotificationController
{
    public function index(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $page = (int) $request->input('page', 1);
            $limit = min((int) $request->input('limit', 20), 50);
            $unreadOnly = $request->input('unread_only', false);
            
            $result = Notification::getUserNotifications(
                $currentUser['id'], 
                $page, 
                $limit, 
                $unreadOnly
            );
            
            return Response::paginated(
                $result['notifications'],
                $result['total'],
                $page,
                $limit,
                'Notifications retrieved successfully'
            );
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve notifications: ' . $e->getMessage());
        }
    }
    
    public function unreadCount(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $count = Notification::getUnreadCount($currentUser['id']);
            
            return Response::success([
                'unread_count' => $count
            ], 'Unread count retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to get unread count: ' . $e->getMessage());
        }
    }
    
    public function markAsRead(Request $request)
    {
        try {
            $currentUser = $request->user();
            $notificationId = $request->route('id');
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            if (!$notificationId) {
                return Response::error('Notification ID is required', 400);
            }
            
            $success = Notification::markAsRead($notificationId, $currentUser['id']);
            
            if ($success) {
                return Response::success(null, 'Notification marked as read');
            } else {
                return Response::error('Notification not found or already read', 404);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to mark notification as read: ' . $e->getMessage());
        }
    }
    
    public function markAllAsRead(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $success = Notification::markAllAsRead($currentUser['id']);
            
            if ($success) {
                return Response::success(null, 'All notifications marked as read');
            } else {
                return Response::error('Failed to mark notifications as read', 500);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to mark all notifications as read: ' . $e->getMessage());
        }
    }
    
    public function delete(Request $request)
    {
        try {
            $currentUser = $request->user();
            $notificationId = $request->route('id');
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            if (!$notificationId) {
                return Response::error('Notification ID is required', 400);
            }
            
            $success = Notification::delete($notificationId, $currentUser['id']);
            
            if ($success) {
                return Response::success(null, 'Notification deleted successfully');
            } else {
                return Response::error('Notification not found', 404);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to delete notification: ' . $e->getMessage());
        }
    }
    
    public function getPreferences(Request $request)
    {
        try {
            $currentUser = $request->user();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            $preferences = Notification::getUserPreferences($currentUser['id']);
            
            return Response::success($preferences, 'Notification preferences retrieved successfully');
            
        } catch (\Exception $e) {
            return Response::error('Failed to retrieve notification preferences: ' . $e->getMessage());
        }
    }
    
    public function updatePreferences(Request $request)
    {
        try {
            $currentUser = $request->user();
            $data = $request->all();
            
            if (!$currentUser) {
                return Response::error('Authentication required', 401);
            }
            
            // Validate preferences data
            $validTypes = ['follow', 'unfollow', 'like', 'comment', 'interview_published', 'mention', 'system'];
            $preferences = [];
            
            foreach ($data as $type => $settings) {
                if (!in_array($type, $validTypes)) {
                    continue;
                }
                
                $preferences[$type] = [
                    'enabled' => isset($settings['enabled']) ? (bool) $settings['enabled'] : true,
                    'email_enabled' => isset($settings['email_enabled']) ? (bool) $settings['email_enabled'] : false,
                    'push_enabled' => isset($settings['push_enabled']) ? (bool) $settings['push_enabled'] : true
                ];
            }
            
            if (empty($preferences)) {
                return Response::error('No valid preferences provided', 400);
            }
            
            $success = Notification::updateUserPreferences($currentUser['id'], $preferences);
            
            if ($success) {
                $updatedPreferences = Notification::getUserPreferences($currentUser['id']);
                return Response::success($updatedPreferences, 'Notification preferences updated successfully');
            } else {
                return Response::error('Failed to update preferences', 500);
            }
            
        } catch (\Exception $e) {
            return Response::error('Failed to update notification preferences: ' . $e->getMessage());
        }
    }

    public function createFromTemplate(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user || $user['role'] !== 'admin') {
                return Response::json([
                    'success' => false,
                    'message' => 'Admin access required'
                ], 403);
            }

            // Validate required fields
            $requiredFields = ['template_type', 'user_id', 'variables'];
            foreach ($requiredFields as $field) {
                if (!$request->has($field)) {
                    return Response::json([
                        'success' => false,
                        'message' => "Field '$field' is required"
                    ], 400);
                }
            }

            $templateType = $request->get('template_type');
            $userId = $request->get('user_id');
            $variables = $request->get('variables', []);

            $notification = Notification::createFromTemplate($templateType, $userId, $variables);

            return Response::json([
                'success' => true,
                'message' => 'Notification created from template successfully',
                'data' => $notification
            ], 201);

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to create notification from template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getRecentActivity(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return Response::json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }

            $limit = min((int) $request->get('limit', 10), 20);
            $notifications = Notification::getRecentActivity($user['id'], $limit);

            return Response::json([
                'success' => true,
                'data' => $notifications
            ]);

        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'message' => 'Failed to get recent activity',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
