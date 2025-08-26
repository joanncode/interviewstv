class UrlManagerService {
    constructor() {
        this.redirectRules = new Map();
        this.seoPatterns = new Map();
        this.canonicalRules = new Map();
        this.setupDefaultRules();
    }

    /**
     * Setup default URL rules
     */
    setupDefaultRules() {
        // Redirect rules for backward compatibility
        this.addRedirectRule('/user/{username}', '/profile/{username}');
        this.addRedirectRule('/interview/{slug}', '/interviews/{slug}');
        this.addRedirectRule('/business/{slug}', '/businesses/{slug}');
        this.addRedirectRule('/admin/dashboard', '/admin');
        this.addRedirectRule('/admin/content-management', '/admin/content');
        this.addRedirectRule('/admin/security-dashboard', '/admin/security');

        // SEO patterns
        this.addSeoPattern('/interviews/{slug}', {
            title: '{title} - Interview on Interviews.tv',
            description: 'Watch {title} interview on Interviews.tv. {description}',
            keywords: 'interview, {category}, {tags}',
            ogType: 'video.other',
            structuredData: 'VideoObject'
        });

        this.addSeoPattern('/profile/{username}', {
            title: '{name} (@{username}) - Interviews.tv Profile',
            description: 'Follow {name} on Interviews.tv. {bio}',
            keywords: 'profile, user, {username}, interviews',
            ogType: 'profile',
            structuredData: 'Person'
        });

        this.addSeoPattern('/businesses/{slug}', {
            title: '{name} - Business Profile on Interviews.tv',
            description: '{description} - Connect with {name} on Interviews.tv',
            keywords: 'business, {category}, {location}',
            ogType: 'business.business',
            structuredData: 'Organization'
        });

        // Canonical rules
        this.addCanonicalRule('remove_trailing_slash', true);
        this.addCanonicalRule('force_lowercase', true);
        this.addCanonicalRule('remove_www', true);
        this.addCanonicalRule('force_https', true);
    }

    /**
     * Add redirect rule
     */
    addRedirectRule(fromPattern, toPattern, statusCode = 301) {
        this.redirectRules.set(fromPattern, {
            to: toPattern,
            statusCode,
            permanent: statusCode === 301
        });
    }

    /**
     * Add SEO pattern
     */
    addSeoPattern(pattern, seoData) {
        this.seoPatterns.set(pattern, seoData);
    }

    /**
     * Add canonical rule
     */
    addCanonicalRule(rule, value) {
        this.canonicalRules.set(rule, value);
    }

    /**
     * Check if URL needs redirect
     */
    checkRedirect(url) {
        for (const [pattern, rule] of this.redirectRules) {
            if (this.matchesPattern(url, pattern)) {
                const redirectUrl = this.applyPattern(url, pattern, rule.to);
                return {
                    url: redirectUrl,
                    statusCode: rule.statusCode,
                    permanent: rule.permanent
                };
            }
        }
        return null;
    }

    /**
     * Get canonical URL
     */
    getCanonicalUrl(url) {
        let canonical = url;

        // Apply canonical rules
        if (this.canonicalRules.get('remove_trailing_slash') && canonical !== '/' && canonical.endsWith('/')) {
            canonical = canonical.slice(0, -1);
        }

        if (this.canonicalRules.get('force_lowercase')) {
            canonical = canonical.toLowerCase();
        }

        // Add domain and protocol
        const protocol = this.canonicalRules.get('force_https') ? 'https:' : window.location.protocol;
        let hostname = window.location.hostname;

        if (this.canonicalRules.get('remove_www') && hostname.startsWith('www.')) {
            hostname = hostname.substring(4);
        }

        return `${protocol}//${hostname}${canonical}`;
    }

    /**
     * Generate SEO metadata for URL
     */
    generateSeoMetadata(url, data = {}) {
        for (const [pattern, seoTemplate] of this.seoPatterns) {
            if (this.matchesPattern(url, pattern)) {
                const metadata = {};
                
                // Extract parameters from URL
                const params = this.extractParameters(url, pattern);
                const allData = { ...params, ...data };

                // Generate metadata from template
                for (const [key, template] of Object.entries(seoTemplate)) {
                    metadata[key] = this.interpolateTemplate(template, allData);
                }

                return metadata;
            }
        }

        // Default metadata
        return {
            title: 'Interviews.tv - Join the Ultimate Interview Network',
            description: 'Create, share, discover, and engage with interviews from diverse voices and perspectives.',
            keywords: 'interviews, social network, video, audio, conversations',
            ogType: 'website'
        };
    }

    /**
     * Generate structured data
     */
    generateStructuredData(url, data = {}) {
        const seoMetadata = this.generateSeoMetadata(url, data);
        
        if (!seoMetadata.structuredData) {
            return null;
        }

        const structuredData = {
            '@context': 'https://schema.org',
            '@type': seoMetadata.structuredData
        };

        switch (seoMetadata.structuredData) {
            case 'VideoObject':
                return {
                    ...structuredData,
                    name: data.title,
                    description: data.description,
                    thumbnailUrl: data.thumbnail_url,
                    uploadDate: data.published_at,
                    duration: data.duration ? `PT${data.duration}S` : undefined,
                    contentUrl: window.location.origin + url,
                    embedUrl: window.location.origin + `/embed${url.replace('/interviews', '')}`,
                    author: {
                        '@type': 'Person',
                        name: data.interviewer_name
                    }
                };

            case 'Person':
                return {
                    ...structuredData,
                    name: data.name,
                    alternateName: data.username,
                    description: data.bio,
                    image: data.avatar_url,
                    url: window.location.origin + url,
                    sameAs: data.social_links || []
                };

            case 'Organization':
                return {
                    ...structuredData,
                    name: data.name,
                    description: data.description,
                    logo: data.logo_url,
                    url: data.website_url,
                    address: data.address ? {
                        '@type': 'PostalAddress',
                        addressLocality: data.address.city,
                        addressRegion: data.address.state,
                        addressCountry: data.address.country
                    } : undefined
                };

            default:
                return structuredData;
        }
    }

    /**
     * Generate sitemap URLs
     */
    generateSitemapUrls(routes = []) {
        const urls = [];
        const baseUrl = window.location.origin;

        // Static routes
        const staticRoutes = [
            { path: '/', priority: 1.0, changefreq: 'daily' },
            { path: '/explore', priority: 0.8, changefreq: 'daily' },
            { path: '/interviews', priority: 0.9, changefreq: 'daily' },
            { path: '/businesses', priority: 0.7, changefreq: 'weekly' },
            { path: '/events', priority: 0.6, changefreq: 'weekly' },
            { path: '/about', priority: 0.5, changefreq: 'monthly' },
            { path: '/contact', priority: 0.4, changefreq: 'monthly' }
        ];

        staticRoutes.forEach(route => {
            urls.push({
                loc: baseUrl + route.path,
                lastmod: new Date().toISOString(),
                changefreq: route.changefreq,
                priority: route.priority
            });
        });

        // Dynamic routes from data
        routes.forEach(route => {
            urls.push({
                loc: baseUrl + route.path,
                lastmod: route.updated_at || route.created_at,
                changefreq: route.changefreq || 'weekly',
                priority: route.priority || 0.6
            });
        });

        return urls;
    }

    /**
     * Generate robots.txt content
     */
    generateRobotsTxt() {
        const baseUrl = window.location.origin;
        
        return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /settings/
Disallow: /messages/
Disallow: /notifications/
Disallow: /404
Disallow: /403
Disallow: /500

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1`;
    }

    /**
     * Check if URL matches pattern
     */
    matchesPattern(url, pattern) {
        const regex = pattern.replace(/\{[^}]+\}/g, '([^/]+)');
        const regexPattern = new RegExp(`^${regex.replace(/\//g, '\\/')}$`);
        return regexPattern.test(url);
    }

    /**
     * Extract parameters from URL using pattern
     */
    extractParameters(url, pattern) {
        const params = {};
        const patternParts = pattern.split('/');
        const urlParts = url.split('/');

        patternParts.forEach((part, index) => {
            if (part.startsWith('{') && part.endsWith('}')) {
                const paramName = part.slice(1, -1);
                params[paramName] = urlParts[index];
            }
        });

        return params;
    }

    /**
     * Apply pattern transformation
     */
    applyPattern(url, fromPattern, toPattern) {
        const params = this.extractParameters(url, fromPattern);
        let result = toPattern;

        for (const [key, value] of Object.entries(params)) {
            result = result.replace(`{${key}}`, value);
        }

        return result;
    }

    /**
     * Interpolate template with data
     */
    interpolateTemplate(template, data) {
        let result = template;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
        }

        // Remove unreplaced placeholders
        result = result.replace(/\{[^}]+\}/g, '');
        
        // Clean up extra spaces
        result = result.replace(/\s+/g, ' ').trim();

        return result;
    }

    /**
     * Validate URL structure
     */
    validateUrl(url) {
        const issues = [];

        // Check length
        if (url.length > 2048) {
            issues.push('URL too long (max 2048 characters)');
        }

        // Check for special characters
        if (/[<>"{}|\\^`\[\]]/.test(url)) {
            issues.push('URL contains invalid characters');
        }

        // Check for double slashes
        if (url.includes('//') && !url.startsWith('http')) {
            issues.push('URL contains double slashes');
        }

        // Check for trailing slash consistency
        if (url !== '/' && url.endsWith('/')) {
            issues.push('URL has trailing slash');
        }

        // Check for uppercase characters
        if (url !== url.toLowerCase()) {
            issues.push('URL contains uppercase characters');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Get URL suggestions for 404 errors
     */
    getUrlSuggestions(invalidUrl, availableUrls = []) {
        const suggestions = [];
        
        // Simple string similarity
        availableUrls.forEach(url => {
            const similarity = this.calculateSimilarity(invalidUrl, url);
            if (similarity > 0.6) {
                suggestions.push({ url, similarity });
            }
        });

        // Sort by similarity
        suggestions.sort((a, b) => b.similarity - a.similarity);
        
        return suggestions.slice(0, 5);
    }

    /**
     * Calculate string similarity
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

export default new UrlManagerService();
