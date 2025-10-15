<?php

namespace App\Controllers;

use App\Services\MultiLanguageService;

/**
 * Multi-Language Controller
 * Handles REST API endpoints for internationalization (i18n) operations
 */
class MultiLanguageController
{
    private MultiLanguageService $languageService;

    public function __construct()
    {
        require_once __DIR__ . '/../../config/database.php';
        $database = new \Database();
        $pdo = $database->getConnection();
        $this->languageService = new MultiLanguageService($pdo);
    }

    /**
     * Get all available languages
     * GET /api/languages
     */
    public function getLanguages(): void
    {
        try {
            $activeOnly = $_GET['active_only'] ?? 'true';
            $options = [
                'active_only' => filter_var($activeOnly, FILTER_VALIDATE_BOOLEAN)
            ];
            
            $languages = $this->languageService->getLanguages($options);
            
            $this->sendResponse([
                'success' => true,
                'data' => $languages,
                'count' => count($languages)
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve languages'
            ], 500);
        }
    }

    /**
     * Get default language
     * GET /api/languages/default
     */
    public function getDefaultLanguage(): void
    {
        try {
            $defaultLanguage = $this->languageService->getDefaultLanguage();
            
            if ($defaultLanguage) {
                $this->sendResponse([
                    'success' => true,
                    'data' => $defaultLanguage
                ]);
            } else {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'Default language not found'
                ], 404);
            }
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve default language'
            ], 500);
        }
    }

    /**
     * Get translations for a language
     * GET /api/languages/{languageId}/translations
     */
    public function getTranslations(): void
    {
        try {
            $languageId = $_GET['language_id'] ?? '';
            
            if (empty($languageId)) {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'Language ID is required'
                ], 400);
                return;
            }
            
            $options = [
                'key_group' => $_GET['key_group'] ?? '',
                'approved_only' => filter_var($_GET['approved_only'] ?? 'true', FILTER_VALIDATE_BOOLEAN)
            ];
            
            $translations = $this->languageService->getTranslations($languageId, $options);
            
            $this->sendResponse([
                'success' => true,
                'data' => $translations,
                'language_id' => $languageId,
                'count' => count($translations)
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve translations'
            ], 500);
        }
    }

    /**
     * Get specific translation
     * GET /api/languages/{languageId}/translations/{keyName}
     */
    public function getTranslation(): void
    {
        try {
            $languageId = $_GET['language_id'] ?? '';
            $keyName = $_GET['key_name'] ?? '';
            $fallbackText = $_GET['fallback'] ?? '';
            
            if (empty($languageId) || empty($keyName)) {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'Language ID and key name are required'
                ], 400);
                return;
            }
            
            $translation = $this->languageService->getTranslation($languageId, $keyName, $fallbackText);
            
            $this->sendResponse([
                'success' => true,
                'data' => [
                    'key_name' => $keyName,
                    'translated_text' => $translation,
                    'language_id' => $languageId
                ]
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve translation'
            ], 500);
        }
    }

    /**
     * Get translation groups
     * GET /api/languages/translation-groups
     */
    public function getTranslationGroups(): void
    {
        try {
            $groups = $this->languageService->getTranslationGroups();
            
            $this->sendResponse([
                'success' => true,
                'data' => $groups,
                'count' => count($groups)
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve translation groups'
            ], 500);
        }
    }

    /**
     * Save translation
     * POST /api/languages/{languageId}/translations
     */
    public function saveTranslation(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $languageId = $input['language_id'] ?? '';
            $keyName = $input['key_name'] ?? '';
            $translatedText = $input['translated_text'] ?? '';
            
            if (empty($languageId) || empty($keyName) || empty($translatedText)) {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'Language ID, key name, and translated text are required'
                ], 400);
                return;
            }
            
            $options = [
                'key_group' => $input['key_group'] ?? 'general',
                'description' => $input['description'] ?? '',
                'context' => $input['context'] ?? '',
                'is_html' => $input['is_html'] ?? false,
                'is_plural' => $input['is_plural'] ?? false,
                'plural_forms' => $input['plural_forms'] ?? null,
                'is_approved' => $input['is_approved'] ?? false,
                'translator_notes' => $input['translator_notes'] ?? '',
                'changed_by' => $input['changed_by'] ?? 'api_user',
                'change_reason' => $input['change_reason'] ?? 'API update'
            ];
            
            $result = $this->languageService->saveTranslation($languageId, $keyName, $translatedText, $options);
            
            if ($result['success']) {
                $this->sendResponse($result, 201);
            } else {
                $this->sendResponse($result, 400);
            }
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to save translation'
            ], 500);
        }
    }

    /**
     * Get user language preferences
     * GET /api/users/{userId}/language-preferences
     */
    public function getUserLanguagePreferences(): void
    {
        try {
            $userId = $_GET['user_id'] ?? '';
            
            if (empty($userId)) {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'User ID is required'
                ], 400);
                return;
            }
            
            $preferences = $this->languageService->getUserLanguagePreferences($userId);
            
            if ($preferences) {
                $this->sendResponse([
                    'success' => true,
                    'data' => $preferences
                ]);
            } else {
                // Return default language if no preferences found
                $defaultLanguage = $this->languageService->getDefaultLanguage();
                $this->sendResponse([
                    'success' => true,
                    'data' => $defaultLanguage,
                    'is_default' => true
                ]);
            }
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve user language preferences'
            ], 500);
        }
    }

    /**
     * Set user language preferences
     * POST /api/users/{userId}/language-preferences
     */
    public function setUserLanguagePreferences(): void
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $userId = $input['user_id'] ?? '';
            $languageId = $input['language_id'] ?? '';
            
            if (empty($userId) || empty($languageId)) {
                $this->sendResponse([
                    'success' => false,
                    'error' => 'User ID and language ID are required'
                ], 400);
                return;
            }
            
            $preferences = [
                'auto_detect' => $input['auto_detect'] ?? true,
                'date_format' => $input['date_format'] ?? 'MM/DD/YYYY',
                'time_format' => $input['time_format'] ?? '12h',
                'timezone' => $input['timezone'] ?? 'UTC',
                'number_format' => $input['number_format'] ?? 'en-US',
                'currency_code' => $input['currency_code'] ?? 'USD'
            ];
            
            $result = $this->languageService->setUserLanguagePreferences($userId, $languageId, $preferences);
            
            if ($result['success']) {
                $this->sendResponse($result, 201);
            } else {
                $this->sendResponse($result, 400);
            }
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to set user language preferences'
            ], 500);
        }
    }

    /**
     * Get translation analytics
     * GET /api/languages/analytics
     */
    public function getTranslationAnalytics(): void
    {
        try {
            $options = [
                'language_id' => $_GET['language_id'] ?? '',
                'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days')),
                'end_date' => $_GET['end_date'] ?? date('Y-m-d')
            ];
            
            $analytics = $this->languageService->getTranslationAnalytics($options);
            
            $this->sendResponse([
                'success' => true,
                'data' => $analytics,
                'count' => count($analytics),
                'date_range' => [
                    'start_date' => $options['start_date'],
                    'end_date' => $options['end_date']
                ]
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve translation analytics'
            ], 500);
        }
    }

    /**
     * Get demo data
     * GET /api/languages/demo-data
     */
    public function getDemoData(): void
    {
        try {
            $demoData = $this->languageService->getDemoData();
            
            $this->sendResponse([
                'success' => true,
                'data' => $demoData,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to retrieve demo data'
            ], 500);
        }
    }

    /**
     * Detect language from browser
     * GET /api/languages/detect
     */
    public function detectLanguage(): void
    {
        try {
            $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $detectedLanguages = [];
            
            if ($acceptLanguage) {
                // Parse Accept-Language header
                $languages = explode(',', $acceptLanguage);
                foreach ($languages as $lang) {
                    $parts = explode(';', trim($lang));
                    $langCode = trim($parts[0]);
                    $quality = 1.0;
                    
                    if (isset($parts[1]) && strpos($parts[1], 'q=') === 0) {
                        $quality = (float) substr($parts[1], 2);
                    }
                    
                    $detectedLanguages[] = [
                        'language_code' => $langCode,
                        'quality' => $quality
                    ];
                }
                
                // Sort by quality
                usort($detectedLanguages, function($a, $b) {
                    return $b['quality'] <=> $a['quality'];
                });
            }
            
            // Try to match with available languages
            $availableLanguages = $this->languageService->getLanguages();
            $matchedLanguage = null;
            
            foreach ($detectedLanguages as $detected) {
                foreach ($availableLanguages as $available) {
                    if (strpos($detected['language_code'], $available['language_code']) === 0) {
                        $matchedLanguage = $available;
                        break 2;
                    }
                }
            }
            
            // Fallback to default language
            if (!$matchedLanguage) {
                $matchedLanguage = $this->languageService->getDefaultLanguage();
            }
            
            $this->sendResponse([
                'success' => true,
                'data' => [
                    'detected_languages' => $detectedLanguages,
                    'matched_language' => $matchedLanguage,
                    'accept_language_header' => $acceptLanguage
                ]
            ]);
        } catch (\Exception $e) {
            $this->sendResponse([
                'success' => false,
                'error' => 'Failed to detect language'
            ], 500);
        }
    }

    /**
     * Send JSON response
     */
    private function sendResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        echo json_encode($data, JSON_PRETTY_PRINT);
    }
}
