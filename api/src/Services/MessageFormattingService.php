<?php

namespace InterviewsTV\Services;

/**
 * Message Formatting Service
 * Handles rich text formatting, markdown parsing, and message sanitization
 */
class MessageFormattingService {
    private $allowedTags;
    private $formattingRules;
    private $maxMessageLength;
    
    public function __construct() {
        $this->allowedTags = [
            'b', 'strong',      // Bold
            'i', 'em',          // Italic
            'u',                // Underline
            'code',             // Inline code
            'pre',              // Code blocks
            'blockquote',       // Quotes
            'a',                // Links (with restrictions)
            'br',               // Line breaks
            'span'              // For custom styling
        ];
        
        $this->formattingRules = [
            // Markdown-style formatting
            'bold' => [
                'pattern' => '/\*\*(.*?)\*\*/',
                'replacement' => '<strong>$1</strong>'
            ],
            'italic' => [
                'pattern' => '/\*(.*?)\*/',
                'replacement' => '<em>$1</em>'
            ],
            'underline' => [
                'pattern' => '/__(.*?)__/',
                'replacement' => '<u>$1</u>'
            ],
            'strikethrough' => [
                'pattern' => '/~~(.*?)~~/',
                'replacement' => '<span class="strikethrough">$1</span>'
            ],
            'inline_code' => [
                'pattern' => '/`(.*?)`/',
                'replacement' => '<code>$1</code>'
            ],
            'code_block' => [
                'pattern' => '/```(.*?)```/s',
                'replacement' => '<pre><code>$1</code></pre>'
            ],
            'quote' => [
                'pattern' => '/^> (.+)$/m',
                'replacement' => '<blockquote>$1</blockquote>'
            ]
        ];
        
        $this->maxMessageLength = 2000;
    }
    
    /**
     * Format message with rich text support
     */
    public function formatMessage(string $message, array $options = []) {
        try {
            // Validate message length
            if (strlen($message) > $this->maxMessageLength) {
                throw new \Exception('Message too long');
            }
            
            // Sanitize input first
            $message = $this->sanitizeInput($message);
            
            // Apply formatting rules
            $formattedMessage = $this->applyFormatting($message, $options);
            
            // Sanitize HTML output
            $formattedMessage = $this->sanitizeHtml($formattedMessage);
            
            // Extract formatting metadata
            $metadata = $this->extractFormattingMetadata($message, $formattedMessage);
            
            return [
                'original_message' => $message,
                'formatted_message' => $formattedMessage,
                'has_formatting' => $metadata['has_formatting'],
                'formatting_types' => $metadata['formatting_types'],
                'word_count' => str_word_count($message),
                'character_count' => strlen($message)
            ];
            
        } catch (\Exception $e) {
            return [
                'original_message' => $message,
                'formatted_message' => htmlspecialchars($message, ENT_QUOTES, 'UTF-8'),
                'has_formatting' => false,
                'formatting_types' => [],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Apply formatting rules to message
     */
    private function applyFormatting(string $message, array $options = []) {
        $formatted = $message;
        
        // Apply formatting rules in specific order
        $ruleOrder = [
            'code_block',    // Apply code blocks first to protect content
            'inline_code',   // Then inline code
            'bold',          // Then bold
            'italic',        // Then italic
            'underline',     // Then underline
            'strikethrough', // Then strikethrough
            'quote'          // Finally quotes
        ];
        
        foreach ($ruleOrder as $ruleName) {
            if (isset($this->formattingRules[$ruleName])) {
                $rule = $this->formattingRules[$ruleName];
                $formatted = preg_replace($rule['pattern'], $rule['replacement'], $formatted);
            }
        }
        
        // Handle line breaks
        $formatted = $this->handleLineBreaks($formatted);
        
        // Handle mentions if enabled
        if ($options['parse_mentions'] ?? true) {
            $formatted = $this->parseMentions($formatted);
        }
        
        // Handle links if enabled
        if ($options['parse_links'] ?? true) {
            $formatted = $this->parseLinks($formatted);
        }
        
        return $formatted;
    }
    
    /**
     * Sanitize input to prevent XSS
     */
    private function sanitizeInput(string $input) {
        // Remove null bytes
        $input = str_replace("\0", '', $input);
        
        // Normalize line endings
        $input = str_replace(["\r\n", "\r"], "\n", $input);
        
        // Limit consecutive newlines
        $input = preg_replace('/\n{3,}/', "\n\n", $input);
        
        return trim($input);
    }
    
    /**
     * Sanitize HTML output
     */
    private function sanitizeHtml(string $html) {
        // Use HTMLPurifier-like approach for allowed tags
        $allowedTagsPattern = '<' . implode('><', $this->allowedTags) . '>';
        
        // Strip disallowed tags
        $html = strip_tags($html, $allowedTagsPattern);
        
        // Remove dangerous attributes
        $html = preg_replace('/(<[^>]+)\s+(on\w+|javascript:|data:|vbscript:)[^>]*>/i', '$1>', $html);
        
        // Ensure proper nesting and close unclosed tags
        $html = $this->fixHtmlNesting($html);
        
        return $html;
    }
    
    /**
     * Handle line breaks in messages
     */
    private function handleLineBreaks(string $message) {
        // Convert single line breaks to <br> tags
        $message = preg_replace('/(?<!\n)\n(?!\n)/', '<br>', $message);
        
        // Convert double line breaks to paragraph breaks
        $message = preg_replace('/\n\n+/', '</p><p>', $message);
        
        // Wrap in paragraph tags if needed
        if (strpos($message, '<p>') === false && strpos($message, '<br>') !== false) {
            $message = '<p>' . $message . '</p>';
        }
        
        return $message;
    }
    
    /**
     * Parse @mentions in messages
     */
    private function parseMentions(string $message) {
        // Match @username patterns
        $pattern = '/@([a-zA-Z0-9_]+)/';
        $replacement = '<span class="mention" data-user="$1">@$1</span>';
        
        return preg_replace($pattern, $replacement, $message);
    }
    
    /**
     * Parse URLs in messages
     */
    private function parseLinks(string $message) {
        // Simple URL pattern (can be enhanced)
        $pattern = '/(https?:\/\/[^\s<>"\']+)/i';
        $replacement = '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>';
        
        return preg_replace($pattern, $replacement, $message);
    }
    
    /**
     * Fix HTML nesting issues
     */
    private function fixHtmlNesting(string $html) {
        // Simple approach - can be enhanced with proper HTML parser
        $openTags = [];
        $result = '';
        
        // This is a simplified version - in production, use a proper HTML parser
        return $html;
    }
    
    /**
     * Extract formatting metadata
     */
    private function extractFormattingMetadata(string $original, string $formatted) {
        $hasFormatting = $original !== strip_tags($formatted);
        $formattingTypes = [];
        
        // Check for each formatting type
        if (strpos($formatted, '<strong>') !== false || strpos($formatted, '<b>') !== false) {
            $formattingTypes[] = 'bold';
        }
        
        if (strpos($formatted, '<em>') !== false || strpos($formatted, '<i>') !== false) {
            $formattingTypes[] = 'italic';
        }
        
        if (strpos($formatted, '<u>') !== false) {
            $formattingTypes[] = 'underline';
        }
        
        if (strpos($formatted, 'class="strikethrough"') !== false) {
            $formattingTypes[] = 'strikethrough';
        }
        
        if (strpos($formatted, '<code>') !== false) {
            $formattingTypes[] = 'code';
        }
        
        if (strpos($formatted, '<pre>') !== false) {
            $formattingTypes[] = 'code_block';
        }
        
        if (strpos($formatted, '<blockquote>') !== false) {
            $formattingTypes[] = 'quote';
        }
        
        if (strpos($formatted, 'class="mention"') !== false) {
            $formattingTypes[] = 'mention';
        }
        
        if (strpos($formatted, 'class="message-link"') !== false) {
            $formattingTypes[] = 'link';
        }
        
        return [
            'has_formatting' => $hasFormatting,
            'formatting_types' => $formattingTypes
        ];
    }
    
    /**
     * Get formatting help text
     */
    public function getFormattingHelp() {
        return [
            'bold' => '**text** or __text__',
            'italic' => '*text*',
            'underline' => '__text__',
            'strikethrough' => '~~text~~',
            'inline_code' => '`code`',
            'code_block' => '```code block```',
            'quote' => '> quoted text',
            'mention' => '@username',
            'link' => 'URLs are automatically linked'
        ];
    }
    
    /**
     * Validate formatting syntax
     */
    public function validateFormatting(string $message) {
        $errors = [];
        
        // Check for unclosed formatting tags
        $patterns = [
            'bold' => '/\*\*/',
            'italic' => '/(?<!\*)\*(?!\*)/',
            'underline' => '/__/',
            'strikethrough' => '/~~/',
            'inline_code' => '/`/',
            'code_block' => '/```/'
        ];
        
        foreach ($patterns as $type => $pattern) {
            $matches = preg_match_all($pattern, $message);
            if ($matches % 2 !== 0) {
                $errors[] = "Unclosed {$type} formatting";
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * Strip all formatting from message
     */
    public function stripFormatting(string $message) {
        // Remove all markdown-style formatting
        $patterns = [
            '/\*\*(.*?)\*\*/',     // Bold
            '/\*(.*?)\*/',         // Italic
            '/__(.*?)__/',         // Underline
            '/~~(.*?)~~/',         // Strikethrough
            '/`(.*?)`/',           // Inline code
            '/```(.*?)```/s',      // Code blocks
            '/^> (.+)$/m'          // Quotes
        ];
        
        $replacements = [
            '$1', '$1', '$1', '$1', '$1', '$1', '$1'
        ];
        
        return preg_replace($patterns, $replacements, $message);
    }
    
    /**
     * Convert HTML back to markdown
     */
    public function htmlToMarkdown(string $html) {
        $conversions = [
            '/<strong>(.*?)<\/strong>/i' => '**$1**',
            '/<b>(.*?)<\/b>/i' => '**$1**',
            '/<em>(.*?)<\/em>/i' => '*$1*',
            '/<i>(.*?)<\/i>/i' => '*$1*',
            '/<u>(.*?)<\/u>/i' => '__$1__',
            '/<span class="strikethrough">(.*?)<\/span>/i' => '~~$1~~',
            '/<code>(.*?)<\/code>/i' => '`$1`',
            '/<pre><code>(.*?)<\/code><\/pre>/s' => '```$1```',
            '/<blockquote>(.*?)<\/blockquote>/i' => '> $1',
            '/<br\s*\/?>/i' => "\n"
        ];
        
        foreach ($conversions as $pattern => $replacement) {
            $html = preg_replace($pattern, $replacement, $html);
        }
        
        return strip_tags($html);
    }
    
    /**
     * Get formatting statistics
     */
    public function getFormattingStats(array $messages) {
        $stats = [
            'total_messages' => count($messages),
            'formatted_messages' => 0,
            'formatting_types' => [],
            'most_used_formatting' => null
        ];
        
        $typeCount = [];
        
        foreach ($messages as $message) {
            if (!empty($message['formatting_types'])) {
                $stats['formatted_messages']++;
                
                foreach ($message['formatting_types'] as $type) {
                    $typeCount[$type] = ($typeCount[$type] ?? 0) + 1;
                }
            }
        }
        
        $stats['formatting_types'] = $typeCount;
        
        if (!empty($typeCount)) {
            $stats['most_used_formatting'] = array_keys($typeCount, max($typeCount))[0];
        }
        
        return $stats;
    }
}
