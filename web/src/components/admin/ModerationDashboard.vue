<template>
  <div class="moderation-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">
          <i class="fas fa-shield-alt"></i>
          Moderation Dashboard
        </h1>
        <p class="dashboard-subtitle">
          Monitor and manage content safety across the platform
        </p>
      </div>
      
      <div class="header-actions">
        <div class="auto-moderation-toggle">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              v-model="autoModerationEnabled" 
              @change="toggleAutoModeration"
            />
            <span class="toggle-slider"></span>
            Auto Moderation
          </label>
        </div>
        
        <button @click="refreshData" class="btn btn-outline" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          Refresh
        </button>
        
        <button @click="showSettingsModal = true" class="btn btn-primary">
          <i class="fas fa-cog"></i>
          Settings
        </button>
      </div>
    </div>

    <!-- Statistics Overview -->
    <div class="moderation-stats">
      <div class="stat-card urgent">
        <div class="stat-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.pendingReview }}</h3>
          <p>Pending Review</p>
          <div class="stat-trend" :class="{ 'increasing': stats.pendingTrend > 0 }">
            <i :class="stats.pendingTrend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
            {{ Math.abs(stats.pendingTrend) }}%
          </div>
        </div>
      </div>
      
      <div class="stat-card warning">
        <div class="stat-icon">
          <i class="fas fa-flag"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.flaggedContent }}</h3>
          <p>Flagged Content</p>
          <div class="stat-detail">Last 24h: {{ stats.flaggedToday }}</div>
        </div>
      </div>
      
      <div class="stat-card success">
        <div class="stat-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.autoApproved }}</h3>
          <p>Auto Approved</p>
          <div class="stat-detail">{{ stats.autoApprovalRate }}% rate</div>
        </div>
      </div>
      
      <div class="stat-card danger">
        <div class="stat-icon">
          <i class="fas fa-ban"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.autoRejected }}</h3>
          <p>Auto Rejected</p>
          <div class="stat-detail">{{ stats.autoRejectionRate }}% rate</div>
        </div>
      </div>
      
      <div class="stat-card info">
        <div class="stat-icon">
          <i class="fas fa-robot"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.aiAccuracy }}%</h3>
          <p>AI Accuracy</p>
          <div class="stat-detail">{{ stats.aiProcessed }} processed</div>
        </div>
      </div>
      
      <div class="stat-card neutral">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.userReports }}</h3>
          <p>User Reports</p>
          <div class="stat-detail">{{ stats.reportResolutionTime }}h avg resolution</div>
        </div>
      </div>
    </div>

    <!-- Filters and Controls -->
    <div class="moderation-controls">
      <div class="filter-section">
        <div class="filter-group">
          <label>Priority</label>
          <select v-model="filters.priority" @change="applyFilters">
            <option value="">All Priorities</option>
            <option value="1">High Priority</option>
            <option value="2">Medium Priority</option>
            <option value="3">Normal Priority</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Content Type</label>
          <select v-model="filters.contentType" @change="applyFilters">
            <option value="">All Types</option>
            <option value="interview">Interviews</option>
            <option value="comment">Comments</option>
            <option value="business">Businesses</option>
            <option value="message">Messages</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="quarantined">Quarantined</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Time Range</label>
          <select v-model="filters.timeRange" @change="applyFilters">
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>
      
      <div class="action-section">
        <button 
          @click="bulkAction('approve')" 
          :disabled="selectedItems.length === 0"
          class="btn btn-success btn-sm"
        >
          <i class="fas fa-check"></i>
          Bulk Approve ({{ selectedItems.length }})
        </button>
        
        <button 
          @click="bulkAction('reject')" 
          :disabled="selectedItems.length === 0"
          class="btn btn-danger btn-sm"
        >
          <i class="fas fa-times"></i>
          Bulk Reject ({{ selectedItems.length }})
        </button>
        
        <button 
          @click="exportData" 
          class="btn btn-outline btn-sm"
        >
          <i class="fas fa-download"></i>
          Export
        </button>
      </div>
    </div>

    <!-- Moderation Queue -->
    <div class="moderation-queue">
      <div class="queue-header">
        <h2>
          <i class="fas fa-list"></i>
          Moderation Queue
          <span class="queue-count">({{ filteredQueue.length }})</span>
        </h2>
        
        <div class="queue-actions">
          <button @click="selectAll" class="btn btn-sm btn-outline">
            <i class="fas fa-check-square"></i>
            Select All
          </button>
          <button @click="clearSelection" class="btn btn-sm btn-outline">
            <i class="fas fa-square"></i>
            Clear
          </button>
        </div>
      </div>

      <div class="queue-list">
        <div 
          v-for="item in paginatedQueue" 
          :key="item.id"
          class="queue-item"
          :class="{ 
            'selected': selectedItems.includes(item.id),
            'high-priority': item.priority === 1,
            'medium-priority': item.priority === 2
          }"
        >
          <div class="item-checkbox">
            <input 
              type="checkbox" 
              :value="item.id"
              v-model="selectedItems"
            />
          </div>
          
          <div class="item-priority">
            <span 
              class="priority-badge" 
              :class="`priority-${item.priority}`"
            >
              {{ getPriorityLabel(item.priority) }}
            </span>
          </div>
          
          <div class="item-content">
            <div class="content-header">
              <span class="content-type">{{ item.content_type }}</span>
              <span class="content-id">#{{ item.content_id }}</span>
              <span class="confidence-score" :class="getConfidenceClass(item.confidence_score)">
                {{ Math.round(item.confidence_score * 100) }}% confidence
              </span>
            </div>
            
            <div class="content-preview">
              {{ getContentPreview(item) }}
            </div>
            
            <div class="content-flags">
              <span 
                v-for="flag in JSON.parse(item.flags || '[]')" 
                :key="flag"
                class="flag-badge"
                :class="getFlagClass(flag)"
              >
                {{ formatFlag(flag) }}
              </span>
            </div>
            
            <div class="content-meta">
              <span class="user-info">
                <i class="fas fa-user"></i>
                User #{{ item.user_id }}
              </span>
              <span class="timestamp">
                <i class="fas fa-clock"></i>
                {{ formatRelativeTime(item.created_at) }}
              </span>
            </div>
          </div>
          
          <div class="item-actions">
            <button 
              @click="reviewItem(item, 'approve')" 
              class="btn btn-sm btn-success"
              title="Approve"
            >
              <i class="fas fa-check"></i>
            </button>
            
            <button 
              @click="reviewItem(item, 'reject')" 
              class="btn btn-sm btn-danger"
              title="Reject"
            >
              <i class="fas fa-times"></i>
            </button>
            
            <button 
              @click="reviewItem(item, 'quarantine')" 
              class="btn btn-sm btn-warning"
              title="Quarantine"
            >
              <i class="fas fa-pause"></i>
            </button>
            
            <button 
              @click="viewDetails(item)" 
              class="btn btn-sm btn-outline"
              title="View Details"
            >
              <i class="fas fa-eye"></i>
            </button>
            
            <button 
              @click="escalateItem(item)" 
              class="btn btn-sm btn-info"
              title="Escalate"
            >
              <i class="fas fa-arrow-up"></i>
            </button>
          </div>
        </div>
        
        <div v-if="filteredQueue.length === 0" class="empty-queue">
          <i class="fas fa-check-circle"></i>
          <h3>Queue is Empty</h3>
          <p>All content has been reviewed. Great job!</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          @click="currentPage--" 
          :disabled="currentPage === 1"
          class="btn btn-outline"
        >
          <i class="fas fa-chevron-left"></i>
          Previous
        </button>
        
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        
        <button 
          @click="currentPage++" 
          :disabled="currentPage === totalPages"
          class="btn btn-outline"
        >
          Next
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Real-time Activity Feed -->
    <div class="activity-feed">
      <h3>
        <i class="fas fa-stream"></i>
        Real-time Activity
      </h3>
      
      <div class="activity-list">
        <div 
          v-for="activity in recentActivity" 
          :key="activity.id"
          class="activity-item"
          :class="activity.type"
        >
          <div class="activity-icon">
            <i :class="getActivityIcon(activity.type)"></i>
          </div>
          <div class="activity-content">
            <div class="activity-message">{{ activity.message }}</div>
            <div class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="showDetailsModal = false">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>Content Details</h3>
          <button @click="showDetailsModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div v-if="selectedItem" class="content-details">
            <!-- Content details would be displayed here -->
            <div class="detail-section">
              <h4>Content Information</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Type:</label>
                  <span>{{ selectedItem.content_type }}</span>
                </div>
                <div class="detail-item">
                  <label>ID:</label>
                  <span>{{ selectedItem.content_id }}</span>
                </div>
                <div class="detail-item">
                  <label>User:</label>
                  <span>{{ selectedItem.user_id }}</span>
                </div>
                <div class="detail-item">
                  <label>Confidence:</label>
                  <span>{{ Math.round(selectedItem.confidence_score * 100) }}%</span>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h4>Moderation Analysis</h4>
              <div class="analysis-data">
                <!-- Analysis details would be displayed here -->
                <pre>{{ JSON.stringify(JSON.parse(selectedItem.moderation_data || '{}'), null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showDetailsModal = false" class="btn btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Review Action Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click="showReviewModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Review Action</h3>
          <button @click="showReviewModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form @submit.prevent="submitReview" class="review-form">
          <div class="form-group">
            <label>Action</label>
            <select v-model="reviewAction" required>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="quarantine">Quarantine</option>
              <option value="escalate">Escalate</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Reason</label>
            <textarea 
              v-model="reviewReason" 
              placeholder="Provide a reason for this action..."
              rows="4"
              required
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showReviewModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
              {{ submitting ? 'Processing...' : 'Submit Review' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="modal-overlay" @click="showSettingsModal = false">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>Moderation Settings</h3>
          <button @click="showSettingsModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="settings-form">
            <!-- Settings form would be here -->
            <div class="setting-group">
              <h4>Auto Moderation Thresholds</h4>
              <div class="threshold-controls">
                <div class="threshold-item">
                  <label>Auto Reject Threshold:</label>
                  <input type="range" min="0.5" max="1" step="0.1" v-model="settings.autoRejectThreshold">
                  <span>{{ settings.autoRejectThreshold }}</span>
                </div>
                <div class="threshold-item">
                  <label>Quarantine Threshold:</label>
                  <input type="range" min="0.3" max="0.9" step="0.1" v-model="settings.quarantineThreshold">
                  <span>{{ settings.quarantineThreshold }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showSettingsModal = false" class="btn btn-outline">
            Cancel
          </button>
          <button @click="saveSettings" class="btn btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading moderation data...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'ModerationDashboard',
  setup() {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const loading = ref(false)
    const submitting = ref(false)
    const autoModerationEnabled = ref(true)
    const moderationQueue = ref([])
    const selectedItems = ref([])
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const recentActivity = ref([])
    
    // Modal state
    const showDetailsModal = ref(false)
    const showReviewModal = ref(false)
    const showSettingsModal = ref(false)
    const selectedItem = ref(null)
    const reviewAction = ref('')
    const reviewReason = ref('')

    // Filters
    const filters = reactive({
      priority: '',
      contentType: '',
      status: '',
      timeRange: '24h'
    })

    // Statistics
    const stats = reactive({
      pendingReview: 0,
      pendingTrend: 0,
      flaggedContent: 0,
      flaggedToday: 0,
      autoApproved: 0,
      autoApprovalRate: 0,
      autoRejected: 0,
      autoRejectionRate: 0,
      aiAccuracy: 0,
      aiProcessed: 0,
      userReports: 0,
      reportResolutionTime: 0
    })

    // Settings
    const settings = reactive({
      autoRejectThreshold: 0.9,
      quarantineThreshold: 0.7
    })

    // Computed properties
    const filteredQueue = computed(() => {
      let filtered = moderationQueue.value

      if (filters.priority) {
        filtered = filtered.filter(item => item.priority === parseInt(filters.priority))
      }

      if (filters.contentType) {
        filtered = filtered.filter(item => item.content_type === filters.contentType)
      }

      if (filters.status) {
        filtered = filtered.filter(item => item.status === filters.status)
      }

      return filtered
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredQueue.value.length / itemsPerPage.value)
    })

    const paginatedQueue = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredQueue.value.slice(start, end)
    })

    // Methods
    const loadModerationData = async () => {
      loading.value = true
      
      try {
        // Load moderation queue
        const queueResponse = await fetch('/api/admin/moderation/queue', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (queueResponse.ok) {
          const queueData = await queueResponse.json()
          moderationQueue.value = queueData.items || []
        }

        // Load statistics
        const statsResponse = await fetch('/api/admin/moderation/stats', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          Object.assign(stats, statsData)
        }

        // Load recent activity
        const activityResponse = await fetch('/api/admin/moderation/activity', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          recentActivity.value = activityData.activities || []
        }

      } catch (error) {
        console.error('Failed to load moderation data:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load moderation data'
        })
      } finally {
        loading.value = false
      }
    }

    const refreshData = () => {
      loadModerationData()
    }

    const applyFilters = () => {
      currentPage.value = 1
      // Filters are applied via computed property
    }

    const selectAll = () => {
      selectedItems.value = paginatedQueue.value.map(item => item.id)
    }

    const clearSelection = () => {
      selectedItems.value = []
    }

    const reviewItem = (item, action) => {
      selectedItem.value = item
      reviewAction.value = action
      reviewReason.value = ''
      showReviewModal.value = true
    }

    const submitReview = async () => {
      if (!selectedItem.value) return

      submitting.value = true

      try {
        const response = await fetch('/api/admin/moderation/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            queue_id: selectedItem.value.id,
            action: reviewAction.value,
            reason: reviewReason.value
          })
        })

        if (!response.ok) {
          throw new Error('Failed to submit review')
        }

        // Remove item from queue
        const index = moderationQueue.value.findIndex(item => item.id === selectedItem.value.id)
        if (index !== -1) {
          moderationQueue.value.splice(index, 1)
        }

        showReviewModal.value = false
        selectedItem.value = null

        notificationStore.addNotification({
          type: 'success',
          message: `Content ${reviewAction.value}d successfully`
        })

      } catch (error) {
        console.error('Failed to submit review:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to submit review'
        })
      } finally {
        submitting.value = false
      }
    }

    const bulkAction = async (action) => {
      if (selectedItems.value.length === 0) return

      try {
        const response = await fetch('/api/admin/moderation/bulk-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            queue_ids: selectedItems.value,
            action: action,
            reason: `Bulk ${action} action`
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to ${action} items`)
        }

        // Remove items from queue
        moderationQueue.value = moderationQueue.value.filter(
          item => !selectedItems.value.includes(item.id)
        )

        selectedItems.value = []

        notificationStore.addNotification({
          type: 'success',
          message: `Successfully ${action}d ${selectedItems.value.length} items`
        })

      } catch (error) {
        console.error(`Failed to ${action} items:`, error)
        notificationStore.addNotification({
          type: 'error',
          message: `Failed to ${action} items`
        })
      }
    }

    const viewDetails = (item) => {
      selectedItem.value = item
      showDetailsModal.value = true
    }

    const escalateItem = async (item) => {
      try {
        const response = await fetch('/api/admin/moderation/escalate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            queue_id: item.id,
            reason: 'Manual escalation'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to escalate item')
        }

        notificationStore.addNotification({
          type: 'success',
          message: 'Item escalated successfully'
        })

        // Refresh data
        loadModerationData()

      } catch (error) {
        console.error('Failed to escalate item:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to escalate item'
        })
      }
    }

    const toggleAutoModeration = async () => {
      try {
        const response = await fetch('/api/admin/moderation/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            auto_moderation_enabled: autoModerationEnabled.value
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update auto moderation setting')
        }

        notificationStore.addNotification({
          type: 'success',
          message: `Auto moderation ${autoModerationEnabled.value ? 'enabled' : 'disabled'}`
        })

      } catch (error) {
        console.error('Failed to toggle auto moderation:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to update auto moderation setting'
        })
        // Revert the toggle
        autoModerationEnabled.value = !autoModerationEnabled.value
      }
    }

    const saveSettings = async () => {
      try {
        const response = await fetch('/api/admin/moderation/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(settings)
        })

        if (!response.ok) {
          throw new Error('Failed to save settings')
        }

        showSettingsModal.value = false

        notificationStore.addNotification({
          type: 'success',
          message: 'Settings saved successfully'
        })

      } catch (error) {
        console.error('Failed to save settings:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to save settings'
        })
      }
    }

    const exportData = async () => {
      try {
        const response = await fetch('/api/admin/moderation/export', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to export data')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `moderation-data-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        notificationStore.addNotification({
          type: 'success',
          message: 'Data exported successfully'
        })

      } catch (error) {
        console.error('Failed to export data:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to export data'
        })
      }
    }

    // Utility functions
    const getPriorityLabel = (priority) => {
      const labels = { 1: 'High', 2: 'Medium', 3: 'Normal' }
      return labels[priority] || 'Normal'
    }

    const getConfidenceClass = (confidence) => {
      if (confidence >= 0.8) return 'high-confidence'
      if (confidence >= 0.6) return 'medium-confidence'
      return 'low-confidence'
    }

    const getFlagClass = (flag) => {
      const classes = {
        'toxicity': 'danger',
        'spam': 'warning',
        'hate_speech': 'danger',
        'threat': 'danger',
        'profanity': 'warning',
        'adult_content': 'danger'
      }
      return classes[flag] || 'info'
    }

    const formatFlag = (flag) => {
      return flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const getContentPreview = (item) => {
      const data = JSON.parse(item.moderation_data || '{}')
      return data.content_preview || 'No preview available'
    }

    const formatRelativeTime = (timestamp) => {
      const now = new Date()
      const time = new Date(timestamp)
      const diff = now - time
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`
      
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    }

    const getActivityIcon = (type) => {
      const icons = {
        'approved': 'fas fa-check-circle',
        'rejected': 'fas fa-times-circle',
        'flagged': 'fas fa-flag',
        'escalated': 'fas fa-arrow-up',
        'reported': 'fas fa-exclamation-triangle'
      }
      return icons[type] || 'fas fa-info-circle'
    }

    // Real-time updates
    let activityInterval = null

    const startRealTimeUpdates = () => {
      activityInterval = setInterval(() => {
        // Load recent activity without full refresh
        fetch('/api/admin/moderation/activity', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })
        .then(response => response.json())
        .then(data => {
          recentActivity.value = data.activities || []
        })
        .catch(error => {
          console.error('Failed to load activity:', error)
        })
      }, 30000) // Update every 30 seconds
    }

    const stopRealTimeUpdates = () => {
      if (activityInterval) {
        clearInterval(activityInterval)
        activityInterval = null
      }
    }

    // Lifecycle
    onMounted(() => {
      loadModerationData()
      startRealTimeUpdates()
    })

    onUnmounted(() => {
      stopRealTimeUpdates()
    })

    return {
      // Reactive state
      loading,
      submitting,
      autoModerationEnabled,
      moderationQueue,
      selectedItems,
      currentPage,
      totalPages,
      recentActivity,
      
      // Modal state
      showDetailsModal,
      showReviewModal,
      showSettingsModal,
      selectedItem,
      reviewAction,
      reviewReason,
      
      // Computed
      filteredQueue,
      paginatedQueue,
      
      // Data
      filters,
      stats,
      settings,
      
      // Methods
      refreshData,
      applyFilters,
      selectAll,
      clearSelection,
      reviewItem,
      submitReview,
      bulkAction,
      viewDetails,
      escalateItem,
      toggleAutoModeration,
      saveSettings,
      exportData,
      
      // Utility functions
      getPriorityLabel,
      getConfidenceClass,
      getFlagClass,
      formatFlag,
      getContentPreview,
      formatRelativeTime,
      getActivityIcon
    }
  }
}
</script>

<style scoped>
.moderation-dashboard {
  background: #1a1a1a;
  color: white;
  min-height: 100vh;
  padding: 30px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #333;
}

.header-content h1 {
  font-size: 2.5rem;
  color: #FF0000;
  margin: 0 0 10px 0;
}

.header-content h1 i {
  margin-right: 15px;
}

.dashboard-subtitle {
  color: #ccc;
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.auto-moderation-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #ccc;
  font-weight: bold;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  width: 50px;
  height: 24px;
  background: #444;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: all 0.3s ease;
}

.toggle-label input[type="checkbox"]:checked + .toggle-slider {
  background: #FF0000;
}

.toggle-label input[type="checkbox"]:checked + .toggle-slider::before {
  transform: translateX(26px);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #FF0000;
  color: white;
}

.btn-primary:hover {
  background: #cc0000;
}

.btn-outline {
  background: transparent;
  color: #FF0000;
  border: 1px solid #FF0000;
}

.btn-outline:hover {
  background: #FF0000;
  color: white;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.moderation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-left: 4px solid transparent;
}

.stat-card.urgent {
  border-left-color: #dc3545;
}

.stat-card.warning {
  border-left-color: #ffc107;
}

.stat-card.success {
  border-left-color: #28a745;
}

.stat-card.danger {
  border-left-color: #dc3545;
}

.stat-card.info {
  border-left-color: #17a2b8;
}

.stat-card.neutral {
  border-left-color: #6c757d;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
}

.stat-content h3 {
  margin: 0 0 5px 0;
  font-size: 2rem;
  color: white;
}

.stat-content p {
  margin: 0 0 5px 0;
  color: #ccc;
  font-size: 0.9rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #28a745;
}

.stat-trend.increasing {
  color: #dc3545;
}

.stat-detail {
  font-size: 0.8rem;
  color: #999;
}

.moderation-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 12px;
}

.filter-section {
  display: flex;
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  color: #ccc;
  font-size: 0.9rem;
  font-weight: bold;
}

.filter-group select {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  min-width: 120px;
}

.action-section {
  display: flex;
  gap: 15px;
}

.moderation-queue {
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 30px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #333;
  border-bottom: 1px solid #444;
}

.queue-header h2 {
  margin: 0;
  color: #FF0000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-count {
  color: #ccc;
  font-size: 0.9rem;
  font-weight: normal;
}

.queue-actions {
  display: flex;
  gap: 10px;
}

.queue-list {
  max-height: 600px;
  overflow-y: auto;
}

.queue-item {
  display: grid;
  grid-template-columns: 40px 100px 1fr 200px;
  gap: 20px;
  padding: 20px;
  border-bottom: 1px solid #333;
  transition: all 0.3s ease;
}

.queue-item:hover {
  background: #333;
}

.queue-item.selected {
  background: rgba(255, 0, 0, 0.1);
}

.queue-item.high-priority {
  border-left: 4px solid #dc3545;
}

.queue-item.medium-priority {
  border-left: 4px solid #ffc107;
}

.item-checkbox input {
  width: 18px;
  height: 18px;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: center;
}

.priority-badge.priority-1 {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.priority-badge.priority-2 {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.priority-badge.priority-3 {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.content-type {
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.content-id {
  color: #ccc;
  font-family: monospace;
  font-size: 0.9rem;
}

.confidence-score {
  font-size: 0.8rem;
  font-weight: bold;
}

.confidence-score.high-confidence {
  color: #dc3545;
}

.confidence-score.medium-confidence {
  color: #ffc107;
}

.confidence-score.low-confidence {
  color: #28a745;
}

.content-preview {
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.4;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-flags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.flag-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: bold;
}

.flag-badge.danger {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.flag-badge.warning {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.flag-badge.info {
  background: rgba(23, 162, 184, 0.2);
  color: #17a2b8;
}

.content-meta {
  display: flex;
  gap: 20px;
  font-size: 0.8rem;
  color: #999;
}

.user-info,
.timestamp {
  display: flex;
  align-items: center;
  gap: 5px;
}

.item-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.empty-queue {
  text-align: center;
  padding: 60px 20px;
  color: #ccc;
}

.empty-queue i {
  font-size: 3rem;
  margin-bottom: 20px;
  color: #28a745;
}

.empty-queue h3 {
  margin: 0 0 10px 0;
  color: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #333;
}

.page-info {
  color: #ccc;
  font-weight: bold;
}

.activity-feed {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
}

.activity-feed h3 {
  margin: 0 0 20px 0;
  color: #FF0000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #333;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-message {
  color: white;
  margin-bottom: 5px;
}

.activity-time {
  color: #999;
  font-size: 0.8rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  color: #FF0000;
}

.modal-close {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px;
}

.modal-close:hover {
  color: white;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid #333;
}

.review-form,
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  color: #ccc;
  font-weight: bold;
}

.form-group select,
.form-group textarea {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 10px;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
}

.content-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  color: #FF0000;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #333;
  border-radius: 6px;
}

.detail-item label {
  color: #ccc;
  font-weight: bold;
}

.detail-item span {
  color: white;
}

.analysis-data {
  background: #333;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}

.analysis-data pre {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.setting-group h4 {
  margin: 0 0 15px 0;
  color: #FF0000;
}

.threshold-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.threshold-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.threshold-item label {
  min-width: 200px;
  color: #ccc;
}

.threshold-item input[type="range"] {
  flex: 1;
}

.threshold-item span {
  min-width: 40px;
  color: white;
  font-weight: bold;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
}

.loading-spinner i {
  font-size: 3rem;
  color: #FF0000;
  margin-bottom: 20px;
}

.loading-spinner p {
  font-size: 1.2rem;
  color: white;
}

/* Scrollbar styling */
.queue-list::-webkit-scrollbar,
.activity-list::-webkit-scrollbar {
  width: 6px;
}

.queue-list::-webkit-scrollbar-track,
.activity-list::-webkit-scrollbar-track {
  background: #333;
}

.queue-list::-webkit-scrollbar-thumb,
.activity-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.queue-list::-webkit-scrollbar-thumb:hover,
.activity-list::-webkit-scrollbar-thumb:hover {
  background: #666;
}

@media (max-width: 1200px) {
  .moderation-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .moderation-controls {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .filter-section {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .action-section {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .moderation-dashboard {
    padding: 20px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .moderation-stats {
    grid-template-columns: 1fr;
  }
  
  .queue-item {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .item-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
