<?php

namespace App\Services\Integrations;

class SlackIntegration
{
    private $clientId;
    private $clientSecret;
    private $redirectUri;
    private $apiBaseUrl = 'https://slack.com/api';
    
    public function __construct()
    {
        $this->clientId = $_ENV['SLACK_CLIENT_ID'] ?? '';
        $this->clientSecret = $_ENV['SLACK_CLIENT_SECRET'] ?? '';
        $this->redirectUri = $_ENV['SLACK_REDIRECT_URI'] ?? '';
    }
    
    /**
     * Get Slack OAuth authorization URL
     */
    public function getAuthorizationUrl($state = null, $scopes = ['chat:write', 'channels:read', 'users:read'])
    {
        $params = [
            'client_id' => $this->clientId,
            'scope' => implode(',', $scopes),
            'redirect_uri' => $this->redirectUri,
            'state' => $state ?: bin2hex(random_bytes(16))
        ];
        
        return 'https://slack.com/oauth/v2/authorize?' . http_build_query($params);
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
        
        $response = $this->makeRequest('POST', $this->apiBaseUrl . '/oauth.v2.access', $data);
        
        if ($response['ok']) {
            return $response;
        }
        
        throw new \Exception('Failed to get access token: ' . $response['error']);
    }
    
    /**
     * Send message to Slack channel
     */
    public function sendMessage($accessToken, $channel, $text, $attachments = null, $blocks = null)
    {
        $data = [
            'channel' => $channel,
            'text' => $text
        ];
        
        if ($attachments) {
            $data['attachments'] = json_encode($attachments);
        }
        
        if ($blocks) {
            $data['blocks'] = json_encode($blocks);
        }
        
        $headers = ['Authorization: Bearer ' . $accessToken];
        $response = $this->makeRequest('POST', $this->apiBaseUrl . '/chat.postMessage', $data, $headers);
        
        if ($response['ok']) {
            return $response;
        }
        
        throw new \Exception('Failed to send message: ' . $response['error']);
    }
    
    /**
     * Share interview completion notification
     */
    public function shareInterviewCompletion($accessToken, $channel, $interviewData)
    {
        $blocks = [
            [
                'type' => 'header',
                'text' => [
                    'type' => 'plain_text',
                    'text' => '🎯 Interview Completed!'
                ]
            ],
            [
                'type' => 'section',
                'fields' => [
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Interview:*\n{$interviewData['title']}"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Candidate:*\n{$interviewData['candidate_name']}"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Duration:*\n{$interviewData['duration']} minutes"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Category:*\n{$interviewData['category']}"
                    ]
                ]
            ]
        ];
        
        if (isset($interviewData['ai_score'])) {
            $blocks[] = [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "*AI Analysis Score:* {$interviewData['ai_score']}/100"
                ]
            ];
        }
        
        $blocks[] = [
            'type' => 'actions',
            'elements' => [
                [
                    'type' => 'button',
                    'text' => [
                        'type' => 'plain_text',
                        'text' => 'View Interview'
                    ],
                    'url' => $interviewData['url'],
                    'style' => 'primary'
                ]
            ]
        ];
        
        return $this->sendMessage($accessToken, $channel, 'Interview completed successfully!', null, $blocks);
    }
    
    /**
     * Send AI analysis results
     */
    public function shareAIAnalysis($accessToken, $channel, $analysisData)
    {
        $insights = $analysisData['insights'];
        $performance = $analysisData['performance'];
        
        $blocks = [
            [
                'type' => 'header',
                'text' => [
                    'type' => 'plain_text',
                    'text' => '🤖 AI Interview Analysis Complete'
                ]
            ],
            [
                'type' => 'section',
                'fields' => [
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Overall Score:*\n{$insights['overall_score']}/100"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Confidence Level:*\n" . ucfirst(str_replace('_', ' ', $insights['confidence_level']['overall_confidence']))
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Speaking Pace:*\n{$performance['speaking_pace']['words_per_minute']} WPM"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Communication Style:*\n{$insights['communication_style']['primary_style']}"
                    ]
                ]
            ]
        ];
        
        // Add strengths
        if (!empty($insights['strengths'])) {
            $strengthsText = "• " . implode("\n• ", array_slice($insights['strengths'], 0, 3));
            $blocks[] = [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "*Key Strengths:*\n{$strengthsText}"
                ]
            ];
        }
        
        // Add recommendations
        if (!empty($insights['recommendations'])) {
            $recommendations = array_slice($insights['recommendations'], 0, 2);
            $recText = "";
            foreach ($recommendations as $rec) {
                $recText .= "• {$rec['title']}\n";
            }
            
            $blocks[] = [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "*Top Recommendations:*\n{$recText}"
                ]
            ];
        }
        
        return $this->sendMessage($accessToken, $channel, 'AI analysis completed!', null, $blocks);
    }
    
    /**
     * Send interview reminder
     */
    public function sendInterviewReminder($accessToken, $channel, $interviewData, $reminderTime)
    {
        $blocks = [
            [
                'type' => 'header',
                'text' => [
                    'type' => 'plain_text',
                    'text' => '⏰ Interview Reminder'
                ]
            ],
            [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "Your interview *{$interviewData['title']}* is scheduled in {$reminderTime}."
                ]
            ],
            [
                'type' => 'section',
                'fields' => [
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Time:*\n{$interviewData['scheduled_time']}"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Duration:*\n{$interviewData['duration']} minutes"
                    ]
                ]
            ],
            [
                'type' => 'actions',
                'elements' => [
                    [
                        'type' => 'button',
                        'text' => [
                            'type' => 'plain_text',
                            'text' => 'Join Interview'
                        ],
                        'url' => $interviewData['join_url'],
                        'style' => 'primary'
                    ],
                    [
                        'type' => 'button',
                        'text' => [
                            'type' => 'plain_text',
                            'text' => 'Reschedule'
                        ],
                        'url' => $interviewData['reschedule_url']
                    ]
                ]
            ]
        ];
        
        return $this->sendMessage($accessToken, $channel, 'Interview reminder', null, $blocks);
    }
    
    /**
     * Get workspace information
     */
    public function getWorkspaceInfo($accessToken)
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        $response = $this->makeRequest('GET', $this->apiBaseUrl . '/team.info', null, $headers);
        
        if ($response['ok']) {
            return $response['team'];
        }
        
        throw new \Exception('Failed to get workspace info: ' . $response['error']);
    }
    
    /**
     * Get channels list
     */
    public function getChannels($accessToken, $types = 'public_channel,private_channel')
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        $params = ['types' => $types, 'limit' => 100];
        
        $response = $this->makeRequest('GET', $this->apiBaseUrl . '/conversations.list?' . http_build_query($params), null, $headers);
        
        if ($response['ok']) {
            return $response['channels'];
        }
        
        throw new \Exception('Failed to get channels: ' . $response['error']);
    }
    
    /**
     * Get user information
     */
    public function getUserInfo($accessToken, $userId = null)
    {
        $headers = ['Authorization: Bearer ' . $accessToken];
        $params = $userId ? ['user' => $userId] : [];
        
        $endpoint = $userId ? '/users.info' : '/auth.test';
        $response = $this->makeRequest('GET', $this->apiBaseUrl . $endpoint . '?' . http_build_query($params), null, $headers);
        
        if ($response['ok']) {
            return $userId ? $response['user'] : $response;
        }
        
        throw new \Exception('Failed to get user info: ' . $response['error']);
    }
    
    /**
     * Create interview discussion thread
     */
    public function createInterviewThread($accessToken, $channel, $interviewData)
    {
        $initialMessage = "🎯 Starting interview discussion for: *{$interviewData['title']}*\n\n" .
                         "Feel free to share thoughts, questions, and feedback about this interview.";
        
        $response = $this->sendMessage($accessToken, $channel, $initialMessage);
        
        if ($response['ok']) {
            return [
                'thread_ts' => $response['ts'],
                'channel' => $response['channel'],
                'message_url' => $this->getMessageUrl($response['channel'], $response['ts'])
            ];
        }
        
        throw new \Exception('Failed to create interview thread');
    }
    
    /**
     * Send message to thread
     */
    public function sendThreadMessage($accessToken, $channel, $threadTs, $text, $blocks = null)
    {
        $data = [
            'channel' => $channel,
            'thread_ts' => $threadTs,
            'text' => $text
        ];
        
        if ($blocks) {
            $data['blocks'] = json_encode($blocks);
        }
        
        $headers = ['Authorization: Bearer ' . $accessToken];
        $response = $this->makeRequest('POST', $this->apiBaseUrl . '/chat.postMessage', $data, $headers);
        
        if ($response['ok']) {
            return $response;
        }
        
        throw new \Exception('Failed to send thread message: ' . $response['error']);
    }
    
    /**
     * Setup webhook for Slack events
     */
    public function setupWebhook($accessToken, $webhookUrl, $events = ['message.channels'])
    {
        $data = [
            'url' => $webhookUrl,
            'events' => $events
        ];
        
        $headers = ['Authorization: Bearer ' . $accessToken];
        $response = $this->makeRequest('POST', $this->apiBaseUrl . '/apps.event.authorizations.list', $data, $headers);
        
        return $response;
    }
    
    /**
     * Send daily interview summary
     */
    public function sendDailySummary($accessToken, $channel, $summaryData)
    {
        $blocks = [
            [
                'type' => 'header',
                'text' => [
                    'type' => 'plain_text',
                    'text' => '📊 Daily Interview Summary'
                ]
            ],
            [
                'type' => 'section',
                'fields' => [
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Interviews Completed:*\n{$summaryData['completed_count']}"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Average Score:*\n{$summaryData['average_score']}/100"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*Total Duration:*\n{$summaryData['total_duration']} minutes"
                    ],
                    [
                        'type' => 'mrkdwn',
                        'text' => "*New Users:*\n{$summaryData['new_users']}"
                    ]
                ]
            ]
        ];
        
        if (!empty($summaryData['top_categories'])) {
            $categoriesText = "";
            foreach ($summaryData['top_categories'] as $category => $count) {
                $categoriesText .= "• {$category}: {$count}\n";
            }
            
            $blocks[] = [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "*Top Categories:*\n{$categoriesText}"
                ]
            ];
        }
        
        return $this->sendMessage($accessToken, $channel, 'Daily summary', null, $blocks);
    }
    
    /**
     * Get message URL
     */
    private function getMessageUrl($channel, $timestamp)
    {
        // Convert timestamp to Slack message URL format
        $ts = str_replace('.', '', $timestamp);
        return "https://slack.com/archives/{$channel}/p{$ts}";
    }
    
    /**
     * Make HTTP request
     */
    private function makeRequest($method, $url, $data = null, $headers = [])
    {
        $curl = curl_init();
        
        $defaultHeaders = [
            'Content-Type: application/x-www-form-urlencoded',
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
                curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
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
}
