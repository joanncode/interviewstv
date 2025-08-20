<?php

namespace App\Services\Integrations;

use App\Services\Integrations\LinkedInIntegration;
use App\Services\Integrations\GitHubIntegration;
use App\Services\Integrations\SlackIntegration;

class IntegrationManager
{
    private $pdo;
    private $linkedIn;
    private $github;
    private $slack;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->linkedIn = new LinkedInIntegration();
        $this->github = new GitHubIntegration();
        $this->slack = new SlackIntegration();
    }
    
    /**
     * Get available integrations for user
     */
    public function getAvailableIntegrations($userId)
    {
        $integrations = [
            'linkedin' => [
                'name' => 'LinkedIn',
                'description' => 'Import your professional profile and share interviews',
                'icon' => 'fab fa-linkedin',
                'color' => '#0077B5',
                'features' => [
                    'Import professional profile',
                    'Sync work experience and skills',
                    'Share interviews on LinkedIn',
                    'Profile completeness analysis'
                ],
                'connected' => $this->isIntegrationConnected($userId, 'linkedin'),
                'auth_url' => $this->linkedIn->getAuthorizationUrl()
            ],
            'github' => [
                'name' => 'GitHub',
                'description' => 'Showcase your coding skills and projects',
                'icon' => 'fab fa-github',
                'color' => '#333333',
                'features' => [
                    'Import repositories and projects',
                    'Analyze coding skills',
                    'Generate developer portfolio',
                    'Track contribution activity'
                ],
                'connected' => $this->isIntegrationConnected($userId, 'github'),
                'auth_url' => $this->github->getAuthorizationUrl()
            ],
            'slack' => [
                'name' => 'Slack',
                'description' => 'Get notifications and share updates in Slack',
                'icon' => 'fab fa-slack',
                'color' => '#4A154B',
                'features' => [
                    'Interview completion notifications',
                    'AI analysis results sharing',
                    'Team collaboration features',
                    'Daily summary reports'
                ],
                'connected' => $this->isIntegrationConnected($userId, 'slack'),
                'auth_url' => $this->slack->getAuthorizationUrl()
            ]
        ];
        
        return $integrations;
    }
    
    /**
     * Connect integration for user
     */
    public function connectIntegration($userId, $platform, $authCode)
    {
        try {
            switch ($platform) {
                case 'linkedin':
                    $tokenData = $this->linkedIn->getAccessToken($authCode);
                    $profileData = $this->linkedIn->importProfile($userId, $tokenData['access_token']);
                    break;
                    
                case 'github':
                    $tokenData = $this->github->getAccessToken($authCode);
                    $profileData = $this->github->importProfile($userId, $tokenData['access_token']);
                    break;
                    
                case 'slack':
                    $tokenData = $this->slack->getAccessToken($authCode);
                    $workspaceInfo = $this->slack->getWorkspaceInfo($tokenData['access_token']);
                    $profileData = ['workspace' => $workspaceInfo];
                    break;
                    
                default:
                    throw new \Exception('Unsupported platform: ' . $platform);
            }
            
            // Save integration data
            $this->saveIntegration($userId, $platform, $tokenData, $profileData);
            
            return [
                'success' => true,
                'platform' => $platform,
                'profile_data' => $profileData,
                'connected_at' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Exception $e) {
            throw new \Exception('Failed to connect ' . $platform . ': ' . $e->getMessage());
        }
    }
    
    /**
     * Disconnect integration
     */
    public function disconnectIntegration($userId, $platform)
    {
        $sql = "DELETE FROM user_integrations WHERE user_id = ? AND platform = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $platform]);
        
        return ['success' => true, 'platform' => $platform];
    }
    
    /**
     * Get user's connected integrations
     */
    public function getUserIntegrations($userId)
    {
        $sql = "SELECT * FROM user_integrations WHERE user_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        $integrations = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $integrations[$row['platform']] = [
                'platform' => $row['platform'],
                'connected_at' => $row['created_at'],
                'last_sync' => $row['last_sync'],
                'profile_data' => json_decode($row['profile_data'], true),
                'status' => $row['status']
            ];
        }
        
        return $integrations;
    }
    
    /**
     * Sync all integrations for user
     */
    public function syncUserIntegrations($userId)
    {
        $integrations = $this->getUserIntegrations($userId);
        $syncResults = [];
        
        foreach ($integrations as $platform => $integration) {
            try {
                $result = $this->syncIntegration($userId, $platform);
                $syncResults[$platform] = $result;
            } catch (\Exception $e) {
                $syncResults[$platform] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $syncResults;
    }
    
    /**
     * Sync specific integration
     */
    public function syncIntegration($userId, $platform)
    {
        $integration = $this->getIntegration($userId, $platform);
        
        if (!$integration) {
            throw new \Exception('Integration not found');
        }
        
        $tokenData = json_decode($integration['token_data'], true);
        $accessToken = $tokenData['access_token'];
        
        switch ($platform) {
            case 'linkedin':
                $profileData = $this->linkedIn->importProfile($userId, $accessToken);
                break;
                
            case 'github':
                $profileData = $this->github->importProfile($userId, $accessToken);
                break;
                
            case 'slack':
                $workspaceInfo = $this->slack->getWorkspaceInfo($accessToken);
                $profileData = ['workspace' => $workspaceInfo];
                break;
                
            default:
                throw new \Exception('Unsupported platform: ' . $platform);
        }
        
        // Update integration data
        $this->updateIntegrationData($userId, $platform, $profileData);
        
        return [
            'success' => true,
            'platform' => $platform,
            'synced_at' => date('Y-m-d H:i:s'),
            'profile_data' => $profileData
        ];
    }
    
    /**
     * Share interview on connected platforms
     */
    public function shareInterview($userId, $interviewId, $platforms = [])
    {
        $interview = $this->getInterviewData($interviewId);
        $userIntegrations = $this->getUserIntegrations($userId);
        $shareResults = [];
        
        foreach ($platforms as $platform) {
            if (!isset($userIntegrations[$platform])) {
                $shareResults[$platform] = [
                    'success' => false,
                    'error' => 'Integration not connected'
                ];
                continue;
            }
            
            try {
                $integration = $this->getIntegration($userId, $platform);
                $tokenData = json_decode($integration['token_data'], true);
                $accessToken = $tokenData['access_token'];
                
                switch ($platform) {
                    case 'linkedin':
                        $result = $this->linkedIn->shareInterview($accessToken, $interview);
                        break;
                        
                    case 'slack':
                        $channels = $this->getSlackChannels($userId);
                        $defaultChannel = $channels[0]['id'] ?? 'general';
                        $result = $this->slack->shareInterviewCompletion($accessToken, $defaultChannel, $interview);
                        break;
                        
                    default:
                        throw new \Exception('Sharing not supported for ' . $platform);
                }
                
                $shareResults[$platform] = [
                    'success' => true,
                    'result' => $result
                ];
                
            } catch (\Exception $e) {
                $shareResults[$platform] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $shareResults;
    }
    
    /**
     * Send notifications to connected platforms
     */
    public function sendNotifications($userId, $notificationType, $data)
    {
        $userIntegrations = $this->getUserIntegrations($userId);
        $notificationResults = [];
        
        foreach ($userIntegrations as $platform => $integration) {
            if ($platform !== 'slack') continue; // Only Slack supports notifications currently
            
            try {
                $integrationData = $this->getIntegration($userId, $platform);
                $tokenData = json_decode($integrationData['token_data'], true);
                $accessToken = $tokenData['access_token'];
                
                $channels = $this->getSlackChannels($userId);
                $defaultChannel = $channels[0]['id'] ?? 'general';
                
                switch ($notificationType) {
                    case 'interview_completed':
                        $result = $this->slack->shareInterviewCompletion($accessToken, $defaultChannel, $data);
                        break;
                        
                    case 'ai_analysis_complete':
                        $result = $this->slack->shareAIAnalysis($accessToken, $defaultChannel, $data);
                        break;
                        
                    case 'interview_reminder':
                        $result = $this->slack->sendInterviewReminder($accessToken, $defaultChannel, $data['interview'], $data['reminder_time']);
                        break;
                        
                    default:
                        continue 2; // Skip this platform
                }
                
                $notificationResults[$platform] = [
                    'success' => true,
                    'result' => $result
                ];
                
            } catch (\Exception $e) {
                $notificationResults[$platform] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        return $notificationResults;
    }
    
    /**
     * Get integration insights and analytics
     */
    public function getIntegrationInsights($userId)
    {
        $integrations = $this->getUserIntegrations($userId);
        $insights = [];
        
        foreach ($integrations as $platform => $integration) {
            switch ($platform) {
                case 'linkedin':
                    $insights[$platform] = $this->getLinkedInInsights($integration['profile_data']);
                    break;
                    
                case 'github':
                    $insights[$platform] = $this->getGitHubInsights($integration['profile_data']);
                    break;
                    
                case 'slack':
                    $insights[$platform] = $this->getSlackInsights($integration['profile_data']);
                    break;
            }
        }
        
        return $insights;
    }
    
    /**
     * Check if integration is connected
     */
    private function isIntegrationConnected($userId, $platform)
    {
        $sql = "SELECT COUNT(*) FROM user_integrations WHERE user_id = ? AND platform = ? AND status = 'active'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $platform]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    /**
     * Save integration data
     */
    private function saveIntegration($userId, $platform, $tokenData, $profileData)
    {
        $sql = "INSERT INTO user_integrations (user_id, platform, token_data, profile_data, status, created_at) 
                VALUES (?, ?, ?, ?, 'active', NOW())
                ON DUPLICATE KEY UPDATE 
                token_data = VALUES(token_data), 
                profile_data = VALUES(profile_data), 
                last_sync = NOW()";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $userId,
            $platform,
            json_encode($tokenData),
            json_encode($profileData)
        ]);
    }
    
    /**
     * Get integration data
     */
    private function getIntegration($userId, $platform)
    {
        $sql = "SELECT * FROM user_integrations WHERE user_id = ? AND platform = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $platform]);
        
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }
    
    /**
     * Update integration data
     */
    private function updateIntegrationData($userId, $platform, $profileData)
    {
        $sql = "UPDATE user_integrations SET profile_data = ?, last_sync = NOW() WHERE user_id = ? AND platform = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([json_encode($profileData), $userId, $platform]);
    }
    
    /**
     * Get interview data
     */
    private function getInterviewData($interviewId)
    {
        // This would fetch interview data from database
        // Placeholder implementation
        return [
            'id' => $interviewId,
            'title' => 'Sample Interview',
            'description' => 'Sample interview description',
            'url' => "https://interviews.tv/interviews/{$interviewId}",
            'category' => 'Technology',
            'tags' => ['javascript', 'react', 'frontend']
        ];
    }
    
    /**
     * Get Slack channels for user
     */
    private function getSlackChannels($userId)
    {
        // This would fetch user's Slack channels
        // Placeholder implementation
        return [
            ['id' => 'C1234567890', 'name' => 'general'],
            ['id' => 'C0987654321', 'name' => 'interviews']
        ];
    }
    
    /**
     * Get LinkedIn insights
     */
    private function getLinkedInInsights($profileData)
    {
        return [
            'profile_completeness' => $profileData['profile_completeness'] ?? 0,
            'connections_count' => $profileData['profile_data']['connections'] ?? 0,
            'experience_years' => count($profileData['experience'] ?? []),
            'skills_count' => count($profileData['skills'] ?? [])
        ];
    }
    
    /**
     * Get GitHub insights
     */
    private function getGitHubInsights($profileData)
    {
        return [
            'repositories_count' => $profileData['skills']['total_repos'] ?? 0,
            'total_stars' => $profileData['skills']['total_stars'] ?? 0,
            'languages_count' => count($profileData['skills']['languages'] ?? []),
            'experience_level' => $profileData['skills']['experience_level'] ?? 'beginner'
        ];
    }
    
    /**
     * Get Slack insights
     */
    private function getSlackInsights($profileData)
    {
        return [
            'workspace_name' => $profileData['workspace']['name'] ?? '',
            'member_count' => $profileData['workspace']['member_count'] ?? 0,
            'connected_channels' => 0 // Would be calculated from actual data
        ];
    }
}
