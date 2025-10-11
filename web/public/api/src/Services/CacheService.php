<?php

namespace App\Services;

class CacheService
{
    private $driver;
    private $prefix;
    private $defaultTtl;
    
    public function __construct($driver = 'file', $prefix = 'interviews_tv_', $defaultTtl = 3600)
    {
        $this->driver = $this->initializeDriver($driver);
        $this->prefix = $prefix;
        $this->defaultTtl = $defaultTtl;
    }
    
    /**
     * Initialize cache driver
     */
    private function initializeDriver($driver)
    {
        switch ($driver) {
            case 'redis':
                return new RedisCacheDriver();
            case 'memcached':
                return new MemcachedCacheDriver();
            case 'file':
            default:
                return new FileCacheDriver();
        }
    }
    
    /**
     * Get item from cache
     */
    public function get($key, $default = null)
    {
        $fullKey = $this->prefix . $key;
        
        try {
            $value = $this->driver->get($fullKey);
            
            if ($value === null) {
                return $default;
            }
            
            // Check if value is serialized
            if (is_string($value) && $this->isSerialized($value)) {
                return unserialize($value);
            }
            
            return $value;
            
        } catch (\Exception $e) {
            error_log("Cache get error for key {$key}: " . $e->getMessage());
            return $default;
        }
    }
    
    /**
     * Store item in cache
     */
    public function set($key, $value, $ttl = null)
    {
        $fullKey = $this->prefix . $key;
        $ttl = $ttl ?: $this->defaultTtl;
        
        try {
            // Serialize complex data types
            if (is_array($value) || is_object($value)) {
                $value = serialize($value);
            }
            
            return $this->driver->set($fullKey, $value, $ttl);
            
        } catch (\Exception $e) {
            error_log("Cache set error for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Delete item from cache
     */
    public function delete($key)
    {
        $fullKey = $this->prefix . $key;
        
        try {
            return $this->driver->delete($fullKey);
        } catch (\Exception $e) {
            error_log("Cache delete error for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if item exists in cache
     */
    public function has($key)
    {
        return $this->get($key) !== null;
    }
    
    /**
     * Get or set cache value
     */
    public function remember($key, $callback, $ttl = null)
    {
        $value = $this->get($key);
        
        if ($value !== null) {
            return $value;
        }
        
        $value = $callback();
        $this->set($key, $value, $ttl);
        
        return $value;
    }
    
    /**
     * Clear cache by pattern
     */
    public function flush($pattern = '*')
    {
        $fullPattern = $this->prefix . $pattern;
        
        try {
            return $this->driver->flush($fullPattern);
        } catch (\Exception $e) {
            error_log("Cache flush error for pattern {$pattern}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Increment cache value
     */
    public function increment($key, $value = 1)
    {
        $fullKey = $this->prefix . $key;
        
        try {
            return $this->driver->increment($fullKey, $value);
        } catch (\Exception $e) {
            error_log("Cache increment error for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Decrement cache value
     */
    public function decrement($key, $value = 1)
    {
        $fullKey = $this->prefix . $key;
        
        try {
            return $this->driver->decrement($fullKey, $value);
        } catch (\Exception $e) {
            error_log("Cache decrement error for key {$key}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get multiple items from cache
     */
    public function getMultiple($keys, $default = null)
    {
        $results = [];
        
        foreach ($keys as $key) {
            $results[$key] = $this->get($key, $default);
        }
        
        return $results;
    }
    
    /**
     * Set multiple items in cache
     */
    public function setMultiple($values, $ttl = null)
    {
        $success = true;
        
        foreach ($values as $key => $value) {
            if (!$this->set($key, $value, $ttl)) {
                $success = false;
            }
        }
        
        return $success;
    }
    
    /**
     * Cache tags functionality
     */
    public function tags($tags)
    {
        return new TaggedCache($this, $tags);
    }
    
    /**
     * Get cache statistics
     */
    public function getStats()
    {
        try {
            return $this->driver->getStats();
        } catch (\Exception $e) {
            error_log("Cache stats error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Check if string is serialized
     */
    private function isSerialized($data)
    {
        if (!is_string($data)) {
            return false;
        }
        
        $data = trim($data);
        
        if ($data === 'N;') {
            return true;
        }
        
        if (strlen($data) < 4) {
            return false;
        }
        
        if ($data[1] !== ':') {
            return false;
        }
        
        $lastc = substr($data, -1);
        if (';' !== $lastc && '}' !== $lastc) {
            return false;
        }
        
        $token = $data[0];
        switch ($token) {
            case 's':
                if ('"' !== substr($data, -2, 1)) {
                    return false;
                }
                break;
            case 'a':
            case 'O':
                return (bool) preg_match("/^{$token}:[0-9]+:/s", $data);
            case 'b':
            case 'i':
            case 'd':
                $end = $lastc === ';' ? ';' : '}';
                return (bool) preg_match("/^{$token}:[0-9.E+-]+{$end}$/", $data);
        }
        
        return false;
    }
}

/**
 * File Cache Driver
 */
class FileCacheDriver
{
    private $cachePath;
    
    public function __construct($cachePath = null)
    {
        $this->cachePath = $cachePath ?: sys_get_temp_dir() . '/interviews_tv_cache/';
        
        if (!is_dir($this->cachePath)) {
            mkdir($this->cachePath, 0755, true);
        }
    }
    
    public function get($key)
    {
        $file = $this->getFilePath($key);
        
        if (!file_exists($file)) {
            return null;
        }
        
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        
        if (!$data || !isset($data['expires']) || !isset($data['value'])) {
            return null;
        }
        
        if ($data['expires'] > 0 && $data['expires'] < time()) {
            unlink($file);
            return null;
        }
        
        return $data['value'];
    }
    
    public function set($key, $value, $ttl)
    {
        $file = $this->getFilePath($key);
        $expires = $ttl > 0 ? time() + $ttl : 0;
        
        $data = [
            'value' => $value,
            'expires' => $expires,
            'created' => time()
        ];
        
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        return file_put_contents($file, json_encode($data), LOCK_EX) !== false;
    }
    
    public function delete($key)
    {
        $file = $this->getFilePath($key);
        
        if (file_exists($file)) {
            return unlink($file);
        }
        
        return true;
    }
    
    public function flush($pattern)
    {
        $files = glob($this->cachePath . '**/*');
        $deleted = 0;
        
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
                $deleted++;
            }
        }
        
        return $deleted > 0;
    }
    
    public function increment($key, $value)
    {
        $current = $this->get($key) ?: 0;
        $new = $current + $value;
        $this->set($key, $new, 0);
        return $new;
    }
    
    public function decrement($key, $value)
    {
        $current = $this->get($key) ?: 0;
        $new = max(0, $current - $value);
        $this->set($key, $new, 0);
        return $new;
    }
    
    public function getStats()
    {
        $files = glob($this->cachePath . '**/*');
        $totalSize = 0;
        $count = 0;
        
        foreach ($files as $file) {
            if (is_file($file)) {
                $totalSize += filesize($file);
                $count++;
            }
        }
        
        return [
            'items' => $count,
            'size' => $totalSize,
            'path' => $this->cachePath
        ];
    }
    
    private function getFilePath($key)
    {
        $hash = md5($key);
        $dir = substr($hash, 0, 2);
        return $this->cachePath . $dir . '/' . $hash . '.cache';
    }
}

/**
 * Tagged Cache Implementation
 */
class TaggedCache
{
    private $cache;
    private $tags;
    
    public function __construct($cache, $tags)
    {
        $this->cache = $cache;
        $this->tags = is_array($tags) ? $tags : [$tags];
    }
    
    public function get($key, $default = null)
    {
        return $this->cache->get($this->taggedKey($key), $default);
    }
    
    public function set($key, $value, $ttl = null)
    {
        $success = $this->cache->set($this->taggedKey($key), $value, $ttl);
        
        if ($success) {
            $this->updateTagIndex($key);
        }
        
        return $success;
    }
    
    public function delete($key)
    {
        return $this->cache->delete($this->taggedKey($key));
    }
    
    public function flush()
    {
        foreach ($this->tags as $tag) {
            $keys = $this->getTaggedKeys($tag);
            
            foreach ($keys as $key) {
                $this->cache->delete($key);
            }
            
            $this->cache->delete("tag_index:{$tag}");
        }
        
        return true;
    }
    
    private function taggedKey($key)
    {
        return 'tagged:' . implode(':', $this->tags) . ':' . $key;
    }
    
    private function updateTagIndex($key)
    {
        foreach ($this->tags as $tag) {
            $indexKey = "tag_index:{$tag}";
            $keys = $this->cache->get($indexKey, []);
            
            if (!in_array($key, $keys)) {
                $keys[] = $key;
                $this->cache->set($indexKey, $keys, 0); // No expiration for index
            }
        }
    }
    
    private function getTaggedKeys($tag)
    {
        return $this->cache->get("tag_index:{$tag}", []);
    }
}
