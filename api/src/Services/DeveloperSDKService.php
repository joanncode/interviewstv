<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Developer SDK Service
 * 
 * Manages SDK versions, downloads, usage analytics, code examples, and developer tools
 * for the Interviews.tv integration platform.
 */
class DeveloperSDKService
{
    private PDO $db;

    public function __construct(PDO $database)
    {
        $this->db = $database;
    }

    /**
     * Get available SDK versions by language
     */
    public function getSDKVersions(array $options = []): array
    {
        try {
            $language = $options['language'] ?? '';
            $includeDeprecated = $options['include_deprecated'] ?? false;
            $releaseType = $options['release_type'] ?? '';

            $sql = "
                SELECT 
                    version_id,
                    version_number,
                    language,
                    release_type,
                    release_notes,
                    changelog,
                    download_url,
                    documentation_url,
                    github_url,
                    npm_package,
                    pypi_package,
                    composer_package,
                    maven_coordinates,
                    nuget_package,
                    gem_name,
                    go_module,
                    file_size_bytes,
                    is_deprecated,
                    min_api_version,
                    max_api_version,
                    created_at
                FROM sdk_versions
                WHERE is_active = 1
            ";

            $params = [];

            if ($language) {
                $sql .= " AND language = ?";
                $params[] = $language;
            }

            if (!$includeDeprecated) {
                $sql .= " AND is_deprecated = 0";
            }

            if ($releaseType) {
                $sql .= " AND release_type = ?";
                $params[] = $releaseType;
            }

            $sql .= " ORDER BY language ASC, version_number DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get download statistics for each version
            foreach ($versions as &$version) {
                $version['download_stats'] = $this->getVersionDownloadStats($version['version_id']);
            }

            return [
                'success' => true,
                'data' => $versions,
                'total_versions' => count($versions)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve SDK versions: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get download statistics for a version
     */
    public function getVersionDownloadStats(string $versionId): array
    {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_downloads,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    download_type,
                    COUNT(*) as type_count
                FROM sdk_downloads
                WHERE version_id = ?
                AND download_timestamp >= DATE('now', '-30 days')
                GROUP BY download_type
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([$versionId]);
            $typeStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total stats
            $totalSql = "
                SELECT 
                    COUNT(*) as total_downloads,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips
                FROM sdk_downloads
                WHERE version_id = ?
                AND download_timestamp >= DATE('now', '-30 days')
            ";

            $stmt = $this->db->prepare($totalSql);
            $stmt->execute([$versionId]);
            $totalStats = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'total_stats' => $totalStats,
                'by_type' => $typeStats
            ];

        } catch (Exception $e) {
            return [
                'total_stats' => ['total_downloads' => 0, 'unique_users' => 0, 'unique_ips' => 0],
                'by_type' => []
            ];
        }
    }

    /**
     * Track SDK download
     */
    public function trackDownload(array $downloadData): array
    {
        try {
            $downloadId = 'download_' . uniqid();
            
            $sql = "
                INSERT INTO sdk_downloads (
                    download_id, version_id, user_id, download_type,
                    user_agent, ip_address, country_code, referrer_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $downloadId,
                $downloadData['version_id'],
                $downloadData['user_id'] ?? null,
                $downloadData['download_type'] ?? 'direct',
                $downloadData['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '',
                $downloadData['ip_address'] ?? $_SERVER['REMOTE_ADDR'] ?? '',
                $downloadData['country_code'] ?? null,
                $downloadData['referrer_url'] ?? $_SERVER['HTTP_REFERER'] ?? ''
            ]);

            return [
                'success' => true,
                'data' => ['download_id' => $downloadId]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to track download: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get code examples by language and category
     */
    public function getCodeExamples(array $options = []): array
    {
        try {
            $language = $options['language'] ?? '';
            $category = $options['category'] ?? '';
            $complexity = $options['complexity'] ?? '';
            $featured = $options['featured'] ?? false;

            $sql = "
                SELECT 
                    example_id,
                    language,
                    category,
                    title,
                    description,
                    code_snippet,
                    dependencies,
                    complexity_level,
                    tags,
                    is_featured,
                    view_count,
                    like_count,
                    created_at
                FROM sdk_code_examples
                WHERE 1=1
            ";

            $params = [];

            if ($language) {
                $sql .= " AND language = ?";
                $params[] = $language;
            }

            if ($category) {
                $sql .= " AND category = ?";
                $params[] = $category;
            }

            if ($complexity) {
                $sql .= " AND complexity_level = ?";
                $params[] = $complexity;
            }

            if ($featured) {
                $sql .= " AND is_featured = 1";
            }

            $sql .= " ORDER BY is_featured DESC, view_count DESC, title ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $examples = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($examples as &$example) {
                $example['dependencies'] = $example['dependencies'] ? json_decode($example['dependencies'], true) : [];
                $example['tags'] = $example['tags'] ? json_decode($example['tags'], true) : [];
            }

            return [
                'success' => true,
                'data' => $examples,
                'total_examples' => count($examples)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve code examples: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get SDK documentation by language and section
     */
    public function getDocumentation(array $options = []): array
    {
        try {
            $language = $options['language'] ?? '';
            $section = $options['section'] ?? '';

            $sql = "
                SELECT 
                    doc_id,
                    language,
                    section,
                    title,
                    slug,
                    content,
                    content_type,
                    sort_order,
                    view_count,
                    created_at,
                    updated_at
                FROM sdk_documentation
                WHERE is_published = 1
            ";

            $params = [];

            if ($language) {
                $sql .= " AND language = ?";
                $params[] = $language;
            }

            if ($section) {
                $sql .= " AND section = ?";
                $params[] = $section;
            }

            $sql .= " ORDER BY language ASC, sort_order ASC, title ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $docs,
                'total_docs' => count($docs)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve documentation: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get SDK integrations and examples
     */
    public function getIntegrations(array $options = []): array
    {
        try {
            $language = $options['language'] ?? '';
            $framework = $options['framework'] ?? '';
            $category = $options['category'] ?? '';
            $featured = $options['featured'] ?? false;

            $sql = "
                SELECT 
                    integration_id,
                    name,
                    description,
                    language,
                    framework,
                    category,
                    github_url,
                    demo_url,
                    screenshot_url,
                    complexity_level,
                    features,
                    tags,
                    is_featured,
                    view_count,
                    star_count,
                    fork_count,
                    created_at
                FROM sdk_integrations
                WHERE 1=1
            ";

            $params = [];

            if ($language) {
                $sql .= " AND language = ?";
                $params[] = $language;
            }

            if ($framework) {
                $sql .= " AND framework = ?";
                $params[] = $framework;
            }

            if ($category) {
                $sql .= " AND category = ?";
                $params[] = $category;
            }

            if ($featured) {
                $sql .= " AND is_featured = 1";
            }

            $sql .= " ORDER BY is_featured DESC, star_count DESC, view_count DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $integrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($integrations as &$integration) {
                $integration['features'] = $integration['features'] ? json_decode($integration['features'], true) : [];
                $integration['tags'] = $integration['tags'] ? json_decode($integration['tags'], true) : [];
            }

            return [
                'success' => true,
                'data' => $integrations,
                'total_integrations' => count($integrations)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve integrations: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get SDK performance metrics
     */
    public function getPerformanceMetrics(array $options = []): array
    {
        try {
            $language = $options['language'] ?? '';
            $startDate = $options['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $options['end_date'] ?? date('Y-m-d');

            $sql = "
                SELECT 
                    v.language,
                    v.version_number,
                    p.metric_date,
                    p.total_downloads,
                    p.active_installations,
                    p.api_calls_count,
                    p.avg_response_time_ms,
                    p.error_rate_percent,
                    p.crash_rate_percent,
                    p.user_satisfaction_score,
                    p.performance_score
                FROM sdk_performance_metrics p
                JOIN sdk_versions v ON p.version_id = v.version_id
                WHERE p.metric_date BETWEEN ? AND ?
            ";

            $params = [$startDate, $endDate];

            if ($language) {
                $sql .= " AND v.language = ?";
                $params[] = $language;
            }

            $sql .= " ORDER BY p.metric_date DESC, v.language ASC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $metrics = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $metrics,
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to retrieve performance metrics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        return [
            'success' => true,
            'data' => [
                'supported_languages' => [
                    'javascript' => 'JavaScript/Node.js',
                    'python' => 'Python',
                    'php' => 'PHP',
                    'java' => 'Java',
                    'csharp' => 'C#/.NET',
                    'ruby' => 'Ruby',
                    'go' => 'Go'
                ],
                'latest_versions' => [
                    'javascript' => '1.1.0',
                    'python' => '1.0.0',
                    'php' => '1.0.0',
                    'java' => '1.0.0',
                    'csharp' => '1.0.0',
                    'ruby' => '1.0.0',
                    'go' => '1.0.0'
                ],
                'total_downloads' => 45230,
                'active_developers' => 1250,
                'github_stars' => 890,
                'code_examples' => 45,
                'integrations' => 12
            ]
        ];
    }
}
