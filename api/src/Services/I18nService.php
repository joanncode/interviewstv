<?php

namespace App\Services;

/**
 * Internationalization (i18n) Service
 * Handles language and translation management
 */
class I18nService
{
    private $supportedLanguages;
    private $defaultLanguage = 'en';
    private $translationsPath;

    public function __construct()
    {
        $this->translationsPath = __DIR__ . '/../../translations/';
        $this->initializeSupportedLanguages();
        $this->ensureTranslationsDirectory();
    }

    /**
     * Initialize supported languages
     */
    private function initializeSupportedLanguages()
    {
        $this->supportedLanguages = [
            'en' => [
                'code' => 'en',
                'name' => 'English',
                'nativeName' => 'English',
                'flag' => '🇺🇸',
                'rtl' => false,
                'enabled' => true
            ],
            'es' => [
                'code' => 'es',
                'name' => 'Spanish',
                'nativeName' => 'Español',
                'flag' => '🇪🇸',
                'rtl' => false,
                'enabled' => true
            ],
            'fr' => [
                'code' => 'fr',
                'name' => 'French',
                'nativeName' => 'Français',
                'flag' => '🇫🇷',
                'rtl' => false,
                'enabled' => true
            ],
            'de' => [
                'code' => 'de',
                'name' => 'German',
                'nativeName' => 'Deutsch',
                'flag' => '🇩🇪',
                'rtl' => false,
                'enabled' => true
            ],
            'it' => [
                'code' => 'it',
                'name' => 'Italian',
                'nativeName' => 'Italiano',
                'flag' => '🇮🇹',
                'rtl' => false,
                'enabled' => false
            ],
            'pt' => [
                'code' => 'pt',
                'name' => 'Portuguese',
                'nativeName' => 'Português',
                'flag' => '🇵🇹',
                'rtl' => false,
                'enabled' => false
            ],
            'ru' => [
                'code' => 'ru',
                'name' => 'Russian',
                'nativeName' => 'Русский',
                'flag' => '🇷🇺',
                'rtl' => false,
                'enabled' => false
            ],
            'zh' => [
                'code' => 'zh',
                'name' => 'Chinese',
                'nativeName' => '中文',
                'flag' => '🇨🇳',
                'rtl' => false,
                'enabled' => false
            ],
            'ja' => [
                'code' => 'ja',
                'name' => 'Japanese',
                'nativeName' => '日本語',
                'flag' => '🇯🇵',
                'rtl' => false,
                'enabled' => false
            ],
            'ko' => [
                'code' => 'ko',
                'name' => 'Korean',
                'nativeName' => '한국어',
                'flag' => '🇰🇷',
                'rtl' => false,
                'enabled' => false
            ],
            'ar' => [
                'code' => 'ar',
                'name' => 'Arabic',
                'nativeName' => 'العربية',
                'flag' => '🇸🇦',
                'rtl' => true,
                'enabled' => false
            ],
            'he' => [
                'code' => 'he',
                'name' => 'Hebrew',
                'nativeName' => 'עברית',
                'flag' => '🇮🇱',
                'rtl' => true,
                'enabled' => false
            ]
        ];
    }

    /**
     * Ensure translations directory exists
     */
    private function ensureTranslationsDirectory()
    {
        if (!is_dir($this->translationsPath)) {
            mkdir($this->translationsPath, 0755, true);
        }
    }

    /**
     * Get available languages
     */
    public function getAvailableLanguages()
    {
        return array_values(array_filter($this->supportedLanguages, function($lang) {
            return $lang['enabled'];
        }));
    }

    /**
     * Get all supported languages (including disabled)
     */
    public function getAllLanguages()
    {
        return array_values($this->supportedLanguages);
    }

    /**
     * Get default language
     */
    public function getDefaultLanguage()
    {
        return $this->defaultLanguage;
    }

    /**
     * Check if language is supported
     */
    public function isLanguageSupported($locale)
    {
        return isset($this->supportedLanguages[$locale]) && $this->supportedLanguages[$locale]['enabled'];
    }

    /**
     * Get translations for a locale
     */
    public function getTranslations($locale)
    {
        if (!$this->isLanguageSupported($locale)) {
            return null;
        }

        $filePath = $this->translationsPath . $locale . '.json';
        
        // If file doesn't exist, try to copy from frontend
        if (!file_exists($filePath)) {
            $this->copyFrontendTranslations($locale);
        }

        if (!file_exists($filePath)) {
            return null;
        }

        $content = file_get_contents($filePath);
        return json_decode($content, true);
    }

    /**
     * Copy translations from frontend to backend
     */
    private function copyFrontendTranslations($locale)
    {
        $frontendPath = __DIR__ . '/../../../web/src/locales/' . $locale . '.json';
        $backendPath = $this->translationsPath . $locale . '.json';
        
        if (file_exists($frontendPath)) {
            copy($frontendPath, $backendPath);
        }
    }

    /**
     * Get specific translation
     */
    public function getTranslation($locale, $key)
    {
        $translations = $this->getTranslations($locale);
        
        if (!$translations) {
            return null;
        }

        return $this->getNestedValue($translations, $key);
    }

    /**
     * Get nested value from array using dot notation
     */
    private function getNestedValue($array, $key)
    {
        $keys = explode('.', $key);
        $value = $array;

        foreach ($keys as $k) {
            if (!is_array($value) || !isset($value[$k])) {
                return null;
            }
            $value = $value[$k];
        }

        return is_string($value) ? $value : null;
    }

    /**
     * Update translations
     */
    public function updateTranslations($locale, $translations)
    {
        if (!$this->isLanguageSupported($locale)) {
            return false;
        }

        $filePath = $this->translationsPath . $locale . '.json';
        $content = json_encode($translations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        $result = file_put_contents($filePath, $content);
        
        // Also update frontend file if it exists
        $frontendPath = __DIR__ . '/../../../web/src/locales/' . $locale . '.json';
        if (file_exists(dirname($frontendPath))) {
            file_put_contents($frontendPath, $content);
        }
        
        return $result !== false;
    }

    /**
     * Add new language
     */
    public function addLanguage($languageData)
    {
        $code = $languageData['code'];
        
        if (isset($this->supportedLanguages[$code])) {
            return false; // Already exists
        }

        $this->supportedLanguages[$code] = [
            'code' => $code,
            'name' => $languageData['name'],
            'nativeName' => $languageData['nativeName'],
            'flag' => $languageData['flag'],
            'rtl' => $languageData['rtl'] ?? false,
            'enabled' => true
        ];

        // Create empty translation file
        $emptyTranslations = ['common' => ['buttons' => [], 'labels' => [], 'messages' => []]];
        return $this->updateTranslations($code, $emptyTranslations);
    }

    /**
     * Get translation statistics
     */
    public function getTranslationStats()
    {
        $stats = [
            'total_languages' => count($this->supportedLanguages),
            'enabled_languages' => count($this->getAvailableLanguages()),
            'languages' => []
        ];

        foreach ($this->supportedLanguages as $code => $language) {
            $translations = $this->getTranslations($code);
            $keyCount = $translations ? $this->countTranslationKeys($translations) : 0;
            
            $stats['languages'][$code] = [
                'name' => $language['name'],
                'nativeName' => $language['nativeName'],
                'enabled' => $language['enabled'],
                'key_count' => $keyCount,
                'last_updated' => $this->getTranslationsLastUpdated($code)
            ];
        }

        return $stats;
    }

    /**
     * Get missing translations compared to default language
     */
    public function getMissingTranslations($locale)
    {
        if ($locale === $this->defaultLanguage) {
            return []; // Default language can't have missing translations
        }

        $defaultTranslations = $this->getTranslations($this->defaultLanguage);
        $localeTranslations = $this->getTranslations($locale);

        if (!$defaultTranslations || !$localeTranslations) {
            return [];
        }

        return $this->findMissingKeys($defaultTranslations, $localeTranslations);
    }

    /**
     * Find missing keys recursively
     */
    private function findMissingKeys($default, $locale, $prefix = '')
    {
        $missing = [];

        foreach ($default as $key => $value) {
            $fullKey = $prefix ? $prefix . '.' . $key : $key;
            
            if (!isset($locale[$key])) {
                $missing[] = $fullKey;
            } elseif (is_array($value) && is_array($locale[$key])) {
                $missing = array_merge($missing, $this->findMissingKeys($value, $locale[$key], $fullKey));
            }
        }

        return $missing;
    }

    /**
     * Import translations
     */
    public function importTranslations($locale, $translations)
    {
        return $this->updateTranslations($locale, $translations);
    }

    /**
     * Get translations last updated timestamp
     */
    public function getTranslationsLastUpdated($locale)
    {
        $filePath = $this->translationsPath . $locale . '.json';
        
        if (!file_exists($filePath)) {
            return null;
        }

        return date('Y-m-d H:i:s', filemtime($filePath));
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
