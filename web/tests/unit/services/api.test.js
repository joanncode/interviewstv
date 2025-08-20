/**
 * API Service Unit Tests
 */

import API from '../../../src/services/api.js';

describe('API Service', () => {
  beforeEach(() => {
    // Reset API configuration
    API.baseURL = '/api';
    API.token = null;
    
    // Clear localStorage
    localStorage.clear();
  });

  describe('Configuration', () => {
    test('should have default base URL', () => {
      expect(API.baseURL).toBe('/api');
    });

    test('should set authentication token', () => {
      const token = 'test-token';
      API.setToken(token);
      
      expect(API.token).toBe(token);
      expect(localStorage.getItem('auth_token')).toBe(token);
    });

    test('should clear authentication token', () => {
      API.setToken('test-token');
      API.clearToken();
      
      expect(API.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    test('should load token from localStorage on initialization', () => {
      const token = 'stored-token';
      localStorage.setItem('auth_token', token);
      
      // Reinitialize API
      API.init();
      
      expect(API.token).toBe(token);
    });
  });

  describe('HTTP Methods', () => {
    test('should make GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockData));

      const response = await API.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockData);
    });

    test('should make POST request with data', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = { id: 1, ...postData };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockResponse));

      const response = await API.post('/test', postData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockResponse);
    });

    test('should make PUT request', async () => {
      const putData = { id: 1, name: 'Updated Item' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(putData));

      const response = await API.put('/test/1', putData);

      expect(fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putData),
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(putData);
    });

    test('should make DELETE request', async () => {
      testUtils.mockFetchResponse(testUtils.createMockResponse({ deleted: true }));

      const response = await API.delete('/test/1');

      expect(fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.success).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('should include authorization header when token is set', async () => {
      const token = 'test-token';
      API.setToken(token);
      
      testUtils.mockFetchResponse(testUtils.createMockResponse({}));

      await API.get('/protected');

      expect(fetch).toHaveBeenCalledWith('/api/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    });

    test('should not include authorization header when no token', async () => {
      testUtils.mockFetchResponse(testUtils.createMockResponse({}));

      await API.get('/public');

      expect(fetch).toHaveBeenCalledWith('/api/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Query Parameters', () => {
    test('should append query parameters to GET request', async () => {
      const params = { page: 1, limit: 10, search: 'test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse([]));

      await API.get('/test', params);

      expect(fetch).toHaveBeenCalledWith('/api/test?page=1&limit=10&search=test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('should handle empty query parameters', async () => {
      testUtils.mockFetchResponse(testUtils.createMockResponse([]));

      await API.get('/test', {});

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('should encode special characters in query parameters', async () => {
      const params = { search: 'test & special chars' };
      testUtils.mockFetchResponse(testUtils.createMockResponse([]));

      await API.get('/test', params);

      expect(fetch).toHaveBeenCalledWith('/api/test?search=test%20%26%20special%20chars', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      testUtils.mockFetchError(new Error('Network error'));

      const response = await API.get('/test');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Network error');
    });

    test('should handle HTTP error responses', async () => {
      const errorResponse = testUtils.createMockResponse(
        { message: 'Not found' },
        false
      );
      testUtils.mockFetchResponse(errorResponse, 404);

      const response = await API.get('/test');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Not found');
    });

    test('should handle invalid JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid response',
      });

      const response = await API.get('/test');

      expect(response.success).toBe(false);
      expect(response.message).toContain('Invalid JSON');
    });

    test('should handle 401 unauthorized responses', async () => {
      const errorResponse = testUtils.createMockResponse(
        { message: 'Unauthorized' },
        false
      );
      testUtils.mockFetchResponse(errorResponse, 401);

      // Mock window.location.href setter
      delete window.location;
      window.location = { href: '' };

      const response = await API.get('/protected');

      expect(response.success).toBe(false);
      expect(window.location.href).toBe('/login');
    });
  });

  describe('Request Interceptors', () => {
    test('should add custom headers', async () => {
      API.addRequestInterceptor((config) => {
        config.headers['X-Custom-Header'] = 'test-value';
        return config;
      });

      testUtils.mockFetchResponse(testUtils.createMockResponse({}));

      await API.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value',
        },
      });
    });

    test('should modify request URL', async () => {
      API.addRequestInterceptor((config) => {
        config.url = config.url + '?modified=true';
        return config;
      });

      testUtils.mockFetchResponse(testUtils.createMockResponse({}));

      await API.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test?modified=true', expect.any(Object));
    });
  });

  describe('Response Interceptors', () => {
    test('should transform response data', async () => {
      API.addResponseInterceptor((response) => {
        if (response.success && response.data) {
          response.data.transformed = true;
        }
        return response;
      });

      const mockData = { id: 1, name: 'Test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockData));

      const response = await API.get('/test');

      expect(response.data.transformed).toBe(true);
    });

    test('should handle response errors', async () => {
      API.addResponseInterceptor((response) => {
        if (!response.success) {
          response.message = 'Intercepted error: ' + response.message;
        }
        return response;
      });

      const errorResponse = testUtils.createMockResponse(
        { message: 'Original error' },
        false
      );
      testUtils.mockFetchResponse(errorResponse, 400);

      const response = await API.get('/test');

      expect(response.message).toBe('Intercepted error: Original error');
    });
  });

  describe('File Upload', () => {
    test('should upload file with FormData', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      testUtils.mockFetchResponse(testUtils.createMockResponse({ url: '/uploads/test.txt' }));

      const response = await API.upload('/upload', formData);

      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        headers: {
          // Note: Content-Type should not be set for FormData
        },
        body: formData,
      });
      
      expect(response.success).toBe(true);
      expect(response.data.url).toBe('/uploads/test.txt');
    });
  });

  describe('Caching', () => {
    test('should cache GET requests when enabled', async () => {
      API.enableCache();
      
      const mockData = { id: 1, name: 'Test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockData));

      // First request
      const response1 = await API.get('/test');
      
      // Second request (should use cache)
      const response2 = await API.get('/test');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response1.data).toEqual(mockData);
      expect(response2.data).toEqual(mockData);
    });

    test('should not cache POST requests', async () => {
      API.enableCache();
      
      const mockData = { id: 1, name: 'Test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockData));

      await API.post('/test', { name: 'Test' });
      await API.post('/test', { name: 'Test' });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should clear cache', async () => {
      API.enableCache();
      
      const mockData = { id: 1, name: 'Test' };
      testUtils.mockFetchResponse(testUtils.createMockResponse(mockData));

      // First request
      await API.get('/test');
      
      // Clear cache
      API.clearCache();
      
      // Second request (should not use cache)
      await API.get('/test');

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Timeout', () => {
    test('should timeout long requests', async () => {
      API.setTimeout(1000); // 1 second timeout

      // Mock a request that takes longer than timeout
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const response = await API.get('/slow-endpoint');

      expect(response.success).toBe(false);
      expect(response.message).toContain('timeout');
    });
  });
});
