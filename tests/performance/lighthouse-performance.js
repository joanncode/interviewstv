const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

/**
 * Comprehensive Lighthouse Performance Testing Suite
 * Tests multiple pages and scenarios for performance, accessibility, and best practices
 */

class LighthousePerformanceTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || 'tests/performance/results';
    this.chromeFlags = options.chromeFlags || ['--headless', '--no-sandbox', '--disable-gpu'];
    this.lighthouseConfig = options.lighthouseConfig || this.getDefaultConfig();
    this.testScenarios = this.getTestScenarios();
  }

  getDefaultConfig() {
    return {
      extends: 'lighthouse:default',
      settings: {
        onlyAudits: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'first-meaningful-paint',
          'speed-index',
          'interactive',
          'cumulative-layout-shift',
          'total-blocking-time',
          'max-potential-fid',
          'server-response-time',
          'render-blocking-resources',
          'unused-css-rules',
          'unused-javascript',
          'modern-image-formats',
          'uses-optimized-images',
          'uses-text-compression',
          'uses-responsive-images',
          'efficient-animated-content',
          'preload-lcp-image',
          'accessibility',
          'best-practices',
          'seo'
        ],
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        },
        emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36'
      }
    };
  }

  getTestScenarios() {
    return [
      {
        name: 'Homepage',
        url: '/',
        description: 'Main landing page performance',
        thresholds: {
          performance: 90,
          accessibility: 95,
          'best-practices': 90,
          seo: 85,
          'first-contentful-paint': 1500,
          'largest-contentful-paint': 2500,
          'cumulative-layout-shift': 0.1,
          'total-blocking-time': 300
        }
      },
      {
        name: 'Interview Listing',
        url: '/interviews',
        description: 'Interview listing page with pagination',
        thresholds: {
          performance: 85,
          accessibility: 95,
          'best-practices': 90,
          seo: 80,
          'first-contentful-paint': 1800,
          'largest-contentful-paint': 3000,
          'cumulative-layout-shift': 0.1,
          'total-blocking-time': 400
        }
      },
      {
        name: 'Search Page',
        url: '/search',
        description: 'Search interface and results',
        thresholds: {
          performance: 80,
          accessibility: 95,
          'best-practices': 90,
          seo: 75,
          'first-contentful-paint': 2000,
          'largest-contentful-paint': 3500,
          'cumulative-layout-shift': 0.15,
          'total-blocking-time': 500
        }
      },
      {
        name: 'User Dashboard',
        url: '/dashboard',
        description: 'Authenticated user dashboard',
        requiresAuth: true,
        thresholds: {
          performance: 85,
          accessibility: 95,
          'best-practices': 90,
          seo: 70,
          'first-contentful-paint': 1800,
          'largest-contentful-paint': 3000,
          'cumulative-layout-shift': 0.1,
          'total-blocking-time': 400
        }
      },
      {
        name: 'Interview Detail',
        url: '/interviews/1',
        description: 'Individual interview page with video player',
        thresholds: {
          performance: 75,
          accessibility: 95,
          'best-practices': 85,
          seo: 85,
          'first-contentful-paint': 2200,
          'largest-contentful-paint': 4000,
          'cumulative-layout-shift': 0.2,
          'total-blocking-time': 600
        }
      },
      {
        name: 'Mobile Homepage',
        url: '/',
        description: 'Mobile version of homepage',
        mobile: true,
        thresholds: {
          performance: 85,
          accessibility: 95,
          'best-practices': 90,
          seo: 85,
          'first-contentful-paint': 2000,
          'largest-contentful-paint': 3500,
          'cumulative-layout-shift': 0.1,
          'total-blocking-time': 400
        }
      }
    ];
  }

  async runAllTests() {
    console.log('🚀 Starting Lighthouse Performance Testing Suite');
    console.log(`Testing ${this.testScenarios.length} scenarios...`);

    // Ensure output directory exists
    await this.ensureOutputDirectory();

    const results = [];
    let chrome;

    try {
      // Launch Chrome
      chrome = await chromeLauncher.launch({ chromeFlags: this.chromeFlags });
      console.log(`Chrome launched on port ${chrome.port}`);

      // Run tests for each scenario
      for (const scenario of this.testScenarios) {
        console.log(`\n📊 Testing: ${scenario.name}`);
        
        try {
          const result = await this.runScenarioTest(scenario, chrome.port);
          results.push(result);
          
          // Save individual result
          await this.saveScenarioResult(scenario, result);
          
          console.log(`✅ ${scenario.name} completed`);
        } catch (error) {
          console.error(`❌ ${scenario.name} failed:`, error.message);
          results.push({
            scenario: scenario.name,
            error: error.message,
            success: false
          });
        }
      }

      // Generate comprehensive report
      await this.generateComprehensiveReport(results);
      
      // Check if all tests passed thresholds
      const summary = this.generateSummary(results);
      console.log('\n📈 Performance Test Summary:');
      console.log(summary);

      return results;

    } finally {
      if (chrome) {
        await chrome.kill();
        console.log('Chrome closed');
      }
    }
  }

  async runScenarioTest(scenario, chromePort) {
    const url = `${this.baseUrl}${scenario.url}`;
    
    // Configure Lighthouse for this scenario
    const config = { ...this.lighthouseConfig };
    
    if (scenario.mobile) {
      config.settings.screenEmulation = {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        disabled: false
      };
      config.settings.emulatedUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
    }

    // Handle authentication if required
    if (scenario.requiresAuth) {
      // This would need to be implemented based on your auth system
      // For now, we'll skip auth scenarios in automated tests
      console.log(`⚠️  Skipping ${scenario.name} - requires authentication`);
      return {
        scenario: scenario.name,
        skipped: true,
        reason: 'Authentication required'
      };
    }

    // Run Lighthouse
    const result = await lighthouse(url, {
      port: chromePort,
      disableDeviceEmulation: false,
      chromeFlags: this.chromeFlags
    }, config);

    // Extract metrics
    const metrics = this.extractMetrics(result);
    
    // Check thresholds
    const thresholdResults = this.checkThresholds(metrics, scenario.thresholds);
    
    return {
      scenario: scenario.name,
      url: url,
      timestamp: new Date().toISOString(),
      metrics: metrics,
      thresholds: thresholdResults,
      success: thresholdResults.passed,
      rawResult: result
    };
  }

  extractMetrics(lighthouseResult) {
    const audits = lighthouseResult.audits;
    const categories = lighthouseResult.categories;

    return {
      // Performance metrics
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      'best-practices': Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100),
      
      // Core Web Vitals
      'first-contentful-paint': audits['first-contentful-paint'].numericValue,
      'largest-contentful-paint': audits['largest-contentful-paint'].numericValue,
      'cumulative-layout-shift': audits['cumulative-layout-shift'].numericValue,
      'total-blocking-time': audits['total-blocking-time'].numericValue,
      'speed-index': audits['speed-index'].numericValue,
      'interactive': audits['interactive'].numericValue,
      
      // Additional metrics
      'server-response-time': audits['server-response-time']?.numericValue || 0,
      'render-blocking-resources': audits['render-blocking-resources']?.details?.items?.length || 0,
      'unused-css-rules': audits['unused-css-rules']?.details?.overallSavingsBytes || 0,
      'unused-javascript': audits['unused-javascript']?.details?.overallSavingsBytes || 0
    };
  }

  checkThresholds(metrics, thresholds) {
    const results = {
      passed: true,
      failures: [],
      warnings: [],
      details: {}
    };

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = metrics[metric];
      
      if (value === undefined) {
        results.warnings.push(`Metric ${metric} not found`);
        continue;
      }

      let passed = false;
      
      // Different comparison logic based on metric type
      if (['performance', 'accessibility', 'best-practices', 'seo'].includes(metric)) {
        passed = value >= threshold;
      } else {
        // For timing metrics, lower is better
        passed = value <= threshold;
      }

      results.details[metric] = {
        value: value,
        threshold: threshold,
        passed: passed,
        difference: metric.includes('score') || ['performance', 'accessibility', 'best-practices', 'seo'].includes(metric) 
          ? value - threshold 
          : threshold - value
      };

      if (!passed) {
        results.passed = false;
        results.failures.push({
          metric: metric,
          value: value,
          threshold: threshold,
          message: `${metric}: ${value} ${metric.includes('score') || ['performance', 'accessibility', 'best-practices', 'seo'].includes(metric) ? '<' : '>'} ${threshold}`
        });
      }
    }

    return results;
  }

  async saveScenarioResult(scenario, result) {
    const filename = `lighthouse-${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    
    // Also save the raw Lighthouse HTML report if available
    if (result.rawResult && result.rawResult.report) {
      const htmlFilename = `lighthouse-${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
      const htmlFilepath = path.join(this.outputDir, htmlFilename);
      await fs.writeFile(htmlFilepath, result.rawResult.report);
    }
  }

  async generateComprehensiveReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      results: results.map(r => ({
        scenario: r.scenario,
        success: r.success,
        metrics: r.metrics,
        thresholds: r.thresholds
      })),
      recommendations: this.generateRecommendations(results)
    };

    const reportPath = path.join(this.outputDir, `lighthouse-comprehensive-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlReportPath = path.join(this.outputDir, `lighthouse-comprehensive-report-${Date.now()}.html`);
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`📊 Comprehensive report saved to: ${reportPath}`);
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`);
  }

  generateSummary(results) {
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const skipped = results.filter(r => r.skipped).length;
    
    return {
      total: total,
      successful: successful,
      failed: total - successful - skipped,
      skipped: skipped,
      successRate: Math.round((successful / (total - skipped)) * 100),
      averagePerformance: this.calculateAverageMetric(results, 'performance'),
      averageAccessibility: this.calculateAverageMetric(results, 'accessibility'),
      averageLCP: this.calculateAverageMetric(results, 'largest-contentful-paint'),
      averageCLS: this.calculateAverageMetric(results, 'cumulative-layout-shift')
    };
  }

  calculateAverageMetric(results, metric) {
    const validResults = results.filter(r => r.metrics && r.metrics[metric] !== undefined);
    if (validResults.length === 0) return 0;
    
    const sum = validResults.reduce((acc, r) => acc + r.metrics[metric], 0);
    return Math.round(sum / validResults.length);
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    // Analyze common issues across scenarios
    const commonIssues = {};
    
    results.forEach(result => {
      if (result.thresholds && result.thresholds.failures) {
        result.thresholds.failures.forEach(failure => {
          if (!commonIssues[failure.metric]) {
            commonIssues[failure.metric] = 0;
          }
          commonIssues[failure.metric]++;
        });
      }
    });

    // Generate recommendations based on common issues
    Object.entries(commonIssues).forEach(([metric, count]) => {
      if (count >= 2) { // If issue appears in 2+ scenarios
        recommendations.push(this.getRecommendationForMetric(metric, count));
      }
    });

    return recommendations;
  }

  getRecommendationForMetric(metric, occurrences) {
    const recommendations = {
      'largest-contentful-paint': 'Optimize images, implement lazy loading, and consider using a CDN to improve Largest Contentful Paint',
      'cumulative-layout-shift': 'Add size attributes to images and videos, avoid inserting content above existing content',
      'total-blocking-time': 'Minimize and defer JavaScript, remove unused code, and optimize third-party scripts',
      'first-contentful-paint': 'Optimize server response times, eliminate render-blocking resources, and minimize critical resource depth',
      'performance': 'Focus on Core Web Vitals optimization, image optimization, and JavaScript performance',
      'accessibility': 'Ensure proper color contrast, add alt text to images, and implement proper heading hierarchy'
    };

    return {
      metric: metric,
      occurrences: occurrences,
      recommendation: recommendations[metric] || `Optimize ${metric} performance across multiple pages`,
      priority: occurrences >= 3 ? 'high' : 'medium'
    };
  }

  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Lighthouse Performance Report - Interviews.tv</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .success { border-left: 4px solid #4CAF50; }
        .warning { border-left: 4px solid #FF9800; }
        .error { border-left: 4px solid #F44336; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Lighthouse Performance Report</h1>
        <p>Generated on: ${report.timestamp}</p>
        <p>Success Rate: ${report.summary.successRate}% (${report.summary.successful}/${report.summary.total - report.summary.skipped} scenarios)</p>
    </div>
    
    <div class="summary">
        <div class="metric-card ${report.summary.averagePerformance >= 80 ? 'success' : 'warning'}">
            <h3>Performance</h3>
            <div style="font-size: 24px; font-weight: bold;">${report.summary.averagePerformance}</div>
        </div>
        <div class="metric-card ${report.summary.averageAccessibility >= 95 ? 'success' : 'warning'}">
            <h3>Accessibility</h3>
            <div style="font-size: 24px; font-weight: bold;">${report.summary.averageAccessibility}</div>
        </div>
        <div class="metric-card ${report.summary.averageLCP <= 2500 ? 'success' : 'warning'}">
            <h3>LCP (ms)</h3>
            <div style="font-size: 24px; font-weight: bold;">${report.summary.averageLCP}</div>
        </div>
        <div class="metric-card ${report.summary.averageCLS <= 0.1 ? 'success' : 'warning'}">
            <h3>CLS</h3>
            <div style="font-size: 24px; font-weight: bold;">${report.summary.averageCLS.toFixed(3)}</div>
        </div>
    </div>
    
    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li><strong>${rec.metric}</strong> (${rec.priority} priority): ${rec.recommendation}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
    
    <h2>Detailed Results</h2>
    <table>
        <thead>
            <tr>
                <th>Scenario</th>
                <th>Status</th>
                <th>Performance</th>
                <th>Accessibility</th>
                <th>LCP (ms)</th>
                <th>CLS</th>
                <th>TBT (ms)</th>
            </tr>
        </thead>
        <tbody>
            ${report.results.map(result => `
                <tr class="${result.success ? 'success' : 'error'}">
                    <td>${result.scenario}</td>
                    <td>${result.success ? '✅ Pass' : '❌ Fail'}</td>
                    <td>${result.metrics?.performance || 'N/A'}</td>
                    <td>${result.metrics?.accessibility || 'N/A'}</td>
                    <td>${result.metrics?.['largest-contentful-paint'] || 'N/A'}</td>
                    <td>${result.metrics?.['cumulative-layout-shift']?.toFixed(3) || 'N/A'}</td>
                    <td>${result.metrics?.['total-blocking-time'] || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  async ensureOutputDirectory() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }
}

// Export for use in other scripts
module.exports = LighthousePerformanceTester;

// CLI usage
if (require.main === module) {
  const tester = new LighthousePerformanceTester({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    outputDir: process.env.OUTPUT_DIR || 'tests/performance/results'
  });

  tester.runAllTests()
    .then(results => {
      const summary = tester.generateSummary(results);
      console.log('\n🎉 Performance testing completed!');
      console.log(`Success rate: ${summary.successRate}%`);
      process.exit(summary.successRate === 100 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}
