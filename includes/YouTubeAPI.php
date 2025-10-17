<?php
/**
 * YouTube Data API v3 Integration
 * YouTube Interview Curation System
 * Created: October 17, 2025
 */

define('YOUTUBE_CURATION_SYSTEM', true);
require_once __DIR__ . '/youtube_config.php';
require_once __DIR__ . '/Database.php';

class YouTubeAPI {
    private $apiKey;
    private $baseUrl;
    private $quotaUsed = 0;
    private $quotaLimit;
    private $db;
    
    public function __construct($apiKey = null) {
        $this->apiKey = $apiKey ?: YOUTUBE_API_KEY;
        $this->baseUrl = YOUTUBE_API_BASE_URL;
        $this->quotaLimit = YOUTUBE_DAILY_QUOTA;
        $this->db = getDB();
        
        if (empty($this->apiKey)) {
            throw new Exception("YouTube API key is required");
        }
    }
    
    /**
     * Extract YouTube video ID from URL
     */
    public function extractVideoId($url) {
        $patterns = [
            '/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $url, $matches)) {
                return $matches[1];
            }
        }
        
        // Check if it's already a video ID
        if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $url)) {
            return $url;
        }
        
        return false;
    }
    
    /**
     * Validate YouTube URL
     */
    public function isValidYouTubeUrl($url) {
        return $this->extractVideoId($url) !== false;
    }
    
    /**
     * Get video details from YouTube API
     */
    public function getVideoDetails($videoId) {
        $endpoint = 'videos';
        $params = [
            'part' => 'snippet,statistics,contentDetails,status',
            'id' => $videoId,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeApiCall($endpoint, $params);
        
        if (!$response || empty($response['items'])) {
            return false;
        }
        
        $video = $response['items'][0];
        return $this->formatVideoData($video);
    }
    
    /**
     * Get channel details
     */
    public function getChannelDetails($channelId) {
        $endpoint = 'channels';
        $params = [
            'part' => 'snippet,statistics',
            'id' => $channelId,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeApiCall($endpoint, $params);
        
        if (!$response || empty($response['items'])) {
            return false;
        }
        
        return $response['items'][0];
    }
    
    /**
     * Search for videos by keywords
     */
    public function searchVideos($query, $maxResults = 25, $order = 'relevance') {
        $endpoint = 'search';
        $params = [
            'part' => 'snippet',
            'q' => $query,
            'type' => 'video',
            'maxResults' => min($maxResults, YOUTUBE_MAX_RESULTS),
            'order' => $order,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeApiCall($endpoint, $params);
        
        if (!$response || empty($response['items'])) {
            return [];
        }
        
        $videos = [];
        foreach ($response['items'] as $item) {
            $videos[] = [
                'video_id' => $item['id']['videoId'],
                'title' => $item['snippet']['title'],
                'description' => $item['snippet']['description'],
                'channel_name' => $item['snippet']['channelTitle'],
                'channel_id' => $item['snippet']['channelId'],
                'published_at' => $item['snippet']['publishedAt'],
                'thumbnail_url' => $item['snippet']['thumbnails']['medium']['url'] ?? ''
            ];
        }
        
        return $videos;
    }
    
    /**
     * Get videos from a playlist
     */
    public function getPlaylistVideos($playlistId, $maxResults = 50) {
        $endpoint = 'playlistItems';
        $params = [
            'part' => 'snippet',
            'playlistId' => $playlistId,
            'maxResults' => min($maxResults, YOUTUBE_MAX_RESULTS),
            'key' => $this->apiKey
        ];
        
        $response = $this->makeApiCall($endpoint, $params);
        
        if (!$response || empty($response['items'])) {
            return [];
        }
        
        $videoIds = [];
        foreach ($response['items'] as $item) {
            if (isset($item['snippet']['resourceId']['videoId'])) {
                $videoIds[] = $item['snippet']['resourceId']['videoId'];
            }
        }
        
        return $videoIds;
    }
    
    /**
     * Get multiple video details in batch
     */
    public function getBatchVideoDetails($videoIds) {
        if (empty($videoIds)) {
            return [];
        }
        
        // YouTube API allows up to 50 IDs per request
        $chunks = array_chunk($videoIds, 50);
        $allVideos = [];
        
        foreach ($chunks as $chunk) {
            $endpoint = 'videos';
            $params = [
                'part' => 'snippet,statistics,contentDetails,status',
                'id' => implode(',', $chunk),
                'key' => $this->apiKey
            ];
            
            $response = $this->makeApiCall($endpoint, $params);
            
            if ($response && !empty($response['items'])) {
                foreach ($response['items'] as $video) {
                    $allVideos[] = $this->formatVideoData($video);
                }
            }
        }
        
        return $allVideos;
    }
    
    /**
     * Format video data from API response
     */
    private function formatVideoData($video) {
        $snippet = $video['snippet'];
        $statistics = $video['statistics'] ?? [];
        $contentDetails = $video['contentDetails'] ?? [];
        $status = $video['status'] ?? [];
        
        return [
            'youtube_id' => $video['id'],
            'title' => $snippet['title'],
            'description' => $snippet['description'],
            'channel_name' => $snippet['channelTitle'],
            'channel_id' => $snippet['channelId'],
            'published_at' => date('Y-m-d H:i:s', strtotime($snippet['publishedAt'])),
            'duration' => $this->parseDuration($contentDetails['duration'] ?? 'PT0S'),
            'view_count' => (int) ($statistics['viewCount'] ?? 0),
            'like_count' => (int) ($statistics['likeCount'] ?? 0),
            'comment_count' => (int) ($statistics['commentCount'] ?? 0),
            'thumbnail_url' => $snippet['thumbnails']['medium']['url'] ?? '',
            'embed_url' => "https://www.youtube.com/embed/{$video['id']}",
            'is_available' => ($status['uploadStatus'] ?? '') === 'processed',
            'privacy_status' => $status['privacyStatus'] ?? 'unknown'
        ];
    }
    
    /**
     * Parse ISO 8601 duration to seconds
     */
    private function parseDuration($duration) {
        $interval = new DateInterval($duration);
        return ($interval->h * 3600) + ($interval->i * 60) + $interval->s;
    }
    
    /**
     * Make API call to YouTube
     */
    private function makeApiCall($endpoint, $params) {
        $url = $this->baseUrl . $endpoint . '?' . http_build_query($params);
        
        // Check quota before making call
        if ($this->quotaUsed >= $this->quotaLimit) {
            throw new Exception("YouTube API quota exceeded for today");
        }
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: YouTube Curation System/1.0',
                    'Accept: application/json'
                ],
                'timeout' => 30
            ]
        ]);
        
        $startTime = microtime(true);
        $response = file_get_contents($url, false, $context);
        $endTime = microtime(true);
        
        if ($response === false) {
            $this->logApiCall($endpoint, $params, false, $endTime - $startTime);
            throw new Exception("Failed to fetch data from YouTube API");
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            $this->logApiCall($endpoint, $params, false, $endTime - $startTime, $data['error']['message']);
            throw new Exception("YouTube API Error: " . $data['error']['message']);
        }
        
        // Update quota usage (rough estimation)
        $this->quotaUsed += $this->estimateQuotaCost($endpoint, $params);
        
        $this->logApiCall($endpoint, $params, true, $endTime - $startTime);
        
        return $data;
    }
    
    /**
     * Estimate quota cost for API call
     */
    private function estimateQuotaCost($endpoint, $params) {
        $costs = [
            'videos' => 1,
            'channels' => 1,
            'search' => 100,
            'playlistItems' => 1
        ];
        
        return $costs[$endpoint] ?? 1;
    }
    
    /**
     * Log API call for monitoring
     */
    private function logApiCall($endpoint, $params, $success, $duration, $error = null) {
        try {
            $this->db->insert('scraping_logs', [
                'operation_type' => 'api_call',
                'youtube_id' => $params['id'] ?? null,
                'api_calls_used' => 1,
                'success_count' => $success ? 1 : 0,
                'error_count' => $success ? 0 : 1,
                'processing_time_ms' => round($duration * 1000),
                'error_details' => $error
            ]);
        } catch (Exception $e) {
            // Don't let logging errors break the main functionality
            error_log("Failed to log API call: " . $e->getMessage());
        }
    }
    
    /**
     * Get current quota usage
     */
    public function getQuotaUsage() {
        return [
            'used' => $this->quotaUsed,
            'limit' => $this->quotaLimit,
            'remaining' => $this->quotaLimit - $this->quotaUsed,
            'percentage' => round(($this->quotaUsed / $this->quotaLimit) * 100, 2)
        ];
    }
    
    /**
     * Reset quota usage (for new day)
     */
    public function resetQuota() {
        $this->quotaUsed = 0;
    }
    
    /**
     * Check if video is embeddable
     */
    public function isEmbeddable($videoId) {
        try {
            $details = $this->getVideoDetails($videoId);
            return $details && $details['is_available'];
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get video captions/transcripts (if available)
     */
    public function getVideoCaptions($videoId) {
        $endpoint = 'captions';
        $params = [
            'part' => 'snippet',
            'videoId' => $videoId,
            'key' => $this->apiKey
        ];
        
        try {
            $response = $this->makeApiCall($endpoint, $params);
            return $response['items'] ?? [];
        } catch (Exception $e) {
            // Captions might not be available or accessible
            return [];
        }
    }
}

?>
