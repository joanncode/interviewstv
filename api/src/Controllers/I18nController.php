<?php

namespace App\Controllers;

use App\Services\I18nService;
use App\Http\Response;

/**
 * Internationalization (i18n) Controller
 * Handles language and translation management
 */
class I18nController
{
    private $i18nService;

    public function __construct()
    {
        $this->i18nService = new I18nService();
    }

    /**
     * Get available languages
     * GET /api/i18n/languages
     */
    public function getLanguages()
    {
        try {
            $languages = $this->i18nService->getAvailableLanguages();
            
            return Response::success([
                'languages' => $languages,
                'default' => $this->i18nService->getDefaultLanguage(),
                'count' => count($languages)
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to get languages', 500, $e->getMessage());
        }
    }

    /**
     * Get translations for a specific language
     * GET /api/i18n/translations/{locale}
     */
    public function getTranslations($locale)
    {
        try {
            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            $translations = $this->i18nService->getTranslations($locale);
            
            if (!$translations) {
                return Response::error('Translations not found', 404);
            }

            return Response::success([
                'locale' => $locale,
                'translations' => $translations,
                'last_updated' => $this->i18nService->getTranslationsLastUpdated($locale)
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to get translations', 500, $e->getMessage());
        }
    }

    /**
     * Get specific translation key
     * GET /api/i18n/translations/{locale}/{key}
     */
    public function getTranslation($locale, $key)
    {
        try {
            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            $translation = $this->i18nService->getTranslation($locale, $key);
            
            if ($translation === null) {
                return Response::error('Translation key not found', 404);
            }

            return Response::success([
                'locale' => $locale,
                'key' => $key,
                'value' => $translation
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to get translation', 500, $e->getMessage());
        }
    }

    /**
     * Update translations (admin only)
     * PUT /api/i18n/translations/{locale}
     */
    public function updateTranslations($locale)
    {
        try {
            // Check admin permissions
            if (!$this->hasAdminPermission()) {
                return Response::error('Unauthorized', 403);
            }

            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['translations'])) {
                return Response::error('Translations data required', 400);
            }

            $result = $this->i18nService->updateTranslations($locale, $input['translations']);
            
            if (!$result) {
                return Response::error('Failed to update translations', 500);
            }

            return Response::success([
                'locale' => $locale,
                'updated' => true,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to update translations', 500, $e->getMessage());
        }
    }

    /**
     * Add new language (admin only)
     * POST /api/i18n/languages
     */
    public function addLanguage()
    {
        try {
            // Check admin permissions
            if (!$this->hasAdminPermission()) {
                return Response::error('Unauthorized', 403);
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            $required = ['code', 'name', 'nativeName', 'flag'];
            foreach ($required as $field) {
                if (!isset($input[$field])) {
                    return Response::error("Field '$field' is required", 400);
                }
            }

            if ($this->i18nService->isLanguageSupported($input['code'])) {
                return Response::error('Language already exists', 409);
            }

            $result = $this->i18nService->addLanguage($input);
            
            if (!$result) {
                return Response::error('Failed to add language', 500);
            }

            return Response::success([
                'language' => $input,
                'added' => true,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to add language', 500, $e->getMessage());
        }
    }

    /**
     * Get translation statistics
     * GET /api/i18n/stats
     */
    public function getStats()
    {
        try {
            $stats = $this->i18nService->getTranslationStats();
            
            return Response::success($stats);
        } catch (\Exception $e) {
            return Response::error('Failed to get translation stats', 500, $e->getMessage());
        }
    }

    /**
     * Get missing translations
     * GET /api/i18n/missing/{locale}
     */
    public function getMissingTranslations($locale)
    {
        try {
            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            $missing = $this->i18nService->getMissingTranslations($locale);
            
            return Response::success([
                'locale' => $locale,
                'missing_keys' => $missing,
                'count' => count($missing)
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to get missing translations', 500, $e->getMessage());
        }
    }

    /**
     * Export translations
     * GET /api/i18n/export/{locale}
     */
    public function exportTranslations($locale)
    {
        try {
            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            $translations = $this->i18nService->getTranslations($locale);
            $filename = "translations_{$locale}_" . date('Y-m-d_H-i-s') . '.json';
            
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: no-cache, must-revalidate');
            
            echo json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        } catch (\Exception $e) {
            return Response::error('Failed to export translations', 500, $e->getMessage());
        }
    }

    /**
     * Import translations (admin only)
     * POST /api/i18n/import/{locale}
     */
    public function importTranslations($locale)
    {
        try {
            // Check admin permissions
            if (!$this->hasAdminPermission()) {
                return Response::error('Unauthorized', 403);
            }

            if (!$this->i18nService->isLanguageSupported($locale)) {
                return Response::error('Language not supported', 400);
            }

            if (!isset($_FILES['translations']) || $_FILES['translations']['error'] !== UPLOAD_ERR_OK) {
                return Response::error('Translation file required', 400);
            }

            $fileContent = file_get_contents($_FILES['translations']['tmp_name']);
            $translations = json_decode($fileContent, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return Response::error('Invalid JSON file', 400);
            }

            $result = $this->i18nService->importTranslations($locale, $translations);
            
            if (!$result) {
                return Response::error('Failed to import translations', 500);
            }

            return Response::success([
                'locale' => $locale,
                'imported' => true,
                'keys_count' => $this->countTranslationKeys($translations),
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            return Response::error('Failed to import translations', 500, $e->getMessage());
        }
    }

    /**
     * Check if user has admin permission
     */
    private function hasAdminPermission()
    {
        // TODO: Implement proper admin permission check
        // For now, return true for development
        return true;
    }

    /**
     * Count translation keys recursively
     */
    private function countTranslationKeys($translations, $count = 0)
    {
        foreach ($translations as $key => $value) {
            if (is_array($value)) {
                $count = $this->countTranslationKeys($value, $count);
            } else {
                $count++;
            }
        }
        return $count;
    }
}
