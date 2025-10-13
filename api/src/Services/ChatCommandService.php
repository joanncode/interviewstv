<?php

namespace InterviewsTV\Services;

/**
 * Chat Command Service
 * Handles slash commands for chat moderation and user interaction
 */
class ChatCommandService {
    
    private $fileStorageService;
    private $moderationService;
    private $userModerationService;
    private $commandConfig;
    private $availableCommands;
    
    public function __construct() {
        $this->fileStorageService = new FileStorageService();
        $this->moderationService = new ChatModerationService();
        $this->userModerationService = new UserModerationService();
        $this->initializeCommandConfig();
        $this->loadAvailableCommands();
    }
    
    /**
     * Initialize command configuration
     */
    private function initializeCommandConfig() {
        $this->commandConfig = [
            'enabled' => true,
            'prefix' => '/',
            'case_sensitive' => false,
            'require_permissions' => true,
            'log_commands' => true,
            'rate_limit' => [
                'enabled' => true,
                'max_commands' => 10,
                'time_window' => 60 // seconds
            ],
            'auto_complete' => true,
            'help_enabled' => true,
            'alias_support' => true
        ];
    }
    
    /**
     * Load available commands with permissions and configurations
     */
    private function loadAvailableCommands() {
        $this->availableCommands = [
            // Moderation Commands
            'mute' => [
                'description' => 'Mute a user for a specified duration',
                'usage' => '/mute <username> [duration] [reason]',
                'examples' => [
                    '/mute john 5m Spamming',
                    '/mute @user123 1h Inappropriate language',
                    '/mute baduser 30m'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'duration' => ['required' => false, 'type' => 'duration', 'default' => '5m'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'No reason provided']
                ],
                'aliases' => ['silence', 'quiet'],
                'category' => 'moderation'
            ],
            
            'unmute' => [
                'description' => 'Remove mute from a user',
                'usage' => '/unmute <username> [reason]',
                'examples' => [
                    '/unmute john Appeal approved',
                    '/unmute @user123'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'Unmuted by moderator']
                ],
                'aliases' => ['unsilence'],
                'category' => 'moderation'
            ],
            
            'kick' => [
                'description' => 'Remove a user from the chat temporarily',
                'usage' => '/kick <username> [reason]',
                'examples' => [
                    '/kick troublemaker Disruptive behavior',
                    '/kick @spammer'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'Kicked by moderator']
                ],
                'aliases' => ['remove'],
                'category' => 'moderation'
            ],
            
            'ban' => [
                'description' => 'Permanently ban a user from the chat',
                'usage' => '/ban <username> [reason]',
                'examples' => [
                    '/ban spammer Repeated violations',
                    '/ban @baduser Harassment'
                ],
                'permissions' => ['admin', 'moderator'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'Banned by moderator']
                ],
                'aliases' => ['banish'],
                'category' => 'moderation'
            ],
            
            'unban' => [
                'description' => 'Remove ban from a user',
                'usage' => '/unban <username> [reason]',
                'examples' => [
                    '/unban user123 Appeal successful',
                    '/unban @reformed_user'
                ],
                'permissions' => ['admin', 'moderator'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'Unbanned by moderator']
                ],
                'aliases' => ['pardon'],
                'category' => 'moderation'
            ],
            
            'warn' => [
                'description' => 'Issue a warning to a user',
                'usage' => '/warn <username> <reason>',
                'examples' => [
                    '/warn john Please follow chat rules',
                    '/warn @newuser Keep discussions on topic'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'reason' => ['required' => true, 'type' => 'string']
                ],
                'aliases' => ['warning'],
                'category' => 'moderation'
            ],
            
            // Information Commands
            'help' => [
                'description' => 'Show available commands and usage',
                'usage' => '/help [command]',
                'examples' => [
                    '/help',
                    '/help mute',
                    '/help moderation'
                ],
                'permissions' => ['admin', 'moderator', 'host', 'participant', 'guest'],
                'parameters' => [
                    'command' => ['required' => false, 'type' => 'string']
                ],
                'aliases' => ['commands', '?'],
                'category' => 'information'
            ],
            
            'status' => [
                'description' => 'Check user status and moderation history',
                'usage' => '/status [username]',
                'examples' => [
                    '/status',
                    '/status john',
                    '/status @user123'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => false, 'type' => 'string']
                ],
                'aliases' => ['info', 'check'],
                'category' => 'information'
            ],
            
            'online' => [
                'description' => 'List online users in the chat',
                'usage' => '/online [role]',
                'examples' => [
                    '/online',
                    '/online moderators',
                    '/online participants'
                ],
                'permissions' => ['admin', 'moderator', 'host', 'participant'],
                'parameters' => [
                    'role' => ['required' => false, 'type' => 'string']
                ],
                'aliases' => ['users', 'who'],
                'category' => 'information'
            ],
            
            // Utility Commands
            'clear' => [
                'description' => 'Clear chat messages (moderator only)',
                'usage' => '/clear [count]',
                'examples' => [
                    '/clear',
                    '/clear 10',
                    '/clear 50'
                ],
                'permissions' => ['admin', 'moderator'],
                'parameters' => [
                    'count' => ['required' => false, 'type' => 'integer', 'default' => 20, 'max' => 100]
                ],
                'aliases' => ['purge'],
                'category' => 'utility'
            ],
            
            'slow' => [
                'description' => 'Enable slow mode with message delay',
                'usage' => '/slow <seconds>',
                'examples' => [
                    '/slow 5',
                    '/slow 30',
                    '/slow off'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'seconds' => ['required' => true, 'type' => 'duration_or_off']
                ],
                'aliases' => ['slowmode'],
                'category' => 'utility'
            ],
            
            'timeout' => [
                'description' => 'Temporarily timeout a user (alias for mute)',
                'usage' => '/timeout <username> [duration] [reason]',
                'examples' => [
                    '/timeout spammer 10m',
                    '/timeout @user 1h Excessive caps'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'username' => ['required' => true, 'type' => 'string'],
                    'duration' => ['required' => false, 'type' => 'duration', 'default' => '5m'],
                    'reason' => ['required' => false, 'type' => 'string', 'default' => 'Timed out']
                ],
                'aliases' => ['to'],
                'category' => 'moderation'
            ],
            
            // Fun/Engagement Commands
            'me' => [
                'description' => 'Send an action message',
                'usage' => '/me <action>',
                'examples' => [
                    '/me waves hello',
                    '/me is excited about this interview'
                ],
                'permissions' => ['admin', 'moderator', 'host', 'participant', 'guest'],
                'parameters' => [
                    'action' => ['required' => true, 'type' => 'string']
                ],
                'aliases' => ['action'],
                'category' => 'engagement'
            ],
            
            'poll' => [
                'description' => 'Create a quick poll',
                'usage' => '/poll <question> <option1> <option2> [option3] [option4]',
                'examples' => [
                    '/poll "Best programming language?" JavaScript Python Java',
                    '/poll "Meeting time?" "9 AM" "2 PM" "5 PM"'
                ],
                'permissions' => ['admin', 'moderator', 'host'],
                'parameters' => [
                    'question' => ['required' => true, 'type' => 'string'],
                    'options' => ['required' => true, 'type' => 'array', 'min' => 2, 'max' => 4]
                ],
                'aliases' => ['vote'],
                'category' => 'engagement'
            ]
        ];
    }
    
    /**
     * Parse and execute a chat command
     */
    public function executeCommand(string $message, array $userContext) {
        if (!$this->commandConfig['enabled']) {
            return [
                'success' => false,
                'error' => 'Chat commands are currently disabled',
                'type' => 'system_disabled'
            ];
        }
        
        // Check if message is a command
        if (!$this->isCommand($message)) {
            return [
                'success' => false,
                'error' => 'Not a valid command',
                'type' => 'not_command'
            ];
        }
        
        // Parse command
        $parsedCommand = $this->parseCommand($message);
        if (!$parsedCommand) {
            return [
                'success' => false,
                'error' => 'Invalid command format',
                'type' => 'parse_error'
            ];
        }
        
        // Check rate limiting
        if (!$this->checkRateLimit($userContext['user_id'])) {
            return [
                'success' => false,
                'error' => 'Command rate limit exceeded. Please wait before using another command.',
                'type' => 'rate_limit'
            ];
        }
        
        // Validate command exists
        $commandName = $this->resolveCommandAlias($parsedCommand['command']);
        if (!isset($this->availableCommands[$commandName])) {
            return [
                'success' => false,
                'error' => "Unknown command: {$parsedCommand['command']}. Type /help for available commands.",
                'type' => 'unknown_command',
                'suggestions' => $this->getSimilarCommands($parsedCommand['command'])
            ];
        }
        
        $command = $this->availableCommands[$commandName];
        
        // Check permissions
        if (!$this->hasPermission($userContext['user_role'], $command['permissions'])) {
            return [
                'success' => false,
                'error' => "Insufficient permissions to use /{$commandName}",
                'type' => 'permission_denied'
            ];
        }
        
        // Validate parameters
        $validationResult = $this->validateParameters($parsedCommand['parameters'], $command['parameters']);
        if (!$validationResult['valid']) {
            return [
                'success' => false,
                'error' => $validationResult['error'],
                'type' => 'parameter_error',
                'usage' => $command['usage']
            ];
        }
        
        // Execute the command
        try {
            $result = $this->executeSpecificCommand($commandName, $validationResult['parameters'], $userContext);
            
            // Log command execution
            if ($this->commandConfig['log_commands']) {
                $this->logCommandExecution($commandName, $parsedCommand, $userContext, $result);
            }
            
            return $result;
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Command execution failed: ' . $e->getMessage(),
                'type' => 'execution_error'
            ];
        }
    }
    
    /**
     * Check if message is a command
     */
    private function isCommand(string $message) {
        return strpos(trim($message), $this->commandConfig['prefix']) === 0;
    }
    
    /**
     * Parse command from message
     */
    private function parseCommand(string $message) {
        $message = trim($message);
        
        // Remove command prefix
        $message = substr($message, strlen($this->commandConfig['prefix']));
        
        // Split into parts, respecting quoted strings
        $parts = $this->parseCommandParts($message);
        
        if (empty($parts)) {
            return null;
        }
        
        return [
            'command' => $this->commandConfig['case_sensitive'] ? $parts[0] : strtolower($parts[0]),
            'parameters' => array_slice($parts, 1)
        ];
    }
    
    /**
     * Parse command parts respecting quoted strings
     */
    private function parseCommandParts(string $input) {
        $parts = [];
        $current = '';
        $inQuotes = false;
        $quoteChar = null;
        $length = strlen($input);
        
        for ($i = 0; $i < $length; $i++) {
            $char = $input[$i];
            
            if (!$inQuotes && ($char === '"' || $char === "'")) {
                $inQuotes = true;
                $quoteChar = $char;
            } elseif ($inQuotes && $char === $quoteChar) {
                $inQuotes = false;
                $quoteChar = null;
            } elseif (!$inQuotes && $char === ' ') {
                if ($current !== '') {
                    $parts[] = $current;
                    $current = '';
                }
            } else {
                $current .= $char;
            }
        }
        
        if ($current !== '') {
            $parts[] = $current;
        }
        
        return $parts;
    }
    
    /**
     * Resolve command alias to actual command name
     */
    private function resolveCommandAlias(string $command) {
        foreach ($this->availableCommands as $commandName => $commandData) {
            if ($commandName === $command) {
                return $commandName;
            }
            
            if (isset($commandData['aliases']) && in_array($command, $commandData['aliases'])) {
                return $commandName;
            }
        }
        
        return $command;
    }
    
    /**
     * Check if user has permission to execute command
     */
    private function hasPermission(string $userRole, array $requiredPermissions) {
        if (!$this->commandConfig['require_permissions']) {
            return true;
        }
        
        return in_array($userRole, $requiredPermissions);
    }
    
    /**
     * Check command rate limiting
     */
    private function checkRateLimit(string $userId) {
        if (!$this->commandConfig['rate_limit']['enabled']) {
            return true;
        }
        
        $rateLimitData = $this->fileStorageService->load("command_rate_limits/{$userId}.json") ?? [
            'commands' => [],
            'last_reset' => time()
        ];
        
        $currentTime = time();
        $timeWindow = $this->commandConfig['rate_limit']['time_window'];
        
        // Reset if time window has passed
        if ($currentTime - $rateLimitData['last_reset'] >= $timeWindow) {
            $rateLimitData = [
                'commands' => [],
                'last_reset' => $currentTime
            ];
        }
        
        // Count commands in current window
        $commandCount = count($rateLimitData['commands']);
        
        if ($commandCount >= $this->commandConfig['rate_limit']['max_commands']) {
            return false;
        }
        
        // Add current command
        $rateLimitData['commands'][] = $currentTime;
        
        // Save updated rate limit data
        $this->fileStorageService->save("command_rate_limits/{$userId}.json", $rateLimitData);
        
        return true;
    }
    
    /**
     * Validate command parameters
     */
    private function validateParameters(array $providedParams, array $parameterConfig) {
        $validatedParams = [];
        $paramIndex = 0;
        
        foreach ($parameterConfig as $paramName => $config) {
            $value = null;
            
            // Get parameter value
            if ($paramIndex < count($providedParams)) {
                $value = $providedParams[$paramIndex];
                $paramIndex++;
            } elseif (isset($config['default'])) {
                $value = $config['default'];
            } elseif ($config['required']) {
                return [
                    'valid' => false,
                    'error' => "Missing required parameter: {$paramName}"
                ];
            }
            
            // Validate parameter type
            if ($value !== null) {
                $validationResult = $this->validateParameterType($value, $config['type'], $config);
                if (!$validationResult['valid']) {
                    return [
                        'valid' => false,
                        'error' => "Invalid {$paramName}: {$validationResult['error']}"
                    ];
                }
                $value = $validationResult['value'];
            }
            
            $validatedParams[$paramName] = $value;
        }
        
        return [
            'valid' => true,
            'parameters' => $validatedParams
        ];
    }
    
    /**
     * Validate parameter type
     */
    private function validateParameterType($value, string $type, array $config) {
        switch ($type) {
            case 'string':
                return ['valid' => true, 'value' => (string)$value];
                
            case 'integer':
                if (!is_numeric($value)) {
                    return ['valid' => false, 'error' => 'Must be a number'];
                }
                $intValue = (int)$value;
                if (isset($config['max']) && $intValue > $config['max']) {
                    return ['valid' => false, 'error' => "Maximum value is {$config['max']}"];
                }
                if (isset($config['min']) && $intValue < $config['min']) {
                    return ['valid' => false, 'error' => "Minimum value is {$config['min']}"];
                }
                return ['valid' => true, 'value' => $intValue];
                
            case 'duration':
                $duration = $this->parseDuration($value);
                if ($duration === false) {
                    return ['valid' => false, 'error' => 'Invalid duration format (use: 5m, 1h, 30s)'];
                }
                return ['valid' => true, 'value' => $duration];
                
            case 'duration_or_off':
                if (strtolower($value) === 'off') {
                    return ['valid' => true, 'value' => 0];
                }
                return $this->validateParameterType($value, 'duration', $config);
                
            case 'array':
                // For commands like poll that take multiple options
                $remaining = array_slice(func_get_args(), 3); // Get remaining parameters
                if (isset($config['min']) && count($remaining) < $config['min']) {
                    return ['valid' => false, 'error' => "Minimum {$config['min']} options required"];
                }
                if (isset($config['max']) && count($remaining) > $config['max']) {
                    return ['valid' => false, 'error' => "Maximum {$config['max']} options allowed"];
                }
                return ['valid' => true, 'value' => $remaining];
                
            default:
                return ['valid' => true, 'value' => $value];
        }
    }
    
    /**
     * Parse duration string (5m, 1h, 30s) to seconds
     */
    private function parseDuration(string $duration) {
        if (preg_match('/^(\d+)([smhd])$/', strtolower($duration), $matches)) {
            $value = (int)$matches[1];
            $unit = $matches[2];
            
            switch ($unit) {
                case 's': return $value;
                case 'm': return $value * 60;
                case 'h': return $value * 3600;
                case 'd': return $value * 86400;
            }
        }
        
        return false;
    }
    
    /**
     * Get similar commands for suggestions
     */
    private function getSimilarCommands(string $command) {
        $suggestions = [];
        $commandNames = array_keys($this->availableCommands);
        
        foreach ($commandNames as $commandName) {
            $similarity = similar_text($command, $commandName, $percent);
            if ($percent > 60) {
                $suggestions[] = $commandName;
            }
        }
        
        return array_slice($suggestions, 0, 3);
    }
    
    /**
     * Execute specific command
     */
    private function executeSpecificCommand(string $commandName, array $parameters, array $userContext) {
        switch ($commandName) {
            case 'mute':
            case 'timeout':
                return $this->executeMuteCommand($parameters, $userContext);
                
            case 'unmute':
                return $this->executeUnmuteCommand($parameters, $userContext);
                
            case 'kick':
                return $this->executeKickCommand($parameters, $userContext);
                
            case 'ban':
                return $this->executeBanCommand($parameters, $userContext);
                
            case 'unban':
                return $this->executeUnbanCommand($parameters, $userContext);
                
            case 'warn':
                return $this->executeWarnCommand($parameters, $userContext);
                
            case 'help':
                return $this->executeHelpCommand($parameters, $userContext);
                
            case 'status':
                return $this->executeStatusCommand($parameters, $userContext);
                
            case 'online':
                return $this->executeOnlineCommand($parameters, $userContext);
                
            case 'clear':
                return $this->executeClearCommand($parameters, $userContext);
                
            case 'slow':
                return $this->executeSlowCommand($parameters, $userContext);
                
            case 'me':
                return $this->executeMeCommand($parameters, $userContext);
                
            case 'poll':
                return $this->executePollCommand($parameters, $userContext);
                
            default:
                return [
                    'success' => false,
                    'error' => 'Command not implemented',
                    'type' => 'not_implemented'
                ];
        }
    }
    
    /**
     * Execute mute command
     */
    private function executeMuteCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $duration = $parameters['duration'];
        $reason = $parameters['reason'];
        
        // Get target user ID (this would typically query a user database)
        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }
        
        // Execute mute
        $result = $this->userModerationService->muteUser([
            'user_id' => $targetUserId,
            'room_id' => $userContext['room_id'],
            'duration' => $duration,
            'reason' => $reason,
            'moderator_id' => $userContext['user_id'],
            'severity' => 'moderate'
        ]);
        
        if ($result['success']) {
            return [
                'success' => true,
                'message' => "User {$username} has been muted for " . $this->formatDuration($duration) . ". Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'mute',
                'target_user' => $username,
                'duration' => $duration,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to mute user',
                'type' => 'execution_failed'
            ];
        }
    }
    
    /**
     * Execute help command
     */
    private function executeHelpCommand(array $parameters, array $userContext) {
        $specificCommand = $parameters['command'] ?? null;
        
        if ($specificCommand) {
            // Show help for specific command
            $commandName = $this->resolveCommandAlias($specificCommand);
            
            if (!isset($this->availableCommands[$commandName])) {
                return [
                    'success' => false,
                    'error' => "Unknown command: {$specificCommand}",
                    'type' => 'unknown_command'
                ];
            }
            
            $command = $this->availableCommands[$commandName];
            
            // Check if user has permission to see this command
            if (!$this->hasPermission($userContext['user_role'], $command['permissions'])) {
                return [
                    'success' => false,
                    'error' => "You don't have permission to use this command",
                    'type' => 'permission_denied'
                ];
            }
            
            $helpText = "**/{$commandName}** - {$command['description']}\n";
            $helpText .= "**Usage:** {$command['usage']}\n";
            
            if (!empty($command['examples'])) {
                $helpText .= "**Examples:**\n";
                foreach ($command['examples'] as $example) {
                    $helpText .= "  {$example}\n";
                }
            }
            
            if (!empty($command['aliases'])) {
                $helpText .= "**Aliases:** " . implode(', ', array_map(function($alias) { return "/{$alias}"; }, $command['aliases']));
            }
            
            return [
                'success' => true,
                'message' => $helpText,
                'type' => 'help_specific',
                'command' => $commandName
            ];
        } else {
            // Show general help
            $userRole = $userContext['user_role'];
            $availableCommands = [];
            
            foreach ($this->availableCommands as $commandName => $command) {
                if ($this->hasPermission($userRole, $command['permissions'])) {
                    $availableCommands[$command['category']][] = [
                        'name' => $commandName,
                        'description' => $command['description'],
                        'usage' => $command['usage']
                    ];
                }
            }
            
            return [
                'success' => true,
                'message' => 'Available commands by category',
                'type' => 'help_general',
                'commands' => $availableCommands
            ];
        }
    }
    
    /**
     * Parse username (remove @ if present)
     */
    private function parseUsername(string $username) {
        return ltrim($username, '@');
    }
    
    /**
     * Get user ID by username (mock implementation)
     */
    private function getUserIdByUsername(string $username) {
        // This would typically query a user database
        // For demo purposes, return a mock user ID
        return "user_" . md5($username);
    }
    
    /**
     * Format duration in human-readable format
     */
    private function formatDuration(int $seconds) {
        if ($seconds < 60) {
            return "{$seconds} second" . ($seconds !== 1 ? 's' : '');
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            return "{$minutes} minute" . ($minutes !== 1 ? 's' : '');
        } elseif ($seconds < 86400) {
            $hours = floor($seconds / 3600);
            return "{$hours} hour" . ($hours !== 1 ? 's' : '');
        } else {
            $days = floor($seconds / 86400);
            return "{$days} day" . ($days !== 1 ? 's' : '');
        }
    }
    
    /**
     * Log command execution
     */
    private function logCommandExecution(string $commandName, array $parsedCommand, array $userContext, array $result) {
        $logEntry = [
            'timestamp' => time(),
            'command' => $commandName,
            'parameters' => $parsedCommand['parameters'],
            'user_id' => $userContext['user_id'],
            'user_role' => $userContext['user_role'],
            'room_id' => $userContext['room_id'],
            'success' => $result['success'],
            'result_type' => $result['type'] ?? 'unknown',
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        $logFile = "command_logs/" . date('Y-m-d') . ".json";
        $existingLogs = $this->fileStorageService->load($logFile) ?? [];
        $existingLogs[] = $logEntry;
        
        $this->fileStorageService->save($logFile, $existingLogs);
    }
    
    /**
     * Get available commands for autocomplete
     */
    public function getAvailableCommands(string $userRole = 'guest') {
        $commands = [];
        
        foreach ($this->availableCommands as $commandName => $command) {
            if ($this->hasPermission($userRole, $command['permissions'])) {
                $commands[] = [
                    'name' => $commandName,
                    'description' => $command['description'],
                    'usage' => $command['usage'],
                    'category' => $command['category'],
                    'aliases' => $command['aliases'] ?? []
                ];
            }
        }
        
        return $commands;
    }
    
    /**
     * Get command statistics
     */
    public function getCommandStatistics(int $days = 7) {
        $stats = [
            'total_commands' => 0,
            'successful_commands' => 0,
            'failed_commands' => 0,
            'command_breakdown' => [],
            'user_breakdown' => [],
            'daily_usage' => []
        ];
        
        $startTime = time() - ($days * 86400);
        
        // Analyze log files
        for ($i = 0; $i < $days; $i++) {
            $date = date('Y-m-d', time() - ($i * 86400));
            $logFile = "command_logs/{$date}.json";
            $logs = $this->fileStorageService->load($logFile) ?? [];
            
            $dailyCount = 0;
            
            foreach ($logs as $log) {
                if ($log['timestamp'] < $startTime) {
                    continue;
                }
                
                $stats['total_commands']++;
                $dailyCount++;
                
                if ($log['success']) {
                    $stats['successful_commands']++;
                } else {
                    $stats['failed_commands']++;
                }
                
                // Count by command
                $command = $log['command'];
                if (!isset($stats['command_breakdown'][$command])) {
                    $stats['command_breakdown'][$command] = 0;
                }
                $stats['command_breakdown'][$command]++;
                
                // Count by user
                $userId = $log['user_id'];
                if (!isset($stats['user_breakdown'][$userId])) {
                    $stats['user_breakdown'][$userId] = 0;
                }
                $stats['user_breakdown'][$userId]++;
            }
            
            $stats['daily_usage'][$date] = $dailyCount;
        }
        
        return $stats;
    }

    /**
     * Execute unmute command
     */
    private function executeUnmuteCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $reason = $parameters['reason'];

        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }

        $result = $this->userModerationService->unmuteUser([
            'user_id' => $targetUserId,
            'room_id' => $userContext['room_id'],
            'reason' => $reason,
            'moderator_id' => $userContext['user_id']
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'message' => "User {$username} has been unmuted. Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'unmute',
                'target_user' => $username,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to unmute user',
                'type' => 'execution_failed'
            ];
        }
    }

    /**
     * Execute kick command
     */
    private function executeKickCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $reason = $parameters['reason'];

        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }

        // Kick is essentially a temporary ban
        $result = $this->userModerationService->kickUser([
            'user_id' => $targetUserId,
            'room_id' => $userContext['room_id'],
            'reason' => $reason,
            'moderator_id' => $userContext['user_id']
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'message' => "User {$username} has been kicked from the chat. Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'kick',
                'target_user' => $username,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to kick user',
                'type' => 'execution_failed'
            ];
        }
    }

    /**
     * Execute ban command
     */
    private function executeBanCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $reason = $parameters['reason'];

        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }

        $result = $this->userModerationService->banUser([
            'user_id' => $targetUserId,
            'room_id' => $userContext['room_id'],
            'reason' => $reason,
            'moderator_id' => $userContext['user_id'],
            'duration' => 0 // Permanent ban
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'message' => "User {$username} has been permanently banned. Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'ban',
                'target_user' => $username,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to ban user',
                'type' => 'execution_failed'
            ];
        }
    }

    /**
     * Execute unban command
     */
    private function executeUnbanCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $reason = $parameters['reason'];

        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }

        $result = $this->userModerationService->unbanUser([
            'user_id' => $targetUserId,
            'room_id' => $userContext['room_id'],
            'reason' => $reason,
            'moderator_id' => $userContext['user_id']
        ]);

        if ($result['success']) {
            return [
                'success' => true,
                'message' => "User {$username} has been unbanned. Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'unban',
                'target_user' => $username,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => $result['error'] ?? 'Failed to unban user',
                'type' => 'execution_failed'
            ];
        }
    }

    /**
     * Execute warn command
     */
    private function executeWarnCommand(array $parameters, array $userContext) {
        $username = $this->parseUsername($parameters['username']);
        $reason = $parameters['reason'];

        $targetUserId = $this->getUserIdByUsername($username);
        if (!$targetUserId) {
            return [
                'success' => false,
                'error' => "User '{$username}' not found",
                'type' => 'user_not_found'
            ];
        }

        $result = $this->moderationService->warnUser($targetUserId, $userContext['room_id'], $reason, $userContext['user_id']);

        if ($result) {
            return [
                'success' => true,
                'message' => "Warning issued to {$username}. Reason: {$reason}",
                'type' => 'moderation_action',
                'action' => 'warn',
                'target_user' => $username,
                'reason' => $reason,
                'broadcast' => true
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to issue warning',
                'type' => 'execution_failed'
            ];
        }
    }

    /**
     * Execute status command
     */
    private function executeStatusCommand(array $parameters, array $userContext) {
        $username = $parameters['username'] ?? null;

        if (!$username) {
            // Show own status
            $targetUserId = $userContext['user_id'];
            $username = $userContext['user_name'] ?? 'You';
        } else {
            $username = $this->parseUsername($username);
            $targetUserId = $this->getUserIdByUsername($username);

            if (!$targetUserId) {
                return [
                    'success' => false,
                    'error' => "User '{$username}' not found",
                    'type' => 'user_not_found'
                ];
            }
        }

        // Get user status from moderation service
        $status = $this->userModerationService->getUserStatus($targetUserId, $userContext['room_id']);

        $statusMessage = "**Status for {$username}:**\n";
        $statusMessage .= "• **Role:** " . ($status['role'] ?? 'Unknown') . "\n";
        $statusMessage .= "• **Reputation:** " . ($status['reputation'] ?? 100) . "\n";
        $statusMessage .= "• **Violations:** " . ($status['violation_count'] ?? 0) . "\n";

        if ($status['is_muted'] ?? false) {
            $statusMessage .= "• **Status:** Muted until " . date('Y-m-d H:i:s', $status['mute_until']) . "\n";
        } elseif ($status['is_banned'] ?? false) {
            $statusMessage .= "• **Status:** Banned\n";
        } else {
            $statusMessage .= "• **Status:** Active\n";
        }

        return [
            'success' => true,
            'message' => $statusMessage,
            'type' => 'information',
            'user_status' => $status
        ];
    }

    /**
     * Execute online command
     */
    private function executeOnlineCommand(array $parameters, array $userContext) {
        $roleFilter = $parameters['role'] ?? null;

        // This would typically query active connections
        // For demo purposes, return mock data
        $onlineUsers = [
            ['username' => 'admin', 'role' => 'admin', 'status' => 'active'],
            ['username' => 'moderator1', 'role' => 'moderator', 'status' => 'active'],
            ['username' => 'host', 'role' => 'host', 'status' => 'active'],
            ['username' => 'participant1', 'role' => 'participant', 'status' => 'active'],
            ['username' => 'participant2', 'role' => 'participant', 'status' => 'active'],
            ['username' => 'guest1', 'role' => 'guest', 'status' => 'active']
        ];

        if ($roleFilter) {
            $onlineUsers = array_filter($onlineUsers, function($user) use ($roleFilter) {
                return stripos($user['role'], $roleFilter) !== false;
            });
        }

        $message = "**Online Users (" . count($onlineUsers) . "):**\n";
        foreach ($onlineUsers as $user) {
            $message .= "• **{$user['username']}** ({$user['role']})\n";
        }

        return [
            'success' => true,
            'message' => $message,
            'type' => 'information',
            'online_users' => $onlineUsers
        ];
    }

    /**
     * Execute clear command
     */
    private function executeClearCommand(array $parameters, array $userContext) {
        $count = $parameters['count'];

        // This would typically clear messages from the chat
        // For now, return success message
        return [
            'success' => true,
            'message' => "Cleared {$count} messages from the chat",
            'type' => 'moderation_action',
            'action' => 'clear',
            'count' => $count,
            'broadcast' => true
        ];
    }

    /**
     * Execute slow mode command
     */
    private function executeSlowCommand(array $parameters, array $userContext) {
        $seconds = $parameters['seconds'];

        if ($seconds === 0) {
            return [
                'success' => true,
                'message' => "Slow mode has been disabled",
                'type' => 'room_setting',
                'action' => 'slow_mode_off',
                'broadcast' => true
            ];
        } else {
            return [
                'success' => true,
                'message' => "Slow mode enabled: {$seconds} second delay between messages",
                'type' => 'room_setting',
                'action' => 'slow_mode_on',
                'delay' => $seconds,
                'broadcast' => true
            ];
        }
    }

    /**
     * Execute me command (action message)
     */
    private function executeMeCommand(array $parameters, array $userContext) {
        $action = $parameters['action'];
        $username = $userContext['user_name'] ?? 'User';

        return [
            'success' => true,
            'message' => "*{$username} {$action}*",
            'type' => 'action_message',
            'action_text' => $action,
            'broadcast' => true
        ];
    }

    /**
     * Execute poll command
     */
    private function executePollCommand(array $parameters, array $userContext) {
        $question = $parameters['question'];
        $options = $parameters['options'];

        $pollId = 'poll_' . time() . '_' . $userContext['user_id'];

        $poll = [
            'id' => $pollId,
            'question' => $question,
            'options' => $options,
            'votes' => array_fill(0, count($options), 0),
            'voters' => [],
            'created_by' => $userContext['user_id'],
            'created_at' => time(),
            'room_id' => $userContext['room_id']
        ];

        // Save poll
        $this->fileStorageService->save("polls/{$pollId}.json", $poll);

        $pollMessage = "**📊 Poll: {$question}**\n";
        for ($i = 0; $i < count($options); $i++) {
            $pollMessage .= ($i + 1) . ". {$options[$i]}\n";
        }
        $pollMessage .= "\nReact with 1️⃣, 2️⃣, 3️⃣, or 4️⃣ to vote!";

        return [
            'success' => true,
            'message' => $pollMessage,
            'type' => 'poll_created',
            'poll' => $poll,
            'broadcast' => true
        ];
    }
}
