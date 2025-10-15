<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Multi-Language Service
 * Handles internationalization (i18n) operations including language management,
 * translation retrieval, user preferences, and analytics
 */
class MultiLanguageService
{
    private PDO $db;

    public function __construct(PDO $database)
    {
        $this->db = $database;
    }

    /**
     * Get all available languages
     */
    public function getLanguages(array $options = []): array
    {
        try {
            $activeOnly = $options['active_only'] ?? true;
            
            $sql = "SELECT * FROM languages";
            $params = [];
            
            if ($activeOnly) {
                $sql .= " WHERE is_active = 1";
            }
            
            $sql .= " ORDER BY sort_order ASC, language_name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error getting languages: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get default language
     */
    public function getDefaultLanguage(): ?array
    {
        try {
            $sql = "SELECT * FROM languages WHERE is_default = 1 AND is_active = 1 LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            error_log("Error getting default language: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get translations for a specific language
     */
    public function getTranslations(string $languageId, array $options = []): array
    {
        try {
            $keyGroup = $options['key_group'] ?? '';
            $approvedOnly = $options['approved_only'] ?? true;
            
            $sql = "SELECT tk.key_name, t.translated_text, t.plural_forms, tk.is_plural
                    FROM translations t
                    JOIN translation_keys tk ON t.key_id = tk.key_id
                    WHERE t.language_id = :language_id";
            
            $params = ['language_id' => $languageId];
            
            if ($keyGroup) {
                $sql .= " AND tk.key_group = :key_group";
                $params['key_group'] = $keyGroup;
            }
            
            if ($approvedOnly) {
                $sql .= " AND t.is_approved = 1";
            }
            
            $sql .= " ORDER BY tk.key_name ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format as key-value pairs
            $translations = [];
            foreach ($results as $row) {
                $translations[$row['key_name']] = $row['translated_text'];
                
                // Add plural forms if available
                if ($row['is_plural'] && $row['plural_forms']) {
                    $pluralForms = json_decode($row['plural_forms'], true);
                    if ($pluralForms) {
                        $translations[$row['key_name'] . '_plural'] = $pluralForms;
                    }
                }
            }
            
            return $translations;
        } catch (Exception $e) {
            error_log("Error getting translations: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get specific translation by key
     */
    public function getTranslation(string $languageId, string $keyName, string $fallbackText = ''): string
    {
        try {
            $sql = "SELECT t.translated_text
                    FROM translations t
                    JOIN translation_keys tk ON t.key_id = tk.key_id
                    WHERE t.language_id = :language_id 
                    AND tk.key_name = :key_name 
                    AND t.is_approved = 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'language_id' => $languageId,
                'key_name' => $keyName
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                return $result['translated_text'];
            }
            
            // Fallback to default language if not found
            if ($languageId !== 'lang_en_us') {
                return $this->getTranslation('lang_en_us', $keyName, $fallbackText);
            }
            
            return $fallbackText ?: $keyName;
        } catch (Exception $e) {
            error_log("Error getting translation: " . $e->getMessage());
            return $fallbackText ?: $keyName;
        }
    }

    /**
     * Get translation key groups
     */
    public function getTranslationGroups(): array
    {
        try {
            $sql = "SELECT DISTINCT key_group, COUNT(*) as key_count
                    FROM translation_keys
                    GROUP BY key_group
                    ORDER BY key_group ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error getting translation groups: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Add or update translation
     */
    public function saveTranslation(string $languageId, string $keyName, string $translatedText, array $options = []): array
    {
        try {
            $this->db->beginTransaction();
            
            // Get or create translation key
            $keyId = $this->getOrCreateTranslationKey($keyName, $options);
            
            // Check if translation exists
            $sql = "SELECT translation_id FROM translations WHERE key_id = :key_id AND language_id = :language_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute(['key_id' => $keyId, 'language_id' => $languageId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // Update existing translation
                $sql = "UPDATE translations 
                        SET translated_text = :translated_text, 
                            plural_forms = :plural_forms,
                            is_approved = :is_approved,
                            translator_notes = :translator_notes,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE translation_id = :translation_id";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'translated_text' => $translatedText,
                    'plural_forms' => json_encode($options['plural_forms'] ?? null),
                    'is_approved' => $options['is_approved'] ?? 0,
                    'translator_notes' => $options['translator_notes'] ?? '',
                    'translation_id' => $existing['translation_id']
                ]);
                
                $translationId = $existing['translation_id'];
            } else {
                // Create new translation
                $translationId = 'trans_' . uniqid();
                
                $sql = "INSERT INTO translations (
                            translation_id, key_id, language_id, translated_text, 
                            plural_forms, is_approved, translator_notes
                        ) VALUES (
                            :translation_id, :key_id, :language_id, :translated_text,
                            :plural_forms, :is_approved, :translator_notes
                        )";
                
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    'translation_id' => $translationId,
                    'key_id' => $keyId,
                    'language_id' => $languageId,
                    'translated_text' => $translatedText,
                    'plural_forms' => json_encode($options['plural_forms'] ?? null),
                    'is_approved' => $options['is_approved'] ?? 0,
                    'translator_notes' => $options['translator_notes'] ?? ''
                ]);
            }
            
            // Log translation history
            $this->logTranslationHistory($translationId, $translatedText, $options);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'translation_id' => $translationId,
                'message' => 'Translation saved successfully'
            ];
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error saving translation: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to save translation'
            ];
        }
    }

    /**
     * Get or create translation key
     */
    private function getOrCreateTranslationKey(string $keyName, array $options = []): string
    {
        // Check if key exists
        $sql = "SELECT key_id FROM translation_keys WHERE key_name = :key_name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['key_name' => $keyName]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            return $existing['key_id'];
        }
        
        // Create new key
        $keyId = 'key_' . uniqid();
        
        $sql = "INSERT INTO translation_keys (
                    key_id, key_name, key_group, description, 
                    context, is_html, is_plural
                ) VALUES (
                    :key_id, :key_name, :key_group, :description,
                    :context, :is_html, :is_plural
                )";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'key_id' => $keyId,
            'key_name' => $keyName,
            'key_group' => $options['key_group'] ?? 'general',
            'description' => $options['description'] ?? '',
            'context' => $options['context'] ?? '',
            'is_html' => $options['is_html'] ?? 0,
            'is_plural' => $options['is_plural'] ?? 0
        ]);
        
        return $keyId;
    }

    /**
     * Log translation history
     */
    private function logTranslationHistory(string $translationId, string $newText, array $options = []): void
    {
        try {
            $historyId = 'hist_' . uniqid();
            
            $sql = "INSERT INTO translation_history (
                        history_id, translation_id, new_text, change_type,
                        changed_by, change_reason
                    ) VALUES (
                        :history_id, :translation_id, :new_text, :change_type,
                        :changed_by, :change_reason
                    )";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'history_id' => $historyId,
                'translation_id' => $translationId,
                'new_text' => $newText,
                'change_type' => $options['change_type'] ?? 'update',
                'changed_by' => $options['changed_by'] ?? 'system',
                'change_reason' => $options['change_reason'] ?? ''
            ]);
        } catch (Exception $e) {
            error_log("Error logging translation history: " . $e->getMessage());
        }
    }

    /**
     * Get user language preferences
     */
    public function getUserLanguagePreferences(string $userId): ?array
    {
        try {
            $sql = "SELECT ulp.*, l.language_name, l.native_name, l.locale_code, l.direction
                    FROM user_language_preferences ulp
                    JOIN languages l ON ulp.language_id = l.language_id
                    WHERE ulp.user_id = :user_id AND ulp.is_primary = 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute(['user_id' => $userId]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            error_log("Error getting user language preferences: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Set user language preferences
     */
    public function setUserLanguagePreferences(string $userId, string $languageId, array $preferences = []): array
    {
        try {
            $preferenceId = 'pref_' . uniqid();
            
            // Remove existing primary preference
            $sql = "UPDATE user_language_preferences SET is_primary = 0 WHERE user_id = :user_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute(['user_id' => $userId]);
            
            // Insert new preference
            $sql = "INSERT OR REPLACE INTO user_language_preferences (
                        preference_id, user_id, language_id, is_primary, auto_detect,
                        date_format, time_format, timezone, number_format, currency_code
                    ) VALUES (
                        :preference_id, :user_id, :language_id, 1, :auto_detect,
                        :date_format, :time_format, :timezone, :number_format, :currency_code
                    )";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'preference_id' => $preferenceId,
                'user_id' => $userId,
                'language_id' => $languageId,
                'auto_detect' => $preferences['auto_detect'] ?? 1,
                'date_format' => $preferences['date_format'] ?? 'MM/DD/YYYY',
                'time_format' => $preferences['time_format'] ?? '12h',
                'timezone' => $preferences['timezone'] ?? 'UTC',
                'number_format' => $preferences['number_format'] ?? 'en-US',
                'currency_code' => $preferences['currency_code'] ?? 'USD'
            ]);
            
            return [
                'success' => true,
                'preference_id' => $preferenceId,
                'message' => 'Language preferences updated successfully'
            ];
        } catch (Exception $e) {
            error_log("Error setting user language preferences: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to update language preferences'
            ];
        }
    }

    /**
     * Get translation analytics
     */
    public function getTranslationAnalytics(array $options = []): array
    {
        try {
            $languageId = $options['language_id'] ?? '';
            $startDate = $options['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $options['end_date'] ?? date('Y-m-d');
            
            $sql = "SELECT ta.*, l.language_name, l.native_name, l.flag_icon
                    FROM translation_analytics ta
                    JOIN languages l ON ta.language_id = l.language_id
                    WHERE ta.date BETWEEN :start_date AND :end_date";
            
            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];
            
            if ($languageId) {
                $sql .= " AND ta.language_id = :language_id";
                $params['language_id'] = $languageId;
            }
            
            $sql .= " ORDER BY ta.date DESC, l.sort_order ASC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error getting translation analytics: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get demo data for testing
     */
    public function getDemoData(): array
    {
        try {
            return [
                'languages' => $this->getLanguages(),
                'translation_groups' => $this->getTranslationGroups(),
                'default_language' => $this->getDefaultLanguage(),
                'sample_translations' => $this->getTranslations('lang_en_us'),
                'analytics_summary' => $this->getAnalyticsSummary(),
                'total_languages' => $this->getTotalLanguageCount(),
                'total_keys' => $this->getTotalKeyCount(),
                'total_translations' => $this->getTotalTranslationCount()
            ];
        } catch (Exception $e) {
            error_log("Error getting demo data: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get analytics summary
     */
    private function getAnalyticsSummary(): array
    {
        try {
            $sql = "SELECT 
                        COUNT(DISTINCT l.language_id) as active_languages,
                        COUNT(DISTINCT tk.key_id) as total_keys,
                        COUNT(t.translation_id) as total_translations,
                        AVG(l.completion_percentage) as avg_completion
                    FROM languages l
                    LEFT JOIN translations t ON l.language_id = t.language_id
                    LEFT JOIN translation_keys tk ON t.key_id = tk.key_id
                    WHERE l.is_active = 1";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            error_log("Error getting analytics summary: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get total language count
     */
    private function getTotalLanguageCount(): int
    {
        try {
            $stmt = $this->db->query("SELECT COUNT(*) FROM languages WHERE is_active = 1");
            return (int) $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }

    /**
     * Get total key count
     */
    private function getTotalKeyCount(): int
    {
        try {
            $stmt = $this->db->query("SELECT COUNT(*) FROM translation_keys");
            return (int) $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }

    /**
     * Get total translation count
     */
    private function getTotalTranslationCount(): int
    {
        try {
            $stmt = $this->db->query("SELECT COUNT(*) FROM translations WHERE is_approved = 1");
            return (int) $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }

    /**
     * Update language completion percentage
     */
    public function updateLanguageCompletion(string $languageId): void
    {
        try {
            $sql = "SELECT
                        COUNT(DISTINCT tk.key_id) as total_keys,
                        COUNT(DISTINCT CASE WHEN t.is_approved = 1 THEN t.key_id END) as completed_keys
                    FROM translation_keys tk
                    LEFT JOIN translations t ON tk.key_id = t.key_id AND t.language_id = :language_id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute(['language_id' => $languageId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $totalKeys = (int) $result['total_keys'];
            $completedKeys = (int) $result['completed_keys'];
            $completionPercentage = $totalKeys > 0 ? ($completedKeys / $totalKeys) * 100 : 0;

            $sql = "UPDATE languages SET completion_percentage = :completion_percentage WHERE language_id = :language_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                'completion_percentage' => round($completionPercentage, 2),
                'language_id' => $languageId
            ]);
        } catch (Exception $e) {
            error_log("Error updating language completion: " . $e->getMessage());
        }
    }

    /**
     * Get language by locale code
     */
    public function getLanguageByLocale(string $localeCode): ?array
    {
        try {
            $sql = "SELECT * FROM languages WHERE locale_code = :locale_code AND is_active = 1";
            $stmt = $this->db->prepare($sql);
            $stmt->execute(['locale_code' => $localeCode]);

            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        } catch (Exception $e) {
            error_log("Error getting language by locale: " . $e->getMessage());
            return null;
        }
    }
}
