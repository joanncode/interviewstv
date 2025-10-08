<template>
  <div class="monetization-dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">
          <i class="fas fa-dollar-sign"></i>
          Monetization Dashboard
        </h1>
        <p class="dashboard-subtitle">
          Manage your earnings, subscriptions, and paid content
        </p>
      </div>
      
      <div class="header-actions">
        <button @click="showCreatePlanModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          Create Plan
        </button>
        <button @click="showCreateContentModal = true" class="btn btn-outline">
          <i class="fas fa-file-plus"></i>
          Add Paid Content
        </button>
        <button @click="requestPayout" class="btn btn-success" :disabled="!canRequestPayout">
          <i class="fas fa-money-bill-wave"></i>
          Request Payout
        </button>
      </div>
    </div>

    <!-- Earnings Overview -->
    <div class="earnings-overview">
      <div class="earnings-card total">
        <div class="card-icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(earnings.total_earnings) }}</h3>
          <p>Total Earnings</p>
          <div class="card-trend positive">
            <i class="fas fa-arrow-up"></i>
            <span>+{{ earnings.subscription_count }} subscribers</span>
          </div>
        </div>
      </div>

      <div class="earnings-card subscriptions">
        <div class="card-icon">
          <i class="fas fa-crown"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(earnings.subscription_earnings) }}</h3>
          <p>Subscription Revenue</p>
          <div class="card-detail">
            {{ earnings.subscription_count }} active subscriptions
          </div>
        </div>
      </div>

      <div class="earnings-card tips">
        <div class="card-icon">
          <i class="fas fa-heart"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(earnings.tip_earnings) }}</h3>
          <p>Tips & Donations</p>
          <div class="card-detail">
            {{ earnings.tip_count }} tips • ${{ earnings.avg_tip_amount }} avg
          </div>
        </div>
      </div>

      <div class="earnings-card content">
        <div class="card-icon">
          <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(earnings.content_earnings) }}</h3>
          <p>Content Sales</p>
          <div class="card-detail">
            {{ earnings.content_sales }} purchases
          </div>
        </div>
      </div>

      <div class="earnings-card pending">
        <div class="card-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div class="card-content">
          <h3>${{ formatNumber(earnings.pending_payout) }}</h3>
          <p>Pending Payout</p>
          <div class="card-detail">
            Available for withdrawal
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Plans Management -->
    <div class="section-container">
      <div class="section-header">
        <h2>Subscription Plans</h2>
        <button @click="showCreatePlanModal = true" class="btn btn-sm btn-primary">
          <i class="fas fa-plus"></i>
          Add Plan
        </button>
      </div>
      
      <div class="plans-grid">
        <div 
          v-for="plan in subscriptionPlans" 
          :key="plan.id"
          class="plan-card"
          :class="{ inactive: !plan.is_active }"
        >
          <div class="plan-header">
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="currency">$</span>
              <span class="amount">{{ plan.price }}</span>
              <span class="interval">/{{ plan.billing_interval }}</span>
            </div>
          </div>
          
          <div class="plan-description">
            {{ plan.description }}
          </div>
          
          <div class="plan-features">
            <div 
              v-for="feature in plan.features" 
              :key="feature"
              class="feature-item"
            >
              <i class="fas fa-check"></i>
              <span>{{ formatFeatureName(feature) }}</span>
            </div>
          </div>
          
          <div class="plan-stats">
            <div class="stat">
              <span class="stat-value">{{ plan.subscriber_count || 0 }}</span>
              <span class="stat-label">Subscribers</span>
            </div>
            <div class="stat">
              <span class="stat-value">${{ formatNumber(plan.monthly_revenue || 0) }}</span>
              <span class="stat-label">Monthly Revenue</span>
            </div>
          </div>
          
          <div class="plan-actions">
            <button @click="editPlan(plan)" class="btn btn-sm btn-outline">
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <button 
              @click="togglePlanStatus(plan)" 
              class="btn btn-sm"
              :class="plan.is_active ? 'btn-warning' : 'btn-success'"
            >
              <i :class="plan.is_active ? 'fas fa-pause' : 'fas fa-play'"></i>
              {{ plan.is_active ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Paid Content Management -->
    <div class="section-container">
      <div class="section-header">
        <h2>Paid Content</h2>
        <button @click="showCreateContentModal = true" class="btn btn-sm btn-primary">
          <i class="fas fa-plus"></i>
          Add Content
        </button>
      </div>
      
      <div class="content-table">
        <div class="table-header">
          <div class="col-title">Content</div>
          <div class="col-type">Type</div>
          <div class="col-price">Price</div>
          <div class="col-sales">Sales</div>
          <div class="col-revenue">Revenue</div>
          <div class="col-actions">Actions</div>
        </div>
        
        <div 
          v-for="content in paidContent" 
          :key="content.id"
          class="table-row"
          :class="{ inactive: !content.is_active }"
        >
          <div class="col-title">
            <div class="content-info">
              <img 
                :src="content.thumbnail_url || '/default-thumbnail.jpg'" 
                :alt="content.title"
                class="content-thumbnail"
              />
              <div class="content-details">
                <h4>{{ content.title }}</h4>
                <p>{{ content.description }}</p>
              </div>
            </div>
          </div>
          <div class="col-type">
            <span class="content-type-badge" :class="content.content_type">
              {{ formatContentType(content.content_type) }}
            </span>
          </div>
          <div class="col-price">
            ${{ content.price }}
          </div>
          <div class="col-sales">
            {{ content.purchase_count || 0 }}
          </div>
          <div class="col-revenue">
            ${{ formatNumber((content.purchase_count || 0) * content.price) }}
          </div>
          <div class="col-actions">
            <button @click="editContent(content)" class="btn btn-sm btn-outline">
              <i class="fas fa-edit"></i>
            </button>
            <button 
              @click="toggleContentStatus(content)" 
              class="btn btn-sm"
              :class="content.is_active ? 'btn-warning' : 'btn-success'"
            >
              <i :class="content.is_active ? 'fas fa-pause' : 'fas fa-play'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section-container">
      <div class="section-header">
        <h2>Recent Transactions</h2>
        <button @click="exportTransactions" class="btn btn-sm btn-outline">
          <i class="fas fa-download"></i>
          Export
        </button>
      </div>
      
      <div class="transactions-table">
        <div class="table-header">
          <div class="col-date">Date</div>
          <div class="col-type">Type</div>
          <div class="col-amount">Amount</div>
          <div class="col-from">From</div>
          <div class="col-status">Status</div>
        </div>
        
        <div 
          v-for="transaction in recentTransactions" 
          :key="transaction.id"
          class="table-row"
        >
          <div class="col-date">
            {{ formatDate(transaction.created_at) }}
          </div>
          <div class="col-type">
            <span class="transaction-type" :class="transaction.type">
              {{ formatTransactionType(transaction.type) }}
            </span>
          </div>
          <div class="col-amount">
            <span class="amount-total">${{ transaction.amount }}</span>
            <span class="amount-creator">${{ transaction.creator_amount }}</span>
          </div>
          <div class="col-from">
            {{ transaction.user_name || 'Anonymous' }}
          </div>
          <div class="col-status">
            <span class="status-badge" :class="transaction.status">
              {{ transaction.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Payout History -->
    <div class="section-container">
      <div class="section-header">
        <h2>Payout History</h2>
      </div>
      
      <div class="payouts-list">
        <div 
          v-for="payout in payoutHistory" 
          :key="payout.id"
          class="payout-item"
        >
          <div class="payout-info">
            <div class="payout-amount">${{ payout.amount }}</div>
            <div class="payout-date">{{ formatDate(payout.created_at) }}</div>
          </div>
          <div class="payout-method">
            <i :class="getPayoutMethodIcon(payout.method)"></i>
            {{ formatPayoutMethod(payout.method) }}
          </div>
          <div class="payout-status">
            <span class="status-badge" :class="payout.status">
              {{ payout.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Plan Modal -->
    <div v-if="showCreatePlanModal" class="modal-overlay" @click="showCreatePlanModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create Subscription Plan</h3>
          <button @click="showCreatePlanModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form @submit.prevent="createPlan" class="plan-form">
          <div class="form-group">
            <label>Plan Name</label>
            <input 
              v-model="newPlan.name" 
              type="text" 
              required 
              placeholder="e.g., Premium Access"
            />
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newPlan.description" 
              placeholder="Describe what subscribers get..."
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Price</label>
              <input 
                v-model="newPlan.price" 
                type="number" 
                step="0.01" 
                min="0.99" 
                required 
              />
            </div>
            
            <div class="form-group">
              <label>Billing Interval</label>
              <select v-model="newPlan.billing_interval">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Features</label>
            <div class="features-selector">
              <div 
                v-for="feature in availableFeatures" 
                :key="feature.id"
                class="feature-option"
              >
                <input 
                  :id="feature.id"
                  v-model="newPlan.features" 
                  :value="feature.id"
                  type="checkbox" 
                />
                <label :for="feature.id">{{ feature.name }}</label>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCreatePlanModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="creatingPlan">
              <i v-if="creatingPlan" class="fas fa-spinner fa-spin"></i>
              {{ creatingPlan ? 'Creating...' : 'Create Plan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Content Modal -->
    <div v-if="showCreateContentModal" class="modal-overlay" @click="showCreateContentModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add Paid Content</h3>
          <button @click="showCreateContentModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form @submit.prevent="createContent" class="content-form">
          <div class="form-group">
            <label>Title</label>
            <input 
              v-model="newContent.title" 
              type="text" 
              required 
              placeholder="Content title..."
            />
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newContent.description" 
              placeholder="Describe your content..."
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Content Type</label>
              <select v-model="newContent.content_type" required>
                <option value="">Select type...</option>
                <option value="interview">Interview</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document</option>
                <option value="course">Course</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Price</label>
              <input 
                v-model="newContent.price" 
                type="number" 
                step="0.01" 
                min="0.99" 
                required 
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Preview Content</label>
            <textarea 
              v-model="newContent.preview_content" 
              placeholder="Free preview that users can see..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Full Content</label>
            <textarea 
              v-model="newContent.full_content" 
              placeholder="Full paid content..."
              required
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showCreateContentModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="creatingContent">
              <i v-if="creatingContent" class="fas fa-spinner fa-spin"></i>
              {{ creatingContent ? 'Creating...' : 'Create Content' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading monetization data...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'MonetizationDashboard',
  setup() {
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const loading = ref(false)
    const showCreatePlanModal = ref(false)
    const showCreateContentModal = ref(false)
    const creatingPlan = ref(false)
    const creatingContent = ref(false)

    // Data
    const earnings = reactive({
      total_earnings: 0,
      subscription_earnings: 0,
      tip_earnings: 0,
      content_earnings: 0,
      pending_payout: 0,
      subscription_count: 0,
      tip_count: 0,
      content_sales: 0,
      avg_tip_amount: 0
    })

    const subscriptionPlans = ref([])
    const paidContent = ref([])
    const recentTransactions = ref([])
    const payoutHistory = ref([])

    // Form data
    const newPlan = reactive({
      name: '',
      description: '',
      price: 9.99,
      billing_interval: 'monthly',
      features: []
    })

    const newContent = reactive({
      title: '',
      description: '',
      content_type: '',
      price: 4.99,
      preview_content: '',
      full_content: ''
    })

    const availableFeatures = [
      { id: 'ad_free', name: 'Ad-free Experience' },
      { id: 'early_access', name: 'Early Access to Content' },
      { id: 'exclusive_content', name: 'Exclusive Content' },
      { id: 'direct_messaging', name: 'Direct Messaging' },
      { id: 'priority_support', name: 'Priority Support' },
      { id: 'custom_badges', name: 'Custom Badges' },
      { id: 'live_chat', name: 'Live Chat Access' },
      { id: 'downloads', name: 'Content Downloads' }
    ]

    // Computed properties
    const canRequestPayout = computed(() => {
      return earnings.pending_payout >= 50.00
    })

    // Methods
    const loadMonetizationData = async () => {
      loading.value = true
      
      try {
        const [earningsRes, plansRes, contentRes, transactionsRes, payoutsRes] = await Promise.all([
          fetch('/api/monetization/earnings', {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }),
          fetch('/api/monetization/plans', {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }),
          fetch('/api/monetization/content', {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }),
          fetch('/api/monetization/transactions?limit=20', {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          }),
          fetch('/api/monetization/payouts', {
            headers: { 'Authorization': `Bearer ${authStore.token}` }
          })
        ])

        if (earningsRes.ok) {
          const earningsData = await earningsRes.json()
          Object.assign(earnings, earningsData)
        }

        if (plansRes.ok) {
          subscriptionPlans.value = await plansRes.json()
        }

        if (contentRes.ok) {
          paidContent.value = await contentRes.json()
        }

        if (transactionsRes.ok) {
          recentTransactions.value = await transactionsRes.json()
        }

        if (payoutsRes.ok) {
          payoutHistory.value = await payoutsRes.json()
        }

      } catch (error) {
        console.error('Failed to load monetization data:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load monetization data'
        })
      } finally {
        loading.value = false
      }
    }

    const createPlan = async () => {
      creatingPlan.value = true
      
      try {
        const response = await fetch('/api/monetization/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(newPlan)
        })

        if (!response.ok) {
          throw new Error('Failed to create plan')
        }

        const plan = await response.json()
        subscriptionPlans.value.push(plan)
        
        // Reset form
        Object.assign(newPlan, {
          name: '',
          description: '',
          price: 9.99,
          billing_interval: 'monthly',
          features: []
        })
        
        showCreatePlanModal.value = false
        
        notificationStore.addNotification({
          type: 'success',
          message: 'Subscription plan created successfully'
        })

      } catch (error) {
        console.error('Failed to create plan:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to create subscription plan'
        })
      } finally {
        creatingPlan.value = false
      }
    }

    const createContent = async () => {
      creatingContent.value = true
      
      try {
        const response = await fetch('/api/monetization/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify(newContent)
        })

        if (!response.ok) {
          throw new Error('Failed to create content')
        }

        const content = await response.json()
        paidContent.value.push(content)
        
        // Reset form
        Object.assign(newContent, {
          title: '',
          description: '',
          content_type: '',
          price: 4.99,
          preview_content: '',
          full_content: ''
        })
        
        showCreateContentModal.value = false
        
        notificationStore.addNotification({
          type: 'success',
          message: 'Paid content created successfully'
        })

      } catch (error) {
        console.error('Failed to create content:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to create paid content'
        })
      } finally {
        creatingContent.value = false
      }
    }

    const requestPayout = async () => {
      try {
        const response = await fetch('/api/monetization/payout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            amount: earnings.pending_payout
          })
        })

        if (!response.ok) {
          throw new Error('Failed to request payout')
        }

        const payout = await response.json()
        payoutHistory.value.unshift(payout)
        earnings.pending_payout = 0
        
        notificationStore.addNotification({
          type: 'success',
          message: 'Payout requested successfully'
        })

      } catch (error) {
        console.error('Failed to request payout:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to request payout'
        })
      }
    }

    const togglePlanStatus = async (plan) => {
      try {
        const response = await fetch(`/api/monetization/plans/${plan.id}/toggle`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to toggle plan status')
        }

        plan.is_active = !plan.is_active
        
        notificationStore.addNotification({
          type: 'success',
          message: `Plan ${plan.is_active ? 'activated' : 'deactivated'} successfully`
        })

      } catch (error) {
        console.error('Failed to toggle plan status:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to update plan status'
        })
      }
    }

    const toggleContentStatus = async (content) => {
      try {
        const response = await fetch(`/api/monetization/content/${content.id}/toggle`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to toggle content status')
        }

        content.is_active = !content.is_active
        
        notificationStore.addNotification({
          type: 'success',
          message: `Content ${content.is_active ? 'activated' : 'deactivated'} successfully`
        })

      } catch (error) {
        console.error('Failed to toggle content status:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to update content status'
        })
      }
    }

    const editPlan = (plan) => {
      // Implementation for editing plan
      console.log('Edit plan:', plan)
    }

    const editContent = (content) => {
      // Implementation for editing content
      console.log('Edit content:', content)
    }

    const exportTransactions = () => {
      const csvContent = [
        ['Date', 'Type', 'Amount', 'Creator Amount', 'From', 'Status'],
        ...recentTransactions.value.map(t => [
          formatDate(t.created_at),
          t.type,
          t.amount,
          t.creator_amount,
          t.user_name || 'Anonymous',
          t.status
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    // Utility functions
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toFixed(2)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const formatFeatureName = (feature) => {
      return feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatContentType = (type) => {
      return type.charAt(0).toUpperCase() + type.slice(1)
    }

    const formatTransactionType = (type) => {
      const types = {
        subscription: 'Subscription',
        tip: 'Tip',
        content_purchase: 'Content Purchase',
        donation: 'Donation'
      }
      return types[type] || type
    }

    const formatPayoutMethod = (method) => {
      const methods = {
        stripe: 'Stripe',
        paypal: 'PayPal',
        bank_transfer: 'Bank Transfer'
      }
      return methods[method] || method
    }

    const getPayoutMethodIcon = (method) => {
      const icons = {
        stripe: 'fab fa-stripe',
        paypal: 'fab fa-paypal',
        bank_transfer: 'fas fa-university'
      }
      return icons[method] || 'fas fa-credit-card'
    }

    // Lifecycle
    onMounted(() => {
      loadMonetizationData()
    })

    return {
      // Reactive state
      loading,
      showCreatePlanModal,
      showCreateContentModal,
      creatingPlan,
      creatingContent,
      
      // Data
      earnings,
      subscriptionPlans,
      paidContent,
      recentTransactions,
      payoutHistory,
      
      // Form data
      newPlan,
      newContent,
      availableFeatures,
      
      // Computed
      canRequestPayout,
      
      // Methods
      loadMonetizationData,
      createPlan,
      createContent,
      requestPayout,
      togglePlanStatus,
      toggleContentStatus,
      editPlan,
      editContent,
      exportTransactions,
      formatNumber,
      formatDate,
      formatFeatureName,
      formatContentType,
      formatTransactionType,
      formatPayoutMethod,
      getPayoutMethodIcon
    }
  }
}
</script>

<style scoped>
.monetization-dashboard {
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
  gap: 15px;
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

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.earnings-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.earnings-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.earnings-card:hover {
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

.earnings-card.total .card-icon { background: rgba(255, 0, 0, 0.2); color: #FF0000; }
.earnings-card.subscriptions .card-icon { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.earnings-card.tips .card-icon { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.earnings-card.content .card-icon { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.earnings-card.pending .card-icon { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }

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
  color: #2ecc71;
}

.card-detail {
  font-size: 0.8rem;
  color: #999;
}

.section-container {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #FF0000;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.plan-card {
  background: #333;
  border-radius: 8px;
  padding: 20px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.plan-card:hover {
  border-color: #FF0000;
}

.plan-card.inactive {
  opacity: 0.6;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.plan-header h3 {
  margin: 0;
  color: white;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.currency {
  font-size: 1rem;
  color: #ccc;
}

.amount {
  font-size: 1.5rem;
  font-weight: bold;
  color: #FF0000;
}

.interval {
  font-size: 0.9rem;
  color: #ccc;
}

.plan-description {
  color: #ccc;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.plan-features {
  margin-bottom: 15px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.feature-item i {
  color: #2ecc71;
  font-size: 0.8rem;
}

.plan-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px 0;
  border-top: 1px solid #444;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-weight: bold;
  color: #FF0000;
}

.stat-label {
  font-size: 0.8rem;
  color: #ccc;
}

.plan-actions {
  display: flex;
  gap: 10px;
}

.content-table,
.transactions-table {
  background: #333;
  border-radius: 8px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  padding: 15px;
  border-bottom: 1px solid #444;
}

.table-header {
  background: #444;
  font-weight: bold;
  color: #ccc;
}

.table-row:hover {
  background: #3a3a3a;
}

.table-row.inactive {
  opacity: 0.6;
}

.content-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.content-thumbnail {
  width: 40px;
  height: 30px;
  border-radius: 4px;
  object-fit: cover;
}

.content-details h4 {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  color: white;
}

.content-details p {
  margin: 0;
  font-size: 0.8rem;
  color: #ccc;
}

.content-type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.content-type-badge.interview { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.content-type-badge.video { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.content-type-badge.audio { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
.content-type-badge.document { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.content-type-badge.course { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }

.transactions-table .table-header,
.transactions-table .table-row {
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
}

.transaction-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.transaction-type.subscription { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.transaction-type.tip { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.transaction-type.content_purchase { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.transaction-type.donation { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }

.amount-total {
  display: block;
  font-weight: bold;
}

.amount-creator {
  display: block;
  font-size: 0.8rem;
  color: #2ecc71;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.completed { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
.status-badge.pending { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
.status-badge.failed { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
.status-badge.processing { background: rgba(52, 152, 219, 0.2); color: #3498db; }
.status-badge.active { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }

.payouts-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.payout-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #333;
  border-radius: 8px;
}

.payout-info {
  display: flex;
  flex-direction: column;
}

.payout-amount {
  font-weight: bold;
  font-size: 1.1rem;
  color: #FF0000;
}

.payout-date {
  font-size: 0.9rem;
  color: #ccc;
}

.payout-method {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #444;
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

.plan-form,
.content-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #ccc;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #333;
  color: white;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.features-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.feature-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-option input[type="checkbox"] {
  width: auto;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #444;
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
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .table-header > div,
  .table-row > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .table-header > div::before,
  .table-row > div::before {
    content: attr(data-label);
    font-weight: bold;
    color: #ccc;
  }
}

@media (max-width: 768px) {
  .monetization-dashboard {
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
  }
  
  .earnings-overview {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .features-selector {
    grid-template-columns: 1fr;
  }
}
</style>
