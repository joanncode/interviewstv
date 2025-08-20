<?php

namespace Tests\Integration\API;

use Tests\TestCase;
use App\Controllers\NotificationController;
use App\Models\Notification;

class NotificationTest extends TestCase
{
    public function testGetNotifications()
    {
        // Create test notifications
        $this->createTestNotification();
        $this->createTestNotification();
        
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications');
        $controller = new NotificationController();
        $response = $controller->index($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertArrayHasKey('notifications', $data['data']);
        $this->assertArrayHasKey('total', $data['data']);
        $this->assertArrayHasKey('unread_count', $data['data']);
        $this->assertCount(2, $data['data']['notifications']);
    }
    
    public function testGetNotificationsWithPagination()
    {
        // Create multiple notifications
        for ($i = 0; $i < 15; $i++) {
            $this->createTestNotification();
        }
        
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications', [
            'page' => 1,
            'limit' => 10
        ]);
        
        $controller = new NotificationController();
        $response = $controller->index($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertCount(10, $data['data']['notifications']);
        $this->assertEquals(15, $data['data']['total']);
        $this->assertEquals(1, $data['data']['page']);
        $this->assertEquals(2, $data['data']['pages']);
    }
    
    public function testGetNotificationsWithFilters()
    {
        // Create notifications of different types
        $this->createTestNotification(['type' => 'new_follower']);
        $this->createTestNotification(['type' => 'new_like']);
        $this->createTestNotification(['type' => 'new_follower']);
        
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications', [
            'type' => 'new_follower'
        ]);
        
        $controller = new NotificationController();
        $response = $controller->index($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertCount(2, $data['data']['notifications']);
        
        foreach ($data['data']['notifications'] as $notification) {
            $this->assertEquals('new_follower', $notification['type']);
        }
    }
    
    public function testGetNotificationsUnauthenticated()
    {
        $request = $this->createRequest('GET', '/api/notifications');
        $controller = new NotificationController();
        $response = $controller->index($request);
        
        $this->assertErrorResponse($response, 401, 'Authentication required');
    }
    
    public function testGetSingleNotification()
    {
        $notification = $this->createTestNotification();
        
        $request = $this->createAuthenticatedRequest('GET', "/api/notifications/{$notification['id']}");
        $controller = new NotificationController();
        $response = $controller->show($request, $notification['id']);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals($notification['id'], $data['data']['id']);
        $this->assertEquals($notification['title'], $data['data']['title']);
    }
    
    public function testGetSingleNotificationNotFound()
    {
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications/99999');
        $controller = new NotificationController();
        $response = $controller->show($request, 99999);
        
        $this->assertErrorResponse($response, 404, 'Notification not found');
    }
    
    public function testGetSingleNotificationUnauthorized()
    {
        // Create notification for different user
        $notification = $this->createTestNotification(['user_id' => $this->adminUser['id']]);
        
        $request = $this->createAuthenticatedRequest('GET', "/api/notifications/{$notification['id']}");
        $controller = new NotificationController();
        $response = $controller->show($request, $notification['id']);
        
        $this->assertErrorResponse($response, 403, 'Unauthorized access');
    }
    
    public function testMarkNotificationAsRead()
    {
        $notification = $this->createTestNotification();
        
        $this->assertFalse($notification['is_read']);
        
        $request = $this->createAuthenticatedRequest('PUT', "/api/notifications/{$notification['id']}/read");
        $controller = new NotificationController();
        $response = $controller->markAsRead($request, $notification['id']);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertArrayHasKey('unread_count', $data['data']);
        
        // Verify notification is marked as read
        $updatedNotification = Notification::findById($notification['id']);
        $this->assertTrue($updatedNotification['is_read']);
    }
    
    public function testMarkAllNotificationsAsRead()
    {
        // Create multiple unread notifications
        $this->createTestNotification();
        $this->createTestNotification();
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/notifications/mark-all-read');
        $controller = new NotificationController();
        $response = $controller->markAllAsRead($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals(0, $data['data']['unread_count']);
        
        // Verify all notifications are marked as read
        $result = Notification::getForUser($this->testUser['id']);
        $this->assertEquals(0, $result['unread_count']);
    }
    
    public function testDeleteNotification()
    {
        $notification = $this->createTestNotification();
        
        $request = $this->createAuthenticatedRequest('DELETE', "/api/notifications/{$notification['id']}");
        $controller = new NotificationController();
        $response = $controller->delete($request, $notification['id']);
        
        $this->assertSuccessResponse($response, 'Notification deleted');
        
        // Verify notification is deleted
        $deletedNotification = Notification::findById($notification['id']);
        $this->assertNull($deletedNotification);
    }
    
    public function testGetUnreadCount()
    {
        // Create mix of read and unread notifications
        $notification1 = $this->createTestNotification();
        $this->createTestNotification();
        
        // Mark one as read
        Notification::markAsRead($notification1['id'], $this->testUser['id']);
        
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications/unread-count');
        $controller = new NotificationController();
        $response = $controller->getUnreadCount($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals(1, $data['data']['unread_count']);
    }
    
    public function testGetRecentActivity()
    {
        // Create test notifications
        $this->createTestNotification();
        $this->createTestNotification();
        
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications/recent-activity', [
            'limit' => 5
        ]);
        
        $controller = new NotificationController();
        $response = $controller->getRecentActivity($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertIsArray($data['data']);
        $this->assertCount(2, $data['data']);
    }
    
    public function testCreateNotificationAsAdmin()
    {
        $notificationData = [
            'user_id' => $this->testUser['id'],
            'type' => 'system_announcement',
            'title' => 'System Maintenance',
            'message' => 'Scheduled maintenance tonight',
            'priority' => 'high'
        ];
        
        $request = $this->createAuthenticatedRequest('POST', '/api/notifications', $notificationData, $this->adminUser);
        $controller = new NotificationController();
        $response = $controller->createNotification($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals($notificationData['title'], $data['data']['title']);
        $this->assertEquals($notificationData['message'], $data['data']['message']);
        $this->assertEquals($notificationData['priority'], $data['data']['priority']);
        
        $this->assertDatabaseHas('notifications', [
            'user_id' => $notificationData['user_id'],
            'type' => $notificationData['type'],
            'title' => $notificationData['title']
        ]);
    }
    
    public function testCreateNotificationAsRegularUser()
    {
        $notificationData = [
            'user_id' => $this->testUser['id'],
            'type' => 'system_announcement',
            'title' => 'System Maintenance',
            'message' => 'Scheduled maintenance tonight'
        ];
        
        $request = $this->createAuthenticatedRequest('POST', '/api/notifications', $notificationData);
        $controller = new NotificationController();
        $response = $controller->createNotification($request);
        
        $this->assertErrorResponse($response, 403, 'Admin access required');
    }
    
    public function testCreateNotificationFromTemplate()
    {
        $this->createNotificationTemplate();
        
        $templateData = [
            'template_type' => 'new_follower',
            'user_id' => $this->testUser['id'],
            'variables' => [
                'follower_name' => 'John Doe',
                'follower_profile_url' => '/profile/123'
            ]
        ];
        
        $request = $this->createAuthenticatedRequest('POST', '/api/notifications/from-template', $templateData, $this->adminUser);
        $controller = new NotificationController();
        $response = $controller->createFromTemplate($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertEquals('new_follower', $data['data']['type']);
        $this->assertStringContainsString('John Doe', $data['data']['title']);
        $this->assertStringContainsString('John Doe', $data['data']['message']);
    }
    
    public function testGetNotificationPreferences()
    {
        $request = $this->createAuthenticatedRequest('GET', '/api/notifications/preferences');
        $controller = new NotificationController();
        $response = $controller->getPreferences($request);
        
        $data = $this->assertSuccessResponse($response);
        
        $this->assertIsArray($data['data']);
    }
    
    public function testUpdateNotificationPreferences()
    {
        $preferences = [
            'new_follower' => [
                'in_app_enabled' => true,
                'email_enabled' => false,
                'push_enabled' => true,
                'frequency' => 'immediate'
            ],
            'new_like' => [
                'in_app_enabled' => true,
                'email_enabled' => true,
                'push_enabled' => false,
                'frequency' => 'daily'
            ]
        ];
        
        $request = $this->createAuthenticatedRequest('PUT', '/api/notifications/preferences', [
            'preferences' => $preferences
        ]);
        
        $controller = new NotificationController();
        $response = $controller->updatePreferences($request);
        
        $this->assertSuccessResponse($response, 'Notification preferences updated successfully');
        
        // Verify preferences were saved
        $savedPrefs = Notification::getUserPreferencesForType($this->testUser['id'], 'new_follower');
        $this->assertTrue($savedPrefs['in_app_enabled']);
        $this->assertFalse($savedPrefs['email_enabled']);
        $this->assertTrue($savedPrefs['push_enabled']);
        $this->assertEquals('immediate', $savedPrefs['frequency']);
    }
    
    public function testUpdateNotificationPreferencesWithInvalidData()
    {
        $request = $this->createAuthenticatedRequest('PUT', '/api/notifications/preferences', []);
        $controller = new NotificationController();
        $response = $controller->updatePreferences($request);
        
        $this->assertErrorResponse($response, 400, 'Preferences data is required');
    }
    
    /**
     * Helper method to create a test notification
     */
    private function createTestNotification($data = [])
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
