<?php

namespace App\Services;

use App\Config\UrlConfig;

/**
 * Redirect Service for managing URL redirects, canonicals, and migrations
 */
class RedirectService
{
    private \PDO $pdo;
    private UrlGeneratorService $urlGenerator;
    private array $redirectCache = [];
    private bool $cacheEnabled = true;

    public function __construct(\PDO $pdo, UrlGeneratorService $urlGenerator)
    {
        $this->pdo = $pdo;
        $this->urlGenerator = $urlGenerator;
        $this->createRedirectTables();
    }

    /**
     * Create a permanent redirect (301)
     */
    public function createPermanentRedirect(string $fromPath, string $toPath, array $options = []): bool
    {
        return $this->createRedirect($fromPath, $toPath, 301, $options);
    }

    /**
     * Create a temporary redirect (302)
     */
    public function createTemporaryRedirect(string $fromPath, string $toPath, array $options = []): bool
    {
        return $this->createRedirect($fromPath, $toPath, 302, $options);
    }

    /**
     * Create a redirect
     */
    public function createRedirect(string $fromPath, string $toPath, int $statusCode = 301, array $options = []): bool
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO redirects (from_path, to_path, status_code, reason, created_at, expires_at, is_active)
            VALUES (?, ?, ?, ?, NOW(), ?, 1)
            ON DUPLICATE KEY UPDATE
            to_path = VALUES(to_path),
            status_code = VALUES(status_code),
            reason = VALUES(reason),
            updated_at = NOW(),
            expires_at = VALUES(expires_at),
            is_active = 1
        ");

        $expiresAt = null;
        if (!empty($options['expires_at'])) {
            $expiresAt = $options['expires_at'];
        } elseif (!empty($options['ttl'])) {
            $expiresAt = date('Y-m-d H:i:s', time() + $options['ttl']);
        }

        $result = $stmt->execute([
            $this->normalizePath($fromPath),
            $this->normalizePath($toPath),
            $statusCode,
            $options['reason'] ?? 'Manual redirect',
            $expiresAt
        ]);

        if ($result) {
            $this->clearCache();
        }

        return $result;
    }

    /**
     * Find redirect for a path
     */
    public function findRedirect(string $path): ?array
    {
        $normalizedPath = $this->normalizePath($path);
        
        // Check cache first
        if ($this->cacheEnabled && isset($this->redirectCache[$normalizedPath])) {
            return $this->redirectCache[$normalizedPath];
        }

        // Check exact match first
        $redirect = $this->findExactRedirect($normalizedPath);
        
        // If no exact match, try pattern matching
        if (!$redirect) {
            $redirect = $this->findPatternRedirect($normalizedPath);
        }

        // If no database redirect, check configured aliases
        if (!$redirect) {
            $redirect = $this->findAliasRedirect($normalizedPath);
        }

        // Cache the result
        if ($this->cacheEnabled) {
            $this->redirectCache[$normalizedPath] = $redirect;
        }

        return $redirect;
    }

    /**
     * Check if path should be redirected
     */
    public function shouldRedirect(string $path): bool
    {
        return $this->findRedirect($path) !== null;
    }

    /**
     * Get redirect response data
     */
    public function getRedirectResponse(string $path): ?array
    {
        $redirect = $this->findRedirect($path);
        
        if (!$redirect) {
            return null;
        }

        return [
            'status_code' => $redirect['status_code'],
            'location' => $redirect['to_path'],
            'headers' => $this->getRedirectHeaders($redirect)
        ];
    }

    /**
     * Create bulk redirects from array
     */
    public function createBulkRedirects(array $redirects): array
    {
        $results = [];
        
        foreach ($redirects as $redirect) {
            $fromPath = $redirect['from'] ?? '';
            $toPath = $redirect['to'] ?? '';
            $statusCode = $redirect['status_code'] ?? 301;
            $options = $redirect['options'] ?? [];
            
            if (empty($fromPath) || empty($toPath)) {
                $results[] = ['success' => false, 'error' => 'Missing from or to path'];
                continue;
            }
            
            $success = $this->createRedirect($fromPath, $toPath, $statusCode, $options);
            $results[] = ['success' => $success, 'from' => $fromPath, 'to' => $toPath];
        }
        
        return $results;
    }

    /**
     * Import redirects from CSV
     */
    public function importFromCsv(string $csvPath): array
    {
        if (!file_exists($csvPath)) {
            throw new \InvalidArgumentException("CSV file not found: {$csvPath}");
        }

        $redirects = [];
        $handle = fopen($csvPath, 'r');
        $header = fgetcsv($handle);
        
        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);
            $redirects[] = [
                'from' => $data['from_path'] ?? '',
                'to' => $data['to_path'] ?? '',
                'status_code' => (int) ($data['status_code'] ?? 301),
                'options' => [
                    'reason' => $data['reason'] ?? 'CSV import'
                ]
            ];
        }
        
        fclose($handle);
        
        return $this->createBulkRedirects($redirects);
    }

    /**
     * Delete redirect
     */
    public function deleteRedirect(string $fromPath): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM redirects WHERE from_path = ?");
        $result = $stmt->execute([$this->normalizePath($fromPath)]);
        
        if ($result) {
            $this->clearCache();
        }
        
        return $result;
    }

    /**
     * Disable redirect
     */
    public function disableRedirect(string $fromPath): bool
    {
        $stmt = $this->pdo->prepare("UPDATE redirects SET is_active = 0 WHERE from_path = ?");
        $result = $stmt->execute([$this->normalizePath($fromPath)]);
        
        if ($result) {
            $this->clearCache();
        }
        
        return $result;
    }

    /**
     * Get all redirects with pagination
     */
    public function getRedirects(int $page = 1, int $limit = 50, array $filters = []): array
    {
        $offset = ($page - 1) * $limit;
        $where = ['is_active = 1'];
        $params = [];

        // Apply filters
        if (!empty($filters['from_path'])) {
            $where[] = 'from_path LIKE ?';
            $params[] = '%' . $filters['from_path'] . '%';
        }

        if (!empty($filters['to_path'])) {
            $where[] = 'to_path LIKE ?';
            $params[] = '%' . $filters['to_path'] . '%';
        }

        if (!empty($filters['status_code'])) {
            $where[] = 'status_code = ?';
            $params[] = $filters['status_code'];
        }

        $whereClause = implode(' AND ', $where);
        
        // Get total count
        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM redirects WHERE {$whereClause}");
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();

        // Get redirects
        $stmt = $this->pdo->prepare("
            SELECT * FROM redirects 
            WHERE {$whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ");
        
        $params[] = $limit;
        $params[] = $offset;
        $stmt->execute($params);
        
        return [
            'redirects' => $stmt->fetchAll(\PDO::FETCH_ASSOC),
            'pagination' => [
                'current_page' => $page,
                'total_pages' => ceil($totalCount / $limit),
                'total_items' => $totalCount,
                'per_page' => $limit
            ]
        ];
    }

    /**
     * Get redirect statistics
     */
    public function getStatistics(): array
    {
        $stats = [];

        // Total redirects
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM redirects WHERE is_active = 1");
        $stats['total_redirects'] = $stmt->fetchColumn();

        // By status code
        $stmt = $this->pdo->query("
            SELECT status_code, COUNT(*) as count 
            FROM redirects 
            WHERE is_active = 1 
            GROUP BY status_code
        ");
        $stats['by_status_code'] = $stmt->fetchAll(\PDO::FETCH_KEY_PAIR);

        // Recent redirects
        $stmt = $this->pdo->query("
            SELECT COUNT(*) 
            FROM redirects 
            WHERE is_active = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $stats['recent_redirects'] = $stmt->fetchColumn();

        // Expired redirects
        $stmt = $this->pdo->query("
            SELECT COUNT(*) 
            FROM redirects 
            WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < NOW()
        ");
        $stats['expired_redirects'] = $stmt->fetchColumn();

        // Most redirected paths
        $stmt = $this->pdo->query("
            SELECT from_path, COUNT(*) as hits 
            FROM redirect_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY from_path 
            ORDER BY hits DESC 
            LIMIT 10
        ");
        $stats['most_redirected'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return $stats;
    }

    /**
     * Log redirect usage
     */
    public function logRedirect(string $fromPath, string $toPath, array $context = []): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO redirect_logs (from_path, to_path, user_agent, ip_address, referer, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $this->normalizePath($fromPath),
            $this->normalizePath($toPath),
            $context['user_agent'] ?? '',
            $context['ip_address'] ?? '',
            $context['referer'] ?? ''
        ]);
    }

    /**
     * Clean up expired redirects
     */
    public function cleanupExpiredRedirects(): int
    {
        $stmt = $this->pdo->prepare("
            UPDATE redirects 
            SET is_active = 0 
            WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = 1
        ");
        
        $stmt->execute();
        $count = $stmt->rowCount();
        
        if ($count > 0) {
            $this->clearCache();
        }
        
        return $count;
    }

    /**
     * Generate canonical URL
     */
    public function generateCanonicalUrl(string $path, array $queryParams = []): string
    {
        // Check if there's a canonical redirect
        $redirect = $this->findRedirect($path);
        if ($redirect && $redirect['status_code'] === 301) {
            $path = $redirect['to_path'];
        }

        return $this->urlGenerator->generateCanonicalUrl($path, $queryParams);
    }

    /**
     * Validate redirect chain
     */
    public function validateRedirectChain(string $path, int $maxDepth = 10): array
    {
        $chain = [];
        $currentPath = $path;
        $depth = 0;

        while ($depth < $maxDepth) {
            $redirect = $this->findRedirect($currentPath);
            
            if (!$redirect) {
                break;
            }

            $chain[] = [
                'from' => $currentPath,
                'to' => $redirect['to_path'],
                'status_code' => $redirect['status_code'],
                'depth' => $depth
            ];

            // Check for circular redirects
            if (in_array($redirect['to_path'], array_column($chain, 'from'))) {
                $chain[] = ['error' => 'Circular redirect detected'];
                break;
            }

            $currentPath = $redirect['to_path'];
            $depth++;
        }

        if ($depth >= $maxDepth) {
            $chain[] = ['error' => 'Maximum redirect depth exceeded'];
        }

        return [
            'chain' => $chain,
            'final_destination' => $currentPath,
            'total_redirects' => count($chain),
            'is_valid' => !isset($chain[count($chain) - 1]['error'])
        ];
    }

    /**
     * Find exact redirect match
     */
    private function findExactRedirect(string $path): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM redirects 
            WHERE from_path = ? AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        
        $stmt->execute([$path]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        return $result ?: null;
    }

    /**
     * Find pattern-based redirect
     */
    private function findPatternRedirect(string $path): ?array
    {
        $stmt = $this->pdo->query("
            SELECT * FROM redirects 
            WHERE from_path LIKE '%{%}%' AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
        ");
        
        while ($redirect = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            if ($this->matchesPattern($path, $redirect['from_path'])) {
                // Replace parameters in destination
                $redirect['to_path'] = $this->replacePatternParameters($path, $redirect['from_path'], $redirect['to_path']);
                return $redirect;
            }
        }
        
        return null;
    }

    /**
     * Find alias redirect
     */
    private function findAliasRedirect(string $path): ?array
    {
        $aliases = UrlConfig::getAllAliases();
        
        foreach ($aliases as $from => $to) {
            if ($path === $from || $this->matchesPattern($path, $from)) {
                return [
                    'from_path' => $from,
                    'to_path' => $to,
                    'status_code' => 301,
                    'reason' => 'URL alias',
                    'is_alias' => true
                ];
            }
        }
        
        return null;
    }

    /**
     * Check if path matches pattern
     */
    private function matchesPattern(string $path, string $pattern): bool
    {
        $regex = preg_replace('/\{[^}]+\}/', '([^/]+)', preg_quote($pattern, '/'));
        return preg_match("/^{$regex}$/", $path) === 1;
    }

    /**
     * Replace pattern parameters
     */
    private function replacePatternParameters(string $path, string $fromPattern, string $toPattern): string
    {
        $fromRegex = preg_replace('/\{([^}]+)\}/', '(?P<$1>[^/]+)', preg_quote($fromPattern, '/'));
        
        if (preg_match("/^{$fromRegex}$/", $path, $matches)) {
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $toPattern = str_replace('{' . $key . '}', $value, $toPattern);
                }
            }
        }
        
        return $toPattern;
    }

    /**
     * Normalize path for consistent storage
     */
    private function normalizePath(string $path): string
    {
        // Remove query string
        $path = strtok($path, '?');
        
        // Ensure starts with /
        if (substr($path, 0, 1) !== '/') {
            $path = '/' . $path;
        }
        
        // Remove trailing slash (except root)
        if ($path !== '/' && substr($path, -1) === '/') {
            $path = rtrim($path, '/');
        }
        
        return $path;
    }

    /**
     * Get redirect headers
     */
    private function getRedirectHeaders(array $redirect): array
    {
        $headers = [
            'Location' => $redirect['to_path']
        ];

        // Add cache headers for permanent redirects
        if ($redirect['status_code'] === 301) {
            $headers['Cache-Control'] = 'public, max-age=31536000'; // 1 year
        }

        return $headers;
    }

    /**
     * Clear redirect cache
     */
    private function clearCache(): void
    {
        $this->redirectCache = [];
    }

    /**
     * Create redirect tables if they don't exist
     */
    private function createRedirectTables(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS redirects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                from_path VARCHAR(500) NOT NULL,
                to_path VARCHAR(500) NOT NULL,
                status_code INT NOT NULL DEFAULT 301,
                reason VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                UNIQUE KEY unique_from_path (from_path),
                INDEX idx_from_path (from_path),
                INDEX idx_is_active (is_active),
                INDEX idx_expires_at (expires_at)
            )
        ");

        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS redirect_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                from_path VARCHAR(500) NOT NULL,
                to_path VARCHAR(500) NOT NULL,
                user_agent TEXT,
                ip_address VARCHAR(45),
                referer VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_from_path (from_path),
                INDEX idx_created_at (created_at)
            )
        ");
    }
}
