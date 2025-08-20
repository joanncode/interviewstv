<?php

namespace App\Services;

use App\Config\UrlConfig;

/**
 * Sitemap Service for generating XML sitemaps and managing SEO
 */
class SitemapService
{
    private \PDO $pdo;
    private UrlGeneratorService $urlGenerator;
    private string $sitemapPath;
    private int $maxUrlsPerSitemap = 50000;

    public function __construct(\PDO $pdo, UrlGeneratorService $urlGenerator, string $sitemapPath = 'public/sitemaps')
    {
        $this->pdo = $pdo;
        $this->urlGenerator = $urlGenerator;
        $this->sitemapPath = $sitemapPath;
        
        // Ensure sitemap directory exists
        if (!is_dir($this->sitemapPath)) {
            mkdir($this->sitemapPath, 0755, true);
        }
    }

    /**
     * Generate complete sitemap index
     */
    public function generateSitemapIndex(): string
    {
        $sitemaps = [];
        
        // Generate individual sitemaps
        $sitemaps[] = $this->generateStaticSitemap();
        $sitemaps[] = $this->generateInterviewsSitemap();
        $sitemaps[] = $this->generateUsersSitemap();
        $sitemaps[] = $this->generateCategoriesSitemap();
        $sitemaps[] = $this->generateBlogSitemap();
        
        // Generate sitemap index
        $indexPath = $this->generateSitemapIndexFile($sitemaps);
        
        return $indexPath;
    }

    /**
     * Generate static pages sitemap
     */
    public function generateStaticSitemap(): string
    {
        $urls = [];
        $baseUrl = $this->urlGenerator->getBaseUrl();
        
        $staticPages = [
            '/' => ['priority' => 1.0, 'changefreq' => 'daily'],
            '/about' => ['priority' => 0.8, 'changefreq' => 'monthly'],
            '/contact' => ['priority' => 0.7, 'changefreq' => 'monthly'],
            '/privacy' => ['priority' => 0.5, 'changefreq' => 'yearly'],
            '/terms' => ['priority' => 0.5, 'changefreq' => 'yearly'],
            '/help' => ['priority' => 0.6, 'changefreq' => 'monthly'],
            '/interviews' => ['priority' => 0.9, 'changefreq' => 'daily'],
            '/categories' => ['priority' => 0.8, 'changefreq' => 'weekly'],
            '/users' => ['priority' => 0.7, 'changefreq' => 'daily'],
            '/search' => ['priority' => 0.8, 'changefreq' => 'daily'],
            '/trending' => ['priority' => 0.8, 'changefreq' => 'hourly'],
            '/featured' => ['priority' => 0.8, 'changefreq' => 'daily'],
        ];
        
        foreach ($staticPages as $path => $config) {
            $urls[] = [
                'loc' => $baseUrl . $path,
                'lastmod' => date('Y-m-d'),
                'changefreq' => $config['changefreq'],
                'priority' => $config['priority']
            ];
        }
        
        return $this->writeSitemapFile('static', $urls);
    }

    /**
     * Generate interviews sitemap
     */
    public function generateInterviewsSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT id, title, slug, category, created_at, updated_at, thumbnail, video_url, duration
            FROM interviews 
            WHERE status = 'published' AND is_public = 1
            ORDER BY updated_at DESC
        ");
        
        $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = $this->urlGenerator->generateSitemapUrls('interviews', $interviews);
        
        // Split into multiple files if needed
        if (count($urls) > $this->maxUrlsPerSitemap) {
            return $this->generateMultipleSitemaps('interviews', $urls);
        }
        
        return $this->writeSitemapFile('interviews', $urls);
    }

    /**
     * Generate users sitemap
     */
    public function generateUsersSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT id, username, name, bio, avatar, created_at, updated_at
            FROM users 
            WHERE is_active = 1 AND profile_public = 1
            ORDER BY updated_at DESC
        ");
        
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = $this->urlGenerator->generateSitemapUrls('users', $users);
        
        if (count($urls) > $this->maxUrlsPerSitemap) {
            return $this->generateMultipleSitemaps('users', $urls);
        }
        
        return $this->writeSitemapFile('users', $urls);
    }

    /**
     * Generate categories sitemap
     */
    public function generateCategoriesSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT id, name, slug, description, created_at, updated_at
            FROM categories 
            WHERE is_active = 1
            ORDER BY name
        ");
        
        $categories = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = $this->urlGenerator->generateSitemapUrls('categories', $categories);
        
        return $this->writeSitemapFile('categories', $urls);
    }

    /**
     * Generate blog sitemap
     */
    public function generateBlogSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT id, title, slug, excerpt, created_at, updated_at, featured_image
            FROM blog_posts 
            WHERE status = 'published'
            ORDER BY updated_at DESC
        ");
        
        $posts = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = [];
        
        foreach ($posts as $post) {
            $urls[] = [
                'loc' => $this->urlGenerator->generateUrl('blog-post', ['slug' => $post['slug']]),
                'lastmod' => $post['updated_at'],
                'changefreq' => 'monthly',
                'priority' => 0.6,
                'images' => !empty($post['featured_image']) ? [[
                    'loc' => $this->urlGenerator->getBaseUrl() . $post['featured_image'],
                    'caption' => $post['title']
                ]] : []
            ];
        }
        
        return $this->writeSitemapFile('blog', $urls);
    }

    /**
     * Generate news sitemap (Google News format)
     */
    public function generateNewsSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT id, title, slug, excerpt, created_at, updated_at
            FROM blog_posts 
            WHERE status = 'published' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)
            ORDER BY created_at DESC
        ");
        
        $posts = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = [];
        
        foreach ($posts as $post) {
            $urls[] = [
                'loc' => $this->urlGenerator->generateUrl('blog-post', ['slug' => $post['slug']]),
                'news' => [
                    'publication' => [
                        'name' => 'Interviews.tv',
                        'language' => 'en'
                    ],
                    'publication_date' => date('Y-m-d\TH:i:s\Z', strtotime($post['created_at'])),
                    'title' => $post['title']
                ]
            ];
        }
        
        return $this->writeNewsSitemapFile($urls);
    }

    /**
     * Generate video sitemap
     */
    public function generateVideoSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT i.id, i.title, i.slug, i.description, i.thumbnail, i.video_url, 
                   i.duration, i.created_at, i.updated_at, u.name as author_name
            FROM interviews i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.status = 'published' AND i.is_public = 1 AND i.video_url IS NOT NULL
            ORDER BY i.updated_at DESC
        ");
        
        $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = [];
        
        foreach ($interviews as $interview) {
            $urls[] = [
                'loc' => $this->urlGenerator->generateInterviewUrl($interview),
                'video' => [
                    'thumbnail_loc' => $this->urlGenerator->getBaseUrl() . $interview['thumbnail'],
                    'title' => $interview['title'],
                    'description' => $interview['description'],
                    'content_loc' => $this->urlGenerator->getBaseUrl() . $interview['video_url'],
                    'duration' => $interview['duration'],
                    'publication_date' => date('Y-m-d\TH:i:s\Z', strtotime($interview['created_at'])),
                    'uploader' => $interview['author_name'] ?? 'Interviews.tv'
                ]
            ];
        }
        
        return $this->writeVideoSitemapFile($urls);
    }

    /**
     * Generate image sitemap
     */
    public function generateImageSitemap(): string
    {
        $stmt = $this->pdo->query("
            SELECT i.id, i.title, i.slug, i.thumbnail, i.created_at,
                   GROUP_CONCAT(ig.image_url) as gallery_images
            FROM interviews i
            LEFT JOIN interview_gallery ig ON i.id = ig.interview_id
            WHERE i.status = 'published' AND i.is_public = 1 
            AND (i.thumbnail IS NOT NULL OR ig.image_url IS NOT NULL)
            GROUP BY i.id
            ORDER BY i.updated_at DESC
        ");
        
        $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $urls = [];
        
        foreach ($interviews as $interview) {
            $images = [];
            
            // Add thumbnail
            if (!empty($interview['thumbnail'])) {
                $images[] = [
                    'loc' => $this->urlGenerator->getBaseUrl() . $interview['thumbnail'],
                    'caption' => $interview['title']
                ];
            }
            
            // Add gallery images
            if (!empty($interview['gallery_images'])) {
                $galleryImages = explode(',', $interview['gallery_images']);
                foreach ($galleryImages as $imageUrl) {
                    $images[] = [
                        'loc' => $this->urlGenerator->getBaseUrl() . trim($imageUrl),
                        'caption' => $interview['title']
                    ];
                }
            }
            
            if (!empty($images)) {
                $urls[] = [
                    'loc' => $this->urlGenerator->generateInterviewUrl($interview),
                    'images' => $images
                ];
            }
        }
        
        return $this->writeSitemapFile('images', $urls);
    }

    /**
     * Generate robots.txt file
     */
    public function generateRobotsTxt(): string
    {
        $baseUrl = $this->urlGenerator->getBaseUrl();
        $content = "User-agent: *\n";
        $content .= "Allow: /\n";
        $content .= "Disallow: /admin/\n";
        $content .= "Disallow: /api/\n";
        $content .= "Disallow: /private/\n";
        $content .= "Disallow: /temp/\n";
        $content .= "Disallow: /*?*\n"; // Disallow URLs with query parameters
        $content .= "\n";
        $content .= "Sitemap: {$baseUrl}/sitemap.xml\n";
        $content .= "Sitemap: {$baseUrl}/sitemap-news.xml\n";
        $content .= "Sitemap: {$baseUrl}/sitemap-videos.xml\n";
        $content .= "Sitemap: {$baseUrl}/sitemap-images.xml\n";
        
        $robotsPath = 'public/robots.txt';
        file_put_contents($robotsPath, $content);
        
        return $robotsPath;
    }

    /**
     * Ping search engines about sitemap updates
     */
    public function pingSearchEngines(): array
    {
        $sitemapUrl = $this->urlGenerator->getBaseUrl() . '/sitemap.xml';
        $results = [];
        
        $searchEngines = [
            'Google' => "https://www.google.com/ping?sitemap=" . urlencode($sitemapUrl),
            'Bing' => "https://www.bing.com/ping?sitemap=" . urlencode($sitemapUrl),
            'Yandex' => "https://webmaster.yandex.com/ping?sitemap=" . urlencode($sitemapUrl)
        ];
        
        foreach ($searchEngines as $engine => $pingUrl) {
            $response = $this->sendPingRequest($pingUrl);
            $results[$engine] = [
                'success' => $response['success'],
                'status_code' => $response['status_code'],
                'message' => $response['message']
            ];
        }
        
        return $results;
    }

    /**
     * Write sitemap file
     */
    private function writeSitemapFile(string $name, array $urls): string
    {
        $xml = $this->generateSitemapXml($urls);
        $filename = "sitemap-{$name}.xml";
        $filepath = $this->sitemapPath . '/' . $filename;
        
        file_put_contents($filepath, $xml);
        
        return $filename;
    }

    /**
     * Write news sitemap file
     */
    private function writeNewsSitemapFile(array $urls): string
    {
        $xml = $this->generateNewsSitemapXml($urls);
        $filename = "sitemap-news.xml";
        $filepath = $this->sitemapPath . '/' . $filename;
        
        file_put_contents($filepath, $xml);
        
        return $filename;
    }

    /**
     * Write video sitemap file
     */
    private function writeVideoSitemapFile(array $urls): string
    {
        $xml = $this->generateVideoSitemapXml($urls);
        $filename = "sitemap-videos.xml";
        $filepath = $this->sitemapPath . '/' . $filename;
        
        file_put_contents($filepath, $xml);
        
        return $filename;
    }

    /**
     * Generate multiple sitemaps for large datasets
     */
    private function generateMultipleSitemaps(string $type, array $urls): array
    {
        $chunks = array_chunk($urls, $this->maxUrlsPerSitemap);
        $filenames = [];
        
        foreach ($chunks as $index => $chunk) {
            $filename = "sitemap-{$type}-" . ($index + 1) . ".xml";
            $xml = $this->generateSitemapXml($chunk);
            $filepath = $this->sitemapPath . '/' . $filename;
            
            file_put_contents($filepath, $xml);
            $filenames[] = $filename;
        }
        
        return $filenames;
    }

    /**
     * Generate sitemap index file
     */
    private function generateSitemapIndexFile(array $sitemaps): string
    {
        $baseUrl = $this->urlGenerator->getBaseUrl();
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        
        foreach ($sitemaps as $sitemap) {
            if (is_array($sitemap)) {
                // Multiple sitemaps
                foreach ($sitemap as $filename) {
                    $xml .= "  <sitemap>\n";
                    $xml .= "    <loc>{$baseUrl}/sitemaps/{$filename}</loc>\n";
                    $xml .= "    <lastmod>" . date('Y-m-d\TH:i:s\Z') . "</lastmod>\n";
                    $xml .= "  </sitemap>\n";
                }
            } else {
                // Single sitemap
                $xml .= "  <sitemap>\n";
                $xml .= "    <loc>{$baseUrl}/sitemaps/{$sitemap}</loc>\n";
                $xml .= "    <lastmod>" . date('Y-m-d\TH:i:s\Z') . "</lastmod>\n";
                $xml .= "  </sitemap>\n";
            }
        }
        
        $xml .= '</sitemapindex>';
        
        $indexPath = 'public/sitemap.xml';
        file_put_contents($indexPath, $xml);
        
        return $indexPath;
    }

    /**
     * Generate standard sitemap XML
     */
    private function generateSitemapXml(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
        $xml .= ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
        $xml .= ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' . "\n";
        
        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>" . htmlspecialchars($url['loc']) . "</loc>\n";
            
            if (!empty($url['lastmod'])) {
                $xml .= "    <lastmod>" . date('Y-m-d', strtotime($url['lastmod'])) . "</lastmod>\n";
            }
            
            if (!empty($url['changefreq'])) {
                $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
            }
            
            if (!empty($url['priority'])) {
                $xml .= "    <priority>{$url['priority']}</priority>\n";
            }
            
            // Add images
            if (!empty($url['images'])) {
                foreach ($url['images'] as $image) {
                    $xml .= "    <image:image>\n";
                    $xml .= "      <image:loc>" . htmlspecialchars($image['loc']) . "</image:loc>\n";
                    if (!empty($image['caption'])) {
                        $xml .= "      <image:caption>" . htmlspecialchars($image['caption']) . "</image:caption>\n";
                    }
                    $xml .= "    </image:image>\n";
                }
            }
            
            // Add videos
            if (!empty($url['videos'])) {
                foreach ($url['videos'] as $video) {
                    $xml .= "    <video:video>\n";
                    $xml .= "      <video:thumbnail_loc>" . htmlspecialchars($video['thumbnail_loc']) . "</video:thumbnail_loc>\n";
                    $xml .= "      <video:title>" . htmlspecialchars($video['title']) . "</video:title>\n";
                    $xml .= "      <video:description>" . htmlspecialchars($video['description']) . "</video:description>\n";
                    $xml .= "      <video:content_loc>" . htmlspecialchars($video['content_loc']) . "</video:content_loc>\n";
                    if (!empty($video['duration'])) {
                        $xml .= "      <video:duration>{$video['duration']}</video:duration>\n";
                    }
                    $xml .= "    </video:video>\n";
                }
            }
            
            $xml .= "  </url>\n";
        }
        
        $xml .= '</urlset>';
        
        return $xml;
    }

    /**
     * Generate news sitemap XML
     */
    private function generateNewsSitemapXml(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
        $xml .= ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' . "\n";
        
        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>" . htmlspecialchars($url['loc']) . "</loc>\n";
            
            if (!empty($url['news'])) {
                $news = $url['news'];
                $xml .= "    <news:news>\n";
                $xml .= "      <news:publication>\n";
                $xml .= "        <news:name>" . htmlspecialchars($news['publication']['name']) . "</news:name>\n";
                $xml .= "        <news:language>{$news['publication']['language']}</news:language>\n";
                $xml .= "      </news:publication>\n";
                $xml .= "      <news:publication_date>{$news['publication_date']}</news:publication_date>\n";
                $xml .= "      <news:title>" . htmlspecialchars($news['title']) . "</news:title>\n";
                $xml .= "    </news:news>\n";
            }
            
            $xml .= "  </url>\n";
        }
        
        $xml .= '</urlset>';
        
        return $xml;
    }

    /**
     * Generate video sitemap XML
     */
    private function generateVideoSitemapXml(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
        $xml .= ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' . "\n";
        
        foreach ($urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>" . htmlspecialchars($url['loc']) . "</loc>\n";
            
            if (!empty($url['video'])) {
                $video = $url['video'];
                $xml .= "    <video:video>\n";
                $xml .= "      <video:thumbnail_loc>" . htmlspecialchars($video['thumbnail_loc']) . "</video:thumbnail_loc>\n";
                $xml .= "      <video:title>" . htmlspecialchars($video['title']) . "</video:title>\n";
                $xml .= "      <video:description>" . htmlspecialchars($video['description']) . "</video:description>\n";
                $xml .= "      <video:content_loc>" . htmlspecialchars($video['content_loc']) . "</video:content_loc>\n";
                $xml .= "      <video:duration>{$video['duration']}</video:duration>\n";
                $xml .= "      <video:publication_date>{$video['publication_date']}</video:publication_date>\n";
                $xml .= "      <video:uploader>" . htmlspecialchars($video['uploader']) . "</video:uploader>\n";
                $xml .= "    </video:video>\n";
            }
            
            $xml .= "  </url>\n";
        }
        
        $xml .= '</urlset>';
        
        return $xml;
    }

    /**
     * Send ping request to search engine
     */
    private function sendPingRequest(string $url): array
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Interviews.tv Sitemap Bot');
        
        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'success' => $statusCode === 200,
            'status_code' => $statusCode,
            'message' => $error ?: 'Success'
        ];
    }
}
