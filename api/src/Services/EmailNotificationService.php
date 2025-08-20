<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class EmailNotificationService
{
    private $mailer;
    private $templates;
    
    public function __construct()
    {
        $this->mailer = $this->initializeMailer();
        $this->templates = $this->loadEmailTemplates();
    }

    /**
     * Initialize email mailer
     */
    private function initializeMailer()
    {
        // This would typically use PHPMailer, SwiftMailer, or similar
        // For now, we'll create a simple wrapper
        return new class {
            public function send($to, $subject, $body, $isHtml = true) {
                // In production, this would use a real email service
                $headers = [
                    'From: Interviews.tv <noreply@interviews.tv>',
                    'Reply-To: support@interviews.tv',
                    'X-Mailer: Interviews.tv Notification System',
                    'MIME-Version: 1.0'
                ];
                
                if ($isHtml) {
                    $headers[] = 'Content-Type: text/html; charset=UTF-8';
                } else {
                    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
                }
                
                return mail($to, $subject, $body, implode("\r\n", $headers));
            }
        };
    }

    /**
     * Load email templates
     */
    private function loadEmailTemplates()
    {
        return [
            'base' => $this->getBaseTemplate(),
            'notification' => $this->getNotificationTemplate(),
            'digest' => $this->getDigestTemplate(),
            'welcome' => $this->getWelcomeTemplate(),
            'verification' => $this->getVerificationTemplate()
        ];
    }

    /**
     * Send notification email
     */
    public function sendNotificationEmail($notificationId)
    {
        $notification = Notification::findById($notificationId);
        if (!$notification) {
            throw new \Exception("Notification not found: {$notificationId}");
        }

        $user = User::findById($notification['user_id']);
        if (!$user) {
            throw new \Exception("User not found: {$notification['user_id']}");
        }

        // Check if user has email notifications enabled for this type
        $preferences = Notification::getUserPreferencesForType($user['id'], $notification['type']);
        if (!$preferences['email_enabled']) {
            return false; // User has disabled email notifications for this type
        }

        // Get email template for notification type
        $template = Notification::getTemplate($notification['type']);
        if (!$template || !$template['email_subject_template'] || !$template['email_body_template']) {
            throw new \Exception("Email template not found for notification type: {$notification['type']}");
        }

        // Prepare variables
        $variables = array_merge(
            $notification['data'] ?: [],
            [
                'user_name' => $user['name'],
                'user_email' => $user['email'],
                'notification_title' => $notification['title'],
                'notification_message' => $notification['message'],
                'platform_url' => config('app.url'),
                'unsubscribe_url' => $this->generateUnsubscribeUrl($user['id'], $notification['type'])
            ]
        );

        // Replace variables in templates
        $subject = $this->replaceVariables($template['email_subject_template'], $variables);
        $bodyText = $this->replaceVariables($template['email_body_template'], $variables);
        
        // Create HTML version
        $bodyHtml = $this->createHtmlEmail($subject, $bodyText, $notification, $variables);

        // Send email
        $success = $this->mailer->send($user['email'], $subject, $bodyHtml, true);

        if ($success) {
            // Mark delivery as sent
            Notification::updateDeliveryStatus($notificationId, 'sent', [
                'email' => $user['email'],
                'subject' => $subject
            ]);
        } else {
            // Mark delivery as failed
            Notification::updateDeliveryStatus($notificationId, 'failed', [
                'email' => $user['email'],
                'error' => 'Failed to send email'
            ]);
        }

        return $success;
    }

    /**
     * Send digest email
     */
    public function sendDigestEmail($userId, $digestType = 'weekly')
    {
        $user = User::findById($userId);
        if (!$user) {
            throw new \Exception("User not found: {$userId}");
        }

        // Check if user has digest emails enabled
        $preferences = Notification::getUserPreferencesForType($userId, 'weekly_digest');
        if (!$preferences['email_enabled']) {
            return false;
        }

        // Get notifications for digest period
        $notifications = $this->getNotificationsForDigest($userId, $digestType);
        
        if (empty($notifications)) {
            return false; // No notifications to include in digest
        }

        // Prepare digest content
        $digestContent = $this->prepareDigestContent($notifications, $digestType);
        
        $variables = [
            'user_name' => $user['name'],
            'digest_type' => $digestType,
            'digest_content' => $digestContent,
            'notification_count' => count($notifications),
            'platform_url' => config('app.url'),
            'unsubscribe_url' => $this->generateUnsubscribeUrl($userId, 'weekly_digest')
        ];

        $subject = $this->replaceVariables("Your {digest_type} digest from Interviews.tv", $variables);
        $bodyHtml = $this->createDigestEmail($variables);

        // Send email
        $success = $this->mailer->send($user['email'], $subject, $bodyHtml, true);

        if ($success) {
            // Create digest record
            $this->createDigestRecord($userId, $digestType, $notifications);
        }

        return $success;
    }

    /**
     * Send welcome email
     */
    public function sendWelcomeEmail($userId)
    {
        $user = User::findById($userId);
        if (!$user) {
            throw new \Exception("User not found: {$userId}");
        }

        $variables = [
            'user_name' => $user['name'],
            'platform_url' => config('app.url'),
            'profile_url' => config('app.url') . "/profile/{$userId}",
            'settings_url' => config('app.url') . "/settings"
        ];

        $subject = "Welcome to Interviews.tv, {$user['name']}!";
        $bodyHtml = $this->createWelcomeEmail($variables);

        return $this->mailer->send($user['email'], $subject, $bodyHtml, true);
    }

    /**
     * Send verification email
     */
    public function sendVerificationEmail($userId, $verificationToken)
    {
        $user = User::findById($userId);
        if (!$user) {
            throw new \Exception("User not found: {$userId}");
        }

        $variables = [
            'user_name' => $user['name'],
            'verification_url' => config('app.url') . "/verify-email?token={$verificationToken}",
            'platform_url' => config('app.url')
        ];

        $subject = "Please verify your email address";
        $bodyHtml = $this->createVerificationEmail($variables);

        return $this->mailer->send($user['email'], $subject, $bodyHtml, true);
    }

    /**
     * Create HTML email from template
     */
    private function createHtmlEmail($subject, $bodyText, $notification, $variables)
    {
        $notificationHtml = $this->replaceVariables($this->templates['notification'], array_merge($variables, [
            'subject' => $subject,
            'body_text' => nl2br(htmlspecialchars($bodyText)),
            'action_url' => $notification['action_url'] ?? $variables['platform_url'],
            'action_text' => $this->getActionText($notification['type'])
        ]));

        return $this->replaceVariables($this->templates['base'], array_merge($variables, [
            'content' => $notificationHtml,
            'title' => $subject
        ]));
    }

    /**
     * Create digest email
     */
    private function createDigestEmail($variables)
    {
        $digestHtml = $this->replaceVariables($this->templates['digest'], $variables);

        return $this->replaceVariables($this->templates['base'], array_merge($variables, [
            'content' => $digestHtml,
            'title' => "Your {$variables['digest_type']} digest"
        ]));
    }

    /**
     * Create welcome email
     */
    private function createWelcomeEmail($variables)
    {
        $welcomeHtml = $this->replaceVariables($this->templates['welcome'], $variables);

        return $this->replaceVariables($this->templates['base'], array_merge($variables, [
            'content' => $welcomeHtml,
            'title' => 'Welcome to Interviews.tv'
        ]));
    }

    /**
     * Create verification email
     */
    private function createVerificationEmail($variables)
    {
        $verificationHtml = $this->replaceVariables($this->templates['verification'], $variables);

        return $this->replaceVariables($this->templates['base'], array_merge($variables, [
            'content' => $verificationHtml,
            'title' => 'Verify your email address'
        ]));
    }

    /**
     * Get notifications for digest
     */
    private function getNotificationsForDigest($userId, $digestType)
    {
        $dateRange = $this->getDigestDateRange($digestType);
        
        // This would query notifications within the date range
        // For now, return mock data
        return [];
    }

    /**
     * Prepare digest content
     */
    private function prepareDigestContent($notifications, $digestType)
    {
        $content = '';
        $groupedNotifications = $this->groupNotificationsByType($notifications);

        foreach ($groupedNotifications as $type => $typeNotifications) {
            $content .= $this->formatNotificationGroup($type, $typeNotifications);
        }

        return $content;
    }

    /**
     * Group notifications by type
     */
    private function groupNotificationsByType($notifications)
    {
        $grouped = [];
        
        foreach ($notifications as $notification) {
            $type = $notification['type'];
            if (!isset($grouped[$type])) {
                $grouped[$type] = [];
            }
            $grouped[$type][] = $notification;
        }

        return $grouped;
    }

    /**
     * Format notification group for digest
     */
    private function formatNotificationGroup($type, $notifications)
    {
        $count = count($notifications);
        $typeLabel = $this->getNotificationTypeLabel($type);
        
        $html = "<h3>{$typeLabel} ({$count})</h3><ul>";
        
        foreach ($notifications as $notification) {
            $html .= "<li>{$notification['message']}</li>";
        }
        
        $html .= "</ul>";
        
        return $html;
    }

    /**
     * Get notification type label
     */
    private function getNotificationTypeLabel($type)
    {
        $labels = [
            'new_follower' => 'New Followers',
            'new_like' => 'New Likes',
            'new_comment' => 'New Comments',
            'interview_featured' => 'Featured Interviews',
            'event_reminder' => 'Event Reminders',
            'business_verified' => 'Business Verifications'
        ];

        return $labels[$type] ?? ucfirst(str_replace('_', ' ', $type));
    }

    /**
     * Get action text for notification type
     */
    private function getActionText($type)
    {
        $actions = [
            'new_follower' => 'View Profile',
            'new_like' => 'View Content',
            'new_comment' => 'View Comment',
            'interview_featured' => 'View Interview',
            'event_reminder' => 'View Event',
            'business_verified' => 'View Business'
        ];

        return $actions[$type] ?? 'View Details';
    }

    /**
     * Get digest date range
     */
    private function getDigestDateRange($digestType)
    {
        switch ($digestType) {
            case 'daily':
                return [
                    'start' => date('Y-m-d', strtotime('-1 day')),
                    'end' => date('Y-m-d')
                ];
            case 'weekly':
                return [
                    'start' => date('Y-m-d', strtotime('-1 week')),
                    'end' => date('Y-m-d')
                ];
            case 'monthly':
                return [
                    'start' => date('Y-m-d', strtotime('-1 month')),
                    'end' => date('Y-m-d')
                ];
            default:
                return [
                    'start' => date('Y-m-d', strtotime('-1 week')),
                    'end' => date('Y-m-d')
                ];
        }
    }

    /**
     * Create digest record
     */
    private function createDigestRecord($userId, $digestType, $notifications)
    {
        // This would create a record in the notification_digest table
        // Implementation depends on database structure
    }

    /**
     * Generate unsubscribe URL
     */
    private function generateUnsubscribeUrl($userId, $notificationType)
    {
        $token = base64_encode("{$userId}:{$notificationType}:" . time());
        return config('app.url') . "/unsubscribe?token={$token}";
    }

    /**
     * Replace variables in template
     */
    private function replaceVariables($template, $variables)
    {
        foreach ($variables as $key => $value) {
            $template = str_replace("{{$key}}", $value, $template);
        }
        
        return $template;
    }

    /**
     * Base email template
     */
    private function getBaseTemplate()
    {
        return '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - Interviews.tv</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .btn:hover { background-color: #0056b3; }
        .unsubscribe { font-size: 11px; color: #999; margin-top: 20px; }
        .unsubscribe a { color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Interviews.tv</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>&copy; ' . date('Y') . ' Interviews.tv. All rights reserved.</p>
            <div class="unsubscribe">
                <p>You received this email because you have notifications enabled.</p>
                <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{platform_url}}/settings/notifications">Manage Preferences</a></p>
            </div>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Notification email template
     */
    private function getNotificationTemplate()
    {
        return '
<h2>{{subject}}</h2>
<p>{{body_text}}</p>
<p style="margin: 30px 0;">
    <a href="{{action_url}}" class="btn">{{action_text}}</a>
</p>
<p style="color: #666; font-size: 14px;">
    This notification was sent to you because you have notifications enabled for this type of activity.
</p>';
    }

    /**
     * Digest email template
     */
    private function getDigestTemplate()
    {
        return '
<h2>Your {{digest_type}} digest</h2>
<p>Hi {{user_name}},</p>
<p>Here\'s what happened on Interviews.tv this {{digest_type}}:</p>
<div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
    {{digest_content}}
</div>
<p style="margin: 30px 0;">
    <a href="{{platform_url}}" class="btn">Visit Interviews.tv</a>
</p>';
    }

    /**
     * Welcome email template
     */
    private function getWelcomeTemplate()
    {
        return '
<h2>Welcome to Interviews.tv, {{user_name}}!</h2>
<p>We\'re excited to have you join our community of professionals sharing their interview experiences.</p>
<p>Here\'s what you can do to get started:</p>
<ul>
    <li><strong>Complete your profile</strong> - Add your professional information and photo</li>
    <li><strong>Share your first interview</strong> - Help others by sharing your experience</li>
    <li><strong>Explore interviews</strong> - Learn from others\' experiences</li>
    <li><strong>Connect with professionals</strong> - Follow people in your industry</li>
</ul>
<p style="margin: 30px 0;">
    <a href="{{profile_url}}" class="btn">Complete Your Profile</a>
</p>
<p>If you have any questions, feel free to reach out to our support team.</p>
<p>Welcome aboard!</p>';
    }

    /**
     * Verification email template
     */
    private function getVerificationTemplate()
    {
        return '
<h2>Please verify your email address</h2>
<p>Hi {{user_name}},</p>
<p>Thank you for signing up for Interviews.tv! To complete your registration, please verify your email address by clicking the button below:</p>
<p style="margin: 30px 0;">
    <a href="{{verification_url}}" class="btn">Verify Email Address</a>
</p>
<p>If the button doesn\'t work, you can copy and paste this link into your browser:</p>
<p style="word-break: break-all; color: #666;">{{verification_url}}</p>
<p>This verification link will expire in 24 hours.</p>
<p>If you didn\'t create an account with Interviews.tv, you can safely ignore this email.</p>';
    }
}';
    }
}
