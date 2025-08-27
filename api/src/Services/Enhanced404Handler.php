<?php

namespace App\Services;

/**
 * Enhanced 404 Handler with intelligent suggestions and SEO optimization
 */
class Enhanced404Handler
{
    private $pdo;
    private $urlGenerator;
    private $seoService;
    private $cache;

    public function __construct($pdo, $urlGenerator = null, $seoService = null, $cache = null)
    {
        $this->pdo = $pdo;
        $this->urlGenerator = $urlGenerator ?: new UrlGeneratorService();
        $this->seoService = $seoService ?: new SeoService($this->urlGenerator);
        $this->cache = $cache ?: new CacheService();
    }

    /**
     * Handle 404 error with intelligent suggestions
     */
    public function handle($requestedPath, $request = null)
    {
        // Log the 404 for analytics
        $this->log404($requestedPath, $request);

        // Try to find suggestions
        $suggestions = $this->findSuggestions($requestedPath);

        // Check for redirects
        $redirect = $this->checkRedirects($requestedPath);
        if ($redirect) {
            return $this->handleRedirect($redirect);
        }

        // Generate 404 response
        return $this->generate404Response($requestedPath, $suggestions, $request);
    }

    /**
     * Find intelligent suggestions for the requested path
     */
    private function findSuggestions($requestedPath)
    {
        $suggestions = [];
        $path = trim($requestedPath, '/');
        
        // Try exact matches first
        $exactMatches = $this->findExactMatches($path);
        if (!empty($exactMatches)) {
            return $exactMatches;
        }

        // Try fuzzy matching
        $fuzzyMatches = $this->findFuzzyMatches($path);
        $suggestions = array_merge($suggestions, $fuzzyMatches);

        // Try partial matches
        $partialMatches = $this->findPartialMatches($path);
        $suggestions = array_merge($suggestions, $partialMatches);

        // Try category/section suggestions
        $categoryMatches = $this->findCategoryMatches($path);
        $suggestions = array_merge($suggestions, $categoryMatches);

        // Remove duplicates and limit results
        $suggestions = array_unique($suggestions, SORT_REGULAR);
        return array_slice($suggestions, 0, 5);
    }

    /**
     * Find exact matches (case-insensitive)
     */
    private function findExactMatches($path)
    {
        $cacheKey = "404_exact_matches:" . md5($path);
        $cached = $this->cache->get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $matches = [];
        
        // Check interviews
        $stmt = $this->pdo->prepare("
            SELECT title, slug, 'interview' as type 
            FROM interviews 
            WHERE LOWER(slug) = LOWER(?) AND status = 'published'
            LIMIT 3
        ");
        $stmt->execute([$path]);
        $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        foreach ($interviews as $interview) {
            $matches[] = [
                'title' => $interview['title'],
                'url' => '/interview/' . $interview['slug'],
                'type' => 'interview',
                'relevance' => 1.0
            ];
        }

        // Check users
        $stmt = $this->pdo->prepare("
            SELECT name, username, 'user' as type 
            FROM users 
            WHERE LOWER(username) = LOWER(?) AND is_active = 1
            LIMIT 3
        ");
        $stmt->execute([$path]);
        $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        foreach ($users as $user) {
            $matches[] = [
                'title' => $user['name'],
                'url' => '/profile/' . $user['username'],
                'type' => 'user',
                'relevance' => 1.0
            ];
        }

        $this->cache->set($cacheKey, $matches, 300); // Cache for 5 minutes
        return $matches;
    }

    /**
     * Find fuzzy matches using Levenshtein distance
     */
    private function findFuzzyMatches($path)
    {
        $cacheKey = "404_fuzzy_matches:" . md5($path);
        $cached = $this->cache->get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $matches = [];
        $maxDistance = max(2, strlen($path) * 0.3); // Allow 30% character difference

        // Check interview slugs
        $stmt = $this->pdo->prepare("
            SELECT title, slug 
            FROM interviews 
            WHERE status = 'published' AND LENGTH(slug) BETWEEN ? AND ?
            ORDER BY created_at DESC
            LIMIT 50
        ");
        $minLen = max(1, strlen($path) - $maxDistance);
        $maxLen = strlen($path) + $maxDistance;
        $stmt->execute([$minLen, $maxLen]);
        $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($interviews as $interview) {
            $distance = levenshtein(strtolower($path), strtolower($interview['slug']));
            if ($distance <= $maxDistance) {
                $relevance = 1 - ($distance / strlen($path));
                $matches[] = [
                    'title' => $interview['title'],
                    'url' => '/interview/' . $interview['slug'],
                    'type' => 'interview',
                    'relevance' => $relevance
                ];
            }
        }

        // Sort by relevance
        usort($matches, function($a, $b) {
            return $b['relevance'] <=> $a['relevance'];
        });

        $matches = array_slice($matches, 0, 3);
        $this->cache->set($cacheKey, $matches, 300);
        return $matches;
    }

    /**
     * Find partial matches
     */
    private function findPartialMatches($path)
    {
        $matches = [];
        $pathParts = explode('-', $path);
        
        if (count($pathParts) > 1) {
            // Try searching for content containing path parts
            $searchTerms = implode(' ', $pathParts);
            
            $stmt = $this->pdo->prepare("
                SELECT title, slug, 'interview' as type,
                       MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
                FROM interviews 
                WHERE MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE)
                  AND status = 'published'
                ORDER BY relevance DESC
                LIMIT 3
            ");
            $stmt->execute([$searchTerms, $searchTerms]);
            $interviews = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            foreach ($interviews as $interview) {
                $matches[] = [
                    'title' => $interview['title'],
                    'url' => '/interview/' . $interview['slug'],
                    'type' => 'interview',
                    'relevance' => $interview['relevance']
                ];
            }
        }

        return $matches;
    }

    /**
     * Find category/section matches
     */
    private function findCategoryMatches($path)
    {
        $matches = [];
        
        // Check if path might be a category
        $categories = [
            'tech' => '/explore?category=technology',
            'technology' => '/explore?category=technology',
            'business' => '/explore?category=business',
            'career' => '/explore?category=career',
            'startup' => '/explore?category=startup',
            'interview' => '/explore',
            'interviews' => '/explore',
            'profile' => '/profiles',
            'profiles' => '/profiles',
            'user' => '/profiles',
            'users' => '/profiles'
        ];

        $lowerPath = strtolower($path);
        foreach ($categories as $keyword => $url) {
            if (strpos($lowerPath, $keyword) !== false) {
                $matches[] = [
                    'title' => ucfirst($keyword) . ' Section',
                    'url' => $url,
                    'type' => 'category',
                    'relevance' => 0.8
                ];
            }
        }

        return $matches;
    }

    /**
     * Check for configured redirects
     */
    private function checkRedirects($requestedPath)
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT target_url, redirect_type 
                FROM url_redirects 
                WHERE source_path = ? AND is_active = 1
            ");
            $stmt->execute([$requestedPath]);
            return $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Handle redirect
     */
    private function handleRedirect($redirect)
    {
        $statusCode = $redirect['redirect_type'] === 'permanent' ? 301 : 302;
        
        header("Location: " . $redirect['target_url'], true, $statusCode);
        exit;
    }

    /**
     * Generate 404 response
     */
    private function generate404Response($requestedPath, $suggestions, $request)
    {
        http_response_code(404);

        // Check if it's an API request
        if ($this->isApiRequest($request)) {
            return $this->generateApi404Response($requestedPath, $suggestions);
        }

        // Generate HTML 404 page
        return $this->generateHtml404Response($requestedPath, $suggestions);
    }

    /**
     * Check if request is for API
     */
    private function isApiRequest($request)
    {
        $path = $_SERVER['REQUEST_URI'] ?? '';
        $acceptHeader = $_SERVER['HTTP_ACCEPT'] ?? '';
        
        return strpos($path, '/api/') === 0 || 
               strpos($acceptHeader, 'application/json') !== false ||
               isset($_SERVER['HTTP_X_REQUESTED_WITH']);
    }

    /**
     * Generate API 404 response
     */
    private function generateApi404Response($requestedPath, $suggestions)
    {
        header('Content-Type: application/json');
        
        return json_encode([
            'success' => false,
            'error' => [
                'code' => 'NOT_FOUND',
                'message' => 'The requested resource was not found',
                'path' => $requestedPath,
                'suggestions' => array_map(function($suggestion) {
                    return [
                        'title' => $suggestion['title'],
                        'url' => $suggestion['url'],
                        'type' => $suggestion['type']
                    ];
                }, $suggestions)
            ]
        ], JSON_UNESCAPED_SLASHES);
    }

    /**
     * Generate HTML 404 response
     */
    private function generateHtml404Response($requestedPath, $suggestions)
    {
        // Generate SEO meta tags for 404 page
        $metaTags = $this->seoService->generateMetaTags('404', [
            'requested_path' => $requestedPath
        ]);

        $suggestionsHtml = '';
        if (!empty($suggestions)) {
            $suggestionsHtml = '<div class="suggestions"><h3>Did you mean?</h3><ul>';
            foreach ($suggestions as $suggestion) {
                $suggestionsHtml .= sprintf(
                    '<li><a href="%s">%s</a> <span class="type">(%s)</span></li>',
                    htmlspecialchars($suggestion['url']),
                    htmlspecialchars($suggestion['title']),
                    htmlspecialchars($suggestion['type'])
                );
            }
            $suggestionsHtml .= '</ul></div>';
        }

        return sprintf('
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                <meta name="description" content="%s">
                <meta name="robots" content="noindex,nofollow">
                <link rel="canonical" href="%s">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                    .error-code { font-size: 72px; color: #FF0000; margin: 0; }
                    .error-message { font-size: 24px; margin: 20px 0; }
                    .suggestions { margin: 30px 0; }
                    .suggestions ul { list-style: none; padding: 0; }
                    .suggestions li { margin: 10px 0; }
                    .suggestions a { color: #FF0000; text-decoration: none; }
                    .suggestions a:hover { text-decoration: underline; }
                    .type { color: #666; font-size: 0.9em; }
                    .actions { margin: 30px 0; }
                    .btn { background: #FF0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1 class="error-code">404</h1>
                <p class="error-message">Page Not Found</p>
                <p>The page you requested (%s) could not be found.</p>
                %s
                <div class="actions">
                    <a href="/" class="btn">Go Home</a>
                    <a href="/explore" class="btn">Explore Interviews</a>
                </div>
            </body>
            </html>
        ',
            htmlspecialchars($metaTags['title']),
            htmlspecialchars($metaTags['description']),
            htmlspecialchars($metaTags['canonical']),
            htmlspecialchars($requestedPath),
            $suggestionsHtml
        );
    }

    /**
     * Log 404 for analytics
     */
    private function log404($requestedPath, $request)
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO error_404_logs (path, referer, user_agent, ip_address, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $requestedPath,
                $_SERVER['HTTP_REFERER'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
                $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            error_log("Failed to log 404: " . $e->getMessage());
        }
    }
}
