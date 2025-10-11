<?php

namespace App\Services;

use App\Config\UrlConfig;

/**
 * SEO Service for managing meta tags, structured data, and SEO optimization
 */
class SeoService
{
    private UrlGeneratorService $urlGenerator;
    private array $defaultMeta;

    public function __construct(UrlGeneratorService $urlGenerator)
    {
        $this->urlGenerator = $urlGenerator;
        $this->defaultMeta = [
            'site_name' => 'Interviews.tv',
            'default_title' => 'Interviews.tv - Master Your Interview Skills',
            'default_description' => 'Practice and improve your interview skills with real interview videos, AI-powered analysis, and expert feedback.',
            'default_image' => '/images/og-default.jpg',
            'twitter_site' => '@interviewstv',
            'facebook_app_id' => '',
        ];
    }

    /**
     * Generate complete SEO meta tags for a page
     */
    public function generateMetaTags(string $routeType, array $data = [], array $options = []): array
    {
        $config = UrlConfig::getSeoConfig($routeType);
        $meta = [];

        // Basic meta tags
        $meta['title'] = $this->generateTitle($routeType, $data, $config);
        $meta['description'] = $this->generateDescription($routeType, $data, $config);
        $meta['canonical'] = $this->generateCanonical($routeType, $data, $config);
        $meta['robots'] = $options['robots'] ?? 'index,follow';

        // Open Graph tags
        $meta['og'] = $this->generateOpenGraphTags($meta, $data, $options);

        // Twitter Card tags
        $meta['twitter'] = $this->generateTwitterCardTags($meta, $data, $options);

        // Structured data
        $meta['structured_data'] = $this->generateStructuredData($routeType, $data, $config);

        // Additional meta tags
        $meta['additional'] = $this->generateAdditionalTags($routeType, $data, $options);

        return $meta;
    }

    /**
     * Generate page title
     */
    private function generateTitle(string $routeType, array $data, array $config): string
    {
        $pattern = $config['title_pattern'] ?? '{title} | Interviews.tv';
        
        return $this->replacePlaceholders($pattern, $data, $this->defaultMeta['default_title']);
    }

    /**
     * Generate meta description
     */
    private function generateDescription(string $routeType, array $data, array $config): string
    {
        $pattern = $config['description_pattern'] ?? $this->defaultMeta['default_description'];
        
        $description = $this->replacePlaceholders($pattern, $data, $this->defaultMeta['default_description']);
        
        // Limit description length
        return $this->truncateText($description, 160);
    }

    /**
     * Generate canonical URL
     */
    private function generateCanonical(string $routeType, array $data, array $config): string
    {
        if (!empty($config['canonical_pattern'])) {
            $path = $this->replacePlaceholders($config['canonical_pattern'], $data);
            return $this->urlGenerator->generateCanonicalUrl($path);
        }

        return $this->urlGenerator->getBaseUrl();
    }

    /**
     * Generate Open Graph tags
     */
    private function generateOpenGraphTags(array $meta, array $data, array $options): array
    {
        $og = [
            'title' => $meta['title'],
            'description' => $meta['description'],
            'url' => $meta['canonical'],
            'site_name' => $this->defaultMeta['site_name'],
            'type' => $options['og_type'] ?? 'website',
        ];

        // Image
        $og['image'] = $this->getImageUrl($data, $options);
        if ($og['image']) {
            $og['image:width'] = $options['image_width'] ?? 1200;
            $og['image:height'] = $options['image_height'] ?? 630;
            $og['image:alt'] = $data['title'] ?? $this->defaultMeta['site_name'];
        }

        // Video specific
        if (!empty($data['video_url'])) {
            $og['video'] = $this->urlGenerator->getBaseUrl() . $data['video_url'];
            $og['video:type'] = 'video/mp4';
            $og['video:width'] = $data['video_width'] ?? 1280;
            $og['video:height'] = $data['video_height'] ?? 720;
            $og['video:duration'] = $data['duration'] ?? null;
        }

        // Article specific
        if ($options['og_type'] === 'article') {
            $og['article:author'] = $data['author'] ?? '';
            $og['article:published_time'] = $data['created_at'] ?? '';
            $og['article:modified_time'] = $data['updated_at'] ?? '';
            $og['article:section'] = $data['category'] ?? '';
            $og['article:tag'] = $data['tags'] ?? [];
        }

        return array_filter($og);
    }

    /**
     * Generate Twitter Card tags
     */
    private function generateTwitterCardTags(array $meta, array $data, array $options): array
    {
        $twitter = [
            'card' => $this->getTwitterCardType($data, $options),
            'site' => $this->defaultMeta['twitter_site'],
            'title' => $this->truncateText($meta['title'], 70),
            'description' => $this->truncateText($meta['description'], 200),
        ];

        // Image
        $image = $this->getImageUrl($data, $options);
        if ($image) {
            $twitter['image'] = $image;
            $twitter['image:alt'] = $data['title'] ?? $this->defaultMeta['site_name'];
        }

        // Creator
        if (!empty($data['author_twitter'])) {
            $twitter['creator'] = $data['author_twitter'];
        }

        // Player for videos
        if (!empty($data['video_url']) && $twitter['card'] === 'player') {
            $twitter['player'] = $this->urlGenerator->generateUrl('interview-watch', ['slug' => $data['slug'] ?? '']);
            $twitter['player:width'] = 1280;
            $twitter['player:height'] = 720;
        }

        return array_filter($twitter);
    }

    /**
     * Generate structured data (JSON-LD)
     */
    private function generateStructuredData(string $routeType, array $data, array $config): array
    {
        $schemaType = $config['schema_type'] ?? 'WebPage';
        
        switch ($schemaType) {
            case 'VideoObject':
                return $this->generateVideoSchema($data);
            case 'Person':
                return $this->generatePersonSchema($data);
            case 'Organization':
                return $this->generateOrganizationSchema($data);
            case 'CollectionPage':
                return $this->generateCollectionSchema($data);
            case 'SearchResultsPage':
                return $this->generateSearchResultsSchema($data);
            case 'BreadcrumbList':
                return $this->generateBreadcrumbSchema($data);
            default:
                return $this->generateWebPageSchema($data);
        }
    }

    /**
     * Generate video schema
     */
    private function generateVideoSchema(array $data): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'VideoObject',
            'name' => $data['title'] ?? '',
            'description' => $data['description'] ?? '',
            'thumbnailUrl' => $this->getImageUrl($data),
            'uploadDate' => $data['created_at'] ?? '',
            'duration' => $this->formatDuration($data['duration'] ?? 0),
            'contentUrl' => $this->urlGenerator->getBaseUrl() . ($data['video_url'] ?? ''),
            'embedUrl' => $this->urlGenerator->generateUrl('interview-watch', ['slug' => $data['slug'] ?? '']),
        ];

        // Publisher
        $schema['publisher'] = [
            '@type' => 'Organization',
            'name' => $this->defaultMeta['site_name'],
            'logo' => [
                '@type' => 'ImageObject',
                'url' => $this->urlGenerator->getBaseUrl() . '/images/logo.png'
            ]
        ];

        // Author
        if (!empty($data['user'])) {
            $schema['author'] = [
                '@type' => 'Person',
                'name' => $data['user']['name'] ?? '',
                'url' => $this->urlGenerator->generateUserUrl($data['user'])
            ];
        }

        // Interaction statistics
        if (!empty($data['stats'])) {
            $schema['interactionStatistic'] = [
                [
                    '@type' => 'InteractionCounter',
                    'interactionType' => 'https://schema.org/WatchAction',
                    'userInteractionCount' => $data['stats']['views'] ?? 0
                ],
                [
                    '@type' => 'InteractionCounter',
                    'interactionType' => 'https://schema.org/LikeAction',
                    'userInteractionCount' => $data['stats']['likes'] ?? 0
                ]
            ];
        }

        return array_filter($schema);
    }

    /**
     * Generate person schema
     */
    private function generatePersonSchema(array $data): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Person',
            'name' => $data['name'] ?? '',
            'description' => $data['bio'] ?? '',
            'url' => $this->urlGenerator->generateUserUrl($data),
            'image' => $this->getImageUrl($data),
        ];

        // Job title and organization
        if (!empty($data['job_title'])) {
            $schema['jobTitle'] = $data['job_title'];
        }

        if (!empty($data['company'])) {
            $schema['worksFor'] = [
                '@type' => 'Organization',
                'name' => $data['company']
            ];
        }

        // Social profiles
        if (!empty($data['social_links'])) {
            $schema['sameAs'] = array_values($data['social_links']);
        }

        // Skills
        if (!empty($data['skills'])) {
            $schema['knowsAbout'] = $data['skills'];
        }

        return array_filter($schema);
    }

    /**
     * Generate organization schema
     */
    private function generateOrganizationSchema(array $data): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => $this->defaultMeta['site_name'],
            'url' => $this->urlGenerator->getBaseUrl(),
            'logo' => $this->urlGenerator->getBaseUrl() . '/images/logo.png',
            'description' => $this->defaultMeta['default_description'],
            'sameAs' => [
                'https://twitter.com/interviewstv',
                'https://linkedin.com/company/interviewstv',
                'https://facebook.com/interviewstv'
            ]
        ];
    }

    /**
     * Generate collection page schema
     */
    private function generateCollectionSchema(array $data): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'CollectionPage',
            'name' => $data['name'] ?? '',
            'description' => $data['description'] ?? '',
            'url' => $this->urlGenerator->generateCategoryUrl($data),
        ];

        // Main entity
        if (!empty($data['interviews'])) {
            $schema['mainEntity'] = [
                '@type' => 'ItemList',
                'numberOfItems' => count($data['interviews']),
                'itemListElement' => array_map(function($interview, $index) {
                    return [
                        '@type' => 'ListItem',
                        'position' => $index + 1,
                        'item' => [
                            '@type' => 'VideoObject',
                            'name' => $interview['title'],
                            'url' => $this->urlGenerator->generateInterviewUrl($interview)
                        ]
                    ];
                }, $data['interviews'], array_keys($data['interviews']))
            ];
        }

        return array_filter($schema);
    }

    /**
     * Generate search results schema
     */
    private function generateSearchResultsSchema(array $data): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'SearchResultsPage',
            'name' => "Search Results for \"{$data['query']}\"",
            'url' => $this->urlGenerator->generateSearchUrl($data['query']),
            'mainEntity' => [
                '@type' => 'ItemList',
                'numberOfItems' => $data['total_results'] ?? 0,
                'itemListElement' => [] // Would be populated with actual results
            ]
        ];
    }

    /**
     * Generate breadcrumb schema
     */
    private function generateBreadcrumbSchema(array $breadcrumbs): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(function($breadcrumb, $index) {
                return [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $breadcrumb['title'],
                    'item' => $breadcrumb['url']
                ];
            }, $breadcrumbs, array_keys($breadcrumbs))
        ];
    }

    /**
     * Generate web page schema
     */
    private function generateWebPageSchema(array $data): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'WebPage',
            'name' => $data['title'] ?? $this->defaultMeta['default_title'],
            'description' => $data['description'] ?? $this->defaultMeta['default_description'],
            'url' => $data['url'] ?? $this->urlGenerator->getBaseUrl(),
            'isPartOf' => [
                '@type' => 'WebSite',
                'name' => $this->defaultMeta['site_name'],
                'url' => $this->urlGenerator->getBaseUrl()
            ]
        ];
    }

    /**
     * Generate additional meta tags
     */
    private function generateAdditionalTags(string $routeType, array $data, array $options): array
    {
        $tags = [];

        // Viewport
        $tags['viewport'] = 'width=device-width, initial-scale=1.0';

        // Theme color
        $tags['theme-color'] = '#007bff';

        // Language
        $tags['language'] = $options['language'] ?? 'en';

        // Author
        if (!empty($data['author'])) {
            $tags['author'] = $data['author'];
        }

        // Keywords (use sparingly)
        if (!empty($data['tags'])) {
            $tags['keywords'] = implode(', ', array_slice($data['tags'], 0, 10));
        }

        // Publication date
        if (!empty($data['created_at'])) {
            $tags['article:published_time'] = $data['created_at'];
        }

        // Modified date
        if (!empty($data['updated_at'])) {
            $tags['article:modified_time'] = $data['updated_at'];
        }

        return $tags;
    }

    /**
     * Get image URL for meta tags
     */
    private function getImageUrl(array $data, array $options = []): string
    {
        if (!empty($options['image'])) {
            return $this->urlGenerator->getBaseUrl() . $options['image'];
        }

        if (!empty($data['thumbnail'])) {
            return $this->urlGenerator->getBaseUrl() . $data['thumbnail'];
        }

        if (!empty($data['image'])) {
            return $this->urlGenerator->getBaseUrl() . $data['image'];
        }

        return $this->urlGenerator->getBaseUrl() . $this->defaultMeta['default_image'];
    }

    /**
     * Get Twitter card type
     */
    private function getTwitterCardType(array $data, array $options): string
    {
        if (!empty($data['video_url'])) {
            return 'player';
        }

        if (!empty($data['thumbnail']) || !empty($data['image'])) {
            return 'summary_large_image';
        }

        return 'summary';
    }

    /**
     * Replace placeholders in text
     */
    private function replacePlaceholders(string $text, array $data, string $fallback = ''): string
    {
        $text = preg_replace_callback('/\{([^}]+)\}/', function($matches) use ($data) {
            $key = $matches[1];
            return $data[$key] ?? $matches[0];
        }, $text);

        // Remove unreplaced placeholders
        $text = preg_replace('/\{[^}]+\}/', '', $text);

        return trim($text) ?: $fallback;
    }

    /**
     * Truncate text to specified length
     */
    private function truncateText(string $text, int $length): string
    {
        if (strlen($text) <= $length) {
            return $text;
        }

        $truncated = substr($text, 0, $length);
        $lastSpace = strrpos($truncated, ' ');

        if ($lastSpace !== false) {
            $truncated = substr($truncated, 0, $lastSpace);
        }

        return $truncated . '...';
    }

    /**
     * Format duration for schema
     */
    private function formatDuration(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $seconds = $seconds % 60;

        $duration = 'PT';
        if ($hours > 0) $duration .= $hours . 'H';
        if ($minutes > 0) $duration .= $minutes . 'M';
        if ($seconds > 0) $duration .= $seconds . 'S';

        return $duration;
    }
}
