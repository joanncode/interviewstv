<?php

namespace App\Config;

/**
 * Comprehensive URL Configuration for Interviews.tv
 * Defines SEO-friendly URL patterns, routing rules, and URL generation
 */
class UrlConfig
{
    /**
     * SEO-friendly URL patterns for all routes
     */
    public const URL_PATTERNS = [
        // Homepage and main sections
        'home' => '/',
        'about' => '/about',
        'contact' => '/contact',
        'privacy' => '/privacy',
        'terms' => '/terms',
        'help' => '/help',
        
        // Authentication routes
        'login' => '/login',
        'register' => '/register',
        'forgot-password' => '/forgot-password',
        'reset-password' => '/reset-password/{token}',
        'verify-email' => '/verify-email/{token}',
        'logout' => '/logout',
        
        // User routes
        'dashboard' => '/dashboard',
        'profile' => '/profile',
        'profile-edit' => '/profile/edit',
        'settings' => '/settings',
        'notifications' => '/notifications',
        'watchlist' => '/watchlist',
        'history' => '/history',
        
        // Interview routes
        'interviews' => '/interviews',
        'interview-detail' => '/interviews/{slug}',
        'interview-watch' => '/watch/{slug}',
        'interview-create' => '/create-interview',
        'interview-edit' => '/interviews/{slug}/edit',
        'interview-upload' => '/interviews/{slug}/upload',
        'interview-analysis' => '/interviews/{slug}/analysis',
        'interview-share' => '/interviews/{slug}/share',
        
        // Category and topic routes
        'categories' => '/categories',
        'category-detail' => '/categories/{slug}',
        'topics' => '/topics',
        'topic-detail' => '/topics/{slug}',
        'skills' => '/skills',
        'skill-detail' => '/skills/{slug}',
        
        // Search and discovery
        'search' => '/search',
        'search-results' => '/search/{query}',
        'advanced-search' => '/search/advanced',
        'recommendations' => '/recommendations',
        'trending' => '/trending',
        'featured' => '/featured',
        
        // User profiles and community
        'users' => '/users',
        'user-profile' => '/users/{username}',
        'user-interviews' => '/users/{username}/interviews',
        'user-reviews' => '/users/{username}/reviews',
        'user-activity' => '/users/{username}/activity',
        'leaderboard' => '/leaderboard',
        'community' => '/community',
        
        // Learning paths and courses
        'learning-paths' => '/learning-paths',
        'learning-path-detail' => '/learning-paths/{slug}',
        'courses' => '/courses',
        'course-detail' => '/courses/{slug}',
        'practice' => '/practice',
        'practice-session' => '/practice/{type}',
        
        // Analytics and insights
        'analytics' => '/analytics',
        'insights' => '/insights',
        'reports' => '/reports',
        'statistics' => '/statistics',
        
        // Integration routes
        'integrations' => '/integrations',
        'integration-connect' => '/integrations/{provider}/connect',
        'integration-callback' => '/integrations/{provider}/callback',
        'integration-disconnect' => '/integrations/{provider}/disconnect',
        
        // API routes
        'api-docs' => '/api/docs',
        'api-health' => '/api/health',
        'api-status' => '/api/status',
        
        // Admin routes
        'admin' => '/admin',
        'admin-dashboard' => '/admin/dashboard',
        'admin-users' => '/admin/users',
        'admin-interviews' => '/admin/interviews',
        'admin-analytics' => '/admin/analytics',
        'admin-settings' => '/admin/settings',
        
        // Blog and content
        'blog' => '/blog',
        'blog-post' => '/blog/{slug}',
        'blog-category' => '/blog/category/{slug}',
        'blog-tag' => '/blog/tag/{slug}',
        'news' => '/news',
        'resources' => '/resources',
        
        // Special pages
        'sitemap' => '/sitemap.xml',
        'robots' => '/robots.txt',
        'manifest' => '/manifest.json',
        'opensearch' => '/opensearch.xml',
    ];

    /**
     * URL parameter patterns and validation rules
     */
    public const PARAMETER_PATTERNS = [
        'id' => '[0-9]+',
        'slug' => '[a-z0-9\-]+',
        'username' => '[a-zA-Z0-9_\-\.]+',
        'token' => '[a-zA-Z0-9]+',
        'query' => '[^/]+',
        'provider' => '[a-z]+',
        'type' => '[a-z\-]+',
        'category' => '[a-z0-9\-]+',
        'tag' => '[a-z0-9\-]+',
        'page' => '[0-9]+',
        'year' => '[0-9]{4}',
        'month' => '[0-9]{1,2}',
        'day' => '[0-9]{1,2}',
    ];

    /**
     * SEO configuration for different route types
     */
    public const SEO_CONFIG = [
        'interviews' => [
            'title_pattern' => '{title} - Interview | Interviews.tv',
            'description_pattern' => 'Watch {title} interview. {description}',
            'canonical_pattern' => '/interviews/{slug}',
            'breadcrumb_pattern' => 'Home > Interviews > {category} > {title}',
            'schema_type' => 'VideoObject',
        ],
        'categories' => [
            'title_pattern' => '{name} Interviews | Interviews.tv',
            'description_pattern' => 'Browse {name} interviews and improve your skills.',
            'canonical_pattern' => '/categories/{slug}',
            'breadcrumb_pattern' => 'Home > Categories > {name}',
            'schema_type' => 'CollectionPage',
        ],
        'users' => [
            'title_pattern' => '{name} - Profile | Interviews.tv',
            'description_pattern' => 'View {name}\'s profile, interviews, and activity.',
            'canonical_pattern' => '/users/{username}',
            'breadcrumb_pattern' => 'Home > Users > {name}',
            'schema_type' => 'ProfilePage',
        ],
        'search' => [
            'title_pattern' => 'Search Results for "{query}" | Interviews.tv',
            'description_pattern' => 'Find interviews, users, and content related to "{query}".',
            'canonical_pattern' => '/search/{query}',
            'breadcrumb_pattern' => 'Home > Search > {query}',
            'schema_type' => 'SearchResultsPage',
        ],
    ];

    /**
     * URL aliases and redirects
     */
    public const URL_ALIASES = [
        // Legacy URL support
        '/interview.php' => '/interviews',
        '/user.php' => '/users',
        '/search.php' => '/search',
        '/category.php' => '/categories',
        
        // Short URLs
        '/i/{id}' => '/interviews/{slug}',
        '/u/{username}' => '/users/{username}',
        '/c/{slug}' => '/categories/{slug}',
        '/s/{query}' => '/search/{query}',
        
        // Common misspellings and variations
        '/interview' => '/interviews',
        '/user' => '/users',
        '/category' => '/categories',
        '/skill' => '/skills',
        '/topic' => '/topics',
        
        // Social media friendly URLs
        '/watch' => '/interviews',
        '/learn' => '/learning-paths',
        '/practice-interview' => '/practice',
        '/job-interview' => '/interviews',
    ];

    /**
     * Localization URL patterns
     */
    public const LOCALIZED_PATTERNS = [
        'en' => [
            'interviews' => '/interviews',
            'categories' => '/categories',
            'users' => '/users',
            'search' => '/search',
        ],
        'es' => [
            'interviews' => '/entrevistas',
            'categories' => '/categorias',
            'users' => '/usuarios',
            'search' => '/buscar',
        ],
        'fr' => [
            'interviews' => '/entretiens',
            'categories' => '/categories',
            'users' => '/utilisateurs',
            'search' => '/recherche',
        ],
        'de' => [
            'interviews' => '/interviews',
            'categories' => '/kategorien',
            'users' => '/benutzer',
            'search' => '/suche',
        ],
    ];

    /**
     * URL generation rules
     */
    public const GENERATION_RULES = [
        'slug_max_length' => 100,
        'slug_separator' => '-',
        'slug_lowercase' => true,
        'slug_remove_words' => ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
        'preserve_numbers' => true,
        'preserve_special_chars' => false,
        'fallback_pattern' => '{type}-{id}',
    ];

    /**
     * Canonical URL rules
     */
    public const CANONICAL_RULES = [
        'force_https' => true,
        'force_www' => false,
        'remove_trailing_slash' => true,
        'lowercase_path' => true,
        'remove_default_params' => ['page=1', 'limit=20', 'sort=default'],
        'preserve_query_params' => ['utm_source', 'utm_medium', 'utm_campaign', 'ref'],
    ];

    /**
     * Sitemap configuration
     */
    public const SITEMAP_CONFIG = [
        'interviews' => [
            'priority' => 0.8,
            'changefreq' => 'weekly',
            'include_images' => true,
            'include_videos' => true,
        ],
        'categories' => [
            'priority' => 0.7,
            'changefreq' => 'monthly',
            'include_images' => false,
            'include_videos' => false,
        ],
        'users' => [
            'priority' => 0.6,
            'changefreq' => 'monthly',
            'include_images' => true,
            'include_videos' => false,
        ],
        'static_pages' => [
            'priority' => 0.5,
            'changefreq' => 'yearly',
            'include_images' => false,
            'include_videos' => false,
        ],
    ];

    /**
     * Route middleware configuration
     */
    public const MIDDLEWARE_CONFIG = [
        'auth_required' => [
            '/dashboard',
            '/profile',
            '/settings',
            '/create-interview',
            '/interviews/{slug}/edit',
            '/admin/*',
        ],
        'guest_only' => [
            '/login',
            '/register',
            '/forgot-password',
            '/reset-password/{token}',
        ],
        'admin_required' => [
            '/admin/*',
        ],
        'verified_email' => [
            '/create-interview',
            '/interviews/{slug}/edit',
        ],
        'rate_limited' => [
            '/api/*',
            '/search',
            '/contact',
        ],
        'cache_enabled' => [
            '/interviews',
            '/categories',
            '/users',
            '/blog',
            '/resources',
        ],
    ];

    /**
     * Get URL pattern by route name
     */
    public static function getPattern(string $routeName): ?string
    {
        return self::URL_PATTERNS[$routeName] ?? null;
    }

    /**
     * Get parameter pattern by parameter name
     */
    public static function getParameterPattern(string $paramName): string
    {
        return self::PARAMETER_PATTERNS[$paramName] ?? '[^/]+';
    }

    /**
     * Get SEO configuration for route type
     */
    public static function getSeoConfig(string $routeType): array
    {
        return self::SEO_CONFIG[$routeType] ?? [];
    }

    /**
     * Get localized pattern
     */
    public static function getLocalizedPattern(string $locale, string $routeName): ?string
    {
        return self::LOCALIZED_PATTERNS[$locale][$routeName] ?? self::URL_PATTERNS[$routeName] ?? null;
    }

    /**
     * Check if route requires authentication
     */
    public static function requiresAuth(string $path): bool
    {
        foreach (self::MIDDLEWARE_CONFIG['auth_required'] as $pattern) {
            if (self::matchesPattern($path, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if route is guest only
     */
    public static function isGuestOnly(string $path): bool
    {
        foreach (self::MIDDLEWARE_CONFIG['guest_only'] as $pattern) {
            if (self::matchesPattern($path, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if route requires admin access
     */
    public static function requiresAdmin(string $path): bool
    {
        foreach (self::MIDDLEWARE_CONFIG['admin_required'] as $pattern) {
            if (self::matchesPattern($path, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if route has caching enabled
     */
    public static function hasCaching(string $path): bool
    {
        foreach (self::MIDDLEWARE_CONFIG['cache_enabled'] as $pattern) {
            if (self::matchesPattern($path, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Match path against pattern (supports wildcards)
     */
    private static function matchesPattern(string $path, string $pattern): bool
    {
        // Convert pattern to regex
        $regex = str_replace(['*', '{', '}'], ['.*', '(?P<', '>[^/]+)'], $pattern);
        $regex = '#^' . $regex . '$#';
        
        return preg_match($regex, $path) === 1;
    }

    /**
     * Get all route patterns
     */
    public static function getAllPatterns(): array
    {
        return self::URL_PATTERNS;
    }

    /**
     * Get all URL aliases
     */
    public static function getAllAliases(): array
    {
        return self::URL_ALIASES;
    }

    /**
     * Get sitemap configuration
     */
    public static function getSitemapConfig(): array
    {
        return self::SITEMAP_CONFIG;
    }

    /**
     * Get canonical rules
     */
    public static function getCanonicalRules(): array
    {
        return self::CANONICAL_RULES;
    }

    /**
     * Get URL generation rules
     */
    public static function getGenerationRules(): array
    {
        return self::GENERATION_RULES;
    }
}
