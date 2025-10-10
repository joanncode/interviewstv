/**
 * SEO Optimization System for Interviews.tv
 * Advanced SEO management, meta tags, sitemaps, and search optimization
 */

const mysql = require('mysql2/promise');
const redis = require('redis');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');

class SEOOptimizationSystem {
  constructor(dbPool, redisClient, logger) {
    this.dbPool = dbPool;
    this.redisClient = redisClient;
    this.logger = logger;
    this.baseUrl = process.env.BASE_URL || 'https://interviews.tv';
    this.seoTemplates = this.initializeSEOTemplates();
    this.keywordTargets = this.initializeKeywordTargets();
  }

  initializeSEOTemplates() {
    return {
      homepage: {
        title: 'Interviews.tv - Professional Interview Platform | Live Streaming & Career Development',
        description: 'Join the leading platform for professional interviews. Stream live interviews, discover career opportunities, and connect with industry experts. Start your journey today.',
        keywords: 'interviews, live streaming, career development, professional networking, job interviews, industry experts',
        ogType: 'website'
      },
      interview: {
        title: '{title} | Professional Interview on Interviews.tv',
        description: 'Watch {title} featuring {participants}. Discover insights about {category} and advance your career with expert advice.',
        keywords: 'interview, {category}, {participants}, career advice, professional development',
        ogType: 'video'
      },
      profile: {
        title: '{name} - Professional Profile | Interviews.tv',
        description: 'Connect with {name}, {title} at {company}. View their professional interviews and career insights on Interviews.tv.',
        keywords: '{name}, {title}, {company}, professional profile, career expert',
        ogType: 'profile'
      },
      category: {
        title: '{category} Interviews | Professional Career Content | Interviews.tv',
        description: 'Explore {category} interviews and career advice from industry experts. Learn from professionals and advance your career in {category}.',
        keywords: '{category}, career advice, professional interviews, industry experts, job market',
        ogType: 'website'
      },
      search: {
        title: 'Search Results for "{query}" | Interviews.tv',
        description: 'Find professional interviews and career content related to "{query}". Discover expert insights and career opportunities.',
        keywords: '{query}, search, interviews, career content, professional development',
        ogType: 'website'
      }
    };
  }

  initializeKeywordTargets() {
    return {
      primary: [
        'professional interviews',
        'live interview streaming',
        'career development platform',
        'job interview preparation',
        'industry expert interviews',
        'professional networking'
      ],
      secondary: [
        'interview skills',
        'career advice',
        'professional growth',
        'industry insights',
        'job market trends',
        'career coaching'
      ],
      longtail: [
        'how to prepare for job interviews',
        'professional interview streaming platform',
        'live career development sessions',
        'industry expert career advice',
        'professional networking for career growth',
        'interview skills improvement platform'
      ]
    };
  }

  // Generate meta tags for pages
  generateMetaTags(pageType, data = {}) {
    try {
      const template = this.seoTemplates[pageType];
      if (!template) {
        return this.getDefaultMetaTags();
      }

      // Replace placeholders with actual data
      const title = this.replacePlaceholders(template.title, data);
      const description = this.replacePlaceholders(template.description, data);
      const keywords = this.replacePlaceholders(template.keywords, data);

      const metaTags = {
        // Basic meta tags
        title: title,
        description: description,
        keywords: keywords,
        
        // Open Graph tags
        'og:title': title,
        'og:description': description,
        'og:type': template.ogType,
        'og:url': data.url || this.baseUrl,
        'og:site_name': 'Interviews.tv',
        'og:locale': 'en_US',
        
        // Twitter Card tags
        'twitter:card': 'summary_large_image',
        'twitter:site': '@InterviewsTV',
        'twitter:title': title,
        'twitter:description': description,
        
        // Additional SEO tags
        'robots': 'index, follow',
        'canonical': data.url || this.baseUrl,
        'author': data.author || 'Interviews.tv',
        'viewport': 'width=device-width, initial-scale=1.0'
      };

      // Add image tags if available
      if (data.image) {
        metaTags['og:image'] = data.image;
        metaTags['twitter:image'] = data.image;
        metaTags['og:image:width'] = '1200';
        metaTags['og:image:height'] = '630';
        metaTags['og:image:alt'] = title;
      }

      // Add video tags for interview pages
      if (pageType === 'interview' && data.videoUrl) {
        metaTags['og:video'] = data.videoUrl;
        metaTags['og:video:type'] = 'video/mp4';
        metaTags['og:video:width'] = '1280';
        metaTags['og:video:height'] = '720';
      }

      // Add structured data
      metaTags.structuredData = this.generateStructuredData(pageType, data);

      return metaTags;

    } catch (error) {
      this.logger.error('Error generating meta tags', { error: error.message });
      return this.getDefaultMetaTags();
    }
  }

  // Replace placeholders in templates
  replacePlaceholders(template, data) {
    let result = template;
    
    // Replace common placeholders
    const placeholders = {
      '{title}': data.title || '',
      '{name}': data.name || '',
      '{category}': data.category || '',
      '{participants}': data.participants || '',
      '{company}': data.company || '',
      '{query}': data.query || ''
    };

    for (const [placeholder, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  // Generate structured data (JSON-LD)
  generateStructuredData(pageType, data) {
    const baseStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Interviews.tv',
      'url': this.baseUrl,
      'description': 'Professional interview platform for career development',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${this.baseUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };

    switch (pageType) {
      case 'interview':
        return {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          'name': data.title,
          'description': data.description,
          'thumbnailUrl': data.thumbnail,
          'uploadDate': data.createdAt,
          'duration': data.duration,
          'contentUrl': data.videoUrl,
          'embedUrl': data.embedUrl,
          'interactionStatistic': [
            {
              '@type': 'InteractionCounter',
              'interactionType': 'https://schema.org/WatchAction',
              'userInteractionCount': data.viewCount || 0
            },
            {
              '@type': 'InteractionCounter',
              'interactionType': 'https://schema.org/LikeAction',
              'userInteractionCount': data.likeCount || 0
            }
          ],
          'author': {
            '@type': 'Person',
            'name': data.creatorName,
            'url': `${this.baseUrl}/profile/${data.creatorId}`
          }
        };

      case 'profile':
        return {
          '@context': 'https://schema.org',
          '@type': 'Person',
          'name': data.name,
          'jobTitle': data.title,
          'worksFor': {
            '@type': 'Organization',
            'name': data.company
          },
          'url': `${this.baseUrl}/profile/${data.id}`,
          'image': data.avatar,
          'description': data.bio,
          'sameAs': data.socialLinks || []
        };

      case 'category':
        return {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          'name': `${data.category} Interviews`,
          'description': `Professional interviews and career content in ${data.category}`,
          'url': `${this.baseUrl}/category/${data.categorySlug}`,
          'mainEntity': {
            '@type': 'ItemList',
            'numberOfItems': data.interviewCount || 0
          }
        };

      default:
        return baseStructuredData;
    }
  }

  // Generate XML sitemap
  async generateSitemap() {
    try {
      const links = [];

      // Add static pages
      const staticPages = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/explore', changefreq: 'daily', priority: 0.9 },
        { url: '/business', changefreq: 'weekly', priority: 0.8 },
        { url: '/about', changefreq: 'monthly', priority: 0.6 },
        { url: '/contact', changefreq: 'monthly', priority: 0.5 },
        { url: '/privacy', changefreq: 'yearly', priority: 0.3 },
        { url: '/terms', changefreq: 'yearly', priority: 0.3 }
      ];

      links.push(...staticPages);

      // Add interview pages
      const [interviews] = await this.dbPool.execute(`
        SELECT id, title, created_at, updated_at
        FROM interviews
        WHERE status = 'published' AND is_public = 1
        ORDER BY created_at DESC
        LIMIT 10000
      `);

      for (const interview of interviews) {
        links.push({
          url: `/interview/${interview.id}`,
          lastmod: interview.updated_at,
          changefreq: 'weekly',
          priority: 0.8
        });
      }

      // Add profile pages
      const [profiles] = await this.dbPool.execute(`
        SELECT id, username, updated_at
        FROM users
        WHERE is_public = 1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 5000
      `);

      for (const profile of profiles) {
        links.push({
          url: `/profile/${profile.username}`,
          lastmod: profile.updated_at,
          changefreq: 'weekly',
          priority: 0.7
        });
      }

      // Add category pages
      const [categories] = await this.dbPool.execute(`
        SELECT DISTINCT category, COUNT(*) as interview_count
        FROM interviews
        WHERE status = 'published' AND is_public = 1
        GROUP BY category
        HAVING interview_count > 0
      `);

      for (const category of categories) {
        const categorySlug = category.category.toLowerCase().replace(/\s+/g, '-');
        links.push({
          url: `/category/${categorySlug}`,
          changefreq: 'daily',
          priority: 0.8
        });
      }

      // Generate sitemap
      const stream = new SitemapStream({ hostname: this.baseUrl });
      const data = await streamToPromise(Readable.from(links).pipe(stream));
      
      // Save sitemap to file
      const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
      await fs.writeFile(sitemapPath, data.toString());

      // Cache sitemap in Redis
      await this.redisClient.setex('sitemap_xml', 86400, data.toString());

      this.logger.info('Sitemap generated successfully', { 
        totalUrls: links.length,
        interviews: interviews.length,
        profiles: profiles.length,
        categories: categories.length
      });

      return { success: true, totalUrls: links.length };

    } catch (error) {
      this.logger.error('Error generating sitemap', { error: error.message });
      throw error;
    }
  }

  // Generate robots.txt
  async generateRobotsTxt() {
    try {
      const robotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /user/settings
Disallow: /search?*
Disallow: /*?utm_*
Disallow: /*?ref=*

# Sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for specific bots
User-agent: Bingbot
Crawl-delay: 1

User-agent: Slurp
Crawl-delay: 1

# Block problematic bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /
      `.trim();

      // Save robots.txt to file
      const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
      await fs.writeFile(robotsPath, robotsTxt);

      // Cache in Redis
      await this.redisClient.setex('robots_txt', 86400, robotsTxt);

      this.logger.info('Robots.txt generated successfully');

      return { success: true, content: robotsTxt };

    } catch (error) {
      this.logger.error('Error generating robots.txt', { error: error.message });
      throw error;
    }
  }

  // Analyze page SEO score
  async analyzeSEOScore(pageData) {
    try {
      const score = {
        total: 0,
        maxScore: 100,
        factors: {}
      };

      // Title optimization (20 points)
      if (pageData.title) {
        if (pageData.title.length >= 30 && pageData.title.length <= 60) {
          score.factors.title = { score: 20, message: 'Title length is optimal' };
        } else if (pageData.title.length > 0) {
          score.factors.title = { score: 10, message: 'Title length could be improved' };
        } else {
          score.factors.title = { score: 0, message: 'Missing title' };
        }
      }

      // Description optimization (15 points)
      if (pageData.description) {
        if (pageData.description.length >= 120 && pageData.description.length <= 160) {
          score.factors.description = { score: 15, message: 'Description length is optimal' };
        } else if (pageData.description.length > 0) {
          score.factors.description = { score: 8, message: 'Description length could be improved' };
        } else {
          score.factors.description = { score: 0, message: 'Missing description' };
        }
      }

      // Keyword optimization (15 points)
      const keywordScore = this.analyzeKeywordOptimization(pageData);
      score.factors.keywords = keywordScore;

      // Content quality (20 points)
      const contentScore = this.analyzeContentQuality(pageData);
      score.factors.content = contentScore;

      // Technical SEO (15 points)
      const technicalScore = this.analyzeTechnicalSEO(pageData);
      score.factors.technical = technicalScore;

      // Performance (15 points)
      const performanceScore = this.analyzePerformance(pageData);
      score.factors.performance = performanceScore;

      // Calculate total score
      score.total = Object.values(score.factors).reduce((sum, factor) => sum + factor.score, 0);
      score.grade = this.getGrade(score.total);

      return score;

    } catch (error) {
      this.logger.error('Error analyzing SEO score', { error: error.message });
      throw error;
    }
  }

  // Analyze keyword optimization
  analyzeKeywordOptimization(pageData) {
    const content = (pageData.title + ' ' + pageData.description + ' ' + pageData.content).toLowerCase();
    let score = 0;
    const messages = [];

    // Check for primary keywords
    const primaryKeywords = this.keywordTargets.primary;
    const foundPrimary = primaryKeywords.filter(keyword => content.includes(keyword.toLowerCase()));
    
    if (foundPrimary.length > 0) {
      score += 10;
      messages.push(`Found ${foundPrimary.length} primary keywords`);
    }

    // Check for secondary keywords
    const secondaryKeywords = this.keywordTargets.secondary;
    const foundSecondary = secondaryKeywords.filter(keyword => content.includes(keyword.toLowerCase()));
    
    if (foundSecondary.length > 0) {
      score += 5;
      messages.push(`Found ${foundSecondary.length} secondary keywords`);
    }

    return {
      score: Math.min(score, 15),
      message: messages.join(', ') || 'No target keywords found'
    };
  }

  // Analyze content quality
  analyzeContentQuality(pageData) {
    let score = 0;
    const messages = [];

    // Content length
    const contentLength = pageData.content ? pageData.content.length : 0;
    if (contentLength > 1000) {
      score += 10;
      messages.push('Good content length');
    } else if (contentLength > 300) {
      score += 5;
      messages.push('Adequate content length');
    } else {
      messages.push('Content too short');
    }

    // Heading structure
    if (pageData.hasH1) {
      score += 5;
      messages.push('Has H1 heading');
    }

    if (pageData.hasSubheadings) {
      score += 5;
      messages.push('Has proper heading structure');
    }

    return {
      score: Math.min(score, 20),
      message: messages.join(', ') || 'Content needs improvement'
    };
  }

  // Analyze technical SEO
  analyzeTechnicalSEO(pageData) {
    let score = 0;
    const messages = [];

    // URL structure
    if (pageData.url && pageData.url.length < 100 && !pageData.url.includes('?')) {
      score += 5;
      messages.push('Clean URL structure');
    }

    // Meta tags
    if (pageData.hasCanonical) {
      score += 3;
      messages.push('Has canonical tag');
    }

    if (pageData.hasOpenGraph) {
      score += 4;
      messages.push('Has Open Graph tags');
    }

    if (pageData.hasStructuredData) {
      score += 3;
      messages.push('Has structured data');
    }

    return {
      score: Math.min(score, 15),
      message: messages.join(', ') || 'Technical SEO needs improvement'
    };
  }

  // Analyze performance
  analyzePerformance(pageData) {
    let score = 0;
    const messages = [];

    // Page load speed
    if (pageData.loadTime && pageData.loadTime < 3) {
      score += 8;
      messages.push('Fast loading speed');
    } else if (pageData.loadTime && pageData.loadTime < 5) {
      score += 4;
      messages.push('Acceptable loading speed');
    }

    // Mobile optimization
    if (pageData.isMobileOptimized) {
      score += 7;
      messages.push('Mobile optimized');
    }

    return {
      score: Math.min(score, 15),
      message: messages.join(', ') || 'Performance needs improvement'
    };
  }

  // Get grade based on score
  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  // Get default meta tags
  getDefaultMetaTags() {
    return {
      title: 'Interviews.tv - Professional Interview Platform',
      description: 'Join the leading platform for professional interviews and career development.',
      keywords: 'interviews, career development, professional networking',
      'og:title': 'Interviews.tv',
      'og:description': 'Professional interview platform for career development',
      'og:type': 'website',
      'og:url': this.baseUrl,
      'twitter:card': 'summary',
      'robots': 'index, follow'
    };
  }

  // Track SEO performance
  async trackSEOPerformance(pageUrl, metrics) {
    try {
      await this.dbPool.execute(`
        INSERT INTO seo_performance (
          page_url, organic_traffic, search_impressions, 
          average_position, click_through_rate, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          organic_traffic = VALUES(organic_traffic),
          search_impressions = VALUES(search_impressions),
          average_position = VALUES(average_position),
          click_through_rate = VALUES(click_through_rate),
          updated_at = NOW()
      `, [
        pageUrl,
        metrics.organicTraffic || 0,
        metrics.searchImpressions || 0,
        metrics.averagePosition || 0,
        metrics.clickThroughRate || 0
      ]);

      this.logger.info('SEO performance tracked', { pageUrl, metrics });

    } catch (error) {
      this.logger.error('Error tracking SEO performance', { error: error.message });
    }
  }
}

module.exports = SEOOptimizationSystem;
