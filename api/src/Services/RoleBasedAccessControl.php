<?php

namespace App\Services;

class RoleBasedAccessControl
{
    private $pdo;
    private $permissions = [];
    private $roleHierarchy = [];
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->loadPermissions();
        $this->setupRoleHierarchy();
    }
    
    /**
     * Check if user has permission
     */
    public function hasPermission($userId, $permission, $resourceId = null)
    {
        $userRoles = $this->getUserRoles($userId);
        
        foreach ($userRoles as $role) {
            if ($this->roleHasPermission($role, $permission, $resourceId)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if user has any of the given permissions
     */
    public function hasAnyPermission($userId, $permissions, $resourceId = null)
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($userId, $permission, $resourceId)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if user has all of the given permissions
     */
    public function hasAllPermissions($userId, $permissions, $resourceId = null)
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($userId, $permission, $resourceId)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check if user has role
     */
    public function hasRole($userId, $role)
    {
        $userRoles = $this->getUserRoles($userId);
        return in_array($role, $userRoles);
    }
    
    /**
     * Check if user has any of the given roles
     */
    public function hasAnyRole($userId, $roles)
    {
        $userRoles = $this->getUserRoles($userId);
        return !empty(array_intersect($userRoles, $roles));
    }
    
    /**
     * Assign role to user
     */
    public function assignRole($userId, $role, $assignedBy = null)
    {
        // Check if role exists
        if (!$this->roleExists($role)) {
            throw new \InvalidArgumentException("Role '{$role}' does not exist");
        }
        
        // Check if user already has this role
        if ($this->hasRole($userId, $role)) {
            return true;
        }
        
        try {
            $sql = "INSERT INTO user_roles (user_id, role, assigned_by, assigned_at) VALUES (?, ?, ?, NOW())";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, $role, $assignedBy]);
            
            $this->logRoleChange('role_assigned', $userId, $role, $assignedBy);
            
            return true;
            
        } catch (\PDOException $e) {
            return false;
        }
    }
    
    /**
     * Remove role from user
     */
    public function removeRole($userId, $role, $removedBy = null)
    {
        try {
            $sql = "DELETE FROM user_roles WHERE user_id = ? AND role = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, $role]);
            
            $this->logRoleChange('role_removed', $userId, $role, $removedBy);
            
            return $stmt->rowCount() > 0;
            
        } catch (\PDOException $e) {
            return false;
        }
    }
    
    /**
     * Get user roles
     */
    public function getUserRoles($userId)
    {
        $sql = "SELECT role FROM user_roles WHERE user_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        
        $roles = $stmt->fetchAll(\PDO::FETCH_COLUMN);
        
        // Add inherited roles based on hierarchy
        $allRoles = $roles;
        foreach ($roles as $role) {
            $inheritedRoles = $this->getInheritedRoles($role);
            $allRoles = array_merge($allRoles, $inheritedRoles);
        }
        
        return array_unique($allRoles);
    }
    
    /**
     * Get user permissions
     */
    public function getUserPermissions($userId, $resourceType = null)
    {
        $userRoles = $this->getUserRoles($userId);
        $permissions = [];
        
        foreach ($userRoles as $role) {
            $rolePermissions = $this->getRolePermissions($role, $resourceType);
            $permissions = array_merge($permissions, $rolePermissions);
        }
        
        return array_unique($permissions);
    }
    
    /**
     * Check if role has permission
     */
    public function roleHasPermission($role, $permission, $resourceId = null)
    {
        $rolePermissions = $this->getRolePermissions($role);
        
        if (in_array($permission, $rolePermissions)) {
            return true;
        }
        
        // Check resource-specific permissions
        if ($resourceId) {
            return $this->hasResourcePermission($role, $permission, $resourceId);
        }
        
        return false;
    }
    
    /**
     * Get role permissions
     */
    public function getRolePermissions($role, $resourceType = null)
    {
        $cacheKey = "role_permissions_{$role}" . ($resourceType ? "_{$resourceType}" : '');
        
        if (isset($this->permissions[$cacheKey])) {
            return $this->permissions[$cacheKey];
        }
        
        $sql = "SELECT permission FROM role_permissions WHERE role = ?";
        $params = [$role];
        
        if ($resourceType) {
            $sql .= " AND (resource_type IS NULL OR resource_type = ?)";
            $params[] = $resourceType;
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        $permissions = $stmt->fetchAll(\PDO::FETCH_COLUMN);
        $this->permissions[$cacheKey] = $permissions;
        
        return $permissions;
    }
    
    /**
     * Grant permission to role
     */
    public function grantPermission($role, $permission, $resourceType = null, $grantedBy = null)
    {
        try {
            $sql = "INSERT INTO role_permissions (role, permission, resource_type, granted_by, granted_at) 
                    VALUES (?, ?, ?, ?, NOW())";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$role, $permission, $resourceType, $grantedBy]);
            
            // Clear cache
            $this->clearPermissionCache($role);
            
            $this->logPermissionChange('permission_granted', $role, $permission, $grantedBy);
            
            return true;
            
        } catch (\PDOException $e) {
            return false;
        }
    }
    
    /**
     * Revoke permission from role
     */
    public function revokePermission($role, $permission, $resourceType = null, $revokedBy = null)
    {
        try {
            $sql = "DELETE FROM role_permissions WHERE role = ? AND permission = ?";
            $params = [$role, $permission];
            
            if ($resourceType) {
                $sql .= " AND resource_type = ?";
                $params[] = $resourceType;
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            // Clear cache
            $this->clearPermissionCache($role);
            
            $this->logPermissionChange('permission_revoked', $role, $permission, $revokedBy);
            
            return $stmt->rowCount() > 0;
            
        } catch (\PDOException $e) {
            return false;
        }
    }
    
    /**
     * Create new role
     */
    public function createRole($role, $description = null, $createdBy = null)
    {
        try {
            $sql = "INSERT INTO roles (name, description, created_by, created_at) VALUES (?, ?, ?, NOW())";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$role, $description, $createdBy]);
            
            $this->logRoleChange('role_created', null, $role, $createdBy);
            
            return true;
            
        } catch (\PDOException $e) {
            return false;
        }
    }
    
    /**
     * Delete role
     */
    public function deleteRole($role, $deletedBy = null)
    {
        try {
            $this->pdo->beginTransaction();
            
            // Remove role from all users
            $sql = "DELETE FROM user_roles WHERE role = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$role]);
            
            // Remove all permissions for this role
            $sql = "DELETE FROM role_permissions WHERE role = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$role]);
            
            // Delete the role
            $sql = "DELETE FROM roles WHERE name = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$role]);
            
            $this->pdo->commit();
            
            // Clear cache
            $this->clearPermissionCache($role);
            
            $this->logRoleChange('role_deleted', null, $role, $deletedBy);
            
            return true;
            
        } catch (\PDOException $e) {
            $this->pdo->rollBack();
            return false;
        }
    }
    
    /**
     * Check resource-specific permission
     */
    private function hasResourcePermission($role, $permission, $resourceId)
    {
        $sql = "SELECT COUNT(*) FROM resource_permissions 
                WHERE role = ? AND permission = ? AND resource_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$role, $permission, $resourceId]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    /**
     * Load permissions into cache
     */
    private function loadPermissions()
    {
        // This could be optimized to load all permissions at once
        // For now, permissions are loaded on-demand
    }
    
    /**
     * Setup role hierarchy
     */
    private function setupRoleHierarchy()
    {
        $this->roleHierarchy = [
            'super_admin' => ['admin', 'moderator', 'user'],
            'admin' => ['moderator', 'user'],
            'moderator' => ['user'],
            'user' => []
        ];
    }
    
    /**
     * Get inherited roles based on hierarchy
     */
    private function getInheritedRoles($role)
    {
        return isset($this->roleHierarchy[$role]) ? $this->roleHierarchy[$role] : [];
    }
    
    /**
     * Check if role exists
     */
    private function roleExists($role)
    {
        $sql = "SELECT COUNT(*) FROM roles WHERE name = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$role]);
        
        return $stmt->fetchColumn() > 0;
    }
    
    /**
     * Clear permission cache for role
     */
    private function clearPermissionCache($role)
    {
        foreach ($this->permissions as $key => $value) {
            if (strpos($key, "role_permissions_{$role}") === 0) {
                unset($this->permissions[$key]);
            }
        }
    }
    
    /**
     * Log role changes
     */
    private function logRoleChange($action, $userId, $role, $changedBy)
    {
        $sql = "INSERT INTO role_audit_log (user_id, role, action, changed_by, changed_at) 
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, $role, $action, $changedBy]);
    }
    
    /**
     * Log permission changes
     */
    private function logPermissionChange($action, $role, $permission, $changedBy)
    {
        $sql = "INSERT INTO permission_audit_log (role, permission, action, changed_by, changed_at) 
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$role, $permission, $action, $changedBy]);
    }
    
    /**
     * Get all available roles
     */
    public function getAllRoles()
    {
        $sql = "SELECT name, description FROM roles ORDER BY name";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
    
    /**
     * Get all available permissions
     */
    public function getAllPermissions()
    {
        $sql = "SELECT DISTINCT permission FROM role_permissions ORDER BY permission";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(\PDO::FETCH_COLUMN);
    }
}
