<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationHelper
{
    /**
     * Create notification for new follower
     */
    public static function notifyNewFollower($followedUserId, $followerUserId)
    {
        $follower = User::findById($followerUserId);
        if (!$follower) return false;

        $variables = [
            'follower_name' => $follower['name'],
            'follower_profile_url' => "/profile/{$follower['id']}",
            'action_url' => "/profile/{$follower['id']}",
            'entity_type' => 'user',
            'entity_id' => $followerUserId
        ];

        return Notification::createFromTemplate('new_follower', $followedUserId, $variables);
    }

    /**
     * Create notification for new like
     */
    public static function notifyNewLike($entityType, $entityId, $ownerId, $likerId)
    {
        if ($ownerId == $likerId) return false; // Don't notify self

        $liker = User::findById($likerId);
        if (!$liker) return false;

        // Get entity details
        $entityDetails = self::getEntityDetails($entityType, $entityId);
        if (!$entityDetails) return false;

        $variables = [
            'liker_name' => $liker['name'],
            'entity_type' => $entityType,
            'entity_title' => $entityDetails['title'],
            'entity_url' => $entityDetails['url'],
            'action_url' => $entityDetails['url'],
            'entity_type' => $entityType,
            'entity_id' => $entityId
        ];

        return Notification::createFromTemplate('new_like', $ownerId, $variables);
    }

    /**
     * Create notification for new comment
     */
    public static function notifyNewComment($entityType, $entityId, $ownerId, $commenterId, $commentText)
    {
        if ($ownerId == $commenterId) return false; // Don't notify self

        $commenter = User::findById($commenterId);
        if (!$commenter) return false;

        // Get entity details
        $entityDetails = self::getEntityDetails($entityType, $entityId);
        if (!$entityDetails) return false;

        $variables = [
            'commenter_name' => $commenter['name'],
            'entity_type' => $entityType,
            'entity_title' => $entityDetails['title'],
            'comment_text' => substr($commentText, 0, 100) . (strlen($commentText) > 100 ? '...' : ''),
            'entity_url' => $entityDetails['url'],
            'action_url' => $entityDetails['url'],
            'entity_type' => $entityType,
            'entity_id' => $entityId
        ];

        return Notification::createFromTemplate('new_comment', $ownerId, $variables);
    }

    /**
     * Create notification for featured interview
     */
    public static function notifyInterviewFeatured($interviewId, $userId)
    {
        $interview = self::getEntityDetails('interview', $interviewId);
        if (!$interview) return false;

        $variables = [
            'interview_title' => $interview['title'],
            'interview_url' => $interview['url'],
            'action_url' => $interview['url'],
            'entity_type' => 'interview',
            'entity_id' => $interviewId,
            'priority' => 'high'
        ];

        return Notification::createFromTemplate('interview_featured', $userId, $variables);
    }

    /**
     * Create notification for event reminder
     */
    public static function notifyEventReminder($eventId, $userId, $reminderTime = '1 hour')
    {
        $event = self::getEntityDetails('event', $eventId);
        if (!$event) return false;

        $variables = [
            'event_title' => $event['title'],
            'start_time' => $reminderTime,
            'event_date' => date('F j, Y', strtotime($event['start_date'])),
            'event_time' => date('g:i A', strtotime($event['start_time'])),
            'event_location' => $event['location'] ?? 'Online',
            'event_url' => $event['url'],
            'action_url' => $event['url'],
            'entity_type' => 'event',
            'entity_id' => $eventId,
            'priority' => 'high'
        ];

        return Notification::createFromTemplate('event_reminder', $userId, $variables);
    }

    /**
     * Create notification for business verification
     */
    public static function notifyBusinessVerified($businessId, $userId)
    {
        $business = self::getEntityDetails('business', $businessId);
        if (!$business) return false;

        $variables = [
            'business_name' => $business['title'],
            'business_url' => $business['url'],
            'action_url' => $business['url'],
            'entity_type' => 'business',
            'entity_id' => $businessId,
            'priority' => 'high'
        ];

        return Notification::createFromTemplate('business_verified', $userId, $variables);
    }

    /**
     * Create system announcement notification
     */
    public static function notifySystemAnnouncement($title, $message, $userIds = [], $moreInfoUrl = null)
    {
        $variables = [
            'announcement_title' => $title,
            'announcement_message' => $message,
            'more_info_url' => $moreInfoUrl ?: config('app.url'),
            'action_url' => $moreInfoUrl,
            'priority' => 'normal'
        ];

        $notifications = [];

        if (empty($userIds)) {
            // Send to all users
            $userIds = User::getAllUserIds();
        }

        foreach ($userIds as $userId) {
            $notifications[] = Notification::createFromTemplate('system_announcement', $userId, $variables);
        }

        return $notifications;
    }

    /**
     * Create weekly digest notification
     */
    public static function notifyWeeklyDigest($userId, $digestContent)
    {
        $variables = [
            'digest_content' => $digestContent,
            'platform_url' => config('app.url'),
            'action_url' => '/dashboard',
            'priority' => 'low'
        ];

        return Notification::createFromTemplate('weekly_digest', $userId, $variables);
    }

    /**
     * Bulk notification for multiple users
     */
    public static function notifyMultipleUsers($templateType, $userIds, $variables = [])
    {
        return Notification::createBulkNotification($templateType, $userIds, $variables);
    }

    /**
     * Get entity details for notifications
     */
    private static function getEntityDetails($entityType, $entityId)
    {
        switch ($entityType) {
            case 'interview':
                return self::getInterviewDetails($entityId);
            case 'comment':
                return self::getCommentDetails($entityId);
            case 'event':
                return self::getEventDetails($entityId);
            case 'business':
                return self::getBusinessDetails($entityId);
            case 'media':
                return self::getMediaDetails($entityId);
            default:
                return null;
        }
    }

    private static function getInterviewDetails($interviewId)
    {
        // This would typically use an Interview model
        // For now, return mock data structure
        return [
            'title' => "Interview #{$interviewId}",
            'url' => "/interviews/{$interviewId}"
        ];
    }

    private static function getCommentDetails($commentId)
    {
        // This would typically use a Comment model
        return [
            'title' => "Comment #{$commentId}",
            'url' => "/comments/{$commentId}"
        ];
    }

    private static function getEventDetails($eventId)
    {
        // This would typically use an Event model
        return [
            'title' => "Event #{$eventId}",
            'url' => "/events/{$eventId}",
            'start_date' => date('Y-m-d'),
            'start_time' => date('H:i:s'),
            'location' => 'Online'
        ];
    }

    private static function getBusinessDetails($businessId)
    {
        // This would typically use a Business model
        return [
            'title' => "Business #{$businessId}",
            'url' => "/businesses/{$businessId}"
        ];
    }

    private static function getMediaDetails($mediaId)
    {
        // This would typically use a Media model
        return [
            'title' => "Media #{$mediaId}",
            'url' => "/media/{$mediaId}"
        ];
    }

    /**
     * Schedule notification for later delivery
     */
    public static function scheduleNotification($templateType, $userId, $variables, $scheduleTime)
    {
        // Add scheduled time to variables
        $variables['scheduled_for'] = $scheduleTime;
        
        // Create notification with future delivery
        $notification = Notification::createFromTemplate($templateType, $userId, $variables);
        
        // Update delivery schedule
        if ($notification) {
            // This would typically integrate with a job queue system
            // For now, we'll just log it
            error_log("Notification {$notification['id']} scheduled for {$scheduleTime}");
        }
        
        return $notification;
    }

    /**
     * Cancel scheduled notification
     */
    public static function cancelScheduledNotification($notificationId)
    {
        // This would cancel the scheduled job and mark notification as cancelled
        return Notification::delete($notificationId);
    }

    /**
     * Get notification statistics
     */
    public static function getNotificationStats($userId = null, $dateRange = null)
    {
        // This would return statistics about notifications
        // Implementation would depend on specific requirements
        return [
            'total_sent' => 0,
            'total_read' => 0,
            'total_clicked' => 0,
            'engagement_rate' => 0
        ];
    }

    /**
     * Mark notification as delivered
     */
    public static function markAsDelivered($notificationId, $channelType, $deliveryData = [])
    {
        return Notification::updateDeliveryStatus($notificationId, 'delivered', $deliveryData);
    }

    /**
     * Mark notification as failed
     */
    public static function markAsFailed($notificationId, $channelType, $errorData = [])
    {
        return Notification::updateDeliveryStatus($notificationId, 'failed', $errorData);
    }

    /**
     * Process notification queue
     */
    public static function processNotificationQueue($limit = 100)
    {
        $pendingDeliveries = Notification::getPendingDeliveries(null, $limit);
        
        foreach ($pendingDeliveries as $delivery) {
            try {
                switch ($delivery['channel_type']) {
                    case 'email':
                        self::sendEmailNotification($delivery);
                        break;
                    case 'push':
                        self::sendPushNotification($delivery);
                        break;
                    case 'sms':
                        self::sendSmsNotification($delivery);
                        break;
                }
            } catch (\Exception $e) {
                error_log("Failed to send notification {$delivery['id']}: " . $e->getMessage());
                self::markAsFailed($delivery['notification_id'], $delivery['channel_type'], [
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    private static function sendEmailNotification($delivery)
    {
        // Email sending logic would go here
        // This would integrate with an email service
        self::markAsDelivered($delivery['notification_id'], 'email');
    }

    private static function sendPushNotification($delivery)
    {
        // Push notification sending logic would go here
        // This would integrate with a push service
        self::markAsDelivered($delivery['notification_id'], 'push');
    }

    private static function sendSmsNotification($delivery)
    {
        // SMS sending logic would go here
        // This would integrate with an SMS service
        self::markAsDelivered($delivery['notification_id'], 'sms');
    }
}
