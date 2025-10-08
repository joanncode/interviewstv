<template>
  <div class="ai-settings-panel">
    <div class="panel-header">
      <h2>
        <i class="fas fa-robot"></i>
        AI Features Management
      </h2>
      <p class="panel-description">
        Configure and control AI-powered features across the platform
      </p>
    </div>

    <!-- AI Features Grid -->
    <div class="features-grid">
      <!-- Transcription Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon transcription">
            <i class="fas fa-microphone"></i>
          </div>
          <div class="feature-info">
            <h3>AI Transcription</h3>
            <p>Automatic speech-to-text for interviews</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.transcription.enabled"
                @change="toggleFeature('transcription')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.transcription.enabled" class="feature-settings">
          <div class="setting-group">
            <label>Language Model</label>
            <select v-model="features.transcription.settings.model">
              <option value="whisper-1">Whisper v1 (Standard)</option>
              <option value="whisper-2">Whisper v2 (Enhanced)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Default Language</label>
            <select v-model="features.transcription.settings.language">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="auto">Auto-detect</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Confidence Threshold</label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              v-model="features.transcription.settings.confidenceThreshold"
            />
            <span class="range-value">{{ features.transcription.settings.confidenceThreshold }}</span>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.transcription.totalUsage }}</span>
            <span class="stat-label">Total Transcriptions</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.transcription.avgAccuracy }}%</span>
            <span class="stat-label">Avg Accuracy</span>
          </div>
        </div>
      </div>

      <!-- Content Suggestions Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon suggestions">
            <i class="fas fa-lightbulb"></i>
          </div>
          <div class="feature-info">
            <h3>Content Suggestions</h3>
            <p>AI-powered interview questions and topics</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.contentSuggestions.enabled"
                @change="toggleFeature('contentSuggestions')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.contentSuggestions.enabled" class="feature-settings">
          <div class="setting-group">
            <label>AI Model</label>
            <select v-model="features.contentSuggestions.settings.model">
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
              <option value="gpt-4">GPT-4 (Advanced)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Suggestion Types</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentSuggestions.settings.includeQuestions"
                />
                <span>Follow-up Questions</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentSuggestions.settings.includeTopics"
                />
                <span>Related Topics</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentSuggestions.settings.includeInsights"
                />
                <span>Key Insights</span>
              </label>
            </div>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.contentSuggestions.totalUsage }}</span>
            <span class="stat-label">Suggestions Generated</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.contentSuggestions.acceptanceRate }}%</span>
            <span class="stat-label">Acceptance Rate</span>
          </div>
        </div>
      </div>

      <!-- AI Moderation Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon moderation">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div class="feature-info">
            <h3>AI Moderation</h3>
            <p>Automated content moderation and safety</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.aiModeration.enabled"
                @change="toggleFeature('aiModeration')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.aiModeration.enabled" class="feature-settings">
          <div class="setting-group">
            <label>Moderation Level</label>
            <select v-model="features.aiModeration.settings.level">
              <option value="low">Low (Minimal filtering)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (Strict filtering)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Auto-action Threshold</label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              v-model="features.aiModeration.settings.autoActionThreshold"
            />
            <span class="range-value">{{ features.aiModeration.settings.autoActionThreshold }}</span>
          </div>
          
          <div class="setting-group">
            <label>Categories to Monitor</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.aiModeration.settings.categories.hate"
                />
                <span>Hate Speech</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.aiModeration.settings.categories.harassment"
                />
                <span>Harassment</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.aiModeration.settings.categories.violence"
                />
                <span>Violence</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.aiModeration.settings.categories.spam"
                />
                <span>Spam</span>
              </label>
            </div>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.aiModeration.totalChecks }}</span>
            <span class="stat-label">Content Checks</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.aiModeration.flaggedRate }}%</span>
            <span class="stat-label">Flagged Rate</span>
          </div>
        </div>
      </div>

      <!-- Sentiment Analysis Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon sentiment">
            <i class="fas fa-smile"></i>
          </div>
          <div class="feature-info">
            <h3>Sentiment Analysis</h3>
            <p>Analyze emotional tone of content</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.sentimentAnalysis.enabled"
                @change="toggleFeature('sentimentAnalysis')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.sentimentAnalysis.enabled" class="feature-settings">
          <div class="setting-group">
            <label>Analysis Depth</label>
            <select v-model="features.sentimentAnalysis.settings.depth">
              <option value="basic">Basic (Positive/Negative/Neutral)</option>
              <option value="detailed">Detailed (Emotions + Confidence)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label>Real-time Analysis</label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="features.sentimentAnalysis.settings.realTime"
              />
              <span>Enable real-time sentiment tracking</span>
            </label>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.sentimentAnalysis.totalAnalyses }}</span>
            <span class="stat-label">Analyses Performed</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.sentimentAnalysis.avgSentiment }}</span>
            <span class="stat-label">Avg Sentiment</span>
          </div>
        </div>
      </div>

      <!-- Auto-tagging Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon tagging">
            <i class="fas fa-tags"></i>
          </div>
          <div class="feature-info">
            <h3>Auto-tagging</h3>
            <p>Automatic content categorization</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.autoTagging.enabled"
                @change="toggleFeature('autoTagging')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.autoTagging.enabled" class="feature-settings">
          <div class="setting-group">
            <label>Max Tags per Content</label>
            <input
              type="number"
              min="3"
              max="20"
              v-model="features.autoTagging.settings.maxTags"
            />
          </div>
          
          <div class="setting-group">
            <label>Tag Categories</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.autoTagging.settings.includeTopics"
                />
                <span>Topics</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.autoTagging.settings.includeIndustries"
                />
                <span>Industries</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.autoTagging.settings.includeSkills"
                />
                <span>Skills</span>
              </label>
            </div>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.autoTagging.totalTags }}</span>
            <span class="stat-label">Tags Generated</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.autoTagging.accuracy }}%</span>
            <span class="stat-label">Tag Accuracy</span>
          </div>
        </div>
      </div>

      <!-- Content Enhancement Feature -->
      <div class="feature-card">
        <div class="feature-header">
          <div class="feature-icon enhancement">
            <i class="fas fa-magic"></i>
          </div>
          <div class="feature-info">
            <h3>Content Enhancement</h3>
            <p>AI-powered content improvement</p>
          </div>
          <div class="feature-toggle">
            <label class="toggle-switch">
              <input
                type="checkbox"
                v-model="features.contentEnhancement.enabled"
                @change="toggleFeature('contentEnhancement')"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div v-if="features.contentEnhancement.enabled" class="feature-settings">
          <div class="setting-group">
            <label>Enhancement Types</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentEnhancement.settings.improve"
                />
                <span>General Improvement</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentEnhancement.settings.summarize"
                />
                <span>Summarization</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="features.contentEnhancement.settings.expand"
                />
                <span>Content Expansion</span>
              </label>
            </div>
          </div>
        </div>

        <div class="feature-stats">
          <div class="stat">
            <span class="stat-value">{{ stats.contentEnhancement.totalEnhancements }}</span>
            <span class="stat-label">Enhancements</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats.contentEnhancement.avgImprovement }}%</span>
            <span class="stat-label">Avg Improvement</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Global AI Settings -->
    <div class="global-settings">
      <h3>Global AI Settings</h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <label>API Rate Limit (requests/minute)</label>
          <input
            type="number"
            min="10"
            max="1000"
            v-model="globalSettings.rateLimit"
            @change="updateGlobalSettings"
          />
        </div>
        
        <div class="setting-group">
          <label>Default Processing Timeout (seconds)</label>
          <input
            type="number"
            min="30"
            max="300"
            v-model="globalSettings.timeout"
            @change="updateGlobalSettings"
          />
        </div>
        
        <div class="setting-group">
          <label>Error Retry Attempts</label>
          <input
            type="number"
            min="1"
            max="5"
            v-model="globalSettings.retryAttempts"
            @change="updateGlobalSettings"
          />
        </div>
        
        <div class="setting-group">
          <label>Usage Analytics</label>
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="globalSettings.enableAnalytics"
              @change="updateGlobalSettings"
            />
            <span>Enable detailed usage tracking</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Usage Overview -->
    <div class="usage-overview">
      <h3>AI Usage Overview (Last 30 Days)</h3>
      
      <div class="usage-stats">
        <div class="usage-stat">
          <div class="stat-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ overallStats.totalRequests }}</span>
            <span class="stat-label">Total AI Requests</span>
          </div>
        </div>
        
        <div class="usage-stat">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ overallStats.avgProcessingTime }}s</span>
            <span class="stat-label">Avg Processing Time</span>
          </div>
        </div>
        
        <div class="usage-stat">
          <div class="stat-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ overallStats.successRate }}%</span>
            <span class="stat-label">Success Rate</span>
          </div>
        </div>
        
        <div class="usage-stat">
          <div class="stat-icon">
            <i class="fas fa-dollar-sign"></i>
          </div>
          <div class="stat-info">
            <span class="stat-value">${{ overallStats.estimatedCost }}</span>
            <span class="stat-label">Estimated Cost</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="panel-actions">
      <button @click="saveAllSettings" class="btn btn-primary" :disabled="saving">
        <i class="fas fa-save"></i>
        {{ saving ? 'Saving...' : 'Save All Settings' }}
      </button>
      
      <button @click="resetToDefaults" class="btn btn-secondary">
        <i class="fas fa-undo"></i>
        Reset to Defaults
      </button>
      
      <button @click="exportSettings" class="btn btn-outline">
        <i class="fas fa-download"></i>
        Export Settings
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'AISettingsPanel',
  setup() {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    const saving = ref(false)

    // AI Features Configuration
    const features = reactive({
      transcription: {
        enabled: true,
        settings: {
          model: 'whisper-1',
          language: 'auto',
          confidenceThreshold: 0.8
        }
      },
      contentSuggestions: {
        enabled: true,
        settings: {
          model: 'gpt-4',
          includeQuestions: true,
          includeTopics: true,
          includeInsights: true
        }
      },
      aiModeration: {
        enabled: true,
        settings: {
          level: 'medium',
          autoActionThreshold: 0.7,
          categories: {
            hate: true,
            harassment: true,
            violence: true,
            spam: true
          }
        }
      },
      sentimentAnalysis: {
        enabled: true,
        settings: {
          depth: 'detailed',
          realTime: false
        }
      },
      autoTagging: {
        enabled: true,
        settings: {
          maxTags: 10,
          includeTopics: true,
          includeIndustries: true,
          includeSkills: true
        }
      },
      contentEnhancement: {
        enabled: false,
        settings: {
          improve: true,
          summarize: true,
          expand: false
        }
      }
    })

    // Global Settings
    const globalSettings = reactive({
      rateLimit: 100,
      timeout: 120,
      retryAttempts: 3,
      enableAnalytics: true
    })

    // Statistics
    const stats = reactive({
      transcription: {
        totalUsage: 1247,
        avgAccuracy: 94.2
      },
      contentSuggestions: {
        totalUsage: 856,
        acceptanceRate: 78.5
      },
      aiModeration: {
        totalChecks: 3421,
        flaggedRate: 2.1
      },
      sentimentAnalysis: {
        totalAnalyses: 2134,
        avgSentiment: 'Positive'
      },
      autoTagging: {
        totalTags: 5678,
        accuracy: 89.3
      },
      contentEnhancement: {
        totalEnhancements: 234,
        avgImprovement: 67.8
      }
    })

    const overallStats = reactive({
      totalRequests: 12847,
      avgProcessingTime: 2.3,
      successRate: 97.8,
      estimatedCost: 234.56
    })

    // Methods
    const toggleFeature = async (featureName) => {
      try {
        const feature = features[featureName]
        
        const response = await fetch('/api/admin/ai/features/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            feature: featureName,
            enabled: feature.enabled,
            settings: feature.settings
          })
        })

        if (!response.ok) {
          throw new Error('Failed to toggle feature')
        }

        notificationStore.addNotification({
          type: 'success',
          message: `${featureName} ${feature.enabled ? 'enabled' : 'disabled'} successfully`
        })

      } catch (error) {
        console.error('Failed to toggle feature:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to update feature settings'
        })
        
        // Revert the toggle
        features[featureName].enabled = !features[featureName].enabled
      }
    }

    const updateGlobalSettings = async () => {
      try {
        const response = await fetch('/api/admin/ai/settings/global', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(globalSettings)
        })

        if (!response.ok) {
          throw new Error('Failed to update global settings')
        }

      } catch (error) {
        console.error('Failed to update global settings:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to update global settings'
        })
      }
    }

    const saveAllSettings = async () => {
      saving.value = true
      
      try {
        const response = await fetch('/api/admin/ai/settings/bulk', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            features,
            globalSettings
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save settings')
        }

        notificationStore.addNotification({
          type: 'success',
          message: 'All AI settings saved successfully'
        })

      } catch (error) {
        console.error('Failed to save settings:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to save AI settings'
        })
      } finally {
        saving.value = false
      }
    }

    const resetToDefaults = async () => {
      if (!confirm('Are you sure you want to reset all AI settings to defaults?')) {
        return
      }

      try {
        const response = await fetch('/api/admin/ai/settings/reset', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to reset settings')
        }

        // Reload settings
        await loadSettings()

        notificationStore.addNotification({
          type: 'success',
          message: 'AI settings reset to defaults'
        })

      } catch (error) {
        console.error('Failed to reset settings:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to reset AI settings'
        })
      }
    }

    const exportSettings = () => {
      const settingsData = {
        features,
        globalSettings,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-settings-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/ai/settings', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load settings')
        }

        const data = await response.json()
        
        // Update reactive objects
        Object.assign(features, data.features)
        Object.assign(globalSettings, data.globalSettings)
        Object.assign(stats, data.stats)
        Object.assign(overallStats, data.overallStats)

      } catch (error) {
        console.error('Failed to load AI settings:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load AI settings'
        })
      }
    }

    // Lifecycle
    onMounted(() => {
      loadSettings()
    })

    return {
      features,
      globalSettings,
      stats,
      overallStats,
      saving,
      toggleFeature,
      updateGlobalSettings,
      saveAllSettings,
      resetToDefaults,
      exportSettings
    }
  }
}
</script>

<style scoped>
.ai-settings-panel {
  background: #1a1a1a;
  color: white;
  padding: 30px;
  border-radius: 12px;
}

.panel-header {
  margin-bottom: 40px;
  text-align: center;
}

.panel-header h2 {
  font-size: 2.5rem;
  color: #FF0000;
  margin-bottom: 10px;
}

.panel-header h2 i {
  margin-right: 15px;
}

.panel-description {
  font-size: 1.1rem;
  color: #ccc;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.feature-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  border: 1px solid #333;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: #FF0000;
  box-shadow: 0 5px 20px rgba(255, 0, 0, 0.1);
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.feature-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.feature-icon.transcription { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.feature-icon.suggestions { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.feature-icon.moderation { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.feature-icon.sentiment { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.feature-icon.tagging { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
.feature-icon.enhancement { background: rgba(230, 126, 34, 0.2); color: #e67e22; }

.feature-info {
  flex: 1;
}

.feature-info h3 {
  margin: 0 0 5px 0;
  font-size: 1.3rem;
  color: white;
}

.feature-info p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.feature-toggle {
  margin-left: auto;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #666;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #FF0000;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.feature-settings {
  margin-bottom: 20px;
  padding: 20px;
  background: #333;
  border-radius: 8px;
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #ccc;
}

.setting-group input,
.setting-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 6px;
  background: #444;
  color: white;
}

.setting-group input[type="range"] {
  width: calc(100% - 60px);
  margin-right: 10px;
}

.range-value {
  color: #FF0000;
  font-weight: bold;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 0 !important;
}

.checkbox-label input[type="checkbox"] {
  width: auto !important;
}

.feature-stats {
  display: flex;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #FF0000;
}

.stat-label {
  font-size: 0.8rem;
  color: #ccc;
}

.global-settings,
.usage-overview {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
}

.global-settings h3,
.usage-overview h3 {
  margin: 0 0 20px 0;
  color: #FF0000;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.usage-stat {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #333;
  border-radius: 8px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.panel-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .feature-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .feature-toggle {
    margin-left: 0;
  }
  
  .feature-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .usage-stats {
    grid-template-columns: 1fr;
  }
  
  .panel-actions {
    flex-direction: column;
  }
}
</style>
