<?php

namespace App\Controllers;

use App\Services\SmartCameraSwitchingService;
use Exception;

/**
 * Smart Camera Switching Controller
 * Handles AI-powered automatic camera switching API endpoints
 */
class SmartCameraSwitchingController
{
    private $smartCameraSwitchingService;

    public function __construct($pdo)
    {
        $this->smartCameraSwitchingService = new SmartCameraSwitchingService($pdo);
    }

    /**
     * Start smart camera switching session
     * POST /api/smart-camera/sessions
     */
    public function startSession($request)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $interviewId = $data['interview_id'] ?? null;
            $userId = $data['user_id'] ?? 1; // Default user for demo
            
            if (!$interviewId) {
                return $this->jsonResponse(['error' => 'Interview ID is required'], 400);
            }
            
            $options = [
                'mode' => $data['mode'] ?? 'auto',
                'sensitivity' => $data['sensitivity'] ?? 'medium',
                'switch_delay' => $data['switch_delay'] ?? 1.0,
                'audio_threshold' => $data['audio_threshold'] ?? 0.1,
                'engagement_threshold' => $data['engagement_threshold'] ?? 0.5,
                'speaker_detection_enabled' => $data['speaker_detection_enabled'] ?? true,
                'audio_level_switching' => $data['audio_level_switching'] ?? true,
                'engagement_switching' => $data['engagement_switching'] ?? true,
                'fallback_enabled' => $data['fallback_enabled'] ?? true,
                'transition_effects' => $data['transition_effects'] ?? true
            ];
            
            $session = $this->smartCameraSwitchingService->startSession($interviewId, $userId, $options);
            
            return $this->jsonResponse([
                'success' => true,
                'session' => $session,
                'message' => 'Smart camera switching session started successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Configure cameras for session
     * POST /api/smart-camera/sessions/{sessionId}/cameras
     */
    public function configureCameras($request, $sessionId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $cameras = $data['cameras'] ?? [];
            
            if (empty($cameras)) {
                return $this->jsonResponse(['error' => 'Cameras configuration is required'], 400);
            }
            
            $result = $this->smartCameraSwitchingService->configureCameras($sessionId, $cameras);
            
            return $this->jsonResponse([
                'success' => true,
                'configuration' => $result,
                'message' => 'Cameras configured successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Process audio data for smart switching
     * POST /api/smart-camera/sessions/{sessionId}/audio
     */
    public function processAudioData($request, $sessionId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $audioData = $data['audio_data'] ?? [];
            
            if (empty($audioData)) {
                return $this->jsonResponse(['error' => 'Audio data is required'], 400);
            }
            
            $result = $this->smartCameraSwitchingService->processAudioData($sessionId, $audioData);
            
            return $this->jsonResponse([
                'success' => true,
                'analysis' => $result,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Process engagement data for smart switching
     * POST /api/smart-camera/sessions/{sessionId}/engagement
     */
    public function processEngagementData($request, $sessionId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $engagementData = $data['engagement_data'] ?? [];
            
            if (empty($engagementData)) {
                return $this->jsonResponse(['error' => 'Engagement data is required'], 400);
            }
            
            $result = $this->smartCameraSwitchingService->processEngagementData($sessionId, $engagementData);
            
            return $this->jsonResponse([
                'success' => true,
                'analysis' => $result,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Execute smart camera switch
     * POST /api/smart-camera/sessions/{sessionId}/switch
     */
    public function executeSwitch($request, $sessionId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $switchData = [
                'target_camera' => $data['target_camera'] ?? null,
                'switch_type' => $data['switch_type'] ?? 'auto',
                'trigger_reason' => $data['trigger_reason'] ?? 'manual',
                'confidence_score' => $data['confidence_score'] ?? 1.0,
                'audio_level' => $data['audio_level'] ?? 0.0,
                'speaker_detected' => $data['speaker_detected'] ?? null,
                'engagement_score' => $data['engagement_score'] ?? 0.0,
                'transition_type' => $data['transition_type'] ?? 'smooth'
            ];
            
            if (!$switchData['target_camera']) {
                return $this->jsonResponse(['error' => 'Target camera is required'], 400);
            }
            
            $result = $this->smartCameraSwitchingService->executeSmartSwitch($sessionId, $switchData);
            
            return $this->jsonResponse([
                'success' => $result['success'],
                'switch_result' => $result,
                'message' => $result['success'] ? 'Camera switch executed successfully' : 'Camera switch failed'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get session analytics
     * GET /api/smart-camera/sessions/{sessionId}/analytics
     */
    public function getSessionAnalytics($request, $sessionId)
    {
        try {
            $analytics = $this->smartCameraSwitchingService->getSessionAnalytics($sessionId);
            
            return $this->jsonResponse([
                'success' => true,
                'analytics' => $analytics,
                'session_id' => $sessionId
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Stop smart camera switching session
     * POST /api/smart-camera/sessions/{sessionId}/stop
     */
    public function stopSession($request, $sessionId)
    {
        try {
            $result = $this->smartCameraSwitchingService->stopSession($sessionId);
            
            return $this->jsonResponse([
                'success' => true,
                'result' => $result,
                'message' => 'Smart camera switching session stopped successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get switching rules
     * GET /api/smart-camera/rules
     */
    public function getSwitchingRules($request)
    {
        try {
            $rules = $this->getSwitchingRulesFromDB();
            
            return $this->jsonResponse([
                'success' => true,
                'rules' => $rules,
                'total_rules' => count($rules)
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update switching rule
     * PUT /api/smart-camera/rules/{ruleId}
     */
    public function updateSwitchingRule($request, $ruleId)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $updates = [
                'enabled' => $data['enabled'] ?? null,
                'priority' => $data['priority'] ?? null,
                'min_confidence' => $data['min_confidence'] ?? null,
                'cooldown_seconds' => $data['cooldown_seconds'] ?? null,
                'conditions' => $data['conditions'] ?? null,
                'actions' => $data['actions'] ?? null
            ];
            
            // Remove null values
            $updates = array_filter($updates, function($value) {
                return $value !== null;
            });
            
            if (empty($updates)) {
                return $this->jsonResponse(['error' => 'No valid updates provided'], 400);
            }
            
            $result = $this->updateRuleInDB($ruleId, $updates);
            
            return $this->jsonResponse([
                'success' => true,
                'updated_rule' => $result,
                'message' => 'Switching rule updated successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get session events
     * GET /api/smart-camera/sessions/{sessionId}/events
     */
    public function getSessionEvents($request, $sessionId)
    {
        try {
            $limit = $_GET['limit'] ?? 50;
            $offset = $_GET['offset'] ?? 0;
            $switchType = $_GET['switch_type'] ?? null;
            
            $events = $this->getSessionEventsFromDB($sessionId, $limit, $offset, $switchType);
            
            return $this->jsonResponse([
                'success' => true,
                'events' => $events,
                'session_id' => $sessionId,
                'pagination' => [
                    'limit' => $limit,
                    'offset' => $offset,
                    'total' => count($events)
                ]
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get demo data for testing
     * GET /api/smart-camera/demo-data
     */
    public function getDemoData($request)
    {
        try {
            $demoData = $this->generateDemoData();
            
            return $this->jsonResponse([
                'success' => true,
                'demo_data' => $demoData,
                'message' => 'Demo data generated successfully'
            ]);
            
        } catch (Exception $e) {
            return $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get switching rules from database
     */
    private function getSwitchingRulesFromDB(): array
    {
        $stmt = $this->smartCameraSwitchingService->pdo->prepare("
            SELECT * FROM switching_rules
            ORDER BY priority ASC, rule_name ASC
        ");
        $stmt->execute();
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rules as &$rule) {
            $rule['conditions'] = json_decode($rule['conditions'], true);
            $rule['actions'] = json_decode($rule['actions'], true);
            $rule['enabled'] = (bool)$rule['enabled'];
        }

        return $rules;
    }

    /**
     * Update rule in database
     */
    private function updateRuleInDB(string $ruleId, array $updates): array
    {
        $setParts = [];
        $params = [];

        foreach ($updates as $field => $value) {
            if ($field === 'conditions' || $field === 'actions') {
                $setParts[] = "{$field} = ?";
                $params[] = json_encode($value);
            } else {
                $setParts[] = "{$field} = ?";
                $params[] = $value;
            }
        }

        $setParts[] = "updated_at = ?";
        $params[] = date('Y-m-d H:i:s');
        $params[] = $ruleId;

        $sql = "UPDATE switching_rules SET " . implode(', ', $setParts) . " WHERE rule_id = ?";

        $stmt = $this->smartCameraSwitchingService->pdo->prepare($sql);
        $stmt->execute($params);

        // Return updated rule
        $stmt = $this->smartCameraSwitchingService->pdo->prepare("SELECT * FROM switching_rules WHERE rule_id = ?");
        $stmt->execute([$ruleId]);
        $rule = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($rule) {
            $rule['conditions'] = json_decode($rule['conditions'], true);
            $rule['actions'] = json_decode($rule['actions'], true);
            $rule['enabled'] = (bool)$rule['enabled'];
        }

        return $rule ?: [];
    }

    /**
     * Get session events from database
     */
    private function getSessionEventsFromDB(string $sessionId, int $limit, int $offset, ?string $switchType): array
    {
        $sql = "
            SELECT * FROM camera_switching_events
            WHERE session_id = ?
        ";
        $params = [$sessionId];

        if ($switchType) {
            $sql .= " AND switch_type = ?";
            $params[] = $switchType;
        }

        $sql .= " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->smartCameraSwitchingService->pdo->prepare($sql);
        $stmt->execute($params);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($events as &$event) {
            $event['metadata'] = json_decode($event['metadata'], true);
            $event['success'] = (bool)$event['success'];
        }

        return $events;
    }

    /**
     * Generate demo data for testing
     */
    private function generateDemoData(): array
    {
        return [
            'session' => [
                'session_id' => 'demo_session_' . time(),
                'interview_id' => 'demo_interview_001',
                'mode' => 'auto',
                'status' => 'active'
            ],
            'cameras' => [
                [
                    'camera_id' => 'host_cam',
                    'device_id' => 'device_1',
                    'name' => 'Host Camera',
                    'position' => 'host',
                    'priority' => 1,
                    'auto_switch_enabled' => true
                ],
                [
                    'camera_id' => 'guest_cam',
                    'device_id' => 'device_2',
                    'name' => 'Guest Camera',
                    'position' => 'guest',
                    'priority' => 2,
                    'auto_switch_enabled' => true
                ],
                [
                    'camera_id' => 'wide_cam',
                    'device_id' => 'device_3',
                    'name' => 'Wide Shot',
                    'position' => 'wide',
                    'priority' => 3,
                    'auto_switch_enabled' => true
                ]
            ],
            'audio_samples' => [
                [
                    'timestamp' => time(),
                    'level' => 0.7,
                    'frequency' => 220,
                    'clarity' => 0.8,
                    'background_noise' => 0.1,
                    'speech_pattern' => true
                ],
                [
                    'timestamp' => time() + 1,
                    'level' => 0.3,
                    'frequency' => 180,
                    'clarity' => 0.6,
                    'background_noise' => 0.2,
                    'speech_pattern' => false
                ]
            ],
            'engagement_samples' => [
                [
                    'participant_id' => 'host',
                    'attention' => 0.8,
                    'interaction' => 0.7,
                    'speech_activity' => 0.6,
                    'gesture_activity' => 0.5,
                    'facial_expression' => 'focused',
                    'emotion' => 'engaged'
                ],
                [
                    'participant_id' => 'guest',
                    'attention' => 0.9,
                    'interaction' => 0.8,
                    'speech_activity' => 0.7,
                    'gesture_activity' => 0.6,
                    'facial_expression' => 'happy',
                    'emotion' => 'excited'
                ]
            ],
            'switching_scenarios' => [
                [
                    'name' => 'Speaker Change',
                    'description' => 'Switch when a different speaker is detected',
                    'trigger_data' => [
                        'audio_data' => [
                            'level' => 0.8,
                            'frequency' => 200,
                            'clarity' => 0.9,
                            'speaker_detected' => 'guest'
                        ],
                        'target_camera' => 'guest_cam',
                        'confidence_score' => 0.9
                    ]
                ],
                [
                    'name' => 'High Engagement',
                    'description' => 'Switch to highly engaged participant',
                    'trigger_data' => [
                        'engagement_data' => [
                            'participant_id' => 'host',
                            'engagement_score' => 0.9,
                            'attention' => 0.95,
                            'interaction' => 0.8
                        ],
                        'target_camera' => 'host_cam',
                        'confidence_score' => 0.85
                    ]
                ],
                [
                    'name' => 'Silence Fallback',
                    'description' => 'Switch to wide shot during silence',
                    'trigger_data' => [
                        'audio_data' => [
                            'level' => 0.02,
                            'frequency' => 0,
                            'clarity' => 0.1,
                            'silence_duration' => 6.0
                        ],
                        'target_camera' => 'wide_cam',
                        'confidence_score' => 0.8
                    ]
                ]
            ]
        ];
    }

    /**
     * Return JSON response
     */
    private function jsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
