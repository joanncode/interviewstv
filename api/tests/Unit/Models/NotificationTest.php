<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\Notification;

class NotificationTest extends TestCase
{
    public function testCreateNotification()
    {
        $notificationData = [
            'user_id' => $this->testUser['id'],
            'type' => 'test_notification',
            'title' => 'Test Notification',
            'message' => 'This is a test notification',
            'data' => ['key' => 'value'],
            'priority' => 'normal'
        ];
        
        $notification = Notification::create($notificationData);
        
        $this->assertNotNull($notification);
        $this->assertEquals($notificationData['user_id'], $notification['user_id']);
        $this->assertEquals($notificationData['type'], $notification['type']);
        $this->assertEquals($notificationData['title'], $notification['title']);
        $this->assertEquals($notificationData['message'], $notification['message']);
        $this->assertEquals($notificationData['priority'], $notification['priority']);
        $this->assertFalse($notification['is_read']);
        
        $this->assertDatabaseHas('notifications', [
            'user_id' => $notificationData['user_id'],
            'type' => $notificationData['type'],
            'title' => $notificationData['title']
        ]);
    }
    
    public function testCreateNotificationFromTemplate()
    {
        // First, create a test template
        $this->createNotificationTemplate();
        
        $variables = [
            'follower_name' => 'John Doe',
            'follower_profile_url' => '/profile/123',
            'action_url' => '/profile/123'
        ];
        
        $notification = Notification::createFromTemplate(
            'new_follower',
            $this->testUser['id'],
            $variables
        );
        
        $this->assertNotNull($notification);
        $this->assertEquals('new_follower', $notification['type']);
        $this->assertEquals($this->testUser['id'], $notification['user_id']);
        $this->assertStringContainsString('John Doe', $notification['title']);
        $this->assertStringContainsString('John Doe', $notification['message']);
    }
    
    public function testFindNotificationById()
    {
        $notification = $this->createNotification();
        
        $found = Notification::findById($notification['id']);
        
        $this->assertNotNull($found);
        $this->assertEquals($notification['id'], $found['id']);
        $this->assertEquals($notification['title'], $found['title']);
    }
    
    public function testGetNotificationsForUser()
    {
        // Create multiple notifications
        $this->createNotification(['user_id' => $this->testUser['id']]);
        $this->createNotification(['user_id' => $this->testUser['id']]);
        $this->createNotification(['user_id' => $this->adminUser['id']]); // Different user
        
        $result = Notification::getForUser($this->testUser['id']);
        
        $this->assertIsArray($result);
        $this->assertArrayHasKey('notifications', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertArrayHasKey('unread_count', $result);
        
        $this->assertCount(2, $result['notifications']);
        $this->assertEquals(2, $result['total']);
        
        // All notifications should belong to the test user
        foreach ($result['notifications'] as $notification) {
            $this->assertEquals($this->testUser['id'], $notification['user_id']);
        }
    }
    
    public function testGetNotificationsWithFilters()
    {
        // Create notifications of different types
        $this->createNotification([
            'user_id' => $this->testUser['id'],
            'type' => 'new_follower'
        ]);
        
        $this->createNotification([
            'user_id' => $this->testUser['id'],
            'type' => 'new_like'
        ]);
        
        // Filter by type
        $result = Notification::getForUser($this->testUser['id'], ['type' => 'new_follower']);
        
        $this->assertCount(1, $result['notifications']);
        $this->assertEquals('new_follower', $result['notifications'][0]['type']);
    }
    
    public function testMarkNotificationAsRead()
    {
        $notification = $this->createNotification(['user_id' => $this->testUser['id']]);
        
        $this->assertFalse($notification['is_read']);
        
        $success = Notification::markAsRead($notification['id'], $this->testUser['id']);
        
        $this->assertTrue($success);
        
        $updatedNotification = Notification::findById($notification['id']);
        $this->assertTrue($updatedNotification['is_read']);
        $this->assertNotNull($updatedNotification['read_at']);
    }
    
    public function testMarkAllNotificationsAsRead()
    {
        // Create multiple unread notifications
        $this->createNotification(['user_id' => $this->testUser['id']]);
        $this->createNotification(['user_id' => $this->testUser['id']]);
        
        $success = Notification::markAllAsRead($this->testUser['id']);
        
        $this->assertTrue($success);
        
        $result = Notification::getForUser($this->testUser['id']);
        $this->assertEquals(0, $result['unread_count']);
        
        foreach ($result['notifications'] as $notification) {
            $this->assertTrue($notification['is_read']);
        }
    }
    
    public function testDeleteNotification()
    {
        $notification = $this->createNotification(['user_id' => $this->testUser['id']]);
        
        $success = Notification::delete($notification['id'], $this->testUser['id']);
        
        $this->assertTrue($success);
        
        $deletedNotification = Notification::findById($notification['id']);
        $this->assertNull($deletedNotification);
    }
    
    public function testGetUnreadCount()
    {
        // Create mix of read and unread notifications
        $notification1 = $this->createNotification(['user_id' => $this->testUser['id']]);
        $notification2 = $this->createNotification(['user_id' => $this->testUser['id']]);
        $this->createNotification(['user_id' => $this->adminUser['id']]); // Different user
        
        // Mark one as read
        Notification::markAsRead($notification1['id'], $this->testUser['id']);
        
        $unreadCount = Notification::getUnreadCount($this->testUser['id']);
        
        $this->assertEquals(1, $unreadCount);
    }
    
    public function testGetRecentActivity()
    {
        // Create notifications with different timestamps
        $this->createNotification([
            'user_id' => $this->testUser['id'],
            'created_at' => date('Y-m-d H:i:s', time() - 3600) // 1 hour ago
        ]);
        
        $this->createNotification([
            'user_id' => $this->testUser['id'],
            'created_at' => date('Y-m-d H:i:s', time() - 1800) // 30 minutes ago
        ]);
        
        $recentActivity = Notification::getRecentActivity($this->testUser['id'], 5);
        
        $this->assertIsArray($recentActivity);
        $this->assertCount(2, $recentActivity);
        
        // Should be ordered by creation date (newest first)
        $this->assertGreaterThanOrEqual(
            strtotime($recentActivity[1]['created_at']),
            strtotime($recentActivity[0]['created_at'])
        );
    }
    
    public function testNotificationPreferences()
    {
        $preferences = [
            'new_follower' => [
                'in_app_enabled' => true,
                'email_enabled' => false,
                'push_enabled' => true,
                'frequency' => 'immediate'
            ]
        ];
        
        $success = Notification::updateUserPreferences($this->testUser['id'], $preferences);
        
        $this->assertTrue($success);
        
        $userPrefs = Notification::getUserPreferencesForType($this->testUser['id'], 'new_follower');
        
        $this->assertTrue($userPrefs['in_app_enabled']);
        $this->assertFalse($userPrefs['email_enabled']);
        $this->assertTrue($userPrefs['push_enabled']);
        $this->assertEquals('immediate', $userPrefs['frequency']);
    }
    
    public function testNotificationTemplate()
    {
        $this->createNotificationTemplate();
        
        $template = Notification::getTemplate('new_follower');
        
        $this->assertNotNull($template);
        $this->assertEquals('new_follower', $template['type']);
        $this->assertStringContainsString('{{follower_name}}', $template['title_template']);
    }
    
    public function testScheduleDelivery()
    {
        $notification = $this->createNotification(['user_id' => $this->testUser['id']]);
        
        $success = Notification::scheduleDelivery($notification['id']);
        
        $this->assertTrue($success);
        
        // Check that delivery records were created
        $this->assertDatabaseHas('notification_deliveries', [
            'notification_id' => $notification['id'],
            'channel_type' => 'in_app'
        ]);
    }
    
    public function testCreateBulkNotification()
    {
        $this->createNotificationTemplate();
        
        $userIds = [$this->testUser['id'], $this->adminUser['id']];
        $variables = [
            'follower_name' => 'John Doe',
            'follower_profile_url' => '/profile/123'
        ];
        
        $notifications = Notification::createBulkNotification('new_follower', $userIds, $variables);
        
        $this->assertCount(2, $notifications);
        
        foreach ($notifications as $notification) {
            $this->assertEquals('new_follower', $notification['type']);
            $this->assertStringContainsString('John Doe', $notification['title']);
        }
    }
    
    public function testNotificationExpiration()
    {
        // Create expired notification
        $expiredNotification = $this->createNotification([
            'user_id' => $this->testUser['id'],
            'expires_at' => date('Y-m-d H:i:s', time() - 3600) // Expired 1 hour ago
        ]);
        
        // Create valid notification
        $validNotification = $this->createNotification([
            'user_id' => $this->testUser['id']
        ]);
        
        $result = Notification::getForUser($this->testUser['id']);
        
        // Should only return non-expired notifications
        $this->assertCount(1, $result['notifications']);
        $this->assertEquals($validNotification['id'], $result['notifications'][0]['id']);
    }
    
    /**
     * Helper method to create a test notification
     */
    private function createNotification($data = [])
    {
        $defaultData = [
            'user_id' => $this->testUser['id'],
            'type' => 'test_notification',
            'title' => 'Test Notification',
            'message' => 'This is a test notification',
            'priority' => 'normal'
        ];
        
        $notificationData = array_merge($defaultData, $data);
        
        return Notification::create($notificationData);
    }
    
    /**
     * Helper method to create a test notification template
     */
    private function createNotificationTemplate()
    {
        $sql = "INSERT INTO notification_templates (type, name, title_template, message_template, is_active) 
                VALUES (?, ?, ?, ?, ?)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'new_follower',
            'New Follower',
            '{{follower_name}} started following you',
            '{{follower_name}} is now following you on Interviews.tv',
            true
        ]);
    }
}
