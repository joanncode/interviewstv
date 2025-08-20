/**
 * NotificationCenter Component Unit Tests
 */

import NotificationCenter from '../../../src/components/NotificationCenter.js';
import API from '../../../src/services/api.js';
import Auth from '../../../src/services/auth.js';

// Mock dependencies
jest.mock('../../../src/services/api.js');
jest.mock('../../../src/services/auth.js');
jest.mock('../../../src/services/realtime.js', () => ({
  realtimeService: {
    on: jest.fn(),
    off: jest.fn(),
  }
}));

describe('NotificationCenter', () => {
  let notificationCenter;
  let mockUser;

  beforeEach(() => {
    // Create mock user
    mockUser = testUtils.createMockUser();
    Auth.getCurrentUser.mockReturnValue(mockUser);

    // Create notification center instance
    notificationCenter = new NotificationCenter();

    // Create header element for bell placement
    document.body.innerHTML = '<div class="navbar"></div>';
  });

  afterEach(() => {
    if (notificationCenter) {
      notificationCenter.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with current user', async () => {
      await notificationCenter.init();

      expect(notificationCenter.currentUser).toEqual(mockUser);
      expect(notificationCenter.notifications).toEqual([]);
      expect(notificationCenter.unreadCount).toBe(0);
    });

    test('should not initialize without user', async () => {
      Auth.getCurrentUser.mockReturnValue(null);
      
      await notificationCenter.init();

      expect(notificationCenter.currentUser).toBeNull();
      expect(document.querySelector('.notification-bell')).toBeNull();
    });

    test('should create notification bell in header', async () => {
      await notificationCenter.init();

      const bell = document.querySelector('.notification-bell');
      expect(bell).toBeTruthy();
      expect(bell.getAttribute('aria-label')).toBe('Notifications');
    });

    test('should load unread count on initialization', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({ unread_count: 5 }));

      await notificationCenter.init();

      expect(API.get).toHaveBeenCalledWith('/api/notifications/unread-count');
      expect(notificationCenter.unreadCount).toBe(5);
    });
  });

  describe('Bell Interaction', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should toggle dropdown on bell click', async () => {
      const bell = document.querySelector('.notification-bell');
      
      // Mock API response for notifications
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [],
        total: 0,
        unread_count: 0
      }));

      // Click to open
      bell.click();
      await testUtils.waitFor(100);

      expect(notificationCenter.isOpen).toBe(true);
      expect(document.querySelector('.notification-dropdown').style.display).toBe('block');

      // Click to close
      bell.click();

      expect(notificationCenter.isOpen).toBe(false);
    });

    test('should support keyboard navigation', async () => {
      const bell = document.querySelector('.notification-bell');
      
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [],
        total: 0,
        unread_count: 0
      }));

      // Press Enter to open
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      bell.dispatchEvent(enterEvent);
      await testUtils.waitFor(100);

      expect(notificationCenter.isOpen).toBe(true);

      // Press Space to close
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      bell.dispatchEvent(spaceEvent);

      expect(notificationCenter.isOpen).toBe(false);
    });

    test('should close dropdown when clicking outside', async () => {
      const bell = document.querySelector('.notification-bell');
      
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [],
        total: 0,
        unread_count: 0
      }));

      // Open dropdown
      bell.click();
      await testUtils.waitFor(100);

      expect(notificationCenter.isOpen).toBe(true);

      // Click outside
      document.body.click();

      expect(notificationCenter.isOpen).toBe(false);
    });
  });

  describe('Notification Loading', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should load notifications when dropdown opens', async () => {
      const mockNotifications = [
        testUtils.createMockNotification({ id: 1 }),
        testUtils.createMockNotification({ id: 2 })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: mockNotifications,
        total: 2,
        unread_count: 1
      }));

      await notificationCenter.openDropdown();

      expect(API.get).toHaveBeenCalledWith('/api/notifications', {
        page: 1,
        limit: 10
      });
      expect(notificationCenter.notifications).toEqual(mockNotifications);
      expect(notificationCenter.unreadCount).toBe(1);
    });

    test('should show loading state while fetching', async () => {
      // Mock delayed API response
      API.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(testUtils.createMockResponse({
            notifications: [],
            total: 0,
            unread_count: 0
          })), 100)
        )
      );

      const loadPromise = notificationCenter.openDropdown();

      // Check loading state
      expect(document.querySelector('.loading-state')).toBeTruthy();

      await loadPromise;

      // Loading state should be gone
      expect(document.querySelector('.loading-state')).toBeFalsy();
    });

    test('should handle API errors gracefully', async () => {
      API.get.mockRejectedValue(new Error('API Error'));

      await notificationCenter.openDropdown();

      expect(document.querySelector('.error-state')).toBeTruthy();
      expect(document.querySelector('.error-state').textContent).toContain('Failed to load notifications');
    });

    test('should show empty state when no notifications', async () => {
      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [],
        total: 0,
        unread_count: 0
      }));

      await notificationCenter.openDropdown();

      expect(document.querySelector('.empty-state')).toBeTruthy();
      expect(document.querySelector('.empty-state').textContent).toContain('No notifications');
    });
  });

  describe('Notification Rendering', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should render notification items correctly', async () => {
      const mockNotifications = [
        testUtils.createMockNotification({
          id: 1,
          title: 'Test Notification',
          message: 'Test message',
          is_read: false,
          type: 'new_follower'
        })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: mockNotifications,
        total: 1,
        unread_count: 1
      }));

      await notificationCenter.openDropdown();

      const notificationItem = document.querySelector('.notification-item');
      expect(notificationItem).toBeTruthy();
      expect(notificationItem.textContent).toContain('Test Notification');
      expect(notificationItem.textContent).toContain('Test message');
      expect(notificationItem.classList.contains('unread')).toBe(true);
    });

    test('should show correct notification icons', async () => {
      const mockNotifications = [
        testUtils.createMockNotification({ type: 'new_follower' }),
        testUtils.createMockNotification({ type: 'new_like' }),
        testUtils.createMockNotification({ type: 'new_comment' })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: mockNotifications,
        total: 3,
        unread_count: 3
      }));

      await notificationCenter.openDropdown();

      const icons = document.querySelectorAll('.notification-icon i');
      expect(icons[0].classList.contains('fa-user-plus')).toBe(true);
      expect(icons[1].classList.contains('fa-heart')).toBe(true);
      expect(icons[2].classList.contains('fa-comment')).toBe(true);
    });

    test('should handle priority classes', async () => {
      const mockNotifications = [
        testUtils.createMockNotification({ priority: 'urgent' }),
        testUtils.createMockNotification({ priority: 'high' }),
        testUtils.createMockNotification({ priority: 'normal' })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: mockNotifications,
        total: 3,
        unread_count: 3
      }));

      await notificationCenter.openDropdown();

      const items = document.querySelectorAll('.notification-item');
      expect(items[0].classList.contains('notification-urgent')).toBe(true);
      expect(items[1].classList.contains('notification-high')).toBe(true);
      expect(items[2].classList.contains('notification-urgent')).toBe(false);
    });
  });

  describe('Notification Actions', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should mark notification as read when clicked', async () => {
      const mockNotification = testUtils.createMockNotification({
        id: 1,
        is_read: false,
        action_url: '/test-url'
      });

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: [mockNotification],
        total: 1,
        unread_count: 1
      }));

      API.put.mockResolvedValue(testUtils.createMockResponse({
        unread_count: 0
      }));

      await notificationCenter.openDropdown();

      const notificationItem = document.querySelector('.notification-item');
      notificationItem.click();

      expect(API.put).toHaveBeenCalledWith('/api/notifications/1/read');
      expect(window.location.href).toBe('/test-url');
    });

    test('should mark all notifications as read', async () => {
      const mockNotifications = [
        testUtils.createMockNotification({ id: 1, is_read: false }),
        testUtils.createMockNotification({ id: 2, is_read: false })
      ];

      API.get.mockResolvedValue(testUtils.createMockResponse({
        notifications: mockNotifications,
        total: 2,
        unread_count: 2
      }));

      API.put.mockResolvedValue(testUtils.createMockResponse({
        unread_count: 0
      }));

      await notificationCenter.openDropdown();

      const markAllBtn = document.querySelector('.mark-all-read-btn');
      markAllBtn.click();

      expect(API.put).toHaveBeenCalledWith('/api/notifications/mark-all-read');
      expect(notificationCenter.unreadCount).toBe(0);
    });
  });

  describe('Unread Badge', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should show badge when there are unread notifications', () => {
      notificationCenter.updateUnreadCount(5);

      const badge = document.querySelector('.notification-badge');
      const count = document.querySelector('.notification-badge .count');

      expect(badge.style.display).toBe('inline-block');
      expect(count.textContent).toBe('5');
    });

    test('should hide badge when no unread notifications', () => {
      notificationCenter.updateUnreadCount(0);

      const badge = document.querySelector('.notification-badge');

      expect(badge.style.display).toBe('none');
    });

    test('should show 99+ for counts over 99', () => {
      notificationCenter.updateUnreadCount(150);

      const count = document.querySelector('.notification-badge .count');

      expect(count.textContent).toBe('99+');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should add new notification from real-time update', () => {
      const newNotification = testUtils.createMockNotification({ id: 999 });

      // Simulate real-time notification
      notificationCenter.addNewNotification(newNotification);

      expect(notificationCenter.notifications[0]).toEqual(newNotification);
    });

    test('should limit notifications in memory', () => {
      // Add 60 notifications (more than the 50 limit)
      for (let i = 0; i < 60; i++) {
        notificationCenter.addNewNotification(
          testUtils.createMockNotification({ id: i })
        );
      }

      expect(notificationCenter.notifications.length).toBe(50);
    });

    test('should update existing notification', () => {
      const originalNotification = testUtils.createMockNotification({ 
        id: 1, 
        is_read: false 
      });
      
      notificationCenter.notifications = [originalNotification];

      const updatedNotification = testUtils.createMockNotification({ 
        id: 1, 
        is_read: true 
      });

      notificationCenter.updateNotification(updatedNotification);

      expect(notificationCenter.notifications[0].is_read).toBe(true);
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(async () => {
      await notificationCenter.init();
    });

    test('should show toast for new notifications', () => {
      const notification = testUtils.createMockNotification({
        title: 'New Follower',
        message: 'John started following you'
      });

      notificationCenter.showToastNotification(notification);

      const toast = document.querySelector('.notification-toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain('New Follower');
      expect(toast.textContent).toContain('John started following you');
    });

    test('should auto-remove toast after timeout', async () => {
      jest.useFakeTimers();

      const notification = testUtils.createMockNotification();
      notificationCenter.showToastNotification(notification);

      expect(document.querySelector('.notification-toast')).toBeTruthy();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      expect(document.querySelector('.notification-toast')).toBeFalsy();

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    test('should clean up resources on destroy', async () => {
      await notificationCenter.init();

      const bell = document.querySelector('.notification-bell-container');
      expect(bell).toBeTruthy();

      notificationCenter.destroy();

      expect(document.querySelector('.notification-bell-container')).toBeFalsy();
      expect(notificationCenter.pollInterval).toBeNull();
    });
  });
});
