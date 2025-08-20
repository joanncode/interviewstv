/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Import testing utilities
import 'jest-dom/extend-expect';

// Mock global objects
global.fetch = require('jest-fetch-mock');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost',
  origin: 'http://localhost',
  protocol: 'http:',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.history
window.history = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn(),
};

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
};

global.cancelAnimationFrame = id => {
  clearTimeout(id);
};

// Mock Notification API
global.Notification = class Notification {
  constructor(title, options) {
    this.title = title;
    this.options = options;
  }
  
  static requestPermission() {
    return Promise.resolve('granted');
  }
  
  close() {}
};

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true,
});

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    pushManager: {
      subscribe: jest.fn(() => Promise.resolve({
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        },
        toJSON: jest.fn(() => ({
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth'
          }
        }))
      })),
      getSubscription: jest.fn(() => Promise.resolve(null)),
    },
    showNotification: jest.fn(() => Promise.resolve()),
    getNotifications: jest.fn(() => Promise.resolve([])),
  })),
  ready: Promise.resolve({
    installing: null,
    waiting: null,
    active: null,
    pushManager: {
      subscribe: jest.fn(),
      getSubscription: jest.fn(() => Promise.resolve(null)),
    },
    showNotification: jest.fn(),
    getNotifications: jest.fn(() => Promise.resolve([])),
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock PushManager
global.PushManager = {
  supportedContentEncodings: ['aes128gcm'],
};

// Mock crypto.getRandomValues
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: arr => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }
  
  readAsDataURL() {
    this.readyState = 2;
    this.result = 'data:image/png;base64,test';
    if (this.onload) this.onload();
  }
  
  readAsText() {
    this.readyState = 2;
    this.result = 'test content';
    if (this.onload) this.onload();
  }
  
  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort();
  }
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Array(4).fill(0),
  })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock HTMLCanvasElement.toDataURL
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');

// Global test utilities
global.testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    email_verified: true,
    created_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),
  
  // Create mock interview
  createMockInterview: (overrides = {}) => ({
    id: 1,
    title: 'Test Interview',
    company: 'Test Company',
    position: 'Software Developer',
    content: 'Test interview content',
    status: 'published',
    user_id: 1,
    created_at: '2023-01-01T00:00:00Z',
    ...overrides,
  }),
  
  // Create mock notification
  createMockNotification: (overrides = {}) => ({
    id: 1,
    user_id: 1,
    type: 'test_notification',
    title: 'Test Notification',
    message: 'Test notification message',
    is_read: false,
    priority: 'normal',
    created_at: '2023-01-01T00:00:00Z',
    time_ago: 'just now',
    ...overrides,
  }),
  
  // Create mock API response
  createMockResponse: (data, success = true) => ({
    success,
    data,
    message: success ? 'Success' : 'Error',
  }),
  
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Trigger DOM event
  triggerEvent: (element, eventType, eventData = {}) => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    Object.assign(event, eventData);
    element.dispatchEvent(event);
  },
  
  // Mock fetch response
  mockFetchResponse: (data, status = 200) => {
    fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    });
  },
  
  // Mock fetch error
  mockFetchError: (error = new Error('Network error')) => {
    fetch.mockRejectedValueOnce(error);
  },
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.resetMocks();
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset location
  window.location.href = 'http://localhost';
  window.location.pathname = '/';
  window.location.search = '';
  window.location.hash = '';
  
  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
