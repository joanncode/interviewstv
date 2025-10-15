<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Interview Template Service
 * Handles interview template creation, management, and usage
 */
class InterviewTemplateService
{
    private PDO $pdo;
    private array $config;

    public function __construct()
    {
        // Get database connection
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $this->pdo = $database->getConnection();

        $this->config = [
            'max_questions_per_template' => 50,
            'max_template_duration' => 480, // 8 hours
            'default_question_time_limit' => 5
        ];
    }

    /**
     * Get all interview templates with filtering
     */
    public function getTemplates(array $filters = []): array
    {
        try {
            $where = ['1=1'];
            $params = [];

            // Apply filters
            if (!empty($filters['category'])) {
                $where[] = 'category = ?';
                $params[] = $filters['category'];
            }

            if (!empty($filters['type'])) {
                $where[] = 'type = ?';
                $params[] = $filters['type'];
            }

            if (isset($filters['is_public'])) {
                $where[] = 'is_public = ?';
                $params[] = $filters['is_public'] ? 1 : 0;
            }

            if (isset($filters['is_featured'])) {
                $where[] = 'is_featured = ?';
                $params[] = $filters['is_featured'] ? 1 : 0;
            }

            if (!empty($filters['search'])) {
                $where[] = '(name LIKE ? OR description LIKE ?)';
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            // Build query
            $orderBy = $filters['sort'] ?? 'featured_first';
            $orderClause = match($orderBy) {
                'name' => 'ORDER BY name ASC',
                'duration' => 'ORDER BY duration_minutes ASC',
                'usage' => 'ORDER BY usage_count DESC',
                'rating' => 'ORDER BY rating DESC',
                'recent' => 'ORDER BY created_at DESC',
                default => 'ORDER BY is_featured DESC, rating DESC, usage_count DESC'
            };

            $sql = "
                SELECT id, name, description, category, type, duration_minutes, 
                       max_guests, is_public, is_featured, usage_count, rating,
                       created_at, updated_at
                FROM interview_templates 
                WHERE " . implode(' AND ', $where) . " 
                $orderClause
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            throw new Exception('Failed to fetch templates: ' . $e->getMessage());
        }
    }

    /**
     * Get template by ID with questions
     */
    public function getTemplateById(string $templateId): ?array
    {
        try {
            // Get template
            $stmt = $this->pdo->prepare("
                SELECT * FROM interview_templates WHERE id = ?
            ");
            $stmt->execute([$templateId]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) {
                return null;
            }

            // Parse JSON fields
            $template['questions'] = json_decode($template['questions'], true) ?? [];
            $template['structure'] = json_decode($template['structure'], true) ?? [];
            $template['settings'] = json_decode($template['settings'], true) ?? [];

            // Get detailed questions if they exist
            $stmt = $this->pdo->prepare("
                SELECT * FROM interview_template_questions 
                WHERE template_id = ? 
                ORDER BY order_index ASC
            ");
            $stmt->execute([$templateId]);
            $detailedQuestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($detailedQuestions)) {
                foreach ($detailedQuestions as &$question) {
                    $question['follow_up_questions'] = json_decode($question['follow_up_questions'], true) ?? [];
                    $question['scoring_criteria'] = json_decode($question['scoring_criteria'], true) ?? [];
                }
                $template['detailed_questions'] = $detailedQuestions;
            }

            return $template;

        } catch (Exception $e) {
            throw new Exception('Failed to fetch template: ' . $e->getMessage());
        }
    }

    /**
     * Create a new interview template
     */
    public function createTemplate(array $data): array
    {
        try {
            $templateId = $this->generateTemplateId();

            // Validate and set defaults
            $data = array_merge([
                'category' => 'general',
                'type' => 'standard',
                'duration_minutes' => 60,
                'max_guests' => 10,
                'questions' => [],
                'structure' => [],
                'settings' => [],
                'is_public' => false,
                'is_featured' => false,
                'created_by' => null
            ], $data);

            // Validate duration
            if ($data['duration_minutes'] > $this->config['max_template_duration']) {
                throw new Exception('Template duration cannot exceed ' . $this->config['max_template_duration'] . ' minutes');
            }

            // Validate questions count
            if (count($data['questions']) > $this->config['max_questions_per_template']) {
                throw new Exception('Template cannot have more than ' . $this->config['max_questions_per_template'] . ' questions');
            }

            $stmt = $this->pdo->prepare("
                INSERT INTO interview_templates (
                    id, name, description, category, type, duration_minutes, max_guests,
                    questions, structure, settings, is_public, is_featured, created_by,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $templateId,
                $data['name'],
                $data['description'] ?? '',
                $data['category'],
                $data['type'],
                $data['duration_minutes'],
                $data['max_guests'],
                json_encode($data['questions']),
                json_encode($data['structure']),
                json_encode($data['settings']),
                $data['is_public'] ? 1 : 0,
                $data['is_featured'] ? 1 : 0,
                $data['created_by']
            ]);

            return $this->getTemplateById($templateId);

        } catch (Exception $e) {
            throw new Exception('Failed to create template: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing template
     */
    public function updateTemplate(string $templateId, array $data): array
    {
        try {
            $updateFields = [];
            $params = [];

            // Build update query dynamically
            $allowedFields = ['name', 'description', 'category', 'type', 'duration_minutes', 
                            'max_guests', 'questions', 'structure', 'settings', 'is_public', 'is_featured'];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $updateFields[] = "$field = ?";
                    
                    if (in_array($field, ['questions', 'structure', 'settings'])) {
                        $params[] = json_encode($data[$field]);
                    } elseif (in_array($field, ['is_public', 'is_featured'])) {
                        $params[] = $data[$field] ? 1 : 0;
                    } else {
                        $params[] = $data[$field];
                    }
                }
            }

            if (empty($updateFields)) {
                throw new Exception('No valid fields to update');
            }

            $updateFields[] = 'updated_at = NOW()';
            $params[] = $templateId;

            $sql = "UPDATE interview_templates SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            return $this->getTemplateById($templateId);

        } catch (Exception $e) {
            throw new Exception('Failed to update template: ' . $e->getMessage());
        }
    }

    /**
     * Delete a template
     */
    public function deleteTemplate(string $templateId): bool
    {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM interview_templates WHERE id = ?");
            $stmt->execute([$templateId]);
            
            return $stmt->rowCount() > 0;

        } catch (Exception $e) {
            throw new Exception('Failed to delete template: ' . $e->getMessage());
        }
    }

    /**
     * Apply template to interview room
     */
    public function applyTemplateToRoom(string $templateId, string $roomId, int $userId, array $customizations = []): array
    {
        try {
            $template = $this->getTemplateById($templateId);
            if (!$template) {
                throw new Exception('Template not found');
            }

            // Record template usage
            $usageId = $this->generateUsageId();
            $stmt = $this->pdo->prepare("
                INSERT INTO interview_template_usage (
                    id, template_id, room_id, used_by, customizations, used_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $usageId,
                $templateId,
                $roomId,
                $userId,
                json_encode($customizations)
            ]);

            // Update template usage count
            $stmt = $this->pdo->prepare("
                UPDATE interview_templates 
                SET usage_count = usage_count + 1 
                WHERE id = ?
            ");
            $stmt->execute([$templateId]);

            // Apply template settings to room (this would integrate with InterviewRoomService)
            $roomSettings = array_merge($template['settings'], $customizations);

            return [
                'template' => $template,
                'usage_id' => $usageId,
                'applied_settings' => $roomSettings
            ];

        } catch (Exception $e) {
            throw new Exception('Failed to apply template: ' . $e->getMessage());
        }
    }

    /**
     * Get template categories
     */
    public function getCategories(): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT category, COUNT(*) as count 
                FROM interview_templates 
                WHERE is_public = 1 
                GROUP BY category 
                ORDER BY count DESC
            ");
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            throw new Exception('Failed to fetch categories: ' . $e->getMessage());
        }
    }

    /**
     * Get template usage statistics
     */
    public function getTemplateStats(string $templateId): array
    {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total_usage,
                    AVG(feedback_rating) as avg_rating,
                    COUNT(CASE WHEN feedback_rating IS NOT NULL THEN 1 END) as rating_count
                FROM interview_template_usage 
                WHERE template_id = ?
            ");
            $stmt->execute([$templateId]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (Exception $e) {
            throw new Exception('Failed to fetch template stats: ' . $e->getMessage());
        }
    }

    /**
     * Generate unique template ID
     */
    private function generateTemplateId(): string
    {
        return 'tpl_' . bin2hex(random_bytes(8));
    }

    /**
     * Generate unique usage ID
     */
    private function generateUsageId(): string
    {
        return 'usage_' . bin2hex(random_bytes(8));
    }
}
