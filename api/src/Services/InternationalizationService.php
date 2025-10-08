<?php

namespace App\Services;

use PDO;
use Exception;

/**
 * Internationalization Service for Multi-Language Support
 */
class InternationalizationService
{
    private PDO $pdo;
    private array $config;
    private array $loadedTranslations = [];
    private string $currentLocale;
    private string $fallbackLocale;

    public function __construct(PDO $pdo, array $config = [])
    {
        $this->pdo = $pdo;
        $this->config = array_merge([
            'default_locale' => 'en',
            'fallback_locale' => 'en',
            'supported_locales' => ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
            'rtl_locales' => ['ar', 'he', 'fa', 'ur'],
            'auto_detect' => true,
            'cache_translations' => true,
            'translation_cache_ttl' => 3600
        ], $config);

        $this->currentLocale = $this->config['default_locale'];
        $this->fallbackLocale = $this->config['fallback_locale'];
    }

    /**
     * Set current locale
     */
    public function setLocale(string $locale): bool
    {
        if (!$this->isLocaleSupported($locale)) {
            return false;
        }

        $this->currentLocale = $locale;
        return true;
    }

    /**
     * Get current locale
     */
    public function getCurrentLocale(): string
    {
        return $this->currentLocale;
    }

    /**
     * Get all supported locales
     */
    public function getSupportedLocales(): array
    {
        return $this->config['supported_locales'];
    }

    /**
     * Check if locale is supported
     */
    public function isLocaleSupported(string $locale): bool
    {
        return in_array($locale, $this->config['supported_locales']);
    }

    /**
     * Detect locale from HTTP headers
     */
    public function detectLocale(string $acceptLanguage = ''): string
    {
        if (!$this->config['auto_detect']) {
            return $this->config['default_locale'];
        }

        if (empty($acceptLanguage)) {
            $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        }

        // Parse Accept-Language header
        $languages = [];
        if (preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)\s*(?:;\s*q\s*=\s*(1|0\.[0-9]+))?/i', $acceptLanguage, $matches)) {
            $languages = array_combine($matches[1], $matches[2]);
            
            // Set default quality to 1 for languages without explicit quality
            foreach ($languages as $lang => $quality) {
                if ($quality === '') {
                    $languages[$lang] = 1;
                }
            }
            
            // Sort by quality
            arsort($languages, SORT_NUMERIC);
        }

        // Find best matching supported locale
        foreach ($languages as $lang => $quality) {
            $locale = strtolower(substr($lang, 0, 2));
            if ($this->isLocaleSupported($locale)) {
                return $locale;
            }
        }

        return $this->config['default_locale'];
    }

    /**
     * Translate a key
     */
    public function translate(string $key, array $params = [], string $locale = null): string
    {
        $locale = $locale ?? $this->currentLocale;
        
        // Load translations for locale if not already loaded
        if (!isset($this->loadedTranslations[$locale])) {
            $this->loadTranslations($locale);
        }

        // Get translation
        $translation = $this->getTranslationValue($key, $locale);
        
        // Fallback to default locale if translation not found
        if ($translation === null && $locale !== $this->fallbackLocale) {
            if (!isset($this->loadedTranslations[$this->fallbackLocale])) {
                $this->loadTranslations($this->fallbackLocale);
            }
            $translation = $this->getTranslationValue($key, $this->fallbackLocale);
        }

        // Return key if no translation found
        if ($translation === null) {
            $this->logMissingTranslation($key, $locale);
            return $key;
        }

        // Replace parameters
        return $this->replaceParameters($translation, $params);
    }

    /**
     * Translate multiple keys at once
     */
    public function translateBatch(array $keys, string $locale = null): array
    {
        $locale = $locale ?? $this->currentLocale;
        $translations = [];

        foreach ($keys as $key) {
            $translations[$key] = $this->translate($key, [], $locale);
        }

        return $translations;
    }

    /**
     * Add or update translation
     */
    public function setTranslation(string $key, string $value, string $locale, string $namespace = 'default'): bool
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO translations (translation_key, locale, namespace, value, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                value = VALUES(value),
                updated_at = NOW()
            ");
            
            $stmt->execute([$key, $locale, $namespace, $value]);
            
            // Clear cache for this locale
            unset($this->loadedTranslations[$locale]);
            
            return true;

        } catch (Exception $e) {
            error_log("Failed to set translation: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Import translations from array
     */
    public function importTranslations(array $translations, string $locale, string $namespace = 'default'): int
    {
        $imported = 0;
        
        try {
            $this->pdo->beginTransaction();
            
            foreach ($translations as $key => $value) {
                if ($this->setTranslation($key, $value, $locale, $namespace)) {
                    $imported++;
                }
            }
            
            $this->pdo->commit();
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Failed to import translations: " . $e->getMessage());
        }
        
        return $imported;
    }

    /**
     * Export translations for a locale
     */
    public function exportTranslations(string $locale, string $namespace = 'default'): array
    {
        $stmt = $this->pdo->prepare("
            SELECT translation_key, value 
            FROM translations 
            WHERE locale = ? AND namespace = ?
            ORDER BY translation_key
        ");
        
        $stmt->execute([$locale, $namespace]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $translations = [];
        foreach ($results as $row) {
            $translations[$row['translation_key']] = $row['value'];
        }
        
        return $translations;
    }

    /**
     * Get translation statistics
     */
    public function getTranslationStats(): array
    {
        $stmt = $this->pdo->prepare("
            SELECT 
                locale,
                namespace,
                COUNT(*) as translation_count,
                COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) as completed_count
            FROM translations
            GROUP BY locale, namespace
            ORDER BY locale, namespace
        ");
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $stats = [];
        foreach ($results as $row) {
            $completionRate = $row['translation_count'] > 0 ? 
                round(($row['completed_count'] / $row['translation_count']) * 100, 2) : 0;
                
            $stats[] = [
                'locale' => $row['locale'],
                'namespace' => $row['namespace'],
                'total_keys' => (int)$row['translation_count'],
                'completed_keys' => (int)$row['completed_count'],
                'completion_rate' => $completionRate
            ];
        }
        
        return $stats;
    }

    /**
     * Get missing translations for a locale
     */
    public function getMissingTranslations(string $locale, string $referenceLocale = null): array
    {
        $referenceLocale = $referenceLocale ?? $this->fallbackLocale;
        
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT r.translation_key, r.namespace
            FROM translations r
            LEFT JOIN translations t ON r.translation_key = t.translation_key 
                AND r.namespace = t.namespace 
                AND t.locale = ?
            WHERE r.locale = ? 
            AND (t.value IS NULL OR t.value = '')
            ORDER BY r.namespace, r.translation_key
        ");
        
        $stmt->execute([$locale, $referenceLocale]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Format number according to locale
     */
    public function formatNumber(float $number, int $decimals = 2, string $locale = null): string
    {
        $locale = $locale ?? $this->currentLocale;
        
        $localeMap = [
            'en' => 'en_US',
            'es' => 'es_ES',
            'fr' => 'fr_FR',
            'de' => 'de_DE',
            'it' => 'it_IT',
            'pt' => 'pt_PT',
            'ru' => 'ru_RU',
            'zh' => 'zh_CN',
            'ja' => 'ja_JP',
            'ko' => 'ko_KR'
        ];
        
        $fullLocale = $localeMap[$locale] ?? 'en_US';
        
        if (class_exists('NumberFormatter')) {
            $formatter = new \NumberFormatter($fullLocale, \NumberFormatter::DECIMAL);
            $formatter->setAttribute(\NumberFormatter::FRACTION_DIGITS, $decimals);
            return $formatter->format($number);
        }
        
        // Fallback formatting
        return number_format($number, $decimals);
    }

    /**
     * Format currency according to locale
     */
    public function formatCurrency(float $amount, string $currency = 'USD', string $locale = null): string
    {
        $locale = $locale ?? $this->currentLocale;
        
        $localeMap = [
            'en' => 'en_US',
            'es' => 'es_ES',
            'fr' => 'fr_FR',
            'de' => 'de_DE',
            'it' => 'it_IT',
            'pt' => 'pt_PT',
            'ru' => 'ru_RU',
            'zh' => 'zh_CN',
            'ja' => 'ja_JP',
            'ko' => 'ko_KR'
        ];
        
        $fullLocale = $localeMap[$locale] ?? 'en_US';
        
        if (class_exists('NumberFormatter')) {
            $formatter = new \NumberFormatter($fullLocale, \NumberFormatter::CURRENCY);
            return $formatter->formatCurrency($amount, $currency);
        }
        
        // Fallback formatting
        $symbols = [
            'USD' => '$',
            'EUR' => '€',
            'GBP' => '£',
            'JPY' => '¥',
            'CNY' => '¥',
            'KRW' => '₩'
        ];
        
        $symbol = $symbols[$currency] ?? $currency;
        return $symbol . number_format($amount, 2);
    }

    /**
     * Format date according to locale
     */
    public function formatDate(\DateTime $date, string $format = 'medium', string $locale = null): string
    {
        $locale = $locale ?? $this->currentLocale;
        
        $formats = [
            'en' => [
                'short' => 'M/d/Y',
                'medium' => 'M j, Y',
                'long' => 'F j, Y',
                'full' => 'l, F j, Y'
            ],
            'es' => [
                'short' => 'd/m/Y',
                'medium' => 'd M Y',
                'long' => 'd \d\e F \d\e Y',
                'full' => 'l, d \d\e F \d\e Y'
            ],
            'fr' => [
                'short' => 'd/m/Y',
                'medium' => 'd M Y',
                'long' => 'd F Y',
                'full' => 'l d F Y'
            ],
            'de' => [
                'short' => 'd.m.Y',
                'medium' => 'd. M Y',
                'long' => 'd. F Y',
                'full' => 'l, d. F Y'
            ]
        ];
        
        $localeFormats = $formats[$locale] ?? $formats['en'];
        $dateFormat = $localeFormats[$format] ?? $localeFormats['medium'];
        
        return $date->format($dateFormat);
    }

    /**
     * Check if locale is RTL (Right-to-Left)
     */
    public function isRTL(string $locale = null): bool
    {
        $locale = $locale ?? $this->currentLocale;
        return in_array($locale, $this->config['rtl_locales']);
    }

    /**
     * Get locale information
     */
    public function getLocaleInfo(string $locale = null): array
    {
        $locale = $locale ?? $this->currentLocale;
        
        $localeInfo = [
            'en' => ['name' => 'English', 'native_name' => 'English', 'flag' => '🇺🇸'],
            'es' => ['name' => 'Spanish', 'native_name' => 'Español', 'flag' => '🇪🇸'],
            'fr' => ['name' => 'French', 'native_name' => 'Français', 'flag' => '🇫🇷'],
            'de' => ['name' => 'German', 'native_name' => 'Deutsch', 'flag' => '🇩🇪'],
            'it' => ['name' => 'Italian', 'native_name' => 'Italiano', 'flag' => '🇮🇹'],
            'pt' => ['name' => 'Portuguese', 'native_name' => 'Português', 'flag' => '🇵🇹'],
            'ru' => ['name' => 'Russian', 'native_name' => 'Русский', 'flag' => '🇷🇺'],
            'zh' => ['name' => 'Chinese', 'native_name' => '中文', 'flag' => '🇨🇳'],
            'ja' => ['name' => 'Japanese', 'native_name' => '日本語', 'flag' => '🇯🇵'],
            'ko' => ['name' => 'Korean', 'native_name' => '한국어', 'flag' => '🇰🇷'],
            'ar' => ['name' => 'Arabic', 'native_name' => 'العربية', 'flag' => '🇸🇦'],
            'he' => ['name' => 'Hebrew', 'native_name' => 'עברית', 'flag' => '🇮🇱']
        ];
        
        return $localeInfo[$locale] ?? [
            'name' => ucfirst($locale),
            'native_name' => ucfirst($locale),
            'flag' => '🌐'
        ];
    }

    // Private helper methods
    private function loadTranslations(string $locale): void
    {
        $stmt = $this->pdo->prepare("
            SELECT translation_key, value, namespace
            FROM translations 
            WHERE locale = ?
        ");
        
        $stmt->execute([$locale]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->loadedTranslations[$locale] = [];
        foreach ($results as $row) {
            $namespace = $row['namespace'] ?? 'default';
            if (!isset($this->loadedTranslations[$locale][$namespace])) {
                $this->loadedTranslations[$locale][$namespace] = [];
            }
            $this->loadedTranslations[$locale][$namespace][$row['translation_key']] = $row['value'];
        }
    }

    private function getTranslationValue(string $key, string $locale): ?string
    {
        // Support namespaced keys (namespace.key)
        $parts = explode('.', $key, 2);
        if (count($parts) === 2) {
            $namespace = $parts[0];
            $translationKey = $parts[1];
        } else {
            $namespace = 'default';
            $translationKey = $key;
        }
        
        return $this->loadedTranslations[$locale][$namespace][$translationKey] ?? null;
    }

    private function replaceParameters(string $translation, array $params): string
    {
        foreach ($params as $key => $value) {
            $translation = str_replace("{{$key}}", $value, $translation);
        }
        
        return $translation;
    }

    private function logMissingTranslation(string $key, string $locale): void
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO missing_translations (translation_key, locale, occurrence_count, first_seen, last_seen)
                VALUES (?, ?, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                occurrence_count = occurrence_count + 1,
                last_seen = NOW()
            ");
            
            $stmt->execute([$key, $locale]);
        } catch (Exception $e) {
            error_log("Failed to log missing translation: " . $e->getMessage());
        }
    }
}
