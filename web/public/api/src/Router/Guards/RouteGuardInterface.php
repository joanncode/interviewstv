<?php

namespace App\Router\Guards;

use App\Router\Route;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Route guard interface for access control
 */
interface RouteGuardInterface
{
    /**
     * Check if access is allowed
     */
    public function canAccess(Route $route, ServerRequestInterface $request): bool;
    
    /**
     * Get error message when access is denied
     */
    public function getErrorMessage(): string;
    
    /**
     * Get redirect URL when access is denied (optional)
     */
    public function getRedirectUrl(): ?string;
}

/**
 * Authentication guard
 */
class AuthGuard implements RouteGuardInterface
{
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $authHeader = $request->getHeaderLine('Authorization');
        
        if (empty($authHeader) || strpos($authHeader, 'Bearer ') !== 0) {
            return false;
        }
        
        $token = substr($authHeader, 7);
        return $this->validateToken($token);
    }
    
    public function getErrorMessage(): string
    {
        return 'Authentication required';
    }
    
    public function getRedirectUrl(): ?string
    {
        return '/login';
    }
    
    private function validateToken(string $token): bool
    {
        // Implement token validation logic
        return !empty($token) && strlen($token) > 10;
    }
}

/**
 * Admin access guard
 */
class AdminGuard implements RouteGuardInterface
{
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $user = $request->getAttribute('user');
        
        if (!$user) {
            return false;
        }
        
        return $this->isAdmin($user);
    }
    
    public function getErrorMessage(): string
    {
        return 'Admin access required';
    }
    
    public function getRedirectUrl(): ?string
    {
        return '/dashboard';
    }
    
    private function isAdmin(array $user): bool
    {
        return isset($user['role']) && $user['role'] === 'admin';
    }
}

/**
 * Email verification guard
 */
class EmailVerifiedGuard implements RouteGuardInterface
{
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $user = $request->getAttribute('user');
        
        if (!$user) {
            return false;
        }
        
        return !empty($user['email_verified_at']);
    }
    
    public function getErrorMessage(): string
    {
        return 'Email verification required';
    }
    
    public function getRedirectUrl(): ?string
    {
        return '/verify-email';
    }
}

/**
 * Subscription guard
 */
class SubscriptionGuard implements RouteGuardInterface
{
    private array $requiredPlans;
    
    public function __construct(array $requiredPlans = ['premium', 'pro'])
    {
        $this->requiredPlans = $requiredPlans;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $user = $request->getAttribute('user');
        
        if (!$user) {
            return false;
        }
        
        $userPlan = $user['subscription_plan'] ?? 'free';
        return in_array($userPlan, $this->requiredPlans);
    }
    
    public function getErrorMessage(): string
    {
        return 'Premium subscription required';
    }
    
    public function getRedirectUrl(): ?string
    {
        return '/upgrade';
    }
}

/**
 * Feature flag guard
 */
class FeatureFlagGuard implements RouteGuardInterface
{
    private string $featureName;
    private array $featureFlags;
    
    public function __construct(string $featureName, array $featureFlags = [])
    {
        $this->featureName = $featureName;
        $this->featureFlags = $featureFlags;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        return $this->featureFlags[$this->featureName] ?? false;
    }
    
    public function getErrorMessage(): string
    {
        return 'Feature not available';
    }
    
    public function getRedirectUrl(): ?string
    {
        return '/';
    }
}

/**
 * IP whitelist guard
 */
class IpWhitelistGuard implements RouteGuardInterface
{
    private array $allowedIps;
    
    public function __construct(array $allowedIps = [])
    {
        $this->allowedIps = $allowedIps;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $serverParams = $request->getServerParams();
        $clientIp = $serverParams['REMOTE_ADDR'] ?? '';
        
        if (empty($this->allowedIps)) {
            return true; // No restrictions
        }
        
        return in_array($clientIp, $this->allowedIps) || $this->isInSubnet($clientIp);
    }
    
    public function getErrorMessage(): string
    {
        return 'Access denied from this IP address';
    }
    
    public function getRedirectUrl(): ?string
    {
        return null;
    }
    
    private function isInSubnet(string $ip): bool
    {
        foreach ($this->allowedIps as $allowedIp) {
            if (strpos($allowedIp, '/') !== false) {
                // CIDR notation
                [$subnet, $mask] = explode('/', $allowedIp);
                if ((ip2long($ip) & ~((1 << (32 - $mask)) - 1)) === ip2long($subnet)) {
                    return true;
                }
            }
        }
        return false;
    }
}

/**
 * Time-based access guard
 */
class TimeBasedGuard implements RouteGuardInterface
{
    private array $allowedHours;
    private string $timezone;
    
    public function __construct(array $allowedHours = [], string $timezone = 'UTC')
    {
        $this->allowedHours = $allowedHours;
        $this->timezone = $timezone;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        if (empty($this->allowedHours)) {
            return true; // No time restrictions
        }
        
        $now = new \DateTime('now', new \DateTimeZone($this->timezone));
        $currentHour = (int) $now->format('H');
        
        return in_array($currentHour, $this->allowedHours);
    }
    
    public function getErrorMessage(): string
    {
        return 'Access not allowed at this time';
    }
    
    public function getRedirectUrl(): ?string
    {
        return null;
    }
}

/**
 * Rate limit guard
 */
class RateLimitGuard implements RouteGuardInterface
{
    private int $maxRequests;
    private int $timeWindow;
    private array $requests = [];
    
    public function __construct(int $maxRequests = 100, int $timeWindow = 3600)
    {
        $this->maxRequests = $maxRequests;
        $this->timeWindow = $timeWindow;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $key = $this->generateKey($request);
        $now = time();
        
        // Clean old requests
        $this->cleanOldRequests($key, $now - $this->timeWindow);
        
        // Check if limit exceeded
        if (!isset($this->requests[$key])) {
            $this->requests[$key] = [];
        }
        
        if (count($this->requests[$key]) >= $this->maxRequests) {
            return false;
        }
        
        // Record request
        $this->requests[$key][] = $now;
        
        return true;
    }
    
    public function getErrorMessage(): string
    {
        return 'Rate limit exceeded';
    }
    
    public function getRedirectUrl(): ?string
    {
        return null;
    }
    
    private function generateKey(ServerRequestInterface $request): string
    {
        $serverParams = $request->getServerParams();
        $user = $request->getAttribute('user');
        
        if ($user) {
            return 'user:' . $user['id'];
        }
        
        return 'ip:' . ($serverParams['REMOTE_ADDR'] ?? 'unknown');
    }
    
    private function cleanOldRequests(string $key, int $cutoff): void
    {
        if (!isset($this->requests[$key])) {
            return;
        }
        
        $this->requests[$key] = array_filter($this->requests[$key], function($timestamp) use ($cutoff) {
            return $timestamp > $cutoff;
        });
    }
}

/**
 * Content type guard
 */
class ContentTypeGuard implements RouteGuardInterface
{
    private array $allowedTypes;
    
    public function __construct(array $allowedTypes = ['application/json'])
    {
        $this->allowedTypes = $allowedTypes;
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $contentType = $request->getHeaderLine('Content-Type');
        
        if (empty($contentType)) {
            return true; // No content type restriction for GET requests
        }
        
        // Extract main content type (ignore charset, etc.)
        $mainType = strtok($contentType, ';');
        
        return in_array($mainType, $this->allowedTypes);
    }
    
    public function getErrorMessage(): string
    {
        return 'Unsupported content type';
    }
    
    public function getRedirectUrl(): ?string
    {
        return null;
    }
}

/**
 * HTTPS guard
 */
class HttpsGuard implements RouteGuardInterface
{
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        $uri = $request->getUri();
        return $uri->getScheme() === 'https';
    }
    
    public function getErrorMessage(): string
    {
        return 'HTTPS required';
    }
    
    public function getRedirectUrl(): ?string
    {
        return null; // Should redirect to HTTPS version
    }
}

/**
 * Composite guard that combines multiple guards
 */
class CompositeGuard implements RouteGuardInterface
{
    private array $guards;
    private string $operator;
    
    public function __construct(array $guards, string $operator = 'AND')
    {
        $this->guards = $guards;
        $this->operator = strtoupper($operator);
    }
    
    public function canAccess(Route $route, ServerRequestInterface $request): bool
    {
        if ($this->operator === 'OR') {
            foreach ($this->guards as $guard) {
                if ($guard->canAccess($route, $request)) {
                    return true;
                }
            }
            return false;
        } else {
            // AND operator (default)
            foreach ($this->guards as $guard) {
                if (!$guard->canAccess($route, $request)) {
                    return false;
                }
            }
            return true;
        }
    }
    
    public function getErrorMessage(): string
    {
        $messages = [];
        foreach ($this->guards as $guard) {
            $messages[] = $guard->getErrorMessage();
        }
        
        $separator = $this->operator === 'OR' ? ' or ' : ' and ';
        return implode($separator, $messages);
    }
    
    public function getRedirectUrl(): ?string
    {
        // Return the first non-null redirect URL
        foreach ($this->guards as $guard) {
            $url = $guard->getRedirectUrl();
            if ($url !== null) {
                return $url;
            }
        }
        
        return null;
    }
}
