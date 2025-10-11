<?php

namespace App\Services;

use App\Config\UrlConfig;

/**
 * URL Generator Service for creating SEO-friendly URLs
 * Handles slug generation, URL building, and canonical URL creation
 */
class UrlGeneratorService
{
    private string $baseUrl;
    private string $defaultLocale;
    private array $config;

    public function __construct(string $baseUrl = '', string $defaultLocale = 'en')
    {
        $this->baseUrl = rtrim($baseUrl ?: ($_ENV['APP_URL'] ?? 'https://interviews.tv'), '/');
        $this->defaultLocale = $defaultLocale;
        $this->config = UrlConfig::getGenerationRules();
    }

    /**
     * Generate a SEO-friendly slug from text
     */
    public function generateSlug(string $text, array $options = []): string
    {
        $options = array_merge($this->config, $options);
        
        // Convert to lowercase if required
        if ($options['slug_lowercase']) {
            $text = strtolower($text);
        }
        
        // Remove HTML tags
        $text = strip_tags($text);
        
        // Replace special characters and spaces
        $text = preg_replace('/[^\w\s\-_]/', '', $text);
        
        // Remove common words if specified
        if (!empty($options['slug_remove_words'])) {
            $words = explode(' ', $text);
            $words = array_filter($words, function($word) use ($options) {
                return !in_array(strtolower($word), $options['slug_remove_words']);
            });
            $text = implode(' ', $words);
        }
        
        // Replace spaces and underscores with separator
        $separator = $options['slug_separator'];
        $text = preg_replace('/[\s_]+/', $separator, $text);
        
        // Remove multiple separators
        $text = preg_replace('/[' . preg_quote($separator) . ']+/', $separator, $text);
        
        // Trim separators from ends
        $text = trim($text, $separator);
        
        // Limit length
        if ($options['slug_max_length'] > 0) {
            $text = substr($text, 0, $options['slug_max_length']);
            $text = rtrim($text, $separator);
        }
        
        // Ensure slug is not empty
        if (empty($text)) {
            $text = 'item-' . uniqid();
        }
        
        return $text;
    }

    /**
     * Generate URL for a route with parameters
     */
    public function generateUrl(string $routeName, array $parameters = [], array $queryParams = [], string $locale = null): string
    {
        $locale = $locale ?: $this->defaultLocale;
        
        // Get URL pattern
        $pattern = UrlConfig::getLocalizedPattern($locale, $routeName);
        if (!$pattern) {
            throw new \InvalidArgumentException("Route '{$routeName}' not found");
        }
        
        // Replace parameters in pattern
        $url = $this->replaceParameters($pattern, $parameters);
        
        // Add query parameters
        if (!empty($queryParams)) {
            $url .= '?' . http_build_query($queryParams);
        }
        
        return $this->baseUrl . $url;
    }

    /**
     * Generate canonical URL
     */
    public function generateCanonicalUrl(string $path, array $queryParams = []): string
    {
        $rules = UrlConfig::getCanonicalRules();
        
        // Clean the path
        $path = $this->cleanPath($path, $rules);
        
        // Filter query parameters
        $queryParams = $this->filterQueryParams($queryParams, $rules);
        
        // Build URL
        $url = $this->baseUrl . $path;
        
        if (!empty($queryParams)) {
            $url .= '?' . http_build_query($queryParams);
        }
        
        return $url;
    }

    /**
     * Generate interview URL with SEO-friendly slug
     */
    public function generateInterviewUrl(array $interview, string $locale = null): string
    {
        $slug = $this->generateInterviewSlug($interview);
        
        return $this->generateUrl('interview-detail', ['slug' => $slug], [], $locale);
    }

    /**
     * Generate user profile URL
     */
    public function generateUserUrl(array $user, string $locale = null): string
    {
        $username = $this->sanitizeUsername($user['username'] ?? $user['name'] ?? '');
        
        return $this->generateUrl('user-profile', ['username' => $username], [], $locale);
    }

    /**
     * Generate category URL
     */
    public function generateCategoryUrl(array $category, string $locale = null): string
    {
        $slug = $this->generateSlug($category['name']);
        
        return $this->generateUrl('category-detail', ['slug' => $slug], [], $locale);
    }

    /**
     * Generate search URL
     */
    public function generateSearchUrl(string $query, array $filters = [], string $locale = null): string
    {
        $queryParams = [];
        
        if (!empty($filters)) {
            $queryParams = array_merge($queryParams, $filters);
        }
        
        return $this->generateUrl('search-results', ['query' => urlencode($query)], $queryParams, $locale);
    }

    /**
     * Generate breadcrumb URLs
     */
    public function generateBreadcrumbs(string $routeType, array $data): array
    {
        $breadcrumbs = [
            [
                'title' => 'Home',
                'url' => $this->generateUrl('home')
            ]
        ];
        
        switch ($routeType) {
            case 'interview':
                $breadcrumbs[] = [
                    'title' => 'Interviews',
                    'url' => $this->generateUrl('interviews')
                ];
                
                if (!empty($data['category'])) {
                    $breadcrumbs[] = [
                        'title' => $data['category']['name'],
                        'url' => $this->generateCategoryUrl($data['category'])
                    ];
                }
                
                $breadcrumbs[] = [
                    'title' => $data['title'],
                    'url' => $this->generateInterviewUrl($data)
                ];
                break;
                
            case 'user':
                $breadcrumbs[] = [
                    'title' => 'Users',
                    'url' => $this->generateUrl('users')
                ];
                
                $breadcrumbs[] = [
                    'title' => $data['name'],
                    'url' => $this->generateUserUrl($data)
                ];
                break;
                
            case 'category':
                $breadcrumbs[] = [
                    'title' => 'Categories',
                    'url' => $this->generateUrl('categories')
                ];
                
                $breadcrumbs[] = [
                    'title' => $data['name'],
                    'url' => $this->generateCategoryUrl($data)
                ];
                break;
                
            case 'search':
                $breadcrumbs[] = [
                    'title' => 'Search',
                    'url' => $this->generateUrl('search')
                ];
                
                $breadcrumbs[] = [
                    'title' => "Results for \"{$data['query']}\"",
                    'url' => $this->generateSearchUrl($data['query'])
                ];
                break;
        }
        
        return $breadcrumbs;
    }

    /**
     * Generate sitemap URLs
     */
    public function generateSitemapUrls(string $type, array $items): array
    {
        $urls = [];
        $config = UrlConfig::getSitemapConfig()[$type] ?? [];
        
        foreach ($items as $item) {
            $url = [
                'loc' => $this->generateItemUrl($type, $item),
                'lastmod' => $item['updated_at'] ?? $item['created_at'] ?? date('Y-m-d'),
                'changefreq' => $config['changefreq'] ?? 'monthly',
                'priority' => $config['priority'] ?? 0.5,
            ];
            
            // Add images if configured
            if ($config['include_images'] ?? false) {
                $url['images'] = $this->extractImages($item);
            }
            
            // Add videos if configured
            if ($config['include_videos'] ?? false) {
                $url['videos'] = $this->extractVideos($item);
            }
            
            $urls[] = $url;
        }
        
        return $urls;
    }

    /**
     * Generate pagination URLs
     */
    public function generatePaginationUrls(string $baseUrl, int $currentPage, int $totalPages, array $queryParams = []): array
    {
        $urls = [
            'first' => null,
            'prev' => null,
            'next' => null,
            'last' => null,
            'pages' => []
        ];
        
        if ($totalPages > 1) {
            // First page
            $urls['first'] = $this->addPageParam($baseUrl, 1, $queryParams);
            
            // Previous page
            if ($currentPage > 1) {
                $urls['prev'] = $this->addPageParam($baseUrl, $currentPage - 1, $queryParams);
            }
            
            // Next page
            if ($currentPage < $totalPages) {
                $urls['next'] = $this->addPageParam($baseUrl, $currentPage + 1, $queryParams);
            }
            
            // Last page
            $urls['last'] = $this->addPageParam($baseUrl, $totalPages, $queryParams);
            
            // Page range
            $start = max(1, $currentPage - 2);
            $end = min($totalPages, $currentPage + 2);
            
            for ($i = $start; $i <= $end; $i++) {
                $urls['pages'][] = [
                    'number' => $i,
                    'url' => $this->addPageParam($baseUrl, $i, $queryParams),
                    'current' => $i === $currentPage
                ];
            }
        }
        
        return $urls;
    }

    /**
     * Generate interview slug from interview data
     */
    private function generateInterviewSlug(array $interview): string
    {
        $title = $interview['title'] ?? '';
        $category = $interview['category'] ?? '';
        $id = $interview['id'] ?? '';
        
        // Create descriptive slug
        $parts = array_filter([$title, $category]);
        $slug = $this->generateSlug(implode(' ', $parts));
        
        // Ensure uniqueness by appending ID if needed
        if (!empty($id)) {
            $slug .= '-' . $id;
        }
        
        return $slug;
    }

    /**
     * Sanitize username for URL
     */
    private function sanitizeUsername(string $username): string
    {
        // Remove special characters except allowed ones
        $username = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $username);
        
        // Limit length
        $username = substr($username, 0, 50);
        
        return $username ?: 'user';
    }

    /**
     * Replace parameters in URL pattern
     */
    private function replaceParameters(string $pattern, array $parameters): string
    {
        foreach ($parameters as $key => $value) {
            $pattern = str_replace('{' . $key . '}', urlencode($value), $pattern);
        }
        
        // Check for unreplaced parameters
        if (preg_match('/\{[^}]+\}/', $pattern)) {
            throw new \InvalidArgumentException('Missing required parameters in URL pattern');
        }
        
        return $pattern;
    }

    /**
     * Clean path according to canonical rules
     */
    private function cleanPath(string $path, array $rules): string
    {
        // Remove trailing slash
        if ($rules['remove_trailing_slash'] && $path !== '/') {
            $path = rtrim($path, '/');
        }
        
        // Convert to lowercase
        if ($rules['lowercase_path']) {
            $path = strtolower($path);
        }
        
        return $path;
    }

    /**
     * Filter query parameters according to canonical rules
     */
    private function filterQueryParams(array $queryParams, array $rules): array
    {
        // Remove default parameters
        if (!empty($rules['remove_default_params'])) {
            foreach ($rules['remove_default_params'] as $defaultParam) {
                if (strpos($defaultParam, '=') !== false) {
                    [$key, $value] = explode('=', $defaultParam, 2);
                    if (isset($queryParams[$key]) && $queryParams[$key] == $value) {
                        unset($queryParams[$key]);
                    }
                }
            }
        }
        
        // Preserve only allowed parameters
        if (!empty($rules['preserve_query_params'])) {
            $queryParams = array_intersect_key($queryParams, array_flip($rules['preserve_query_params']));
        }
        
        return $queryParams;
    }

    /**
     * Generate URL for specific item type
     */
    private function generateItemUrl(string $type, array $item): string
    {
        switch ($type) {
            case 'interviews':
                return $this->generateInterviewUrl($item);
            case 'users':
                return $this->generateUserUrl($item);
            case 'categories':
                return $this->generateCategoryUrl($item);
            default:
                return $this->baseUrl . '/' . $type . '/' . ($item['slug'] ?? $item['id']);
        }
    }

    /**
     * Extract images from item for sitemap
     */
    private function extractImages(array $item): array
    {
        $images = [];
        
        if (!empty($item['thumbnail'])) {
            $images[] = [
                'loc' => $this->baseUrl . $item['thumbnail'],
                'caption' => $item['title'] ?? '',
            ];
        }
        
        if (!empty($item['images'])) {
            foreach ($item['images'] as $image) {
                $images[] = [
                    'loc' => $this->baseUrl . $image['url'],
                    'caption' => $image['caption'] ?? '',
                ];
            }
        }
        
        return $images;
    }

    /**
     * Extract videos from item for sitemap
     */
    private function extractVideos(array $item): array
    {
        $videos = [];
        
        if (!empty($item['video_url'])) {
            $videos[] = [
                'thumbnail_loc' => $this->baseUrl . ($item['thumbnail'] ?? ''),
                'title' => $item['title'] ?? '',
                'description' => $item['description'] ?? '',
                'content_loc' => $this->baseUrl . $item['video_url'],
                'duration' => $item['duration'] ?? null,
            ];
        }
        
        return $videos;
    }

    /**
     * Add page parameter to URL
     */
    private function addPageParam(string $baseUrl, int $page, array $queryParams): string
    {
        $params = $queryParams;
        
        if ($page > 1) {
            $params['page'] = $page;
        } else {
            unset($params['page']);
        }
        
        $url = $baseUrl;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        return $url;
    }

    /**
     * Get base URL
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Set base URL
     */
    public function setBaseUrl(string $baseUrl): void
    {
        $this->baseUrl = rtrim($baseUrl, '/');
    }
}
