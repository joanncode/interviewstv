<?php

namespace App\Services\Integrations;

class LinkedInIntegration
{
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    private $apiBaseUrl = 'https://api.linkedin.com/v2';
    
    public function __construct()
    {
        $this->clientId = $_ENV['LINKEDIN_CLIENT_ID'] ?? '';
        $this->clientSecret = $_ENV['LINKEDIN_CLIENT_SECRET'] ?? '';
        $this->redirectUri = $_ENV['LINKEDIN_REDIRECT_URI'] ?? '';
    }
    
    /**
     * Get LinkedIn OAuth authorization URL
     */
    public function getAuthorizationUrl($state = null, $scopes = ['r_liteprofile', 'r_emailaddress'])
    {
        $params = [
            'response_type' => 'code',
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state ?: bin2hex(random_bytes(16)),
            'scope' => implode(' ', $scopes)
        ];
        
        return 'https://www.linkedin.com/oauth/v2/authorization?' . http_build_query($params);
    }
    
    /**
     * Exchange authorization code for access token
     */
    public function getAccessToken($code)
    {
        $data = [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret
        ];
        
        $response = $this->makeRequest('POST', 'https://www.linkedin.com/oauth/v2/accessToken', $data);
        
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
        $headers = ['Authorization: Bearer ' . $accessToken];
        
        // Get basic profile
        $profile = $this->makeRequest('GET', $this->apiBaseUrl . '/people/~', null, $headers);
        
        // Get email address
        $email = $this->makeRequest('GET', $this->apiBaseUrl . '/emailAddress?q=members&projection=(elements*(handle~))', null, $headers);
        
        // Get profile picture
        $picture = $this->makeRequest('GET', $this->apiBaseUrl . '/people/~/profilePicture(displayImage~:playableStreams)', null, $headers);
        
        return [
            'id' => $profile['id'] ?? null,
            'first_name' => $profile['localizedFirstName'] ?? '',
            'last_name' => $profile['localizedLastName'] ?? '',
            'headline' => $profile['localizedHeadline'] ?? '',
            'email' => $email['elements'][0]['handle~']['emailAddress'] ?? '',
            'profile_picture' => $this->extractProfilePicture($picture),
            'profile_url' => 'https://www.linkedin.com/in/' . ($profile['vanityName'] ?? $profile['id']),
            'raw_data' => $profile
        ];
    }
    
    /**
     * Get user's work experience
     */
    public function getWorkExperience($accessToken)
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        
        $response = $this->makeRequest('GET', 
            $this->apiBaseUrl . '/people/~/positions?projection=(elements*(id,title,companyName,summary,startDate,endDate,company~(name,industry,size)))',
            null, 
            $headers
        );
        
        $experiences = [];
        
        if (isset($response['elements'])) {
            foreach ($response['elements'] as $position) {
                $experiences[] = [
                    'title' => $position['title'] ?? '',
                    'company' => $position['companyName'] ?? $position['company~']['name'] ?? '',
                    'industry' => $position['company~']['industry'] ?? '',
                    'company_size' => $position['company~']['size'] ?? '',
                    'summary' => $position['summary'] ?? '',
                    'start_date' => $this->formatLinkedInDate($position['startDate'] ?? null),
                    'end_date' => $this->formatLinkedInDate($position['endDate'] ?? null),
                    'is_current' => !isset($position['endDate'])
                ];
            }
        }
        
        return $experiences;
    }
    
    /**
     * Get user's education
     */
    public function getEducation($accessToken)
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        
        $response = $this->makeRequest('GET',
            $this->apiBaseUrl . '/people/~/educations?projection=(elements*(schoolName,fieldOfStudy,degree,startDate,endDate))',
            null,
            $headers
        );
        
        $education = [];
        
        if (isset($response['elements'])) {
            foreach ($response['elements'] as $edu) {
                $education[] = [
                    'school' => $edu['schoolName'] ?? '',
                    'degree' => $edu['degree'] ?? '',
                    'field_of_study' => $edu['fieldOfStudy'] ?? '',
                    'start_date' => $this->formatLinkedInDate($edu['startDate'] ?? null),
                    'end_date' => $this->formatLinkedInDate($edu['endDate'] ?? null)
                ];
            }
        }
        
        return $education;
    }
    
    /**
     * Get user's skills
     */
    public function getSkills($accessToken)
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        
        $response = $this->makeRequest('GET',
            $this->apiBaseUrl . '/people/~/skills?projection=(elements*(name))',
            null,
            $headers
        );
        
        $skills = [];
        
        if (isset($response['elements'])) {
            foreach ($response['elements'] as $skill) {
                $skills[] = $skill['name'] ?? '';
            }
        }
        
        return $skills;
    }
    
    /**
     * Share interview on LinkedIn
     */
    public function shareInterview($accessToken, $interviewData)
    {
        $headers = [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
            'X-Restli-Protocol-Version: 2.0.0'
        ];
        
        $shareData = [
            'author' => 'urn:li:person:' . $this->getUserId($accessToken),
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => [
                'com.linkedin.ugc.ShareContent' => [
                    'shareCommentary' => [
                        'text' => $this->generateShareText($interviewData)
                    ],
                    'shareMediaCategory' => 'ARTICLE',
                    'media' => [
                        [
                            'status' => 'READY',
                            'description' => [
                                'text' => $interviewData['description']
                            ],
                            'originalUrl' => $interviewData['url'],
                            'title' => [
                                'text' => $interviewData['title']
                            ]
                        ]
                    ]
                ]
            ],
            'visibility' => [
                'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'
            ]
        ];
        
        $response = $this->makeRequest('POST', $this->apiBaseUrl . '/ugcPosts', $shareData, $headers);
        
        return $response;
    }
    
    /**
     * Import LinkedIn profile to user account
     */
    public function importProfile($userId, $accessToken)
    {
        try {
            $profile = $this->getUserProfile($accessToken);
            $experience = $this->getWorkExperience($accessToken);
            $education = $this->getEducation($accessToken);
            $skills = $this->getSkills($accessToken);
            
            $importData = [
                'user_id' => $userId,
                'linkedin_id' => $profile['id'],
                'profile_data' => $profile,
                'experience' => $experience,
                'education' => $education,
                'skills' => $skills,
                'imported_at' => date('Y-m-d H:i:s')
            ];
            
            // Save to database
            $this->saveLinkedInData($importData);
            
            // Update user profile with LinkedIn data
            $this->updateUserProfile($userId, $profile, $experience, $skills);
            
            return $importData;
            
        } catch (\Exception $e) {
            throw new \Exception('Failed to import LinkedIn profile: ' . $e->getMessage());
        }
    }
    
    /**
     * Sync interview with LinkedIn profile
     */
    public function syncInterviewWithProfile($interviewId, $linkedinData)
    {
        $suggestions = [
            'skills_match' => $this->findSkillsMatch($interviewId, $linkedinData['skills']),
            'experience_relevance' => $this->assessExperienceRelevance($interviewId, $linkedinData['experience']),
            'industry_alignment' => $this->checkIndustryAlignment($interviewId, $linkedinData['experience']),
            'profile_completeness' => $this->assessProfileCompleteness($linkedinData)
        ];
        
        return $suggestions;
    }
    
    /**
     * Generate LinkedIn post for interview sharing
     */
    private function generateShareText($interviewData)
    {
        $templates = [
            "Just completed an insightful interview about {topic}! 🎯 Check out my experience and insights: {url} #Interview #CareerGrowth #ProfessionalDevelopment",
            "Excited to share my recent interview on {topic}! 💼 Great discussion about {highlights}. Watch here: {url} #InterviewExperience #Learning",
            "Had an amazing interview experience discussing {topic}! 🚀 Sharing my journey and insights: {url} #Career #Interview #Growth"
        ];
        
        $template = $templates[array_rand($templates)];
        
        return str_replace([
            '{topic}', 
            '{url}', 
            '{highlights}'
        ], [
            $interviewData['category'] ?? 'my experience',
            $interviewData['url'],
            $this->extractHighlights($interviewData)
        ], $template);
    }
    
    /**
     * Extract profile picture URL
     */
    private function extractProfilePicture($pictureData)
    {
        if (isset($pictureData['displayImage~']['elements'])) {
            $elements = $pictureData['displayImage~']['elements'];
            
            // Find the largest image
            $largestImage = null;
            $maxSize = 0;
            
            foreach ($elements as $element) {
                if (isset($element['data']['com.linkedin.digitalmedia.mediaartifact.StillImage'])) {
                    $image = $element['data']['com.linkedin.digitalmedia.mediaartifact.StillImage'];
                    $size = ($image['displaySize']['width'] ?? 0) * ($image['displaySize']['height'] ?? 0);
                    
                    if ($size > $maxSize) {
                        $maxSize = $size;
                        $largestImage = $element['identifiers'][0]['identifier'] ?? null;
                    }
                }
            }
            
            return $largestImage;
        }
        
        return null;
    }
    
    /**
     * Format LinkedIn date
     */
    private function formatLinkedInDate($dateData)
    {
        if (!$dateData) return null;
        
        $year = $dateData['year'] ?? null;
        $month = $dateData['month'] ?? 1;
        $day = $dateData['day'] ?? 1;
        
        if ($year) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
        
        return null;
    }
    
    /**
     * Get user ID from access token
     */
    private function getUserId($accessToken)
    {
        $profile = $this->getUserProfile($accessToken);
        return $profile['id'];
    }
    
    /**
     * Make HTTP request
     */
    private function makeRequest($method, $url, $data = null, $headers = [])
    {
        $curl = curl_init();
        
        $defaultHeaders = [
            'Accept: application/json',
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
                if (is_array($data)) {
                    if (in_array('Content-Type: application/json', $headers)) {
                        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($data));
                    } else {
                        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
                    }
                } else {
                    curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
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
     * Save LinkedIn data to database
     */
    private function saveLinkedInData($data)
    {
        // Implementation would save to linkedin_integrations table
        // This is a placeholder for the actual database operation
    }
    
    /**
     * Update user profile with LinkedIn data
     */
    private function updateUserProfile($userId, $profile, $experience, $skills)
    {
        // Implementation would update user profile with LinkedIn data
        // This is a placeholder for the actual database operation
    }
    
    /**
     * Find skills match between interview and LinkedIn profile
     */
    private function findSkillsMatch($interviewId, $linkedinSkills)
    {
        // Implementation would compare interview requirements with LinkedIn skills
        return ['matched_skills' => [], 'missing_skills' => [], 'match_percentage' => 0];
    }
    
    /**
     * Assess experience relevance
     */
    private function assessExperienceRelevance($interviewId, $experience)
    {
        // Implementation would analyze experience relevance to interview
        return ['relevance_score' => 0.8, 'relevant_positions' => []];
    }
    
    /**
     * Check industry alignment
     */
    private function checkIndustryAlignment($interviewId, $experience)
    {
        // Implementation would check industry alignment
        return ['alignment_score' => 0.7, 'industry_match' => true];
    }
    
    /**
     * Assess profile completeness
     */
    private function assessProfileCompleteness($linkedinData)
    {
        $score = 0;
        $total = 6;
        
        if (!empty($linkedinData['profile_data']['headline'])) $score++;
        if (!empty($linkedinData['profile_data']['profile_picture'])) $score++;
        if (!empty($linkedinData['experience'])) $score++;
        if (!empty($linkedinData['education'])) $score++;
        if (!empty($linkedinData['skills'])) $score++;
        if (count($linkedinData['skills']) >= 5) $score++;
        
        return [
            'score' => round(($score / $total) * 100),
            'missing_elements' => $this->getMissingElements($linkedinData)
        ];
    }
    
    /**
     * Get missing profile elements
     */
    private function getMissingElements($linkedinData)
    {
        $missing = [];
        
        if (empty($linkedinData['profile_data']['headline'])) {
            $missing[] = 'Professional headline';
        }
        if (empty($linkedinData['profile_data']['profile_picture'])) {
            $missing[] = 'Profile picture';
        }
        if (empty($linkedinData['experience'])) {
            $missing[] = 'Work experience';
        }
        if (empty($linkedinData['education'])) {
            $missing[] = 'Education';
        }
        if (count($linkedinData['skills']) < 5) {
            $missing[] = 'More skills (minimum 5 recommended)';
        }
        
        return $missing;
    }
    
    /**
     * Extract highlights from interview data
     */
    private function extractHighlights($interviewData)
    {
        $highlights = [];
        
        if (isset($interviewData['tags'])) {
            $highlights = array_slice($interviewData['tags'], 0, 3);
        }
        
        return implode(', ', $highlights) ?: 'professional development';
    }
}
