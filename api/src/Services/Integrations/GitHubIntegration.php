<?php

namespace App\Services\Integrations;

class GitHubIntegration
{
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    private $apiBaseUrl = 'https://api.github.com';
    
    public function __construct()
    {
        $this->clientId = $_ENV['GITHUB_CLIENT_ID'] ?? '';
        $this->clientSecret = $_ENV['GITHUB_CLIENT_SECRET'] ?? '';
        $this->redirectUri = $_ENV['GITHUB_REDIRECT_URI'] ?? '';
    }
    
    /**
     * Get GitHub OAuth authorization URL
     */
    public function getAuthorizationUrl($state = null, $scopes = ['user:email', 'public_repo'])
    {
        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'scope' => implode(' ', $scopes),
            'state' => $state ?: bin2hex(random_bytes(16))
        ];
        
        return 'https://github.com/login/oauth/authorize?' . http_build_query($params);
    }
    
    /**
     * Exchange authorization code for access token
     */
    public function getAccessToken($code)
    {
        $data = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code' => $code,
            'redirect_uri' => $this->redirectUri
        ];
        
        $headers = ['Accept: application/json'];
        $response = $this->makeRequest('POST', 'https://github.com/login/oauth/access_token', $data, $headers);
        
        if (isset($response['access_token'])) {
            return $response;
        }
        
        throw new \Exception('Failed to get access token: ' . json_encode($response));
    }
    
    /**
     * Get user profile information
     */
    public function getUserProfile($accessToken)
    {
        $headers = ['Authorization: token ' . $accessToken];
        
        $user = $this->makeRequest('GET', $this->apiBaseUrl . '/user', null, $headers);
        $emails = $this->makeRequest('GET', $this->apiBaseUrl . '/user/emails', null, $headers);
        
        // Find primary email
        $primaryEmail = '';
        foreach ($emails as $email) {
            if ($email['primary']) {
                $primaryEmail = $email['email'];
                break;
            }
        }
        
        return [
            'id' => $user['id'],
            'username' => $user['login'],
            'name' => $user['name'] ?? '',
            'email' => $primaryEmail,
            'avatar_url' => $user['avatar_url'],
            'bio' => $user['bio'] ?? '',
            'company' => $user['company'] ?? '',
            'location' => $user['location'] ?? '',
            'blog' => $user['blog'] ?? '',
            'public_repos' => $user['public_repos'],
            'followers' => $user['followers'],
            'following' => $user['following'],
            'created_at' => $user['created_at'],
            'profile_url' => $user['html_url']
        ];
    }
    
    /**
     * Get user's repositories
     */
    public function getRepositories($accessToken, $type = 'owner', $sort = 'updated', $per_page = 30)
    {
        $headers = ['Authorization: token ' . $accessToken];
        $params = [
            'type' => $type,
            'sort' => $sort,
            'per_page' => $per_page
        ];
        
        $repos = $this->makeRequest('GET', $this->apiBaseUrl . '/user/repos?' . http_build_query($params), null, $headers);
        
        $repositories = [];
        foreach ($repos as $repo) {
            $repositories[] = [
                'id' => $repo['id'],
                'name' => $repo['name'],
                'full_name' => $repo['full_name'],
                'description' => $repo['description'] ?? '',
                'language' => $repo['language'] ?? '',
                'stars' => $repo['stargazers_count'],
                'forks' => $repo['forks_count'],
                'size' => $repo['size'],
                'is_private' => $repo['private'],
                'is_fork' => $repo['fork'],
                'url' => $repo['html_url'],
                'clone_url' => $repo['clone_url'],
                'created_at' => $repo['created_at'],
                'updated_at' => $repo['updated_at'],
                'topics' => $repo['topics'] ?? []
            ];
        }
        
        return $repositories;
    }
    
    /**
     * Get repository languages
     */
    public function getRepositoryLanguages($accessToken, $owner, $repo)
    {
        $headers = ['Authorization: token ' . $accessToken];
        $languages = $this->makeRequest('GET', $this->apiBaseUrl . "/repos/{$owner}/{$repo}/languages", null, $headers);
        
        // Calculate percentages
        $total = array_sum($languages);
        $languageStats = [];
        
        foreach ($languages as $language => $bytes) {
            $languageStats[] = [
                'language' => $language,
                'bytes' => $bytes,
                'percentage' => $total > 0 ? round(($bytes / $total) * 100, 2) : 0
            ];
        }
        
        // Sort by percentage
        usort($languageStats, function($a, $b) {
            return $b['percentage'] <=> $a['percentage'];
        });
        
        return $languageStats;
    }
    
    /**
     * Get user's contribution activity
     */
    public function getContributionActivity($accessToken, $username)
    {
        $headers = ['Authorization: token ' . $accessToken];
        
        // Get events (last 30 events)
        $events = $this->makeRequest('GET', $this->apiBaseUrl . "/users/{$username}/events?per_page=30", null, $headers);
        
        $activity = [
            'total_events' => count($events),
            'push_events' => 0,
            'pull_request_events' => 0,
            'issue_events' => 0,
            'create_events' => 0,
            'recent_activity' => []
        ];
        
        foreach ($events as $event) {
            // Count event types
            switch ($event['type']) {
                case 'PushEvent':
                    $activity['push_events']++;
                    break;
                case 'PullRequestEvent':
                    $activity['pull_request_events']++;
                    break;
                case 'IssuesEvent':
                    $activity['issue_events']++;
                    break;
                case 'CreateEvent':
                    $activity['create_events']++;
                    break;
            }
            
            // Add to recent activity
            $activity['recent_activity'][] = [
                'type' => $event['type'],
                'repo' => $event['repo']['name'],
                'created_at' => $event['created_at'],
                'public' => $event['public']
            ];
        }
        
        return $activity;
    }
    
    /**
     * Analyze coding skills from repositories
     */
    public function analyzeCodingSkills($accessToken, $username)
    {
        $repos = $this->getRepositories($accessToken);
        
        $skills = [
            'languages' => [],
            'frameworks' => [],
            'tools' => [],
            'total_repos' => count($repos),
            'total_stars' => 0,
            'total_forks' => 0,
            'experience_level' => 'beginner'
        ];
        
        $languageCount = [];
        $frameworkPatterns = [
            'react' => ['react', 'jsx', 'next.js', 'gatsby'],
            'vue' => ['vue', 'nuxt'],
            'angular' => ['angular', 'typescript'],
            'django' => ['django', 'python'],
            'rails' => ['rails', 'ruby'],
            'express' => ['express', 'node.js'],
            'spring' => ['spring', 'java'],
            'laravel' => ['laravel', 'php']
        ];
        
        foreach ($repos as $repo) {
            // Count languages
            if ($repo['language']) {
                $languageCount[$repo['language']] = ($languageCount[$repo['language']] ?? 0) + 1;
            }
            
            // Detect frameworks from description and topics
            $text = strtolower($repo['description'] . ' ' . implode(' ', $repo['topics']));
            foreach ($frameworkPatterns as $framework => $patterns) {
                foreach ($patterns as $pattern) {
                    if (strpos($text, $pattern) !== false) {
                        $skills['frameworks'][$framework] = ($skills['frameworks'][$framework] ?? 0) + 1;
                        break;
                    }
                }
            }
            
            $skills['total_stars'] += $repo['stars'];
            $skills['total_forks'] += $repo['forks'];
        }
        
        // Sort languages by frequency
        arsort($languageCount);
        $skills['languages'] = array_keys(array_slice($languageCount, 0, 10));
        
        // Sort frameworks by frequency
        arsort($skills['frameworks']);
        $skills['frameworks'] = array_keys($skills['frameworks']);
        
        // Determine experience level
        $skills['experience_level'] = $this->determineExperienceLevel($skills);
        
        return $skills;
    }
    
    /**
     * Get repository README content
     */
    public function getRepositoryReadme($accessToken, $owner, $repo)
    {
        $headers = ['Authorization: token ' . $accessToken];
        
        try {
            $readme = $this->makeRequest('GET', $this->apiBaseUrl . "/repos/{$owner}/{$repo}/readme", null, $headers);
            
            if (isset($readme['content'])) {
                return [
                    'content' => base64_decode($readme['content']),
                    'encoding' => $readme['encoding'],
                    'size' => $readme['size'],
                    'name' => $readme['name'],
                    'path' => $readme['path']
                ];
            }
        } catch (\Exception $e) {
            // README not found
        }
        
        return null;
    }
    
    /**
     * Create a gist for code sharing
     */
    public function createGist($accessToken, $files, $description = '', $public = true)
    {
        $headers = [
            'Authorization: token ' . $accessToken,
            'Content-Type: application/json'
        ];
        
        $data = [
            'description' => $description,
            'public' => $public,
            'files' => $files
        ];
        
        $gist = $this->makeRequest('POST', $this->apiBaseUrl . '/gists', $data, $headers);
        
        return [
            'id' => $gist['id'],
            'url' => $gist['html_url'],
            'git_pull_url' => $gist['git_pull_url'],
            'created_at' => $gist['created_at'],
            'public' => $gist['public'],
            'files' => array_keys($gist['files'])
        ];
    }
    
    /**
     * Import GitHub profile data
     */
    public function importProfile($userId, $accessToken)
    {
        try {
            $profile = $this->getUserProfile($accessToken);
            $repos = $this->getRepositories($accessToken);
            $skills = $this->analyzeCodingSkills($accessToken, $profile['username']);
            $activity = $this->getContributionActivity($accessToken, $profile['username']);
            
            $importData = [
                'user_id' => $userId,
                'github_id' => $profile['id'],
                'username' => $profile['username'],
                'profile_data' => $profile,
                'repositories' => $repos,
                'skills' => $skills,
                'activity' => $activity,
                'imported_at' => date('Y-m-d H:i:s')
            ];
            
            // Save to database
            $this->saveGitHubData($importData);
            
            return $importData;
            
        } catch (\Exception $e) {
            throw new \Exception('Failed to import GitHub profile: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate portfolio from GitHub data
     */
    public function generatePortfolio($githubData)
    {
        $portfolio = [
            'summary' => $this->generateSummary($githubData),
            'featured_projects' => $this->selectFeaturedProjects($githubData['repositories']),
            'skills_showcase' => $this->createSkillsShowcase($githubData['skills']),
            'contribution_stats' => $this->formatContributionStats($githubData['activity']),
            'github_stats' => [
                'total_repos' => count($githubData['repositories']),
                'total_stars' => array_sum(array_column($githubData['repositories'], 'stars')),
                'total_forks' => array_sum(array_column($githubData['repositories'], 'forks')),
                'languages' => $githubData['skills']['languages']
            ]
        ];
        
        return $portfolio;
    }
    
    /**
     * Determine experience level based on GitHub activity
     */
    private function determineExperienceLevel($skills)
    {
        $score = 0;
        
        // Repository count
        if ($skills['total_repos'] > 20) $score += 3;
        elseif ($skills['total_repos'] > 10) $score += 2;
        elseif ($skills['total_repos'] > 5) $score += 1;
        
        // Stars received
        if ($skills['total_stars'] > 100) $score += 3;
        elseif ($skills['total_stars'] > 50) $score += 2;
        elseif ($skills['total_stars'] > 10) $score += 1;
        
        // Language diversity
        if (count($skills['languages']) > 5) $score += 2;
        elseif (count($skills['languages']) > 3) $score += 1;
        
        // Framework knowledge
        if (count($skills['frameworks']) > 3) $score += 2;
        elseif (count($skills['frameworks']) > 1) $score += 1;
        
        if ($score >= 8) return 'expert';
        if ($score >= 5) return 'advanced';
        if ($score >= 3) return 'intermediate';
        return 'beginner';
    }
    
    /**
     * Generate profile summary
     */
    private function generateSummary($githubData)
    {
        $profile = $githubData['profile_data'];
        $skills = $githubData['skills'];
        
        $summary = "Developer with {$skills['total_repos']} public repositories";
        
        if (!empty($skills['languages'])) {
            $topLanguages = array_slice($skills['languages'], 0, 3);
            $summary .= ", specializing in " . implode(', ', $topLanguages);
        }
        
        if ($skills['total_stars'] > 0) {
            $summary .= ". Projects have received {$skills['total_stars']} stars";
        }
        
        $summary .= " on GitHub.";
        
        return $summary;
    }
    
    /**
     * Select featured projects
     */
    private function selectFeaturedProjects($repositories)
    {
        // Sort by stars and select top projects
        usort($repositories, function($a, $b) {
            return $b['stars'] <=> $a['stars'];
        });
        
        return array_slice($repositories, 0, 6);
    }
    
    /**
     * Create skills showcase
     */
    private function createSkillsShowcase($skills)
    {
        return [
            'primary_languages' => array_slice($skills['languages'], 0, 5),
            'frameworks' => $skills['frameworks'],
            'experience_level' => $skills['experience_level'],
            'repository_count' => $skills['total_repos']
        ];
    }
    
    /**
     * Format contribution stats
     */
    private function formatContributionStats($activity)
    {
        return [
            'recent_activity_count' => $activity['total_events'],
            'push_events' => $activity['push_events'],
            'pull_requests' => $activity['pull_request_events'],
            'issues' => $activity['issue_events']
        ];
    }
    
    /**
     * Make HTTP request
     */
    private function makeRequest($method, $url, $data = null, $headers = [])
    {
        $curl = curl_init();
        
        $defaultHeaders = [
            'Accept: application/vnd.github.v3+json',
            'User-Agent: Interviews.tv/1.0'
        ];
        
        $headers = array_merge($defaultHeaders, $headers);
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        if ($method === 'POST') {
            curl_setopt($curl, CURLOPT_POST, true);
            if ($data) {
                if (in_array('Content-Type: application/json', $headers)) {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
                } else {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
                }
            }
        }
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        if ($error) {
            throw new \Exception('cURL error: ' . $error);
        }
        
        if ($httpCode >= 400) {
            throw new \Exception('HTTP error: ' . $httpCode . ' - ' . $response);
        }
        
        return json_decode($response, true);
    }
    
    /**
     * Save GitHub data to database
     */
    private function saveGitHubData($data)
    {
        // Implementation would save to github_integrations table
        // This is a placeholder for the actual database operation
    }
}
