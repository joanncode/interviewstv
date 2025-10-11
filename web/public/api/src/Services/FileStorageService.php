<?php

namespace InterviewsTV\Services;

class FileStorageService {
    private $dataDir;
    
    public function __construct() {
        $this->dataDir = __DIR__ . '/../../data';
        $this->ensureDirectoryExists($this->dataDir);
    }
    
    /**
     * Save data to a file
     */
    public function save($collection, $id, $data) {
        $dir = $this->dataDir . '/' . $collection;
        $this->ensureDirectoryExists($dir);
        
        $file = $dir . '/' . $id . '.json';
        $data['updated_at'] = time();
        
        if (!isset($data['created_at'])) {
            $data['created_at'] = time();
        }
        
        return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT)) !== false;
    }
    
    /**
     * Load data from a file
     */
    public function load($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (!file_exists($file)) {
            return null;
        }
        
        $content = file_get_contents($file);
        return json_decode($content, true);
    }
    
    /**
     * Delete a file
     */
    public function delete($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (file_exists($file)) {
            return unlink($file);
        }
        
        return false;
    }
    
    /**
     * List all items in a collection
     */
    public function list($collection, $limit = null, $offset = 0) {
        $dir = $this->dataDir . '/' . $collection;
        
        if (!is_dir($dir)) {
            return [];
        }
        
        $files = glob($dir . '/*.json');
        $files = array_filter($files, function($file) {
            return basename($file) !== 'index.json';
        });
        
        // Sort by modification time (newest first)
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        // Apply offset and limit
        if ($offset > 0) {
            $files = array_slice($files, $offset);
        }
        
        if ($limit !== null) {
            $files = array_slice($files, 0, $limit);
        }
        
        $items = [];
        foreach ($files as $file) {
            $content = file_get_contents($file);
            $data = json_decode($content, true);
            if ($data) {
                $items[] = $data;
            }
        }
        
        return $items;
    }
    
    /**
     * Search items in a collection
     */
    public function search($collection, $criteria) {
        $items = $this->list($collection);
        
        return array_filter($items, function($item) use ($criteria) {
            foreach ($criteria as $key => $value) {
                if (!isset($item[$key]) || $item[$key] !== $value) {
                    return false;
                }
            }
            return true;
        });
    }
    
    /**
     * Append data to an array file
     */
    public function append($collection, $id, $data) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        $existing = [];
        if (file_exists($file)) {
            $content = file_get_contents($file);
            $existing = json_decode($content, true) ?: [];
        }
        
        $data['id'] = uniqid();
        $data['timestamp'] = time();
        $existing[] = $data;
        
        return file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT)) !== false;
    }
    
    /**
     * Get array data from file
     */
    public function getArray($collection, $id) {
        $file = $this->dataDir . '/' . $collection . '/' . $id . '.json';
        
        if (!file_exists($file)) {
            return [];
        }
        
        $content = file_get_contents($file);
        return json_decode($content, true) ?: [];
    }
    
    /**
     * Update index file
     */
    public function updateIndex($collection, $indexData) {
        $file = $this->dataDir . '/' . $collection . '/index.json';
        return file_put_contents($file, json_encode($indexData, JSON_PRETTY_PRINT)) !== false;
    }
    
    /**
     * Get index data
     */
    public function getIndex($collection) {
        $file = $this->dataDir . '/' . $collection . '/index.json';
        
        if (!file_exists($file)) {
            return [];
        }
        
        $content = file_get_contents($file);
        return json_decode($content, true) ?: [];
    }
    
    /**
     * Generate next ID for a collection
     */
    public function getNextId($collection) {
        $items = $this->list($collection);
        $maxId = 0;
        
        foreach ($items as $item) {
            if (isset($item['id']) && is_numeric($item['id'])) {
                $maxId = max($maxId, (int)$item['id']);
            }
        }
        
        return $maxId + 1;
    }
    
    /**
     * Count items in collection
     */
    public function count($collection) {
        $dir = $this->dataDir . '/' . $collection;
        
        if (!is_dir($dir)) {
            return 0;
        }
        
        $files = glob($dir . '/*.json');
        $files = array_filter($files, function($file) {
            return basename($file) !== 'index.json';
        });
        
        return count($files);
    }
    
    /**
     * Ensure directory exists
     */
    private function ensureDirectoryExists($dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
    
    /**
     * Get data directory path
     */
    public function getDataDir() {
        return $this->dataDir;
    }
    
    /**
     * Backup data
     */
    public function backup($collection = null) {
        $timestamp = date('Y-m-d_H-i-s');
        $backupDir = $this->dataDir . '/backups/' . $timestamp;
        $this->ensureDirectoryExists($backupDir);
        
        if ($collection) {
            $sourceDir = $this->dataDir . '/' . $collection;
            $targetDir = $backupDir . '/' . $collection;
            
            if (is_dir($sourceDir)) {
                $this->copyDirectory($sourceDir, $targetDir);
            }
        } else {
            // Backup all collections
            $collections = ['users', 'interviews', 'guests', 'recordings', 'chat'];
            
            foreach ($collections as $coll) {
                $sourceDir = $this->dataDir . '/' . $coll;
                $targetDir = $backupDir . '/' . $coll;
                
                if (is_dir($sourceDir)) {
                    $this->copyDirectory($sourceDir, $targetDir);
                }
            }
        }
        
        return $backupDir;
    }
    
    /**
     * Copy directory recursively
     */
    private function copyDirectory($source, $target) {
        $this->ensureDirectoryExists($target);
        
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($source, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $item) {
            $targetPath = $target . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
            
            if ($item->isDir()) {
                $this->ensureDirectoryExists($targetPath);
            } else {
                copy($item, $targetPath);
            }
        }
    }
    
    /**
     * Clean up old files
     */
    public function cleanup($collection, $daysOld = 30) {
        $dir = $this->dataDir . '/' . $collection;
        
        if (!is_dir($dir)) {
            return 0;
        }
        
        $cutoffTime = time() - ($daysOld * 24 * 60 * 60);
        $files = glob($dir . '/*.json');
        $deletedCount = 0;
        
        foreach ($files as $file) {
            if (basename($file) === 'index.json') {
                continue;
            }
            
            if (filemtime($file) < $cutoffTime) {
                if (unlink($file)) {
                    $deletedCount++;
                }
            }
        }
        
        return $deletedCount;
    }
}
