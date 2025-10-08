<template>
  <div class="analytics-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">
          <i class="fas fa-chart-line"></i>
          Analytics Dashboard
        </h1>
        <p class="dashboard-subtitle">
          Comprehensive insights into your content performance and audience engagement
        </p>
      </div>
      
      <div class="header-controls">
        <div class="time-range-selector">
          <select v-model="selectedTimeRange" @change="loadAnalytics">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
        
        <button @click="exportData" class="btn btn-outline">
          <i class="fas fa-download"></i>
          Export Data
        </button>
        
        <button @click="refreshData" class="btn btn-primary" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          Refresh
        </button>
      </div>
    </div>

    <!-- Real-time Stats Bar -->
    <div class="realtime-stats">
      <div class="realtime-indicator">
        <div class="pulse-dot"></div>
        <span>Live Stats</span>
      </div>
      
      <div class="realtime-metrics">
        <div class="realtime-metric">
          <span class="metric-value">{{ realTimeStats.recent_views }}</span>
          <span class="metric-label">Views (5m)</span>
        </div>
        <div class="realtime-metric">
          <span class="metric-value">{{ realTimeStats.recent_likes }}</span>
          <span class="metric-label">Likes (5m)</span>
        </div>
        <div class="realtime-metric">
          <span class="metric-value">{{ realTimeStats.recent_comments }}</span>
          <span class="metric-label">Comments (5m)</span>
        </div>
        <div class="realtime-metric">
          <span class="metric-value">{{ realTimeStats.recent_followers }}</span>
          <span class="metric-label">New Followers (5m)</span>
        </div>
      </div>
    </div>

    <!-- Overview Cards -->
    <div class="overview-cards">
      <div class="metric-card">
        <div class="card-icon views">
          <i class="fas fa-eye"></i>
        </div>
        <div class="card-content">
          <h3>{{ formatNumber(overview.total_views) }}</h3>
          <p>Total Views</p>
          <div class="card-trend" :class="getViewsTrend()">
            <i :class="getViewsTrendIcon()"></i>
            <span>{{ overview.period_views }} this period</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="card-icon engagement">
          <i class="fas fa-heart"></i>
        </div>
        <div class="card-content">
          <h3>{{ overview.engagement_rate }}%</h3>
          <p>Engagement Rate</p>
          <div class="card-trend positive">
            <i class="fas fa-arrow-up"></i>
            <span>{{ overview.total_likes + overview.total_comments }} interactions</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="card-icon followers">
          <i class="fas fa-users"></i>
        </div>
        <div class="card-content">
          <h3>{{ formatNumber(overview.total_followers) }}</h3>
          <p>Followers</p>
          <div class="card-trend positive">
            <i class="fas fa-arrow-up"></i>
            <span>{{ growthMetrics.follower_growth_rate }}% growth</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="card-icon revenue">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(revenueAnalytics.total_revenue) }}</h3>
          <p>Total Revenue</p>
          <div class="card-trend positive">
            <i class="fas fa-arrow-up"></i>
            <span>${{ formatNumber(revenueAnalytics.subscription_revenue) }} subscriptions</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="card-icon watch-time">
          <i class="fas fa-clock"></i>
        </div>
        <div class="card-content">
          <h3>{{ formatDuration(overview.avg_watch_time) }}</h3>
          <p>Avg Watch Time</p>
          <div class="card-trend neutral">
            <i class="fas fa-minus"></i>
            <span>{{ overview.total_interviews }} interviews</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="card-icon subscribers">
          <i class="fas fa-star"></i>
        </div>
        <div class="card-content">
          <h3>{{ formatNumber(revenueAnalytics.subscribers) }}</h3>
          <p>Subscribers</p>
          <div class="card-trend positive">
            <i class="fas fa-arrow-up"></i>
            <span>${{ revenueAnalytics.avg_subscription_value }} avg value</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <!-- Engagement Trends Chart -->
      <div class="chart-container">
        <div class="chart-header">
          <h3>Engagement Trends</h3>
          <div class="chart-legend">
            <span class="legend-item views"><span class="legend-color"></span>Views</span>
            <span class="legend-item likes"><span class="legend-color"></span>Likes</span>
            <span class="legend-item comments"><span class="legend-color"></span>Comments</span>
            <span class="legend-item shares"><span class="legend-color"></span>Shares</span>
          </div>
        </div>
        <div class="chart-content">
          <canvas ref="engagementChart" width="800" height="300"></canvas>
        </div>
      </div>

      <!-- Audience Growth Chart -->
      <div class="chart-container">
        <div class="chart-header">
          <h3>Audience Growth</h3>
          <div class="chart-controls">
            <button 
              @click="growthChartType = 'followers'" 
              :class="{ active: growthChartType === 'followers' }"
              class="chart-toggle"
            >
              Followers
            </button>
            <button 
              @click="growthChartType = 'subscribers'" 
              :class="{ active: growthChartType === 'subscribers' }"
              class="chart-toggle"
            >
              Subscribers
            </button>
          </div>
        </div>
        <div class="chart-content">
          <canvas ref="growthChart" width="800" height="300"></canvas>
        </div>
      </div>
    </div>

    <!-- Content Performance & Audience Insights -->
    <div class="insights-section">
      <!-- Top Content -->
      <div class="insight-panel">
        <h3>Top Performing Content</h3>
        <div class="content-list">
          <div 
            v-for="content in topContent" 
            :key="content.id" 
            class="content-item"
          >
            <div class="content-thumbnail">
              <img :src="content.thumbnail_url || '/default-thumbnail.jpg'" :alt="content.title" />
            </div>
            <div class="content-info">
              <h4>{{ content.title }}</h4>
              <div class="content-stats">
                <span><i class="fas fa-eye"></i> {{ formatNumber(content.views) }}</span>
                <span><i class="fas fa-heart"></i> {{ formatNumber(content.likes) }}</span>
                <span><i class="fas fa-comment"></i> {{ formatNumber(content.comments) }}</span>
              </div>
              <div class="content-engagement">
                <div class="engagement-bar">
                  <div 
                    class="engagement-fill" 
                    :style="{ width: (content.engagement_score / maxEngagementScore * 100) + '%' }"
                  ></div>
                </div>
                <span class="engagement-score">{{ content.engagement_score }} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audience Demographics -->
      <div class="insight-panel">
        <h3>Audience Demographics</h3>
        
        <div class="demographics-section">
          <h4>Age Distribution</h4>
          <div class="demographic-chart">
            <div 
              v-for="age in audienceDemographics.age_distribution" 
              :key="age.age_range"
              class="demographic-bar"
            >
              <span class="demographic-label">{{ age.age_range || 'Unknown' }}</span>
              <div class="demographic-progress">
                <div 
                  class="demographic-fill"
                  :style="{ width: (age.count / maxAgeCount * 100) + '%' }"
                ></div>
              </div>
              <span class="demographic-value">{{ age.count }}</span>
            </div>
          </div>
        </div>

        <div class="demographics-section">
          <h4>Top Locations</h4>
          <div class="location-list">
            <div 
              v-for="location in audienceDemographics.location_distribution.slice(0, 5)" 
              :key="location.location_country"
              class="location-item"
            >
              <span class="location-flag">🌍</span>
              <span class="location-name">{{ location.location_country || 'Unknown' }}</span>
              <span class="location-count">{{ location.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Traffic Sources -->
      <div class="insight-panel">
        <h3>Traffic Sources</h3>
        <div class="traffic-sources">
          <div 
            v-for="source in trafficSources" 
            :key="source.referrer_source"
            class="traffic-source"
          >
            <div class="source-info">
              <span class="source-name">{{ formatSourceName(source.referrer_source) }}</span>
              <span class="source-stats">
                {{ formatNumber(source.views) }} views • {{ formatNumber(source.unique_visitors) }} visitors
              </span>
            </div>
            <div class="source-progress">
              <div 
                class="source-fill"
                :style="{ width: (source.views / maxTrafficViews * 100) + '%' }"
              ></div>
            </div>
            <span class="source-percentage">{{ ((source.views / totalTrafficViews) * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Revenue Breakdown -->
    <div class="revenue-section">
      <div class="revenue-panel">
        <h3>Revenue Breakdown</h3>
        <div class="revenue-chart">
          <div class="revenue-item">
            <div class="revenue-icon subscriptions">
              <i class="fas fa-crown"></i>
            </div>
            <div class="revenue-info">
              <h4>${{ formatNumber(revenueAnalytics.subscription_revenue) }}</h4>
              <p>Subscription Revenue</p>
              <span class="revenue-detail">{{ revenueAnalytics.subscribers }} subscribers</span>
            </div>
          </div>
          
          <div class="revenue-item">
            <div class="revenue-icon donations">
              <i class="fas fa-gift"></i>
            </div>
            <div class="revenue-info">
              <h4>${{ formatNumber(revenueAnalytics.donation_revenue) }}</h4>
              <p>Donation Revenue</p>
              <span class="revenue-detail">{{ revenueAnalytics.total_donations }} donations</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading analytics...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import Chart from 'chart.js/auto'

export default {
  name: 'AnalyticsDashboard',
  setup() {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const loading = ref(false)
    const selectedTimeRange = ref('30d')
    const growthChartType = ref('followers')
    
    // Chart refs
    const engagementChart = ref(null)
    const growthChart = ref(null)
    
    // Chart instances
    let engagementChartInstance = null
    let growthChartInstance = null

    // Analytics data
    const overview = reactive({
      total_interviews: 0,
      total_views: 0,
      total_likes: 0,
      total_comments: 0,
      total_shares: 0,
      total_followers: 0,
      avg_watch_time: 0,
      engagement_rate: 0,
      period_interviews: 0,
      period_views: 0
    })

    const contentPerformance = ref([])
    const audienceInsights = reactive({
      demographics: [],
      interests: [],
      total_unique_viewers: 0,
      returning_viewers: 0
    })
    
    const engagementTrends = ref([])
    const revenueAnalytics = reactive({
      total_revenue: 0,
      subscription_revenue: 0,
      donation_revenue: 0,
      subscribers: 0,
      total_donations: 0,
      avg_subscription_value: 0,
      avg_donation_value: 0
    })
    
    const growthMetrics = reactive({
      growth_data: [],
      total_followers: 0,
      total_subscribers: 0,
      follower_growth_rate: 0,
      subscriber_growth_rate: 0
    })
    
    const topContent = ref([])
    const audienceDemographics = reactive({
      age_distribution: [],
      gender_distribution: [],
      location_distribution: []
    })
    
    const trafficSources = ref([])
    const realTimeStats = reactive({
      recent_views: 0,
      recent_likes: 0,
      recent_comments: 0,
      recent_followers: 0
    })

    // Computed properties
    const maxEngagementScore = computed(() => {
      return Math.max(...topContent.value.map(c => c.engagement_score), 1)
    })

    const maxAgeCount = computed(() => {
      return Math.max(...audienceDemographics.age_distribution.map(a => a.count), 1)
    })

    const maxTrafficViews = computed(() => {
      return Math.max(...trafficSources.value.map(s => s.views), 1)
    })

    const totalTrafficViews = computed(() => {
      return trafficSources.value.reduce((sum, s) => sum + s.views, 1)
    })

    // Methods
    const loadAnalytics = async () => {
      loading.value = true
      
      try {
        const response = await fetch(`/api/analytics/dashboard?timeRange=${selectedTimeRange.value}`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load analytics')
        }

        const data = await response.json()
        
        // Update reactive data
        Object.assign(overview, data.overview)
        contentPerformance.value = data.content_performance
        Object.assign(audienceInsights, data.audience_insights)
        engagementTrends.value = data.engagement_trends
        Object.assign(revenueAnalytics, data.revenue_analytics)
        Object.assign(growthMetrics, data.growth_metrics)
        topContent.value = data.top_content
        Object.assign(audienceDemographics, data.audience_demographics)
        trafficSources.value = data.traffic_sources
        Object.assign(realTimeStats, data.real_time_stats)

        // Update charts
        await nextTick()
        updateCharts()

      } catch (error) {
        console.error('Failed to load analytics:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load analytics data'
        })
      } finally {
        loading.value = false
      }
    }

    const refreshData = () => {
      loadAnalytics()
    }

    const exportData = () => {
      const exportData = {
        overview,
        contentPerformance: contentPerformance.value,
        audienceInsights,
        engagementTrends: engagementTrends.value,
        revenueAnalytics,
        growthMetrics,
        topContent: topContent.value,
        audienceDemographics,
        trafficSources: trafficSources.value,
        exportedAt: new Date().toISOString(),
        timeRange: selectedTimeRange.value
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${selectedTimeRange.value}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const updateCharts = () => {
      updateEngagementChart()
      updateGrowthChart()
    }

    const updateEngagementChart = () => {
      if (!engagementChart.value) return

      const ctx = engagementChart.value.getContext('2d')
      
      if (engagementChartInstance) {
        engagementChartInstance.destroy()
      }

      const labels = engagementTrends.value.map(d => d.period)
      
      engagementChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Views',
              data: engagementTrends.value.map(d => d.views),
              borderColor: '#FF0000',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              tension: 0.4
            },
            {
              label: 'Likes',
              data: engagementTrends.value.map(d => d.likes),
              borderColor: '#00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              tension: 0.4
            },
            {
              label: 'Comments',
              data: engagementTrends.value.map(d => d.comments),
              borderColor: '#0099ff',
              backgroundColor: 'rgba(0, 153, 255, 0.1)',
              tension: 0.4
            },
            {
              label: 'Shares',
              data: engagementTrends.value.map(d => d.shares),
              borderColor: '#ff9900',
              backgroundColor: 'rgba(255, 153, 0, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#333'
              },
              ticks: {
                color: '#ccc'
              }
            },
            x: {
              grid: {
                color: '#333'
              },
              ticks: {
                color: '#ccc'
              }
            }
          }
        }
      })
    }

    const updateGrowthChart = () => {
      if (!growthChart.value) return

      const ctx = growthChart.value.getContext('2d')
      
      if (growthChartInstance) {
        growthChartInstance.destroy()
      }

      const labels = growthMetrics.growth_data.map(d => d.period)
      const dataKey = growthChartType.value === 'followers' ? 'new_followers' : 'new_subscribers'
      
      growthChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: growthChartType.value === 'followers' ? 'New Followers' : 'New Subscribers',
            data: growthMetrics.growth_data.map(d => d[dataKey]),
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            borderColor: '#FF0000',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#333'
              },
              ticks: {
                color: '#ccc'
              }
            },
            x: {
              grid: {
                color: '#333'
              },
              ticks: {
                color: '#ccc'
              }
            }
          }
        }
      })
    }

    // Utility functions
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toString()
    }

    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const formatSourceName = (source) => {
      if (!source) return 'Direct'
      return source.charAt(0).toUpperCase() + source.slice(1)
    }

    const getViewsTrend = () => {
      return overview.period_views > 0 ? 'positive' : 'neutral'
    }

    const getViewsTrendIcon = () => {
      return overview.period_views > 0 ? 'fas fa-arrow-up' : 'fas fa-minus'
    }

    // Auto-refresh real-time stats
    let realTimeInterval = null

    const startRealTimeUpdates = () => {
      realTimeInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/analytics/realtime', {
            headers: {
              'Authorization': `Bearer ${authStore.token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            Object.assign(realTimeStats, data)
          }
        } catch (error) {
          console.error('Failed to update real-time stats:', error)
        }
      }, 30000) // Update every 30 seconds
    }

    const stopRealTimeUpdates = () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval)
        realTimeInterval = null
      }
    }

    // Lifecycle
    onMounted(() => {
      loadAnalytics()
      startRealTimeUpdates()
    })

    onUnmounted(() => {
      stopRealTimeUpdates()
      if (engagementChartInstance) {
        engagementChartInstance.destroy()
      }
      if (growthChartInstance) {
        growthChartInstance.destroy()
      }
    })

    return {
      // Reactive state
      loading,
      selectedTimeRange,
      growthChartType,
      
      // Chart refs
      engagementChart,
      growthChart,
      
      // Data
      overview,
      contentPerformance,
      audienceInsights,
      engagementTrends,
      revenueAnalytics,
      growthMetrics,
      topContent,
      audienceDemographics,
      trafficSources,
      realTimeStats,
      
      // Computed
      maxEngagementScore,
      maxAgeCount,
      maxTrafficViews,
      totalTrafficViews,
      
      // Methods
      loadAnalytics,
      refreshData,
      exportData,
      formatNumber,
      formatDuration,
      formatSourceName,
      getViewsTrend,
      getViewsTrendIcon
    }
  }
}
</script>

<style scoped>
.analytics-dashboard {
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.time-range-selector select {
  background: #2a2a2a;
  border: 1px solid #444;
  color: white;
  padding: 10px 15px;
  border-radius: 6px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.realtime-stats {
  display: flex;
  align-items: center;
  gap: 30px;
  background: #2a2a2a;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  color: #00ff00;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ff00;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.realtime-metrics {
  display: flex;
  gap: 30px;
}

.realtime-metric {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #FF0000;
}

.metric-label {
  font-size: 0.9rem;
  color: #ccc;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.metric-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 0, 0, 0.1);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.card-icon.views { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.card-icon.engagement { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.card-icon.followers { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.card-icon.revenue { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.card-icon.watch-time { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
.card-icon.subscribers { background: rgba(230, 126, 34, 0.2); color: #e67e22; }

.card-content h3 {
  margin: 0 0 5px 0;
  font-size: 2rem;
  color: white;
}

.card-content p {
  margin: 0 0 10px 0;
  color: #ccc;
  font-size: 0.9rem;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
}

.card-trend.positive { color: #2ecc71; }
.card-trend.negative { color: #e74c3c; }
.card-trend.neutral { color: #95a5a6; }

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.chart-container {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #FF0000;
}

.chart-legend {
  display: flex;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-item.views .legend-color { background: #FF0000; }
.legend-item.likes .legend-color { background: #00ff00; }
.legend-item.comments .legend-color { background: #0099ff; }
.legend-item.shares .legend-color { background: #ff9900; }

.chart-controls {
  display: flex;
  gap: 10px;
}

.chart-toggle {
  padding: 6px 12px;
  border: 1px solid #444;
  background: transparent;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chart-toggle.active,
.chart-toggle:hover {
  background: #FF0000;
  color: white;
  border-color: #FF0000;
}

.chart-content {
  height: 300px;
  position: relative;
}

.insights-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.insight-panel {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
}

.insight-panel h3 {
  margin: 0 0 20px 0;
  color: #FF0000;
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.content-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #333;
  border-radius: 8px;
}

.content-thumbnail {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}

.content-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.content-info {
  flex: 1;
}

.content-info h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: white;
}

.content-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
  font-size: 0.8rem;
  color: #ccc;
}

.content-engagement {
  display: flex;
  align-items: center;
  gap: 10px;
}

.engagement-bar {
  flex: 1;
  height: 4px;
  background: #444;
  border-radius: 2px;
  overflow: hidden;
}

.engagement-fill {
  height: 100%;
  background: #FF0000;
  transition: width 0.3s ease;
}

.engagement-score {
  font-size: 0.8rem;
  color: #FF0000;
  font-weight: bold;
}

.demographics-section {
  margin-bottom: 25px;
}

.demographics-section h4 {
  margin: 0 0 15px 0;
  color: #ccc;
  font-size: 1rem;
}

.demographic-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demographic-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demographic-label {
  width: 80px;
  font-size: 0.8rem;
  color: #ccc;
}

.demographic-progress {
  flex: 1;
  height: 6px;
  background: #444;
  border-radius: 3px;
  overflow: hidden;
}

.demographic-fill {
  height: 100%;
  background: #FF0000;
  transition: width 0.3s ease;
}

.demographic-value {
  width: 40px;
  text-align: right;
  font-size: 0.8rem;
  color: #FF0000;
  font-weight: bold;
}

.location-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.location-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #333;
  border-radius: 4px;
}

.location-flag {
  font-size: 1.2rem;
}

.location-name {
  flex: 1;
  font-size: 0.9rem;
}

.location-count {
  font-weight: bold;
  color: #FF0000;
}

.traffic-sources {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.traffic-source {
  display: flex;
  align-items: center;
  gap: 15px;
}

.source-info {
  flex: 1;
}

.source-name {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.source-stats {
  font-size: 0.8rem;
  color: #ccc;
}

.source-progress {
  width: 100px;
  height: 6px;
  background: #444;
  border-radius: 3px;
  overflow: hidden;
}

.source-fill {
  height: 100%;
  background: #FF0000;
  transition: width 0.3s ease;
}

.source-percentage {
  width: 40px;
  text-align: right;
  font-weight: bold;
  color: #FF0000;
}

.revenue-section {
  margin-bottom: 40px;
}

.revenue-panel {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
}

.revenue-panel h3 {
  margin: 0 0 20px 0;
  color: #FF0000;
}

.revenue-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.revenue-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #333;
  border-radius: 8px;
}

.revenue-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.revenue-icon.subscriptions { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.revenue-icon.donations { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }

.revenue-info h4 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
  color: white;
}

.revenue-info p {
  margin: 0 0 8px 0;
  color: #ccc;
}

.revenue-detail {
  font-size: 0.8rem;
  color: #999;
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

@media (max-width: 1200px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .insights-section {
    grid-template-columns: 1fr;
  }
  
  .revenue-chart {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .analytics-dashboard {
    padding: 20px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  
  .header-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .realtime-stats {
    flex-direction: column;
    gap: 15px;
  }
  
  .realtime-metrics {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
