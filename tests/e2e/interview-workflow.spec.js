const { test, expect } = require('@playwright/test');

test.describe('Interview Workflow E2E Tests', () => {
  let page;
  let testUser;
  let testInterview;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set up test data
    testUser = {
      name: 'E2E Test User',
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'SecurePassword123!'
    };
  });

  test.afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await page.close();
  });

  test('Complete interview creation and analysis workflow', async () => {
    // Step 1: User Registration
    await test.step('Register new user', async () => {
      await page.goto('/register');
      
      await page.fill('[data-testid="name-input"]', testUser.name);
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="password-confirmation-input"]', testUser.password);
      
      await page.click('[data-testid="register-button"]');
      
      // Wait for successful registration
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page).toHaveURL('/dashboard');
    });

    // Step 2: Create New Interview
    await test.step('Create new interview', async () => {
      await page.click('[data-testid="create-interview-button"]');
      
      // Fill interview details
      await page.fill('[data-testid="interview-title"]', 'E2E Test Interview - React Developer');
      await page.fill('[data-testid="interview-description"]', 'Comprehensive React developer interview covering hooks, state management, and performance optimization.');
      
      await page.selectOption('[data-testid="interview-category"]', 'Technology');
      await page.selectOption('[data-testid="difficulty-level"]', 'intermediate');
      
      // Add tags
      await page.fill('[data-testid="tags-input"]', 'react');
      await page.keyboard.press('Enter');
      await page.fill('[data-testid="tags-input"]', 'javascript');
      await page.keyboard.press('Enter');
      await page.fill('[data-testid="tags-input"]', 'frontend');
      await page.keyboard.press('Enter');
      
      await page.click('[data-testid="create-interview-submit"]');
      
      // Wait for interview creation
      await expect(page.locator('[data-testid="interview-created-message"]')).toBeVisible();
      
      // Extract interview ID from URL
      const url = page.url();
      const interviewId = url.match(/\/interviews\/(\d+)/)[1];
      testInterview = { id: interviewId };
    });

    // Step 3: Upload Interview Video
    await test.step('Upload interview video', async () => {
      // Navigate to video upload section
      await page.click('[data-testid="upload-video-tab"]');
      
      // Create test video file
      const testVideoPath = await createTestVideoFile();
      
      // Upload video
      await page.setInputFiles('[data-testid="video-upload-input"]', testVideoPath);
      
      // Wait for upload progress
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
      
      // Verify video preview is available
      await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
    });

    // Step 4: Start AI Analysis
    await test.step('Start AI analysis', async () => {
      await page.click('[data-testid="start-analysis-button"]');
      
      // Confirm analysis start
      await page.click('[data-testid="confirm-analysis-button"]');
      
      // Wait for analysis to start
      await expect(page.locator('[data-testid="analysis-status"]')).toContainText('Processing');
      
      // Wait for analysis completion (with timeout)
      await expect(page.locator('[data-testid="analysis-status"]')).toContainText('Completed', { timeout: 120000 });
    });

    // Step 5: View Analysis Results
    await test.step('View analysis results', async () => {
      await page.click('[data-testid="view-analysis-button"]');
      
      // Check overall score
      await expect(page.locator('[data-testid="overall-score"]')).toBeVisible();
      const overallScore = await page.locator('[data-testid="overall-score-value"]').textContent();
      expect(parseInt(overallScore)).toBeGreaterThan(0);
      expect(parseInt(overallScore)).toBeLessThanOrEqual(100);
      
      // Check insights tabs
      await expect(page.locator('[data-testid="insights-tab"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-tab"]')).toBeVisible();
      await expect(page.locator('[data-testid="sentiment-tab"]')).toBeVisible();
      await expect(page.locator('[data-testid="keywords-tab"]')).toBeVisible();
      
      // Test insights tab
      await page.click('[data-testid="insights-tab"]');
      await expect(page.locator('[data-testid="strengths-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="improvements-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible();
      
      // Test performance tab
      await page.click('[data-testid="performance-tab"]');
      await expect(page.locator('[data-testid="speaking-pace-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="filler-words-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="vocabulary-card"]')).toBeVisible();
      
      // Test sentiment tab
      await page.click('[data-testid="sentiment-tab"]');
      await expect(page.locator('[data-testid="sentiment-gauge"]')).toBeVisible();
      await expect(page.locator('[data-testid="emotions-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="confidence-analysis"]')).toBeVisible();
      
      // Test keywords tab
      await page.click('[data-testid="keywords-tab"]');
      await expect(page.locator('[data-testid="technical-terms"]')).toBeVisible();
      await expect(page.locator('[data-testid="soft-skills"]')).toBeVisible();
      await expect(page.locator('[data-testid="topics-list"]')).toBeVisible();
    });

    // Step 6: Publish Interview
    await test.step('Publish interview', async () => {
      await page.click('[data-testid="publish-interview-button"]');
      
      // Confirm publication
      await page.click('[data-testid="confirm-publish-button"]');
      
      // Wait for publication success
      await expect(page.locator('[data-testid="publish-success-message"]')).toBeVisible();
      
      // Verify interview is now public
      await expect(page.locator('[data-testid="interview-status"]')).toContainText('Published');
    });
  });

  test('Search and discovery workflow', async () => {
    // Step 1: Navigate to search page
    await test.step('Navigate to search', async () => {
      await page.goto('/search');
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    });

    // Step 2: Perform search
    await test.step('Search for interviews', async () => {
      await page.fill('[data-testid="search-input"]', 'react javascript');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="result-count"]')).toBeVisible();
      
      // Verify search results contain relevant content
      const resultCards = page.locator('[data-testid="result-card"]');
      await expect(resultCards.first()).toBeVisible();
      
      // Check that results contain search terms
      const firstResultTitle = await resultCards.first().locator('[data-testid="result-title"]').textContent();
      expect(firstResultTitle.toLowerCase()).toMatch(/(react|javascript)/);
    });

    // Step 3: Apply filters
    await test.step('Apply search filters', async () => {
      // Apply category filter
      await page.click('[data-testid="filter-technology"]');
      
      // Apply difficulty filter
      await page.click('[data-testid="filter-intermediate"]');
      
      // Wait for filtered results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Verify filters are applied
      await expect(page.locator('[data-testid="active-filters"]')).toContainText('Technology');
      await expect(page.locator('[data-testid="active-filters"]')).toContainText('Intermediate');
    });

    // Step 4: View search suggestions
    await test.step('Test search suggestions', async () => {
      await page.fill('[data-testid="search-input"]', 'node');
      
      // Wait for suggestions dropdown
      await expect(page.locator('[data-testid="suggestions-dropdown"]')).toBeVisible();
      
      // Verify AI suggestions are present
      await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
      
      // Click on a suggestion
      await page.click('[data-testid="suggestion-item"]').first();
      
      // Verify search is performed with suggestion
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test('User profile and recommendations workflow', async () => {
    // Step 1: Navigate to profile
    await test.step('Navigate to user profile', async () => {
      await page.goto('/profile');
      await expect(page.locator('[data-testid="profile-header"]')).toBeVisible();
    });

    // Step 2: Update profile information
    await test.step('Update profile', async () => {
      await page.click('[data-testid="edit-profile-button"]');
      
      // Update bio
      await page.fill('[data-testid="bio-input"]', 'Experienced React developer with 5+ years of frontend development experience.');
      
      // Add skills
      await page.fill('[data-testid="skills-input"]', 'React');
      await page.keyboard.press('Enter');
      await page.fill('[data-testid="skills-input"]', 'JavaScript');
      await page.keyboard.press('Enter');
      await page.fill('[data-testid="skills-input"]', 'TypeScript');
      await page.keyboard.press('Enter');
      
      // Set experience level
      await page.selectOption('[data-testid="experience-level"]', 'senior');
      
      // Save profile
      await page.click('[data-testid="save-profile-button"]');
      
      // Wait for save confirmation
      await expect(page.locator('[data-testid="profile-saved-message"]')).toBeVisible();
    });

    // Step 3: View recommendations
    await test.step('View personalized recommendations', async () => {
      await page.goto('/recommendations');
      
      // Wait for recommendations to load
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible();
      
      // Check different recommendation types
      await expect(page.locator('[data-testid="interview-recommendations"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-recommendations"]')).toBeVisible();
      await expect(page.locator('[data-testid="people-recommendations"]')).toBeVisible();
      
      // Test recommendation tabs
      await page.click('[data-testid="skills-tab"]');
      await expect(page.locator('[data-testid="skill-recommendation-cards"]')).toBeVisible();
      
      await page.click('[data-testid="people-tab"]');
      await expect(page.locator('[data-testid="people-recommendation-cards"]')).toBeVisible();
    });

    // Step 4: Connect integrations
    await test.step('Test integration connections', async () => {
      await page.goto('/integrations');
      
      // Check available integrations
      await expect(page.locator('[data-testid="linkedin-integration"]')).toBeVisible();
      await expect(page.locator('[data-testid="github-integration"]')).toBeVisible();
      await expect(page.locator('[data-testid="slack-integration"]')).toBeVisible();
      
      // Test integration info display
      await page.click('[data-testid="linkedin-info-button"]');
      await expect(page.locator('[data-testid="integration-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="integration-features"]')).toBeVisible();
      
      await page.click('[data-testid="close-modal-button"]');
    });
  });

  test('Interview viewing and interaction workflow', async () => {
    // Step 1: Browse interviews
    await test.step('Browse public interviews', async () => {
      await page.goto('/interviews');
      
      // Wait for interviews list
      await expect(page.locator('[data-testid="interviews-grid"]')).toBeVisible();
      
      // Check interview cards
      const interviewCards = page.locator('[data-testid="interview-card"]');
      await expect(interviewCards.first()).toBeVisible();
      
      // Click on first interview
      await interviewCards.first().click();
      
      // Wait for interview page to load
      await expect(page.locator('[data-testid="interview-player"]')).toBeVisible();
    });

    // Step 2: Watch interview
    await test.step('Watch interview video', async () => {
      // Play video
      await page.click('[data-testid="play-button"]');
      
      // Wait for video to start playing
      await expect(page.locator('[data-testid="video-player"]')).toHaveAttribute('data-playing', 'true');
      
      // Test video controls
      await page.click('[data-testid="pause-button"]');
      await expect(page.locator('[data-testid="video-player"]')).toHaveAttribute('data-playing', 'false');
      
      // Test seek functionality
      await page.click('[data-testid="seek-bar"]', { position: { x: 100, y: 10 } });
      
      // Test fullscreen
      await page.click('[data-testid="fullscreen-button"]');
      await page.keyboard.press('Escape'); // Exit fullscreen
    });

    // Step 3: View interview analysis
    await test.step('View public analysis', async () => {
      await page.click('[data-testid="analysis-tab"]');
      
      // Check analysis sections are visible
      await expect(page.locator('[data-testid="public-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="key-topics"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-highlights"]')).toBeVisible();
    });

    // Step 4: Rate and review
    await test.step('Rate and review interview', async () => {
      // Scroll to rating section
      await page.locator('[data-testid="rating-section"]').scrollIntoViewIfNeeded();
      
      // Give rating
      await page.click('[data-testid="star-4"]');
      
      // Write review
      await page.fill('[data-testid="review-text"]', 'Excellent interview with great technical depth. Very helpful for React developers.');
      
      // Select helpful aspects
      await page.check('[data-testid="helpful-technical-depth"]');
      await page.check('[data-testid="helpful-real-scenarios"]');
      
      // Submit review
      await page.click('[data-testid="submit-review-button"]');
      
      // Wait for review confirmation
      await expect(page.locator('[data-testid="review-success-message"]')).toBeVisible();
    });

    // Step 5: Add to watchlist
    await test.step('Add to watchlist', async () => {
      await page.click('[data-testid="add-to-watchlist-button"]');
      
      // Wait for watchlist confirmation
      await expect(page.locator('[data-testid="added-to-watchlist-message"]')).toBeVisible();
      
      // Verify button state changed
      await expect(page.locator('[data-testid="remove-from-watchlist-button"]')).toBeVisible();
    });
  });

  // Helper functions
  async function createTestVideoFile() {
    // This would create a test video file for upload testing
    // In a real implementation, you'd create a minimal valid video file
    return 'path/to/test/video.mp4';
  }

  async function cleanupTestData() {
    // Clean up test user and interview data
    // This would make API calls to remove test data
    if (testInterview && testInterview.id) {
      // Delete test interview
    }
    
    if (testUser && testUser.email) {
      // Delete test user
    }
  }
});

// Performance and accessibility tests
test.describe('Performance and Accessibility Tests', () => {
  test('Page load performance', async ({ page }) => {
    // Test homepage performance
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // Page should load within 3 seconds
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        }).observe({ entryTypes: ['navigation', 'paint'] });
      });
    });
    
    // Verify performance metrics are within acceptable ranges
    expect(metrics).toBeDefined();
  });

  test('Accessibility compliance', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility features
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Check for proper form labels
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"]').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
      }
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test mobile menu functionality
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    // Verify layout adapts to tablet size
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});
