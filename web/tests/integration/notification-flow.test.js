/**
 * Notification Flow Integration Tests
 * Tests the complete notification workflow from creation to user interaction
 */

import NotificationCenter from '../../src/components/NotificationCenter.js';
import { notificationService } from '../../src/services/notifications.js';
import API from '../../src/services/api.js';
import Auth from '../../src/services/auth.js';

// Mock dependencies
jest.mock('../../src/services/api.js');
jest.mock('../../src/services/auth.js');
jest.mock('../../src/services/realtime.js', () => ({
  realtimeService: {
    on: jest.fn((event, callback) => {
      // Store callbacks for manual triggering
      if (!global.mockRealtimeCallbacks) {
        global.mockRealtimeCallbacks = {};
      }
      global.mockRealtimeCallbacks[event] = callback;
      return jest.fn(); // Return unsubscribe function
    }),
    off: jest.fn(),
  }
}));

describe('Notification Flow Integration', () => {
  let notificationCenter;
  let mockUser;

  beforeEach(() => {
    // Reset global state
    global.mockRealtimeCallbacks = {};
    
    // Create mock user
    mockUser = testUtils.createMockUser();
    Auth.getCurrentUser.mockReturnValue(mockUser);

    // Setup DOM
    document.body.innerHTML = '<div class="navbar"></div>';

    // Create notification center
    notificationCenter = new NotificationCenter();
  });

  afterEach(() => {
    if (notificationCenter) {
      notificationCenter.destroy();
    }
    global.mockRealtimeCallbacks = {};
  });

  describe('Complete Notification Lifecycle', () => {
    test('should handle new notification from creation to user interaction', async () => {
      // Initialize notification center
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      await notificationCenter.init();

      // Simulate new notification from server
      const newNotification = testUtils.createMockNotification({
        id: 1,
        title: 'New Follower',
        message: 'John started following you',
        type: 'new_follower',
        is_read: false,
        action_url: '/profile/john'
      });

      // Trigger real-time notification
      if (global.mockRealtimeCallbacks.new_notification) {
        global.mockRealtimeCallbacks.new_notification({
          user_id: mockUser.id,
          notification: newNotification
        });
      }

      // Verify notification was added
      expect(notificationCenter.notifications).toContainEqual(newNotification);
      expect(notificationCenter.unreadCount).toBe(1);

      // Verify toast notification was shown
      const toast = document.querySelector('.notification-toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain('New Follower');

      // Verify badge is updated
      const badge = document.querySelector('.notification-badge');
      expect(badge.style.display).toBe('inline-block');
      expect(badge.textContent).toContain('1');

      // Open notification dropdown
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [newNotification],
        total: 1,
        unread_count: 1
      }));

      const bell = document.querySelector('.notification-bell');
      bell.click();
      await testUtils.waitFor(100);

      // Verify dropdown is open and shows notification
      expect(notificationCenter.isOpen).toBe(true);
      const notificationItem = document.querySelector('.notification-item');
      expect(notificationItem).toBeTruthy();
      expect(notificationItem.textContent).toContain('New Follower');
      expect(notificationItem.classList.contains('unread')).toBe(true);

      // Click on notification
      API.put.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      notificationItem.click();

      // Verify notification was marked as read
      expect(API.put).toHaveBeenCalledWith('/api/notifications/1/read');
      expect(window.location.href).toBe('/profile/john');
    });

    test('should handle bulk notification operations', async () => {
      // Initialize with multiple notifications
      const notifications = [
        testUtils.createMockNotification({ id: 1, is_read: false }),
        testUtils.createMockNotification({ id: 2, is_read: false }),
        testUtils.createMockNotification({ id: 3, is_read: false })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 3 }));
      await notificationCenter.init();

      // Open dropdown
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: notifications,
        total: 3,
        unread_count: 3
      }));

      const bell = document.querySelector('.notification-bell');
      bell.click();
      await testUtils.waitFor(100);

      // Verify all notifications are shown as unread
      const unreadItems = document.querySelectorAll('.notification-item.unread');
      expect(unreadItems.length).toBe(3);

      // Mark all as read
      API.put.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      const markAllBtn = document.querySelector('.mark-all-read-btn');
      markAllBtn.click();

      // Verify API call and state update
      expect(API.put).toHaveBeenCalledWith('/api/notifications/mark-all-read');
      expect(notificationCenter.unreadCount).toBe(0);

      // Verify badge is hidden
      const badge = document.querySelector('.notification-badge');
      expect(badge.style.display).toBe('none');
    });
  });

  describe('Real-time Synchronization', () => {
    test('should sync notification states across multiple instances', async () => {
      // Initialize notification center
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 1 }));
      await notificationCenter.init();

      const notification = testUtils.createMockNotification({
        id: 1,
        is_read: false
      });

      notificationCenter.notifications = [notification];

      // Simulate notification being read in another tab/device
      if (global.mockRealtimeCallbacks.notification_updated) {
        global.mockRealtimeCallbacks.notification_updated({
          user_id: mockUser.id,
          notification: { ...notification, is_read: true }
        });
      }

      // Verify local state was updated
      expect(notificationCenter.notifications[0].is_read).toBe(true);
    });

    test('should handle unread count updates from other sources', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 5 }));
      await notificationCenter.init();

      expect(notificationCenter.unreadCount).toBe(5);

      // Simulate unread count update from server
      if (global.mockRealtimeCallbacks.unread_count_updated) {
        global.mockRealtimeCallbacks.unread_count_updated({
          user_id: mockUser.id,
          count: 3
        });
      }

      // Verify count was updated
      expect(notificationCenter.unreadCount).toBe(3);

      // Verify badge reflects new count
      const count = document.querySelector('.notification-badge .count');
      expect(count.textContent).toBe('3');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle API failures gracefully', async () => {
      // Initialize successfully
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      await notificationCenter.init();

      // Simulate API failure when opening dropdown
      API.get.mockRejectedValue(new Error('Network error'));

      const bell = document.querySelector('.notification-bell');
      bell.click();
      await testUtils.waitFor(100);

      // Verify error state is shown
      const errorState = document.querySelector('.error-state');
      expect(errorState).toBeTruthy();
      expect(errorState.textContent).toContain('Failed to load notifications');

      // Verify retry button works
      const retryBtn = document.querySelector('.retry-btn');
      expect(retryBtn).toBeTruthy();

      // Mock successful retry
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [],
        total: 0,
        unread_count: 0
      }));

      retryBtn.click();
      await testUtils.waitFor(100);

      // Verify error state is cleared
      expect(document.querySelector('.error-state')).toBeFalsy();
      expect(document.querySelector('.empty-state')).toBeTruthy();
    });

    test('should handle partial failures in notification actions', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 1 }));
      await notificationCenter.init();

      const notification = testUtils.createMockNotification({
        id: 1,
        is_read: false
      });

      // Open dropdown with notification
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [notification],
        total: 1,
        unread_count: 1
      }));

      const bell = document.querySelector('.notification-bell');
      bell.click();
      await testUtils.waitFor(100);

      // Simulate failure when marking as read
      API.put.mockRejectedValue(new Error('Server error'));

      const notificationItem = document.querySelector('.notification-item');
      notificationItem.click();

      // Verify error was handled (notification should remain unread)
      expect(notificationCenter.notifications[0].is_read).toBe(false);
      
      // User should still be navigated to the URL despite the error
      expect(window.location.href).toBe(notification.action_url || '/');
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit notifications in memory', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      await notificationCenter.init();

      // Add many notifications
      for (let i = 0; i < 60; i++) {
        notificationCenter.addNewNotification(
          testUtils.createMockNotification({ id: i })
        );
      }

      // Should only keep latest 50
      expect(notificationCenter.notifications.length).toBe(50);
      expect(notificationCenter.notifications[0].id).toBe(59); // Latest first
      expect(notificationCenter.notifications[49].id).toBe(10); // Oldest kept
    });

    test('should clean up resources on destroy', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      await notificationCenter.init();

      // Verify resources are created
      expect(document.querySelector('.notification-bell-container')).toBeTruthy();
      expect(notificationCenter.pollInterval).toBeTruthy();
      expect(notificationCenter.realtimeUnsubscribers.length).toBeGreaterThan(0);

      // Destroy
      notificationCenter.destroy();

      // Verify cleanup
      expect(document.querySelector('.notification-bell-container')).toBeFalsy();
      expect(notificationCenter.pollInterval).toBeNull();
      expect(notificationCenter.realtimeUnsubscribers.length).toBe(0);
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should support keyboard navigation', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 0 }));
      await notificationCenter.init();

      const bell = document.querySelector('.notification-bell');

      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      bell.dispatchEvent(enterEvent);
      await testUtils.waitFor(100);

      expect(notificationCenter.isOpen).toBe(true);

      // Test Escape key (should close)
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(notificationCenter.isOpen).toBe(false);
    });

    test('should have proper ARIA attributes', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 3 }));
      await notificationCenter.init();

      const bell = document.querySelector('.notification-bell');
      const badge = document.querySelector('.notification-badge');

      expect(bell.getAttribute('aria-label')).toBe('Notifications');
      expect(bell.getAttribute('role')).toBe('button');
      expect(badge.querySelector('.visually-hidden').textContent).toBe('unread notifications');
    });

    test('should provide clear visual feedback for actions', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 1 }));
      await notificationCenter.init();

      // Open dropdown
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [testUtils.createMockNotification({ id: 1, is_read: false })],
        total: 1,
        unread_count: 1
      }));

      const bell = document.querySelector('.notification-bell');
      bell.click();
      await testUtils.waitFor(100);

      // Verify active state
      expect(bell.classList.contains('active')).toBe(true);

      // Verify unread indicator
      const unreadIndicator = document.querySelector('.notification-indicator');
      expect(unreadIndicator).toBeTruthy();
    });
  });
});
