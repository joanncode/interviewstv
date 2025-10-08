<template>
  <div class="translation-manager">
    <!-- Header -->
    <div class="manager-header">
      <div class="header-content">
        <h1 class="manager-title">
          <i class="fas fa-language"></i>
          Translation Manager
        </h1>
        <p class="manager-subtitle">
          Manage translations and localization for the platform
        </p>
      </div>
      
      <div class="header-actions">
        <div class="locale-selector">
          <label>Current Locale:</label>
          <select v-model="selectedLocale" @change="loadTranslations">
            <option v-for="locale in availableLocales" :key="locale.code" :value="locale.code">
              {{ locale.flag }} {{ locale.nativeName }}
            </option>
          </select>
        </div>
        
        <button @click="showImportModal = true" class="btn btn-outline">
          <i class="fas fa-upload"></i>
          Import
        </button>
        
        <button @click="exportTranslations" class="btn btn-outline">
          <i class="fas fa-download"></i>
          Export
        </button>
        
        <button @click="showAddKeyModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          Add Key
        </button>
      </div>
    </div>

    <!-- Statistics -->
    <div class="translation-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-key"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.totalKeys }}</h3>
          <p>Total Keys</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.completedKeys }}</h3>
          <p>Completed</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.missingKeys }}</h3>
          <p>Missing</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-percentage"></i>
        </div>
        <div class="stat-content">
          <h3>{{ stats.completionRate }}%</h3>
          <p>Completion Rate</p>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search translation keys..."
          @input="filterTranslations"
        />
      </div>
      
      <div class="filter-controls">
        <select v-model="namespaceFilter" @change="filterTranslations">
          <option value="">All Namespaces</option>
          <option v-for="namespace in namespaces" :key="namespace" :value="namespace">
            {{ namespace }}
          </option>
        </select>
        
        <select v-model="statusFilter" @change="filterTranslations">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="missing">Missing</option>
          <option value="empty">Empty</option>
        </select>
        
        <button @click="showMissingOnly = !showMissingOnly" class="btn btn-sm" :class="{ 'btn-warning': showMissingOnly }">
          <i class="fas fa-exclamation-triangle"></i>
          {{ showMissingOnly ? 'Show All' : 'Missing Only' }}
        </button>
      </div>
    </div>

    <!-- Translation Table -->
    <div class="translations-table">
      <div class="table-header">
        <div class="col-key">Translation Key</div>
        <div class="col-namespace">Namespace</div>
        <div class="col-value">Translation Value</div>
        <div class="col-status">Status</div>
        <div class="col-actions">Actions</div>
      </div>
      
      <div 
        v-for="translation in filteredTranslations" 
        :key="translation.key"
        class="table-row"
        :class="{ 
          'missing': !translation.value,
          'empty': translation.value === '',
          'editing': editingKey === translation.key
        }"
      >
        <div class="col-key">
          <code>{{ translation.key }}</code>
        </div>
        
        <div class="col-namespace">
          <span class="namespace-badge">{{ translation.namespace }}</span>
        </div>
        
        <div class="col-value">
          <div v-if="editingKey === translation.key" class="edit-form">
            <textarea 
              v-model="editingValue"
              @keydown.ctrl.enter="saveTranslation"
              @keydown.esc="cancelEdit"
              placeholder="Enter translation..."
              rows="3"
            ></textarea>
            <div class="edit-actions">
              <button @click="saveTranslation" class="btn btn-sm btn-success">
                <i class="fas fa-check"></i>
                Save
              </button>
              <button @click="cancelEdit" class="btn btn-sm btn-outline">
                <i class="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </div>
          
          <div v-else class="translation-value">
            <span v-if="translation.value" class="value-text">{{ translation.value }}</span>
            <span v-else class="missing-text">No translation</span>
          </div>
        </div>
        
        <div class="col-status">
          <span 
            class="status-badge" 
            :class="{
              'completed': translation.value && translation.value.trim(),
              'missing': !translation.value,
              'empty': translation.value === ''
            }"
          >
            {{ getTranslationStatus(translation) }}
          </span>
        </div>
        
        <div class="col-actions">
          <button 
            v-if="editingKey !== translation.key"
            @click="startEdit(translation)" 
            class="btn btn-sm btn-outline"
          >
            <i class="fas fa-edit"></i>
            Edit
          </button>
          
          <button 
            @click="deleteTranslation(translation)" 
            class="btn btn-sm btn-danger"
          >
            <i class="fas fa-trash"></i>
            Delete
          </button>
        </div>
      </div>
      
      <div v-if="filteredTranslations.length === 0" class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No translations found</h3>
        <p>Try adjusting your search or filter criteria</p>
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

    <!-- Add Key Modal -->
    <div v-if="showAddKeyModal" class="modal-overlay" @click="showAddKeyModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add Translation Key</h3>
          <button @click="showAddKeyModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form @submit.prevent="addTranslationKey" class="add-key-form">
          <div class="form-group">
            <label>Translation Key</label>
            <input 
              v-model="newKey.key" 
              type="text" 
              required 
              placeholder="e.g., common.buttons.save"
            />
          </div>
          
          <div class="form-group">
            <label>Namespace</label>
            <input 
              v-model="newKey.namespace" 
              type="text" 
              placeholder="default"
            />
          </div>
          
          <div class="form-group">
            <label>Translation Value</label>
            <textarea 
              v-model="newKey.value" 
              placeholder="Enter translation value..."
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddKeyModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!newKey.key">
              Add Translation
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Import Translations</h3>
          <button @click="showImportModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="import-form">
          <div class="form-group">
            <label>Import Format</label>
            <select v-model="importFormat">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Target Locale</label>
            <select v-model="importLocale">
              <option v-for="locale in availableLocales" :key="locale.code" :value="locale.code">
                {{ locale.flag }} {{ locale.nativeName }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>File Upload</label>
            <div class="file-upload">
              <input 
                ref="fileInput"
                type="file" 
                @change="handleFileUpload"
                :accept="getFileAccept()"
                hidden
              />
              <button @click="$refs.fileInput.click()" class="btn btn-outline">
                <i class="fas fa-upload"></i>
                Choose File
              </button>
              <span v-if="importFile" class="file-name">{{ importFile.name }}</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button @click="showImportModal = false" class="btn btn-outline">
              Cancel
            </button>
            <button @click="importTranslations" class="btn btn-primary" :disabled="!importFile || importing">
              <i v-if="importing" class="fas fa-spinner fa-spin"></i>
              {{ importing ? 'Importing...' : 'Import' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading translations...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

export default {
  name: 'TranslationManager',
  setup() {
    const { availableLocales } = useI18n()
    const authStore = useAuthStore()
    const notificationStore = useNotificationStore()

    // Reactive state
    const loading = ref(false)
    const importing = ref(false)
    const selectedLocale = ref('en')
    const translations = ref([])
    const filteredTranslations = ref([])
    const searchQuery = ref('')
    const namespaceFilter = ref('')
    const statusFilter = ref('')
    const showMissingOnly = ref(false)
    const currentPage = ref(1)
    const itemsPerPage = ref(50)
    
    // Editing state
    const editingKey = ref(null)
    const editingValue = ref('')
    
    // Modal state
    const showAddKeyModal = ref(false)
    const showImportModal = ref(false)
    
    // Form data
    const newKey = reactive({
      key: '',
      namespace: 'default',
      value: ''
    })
    
    const importFormat = ref('json')
    const importLocale = ref('en')
    const importFile = ref(null)

    // Statistics
    const stats = reactive({
      totalKeys: 0,
      completedKeys: 0,
      missingKeys: 0,
      completionRate: 0
    })

    // Computed properties
    const namespaces = computed(() => {
      const ns = new Set()
      translations.value.forEach(t => ns.add(t.namespace))
      return Array.from(ns).sort()
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredTranslations.value.length / itemsPerPage.value)
    })

    const paginatedTranslations = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredTranslations.value.slice(start, end)
    })

    // Methods
    const loadTranslations = async () => {
      loading.value = true
      
      try {
        const response = await fetch(`/api/admin/translations/${selectedLocale.value}`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load translations')
        }

        const data = await response.json()
        translations.value = data.translations || []
        
        // Update statistics
        updateStats()
        
        // Apply current filters
        filterTranslations()

      } catch (error) {
        console.error('Failed to load translations:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to load translations'
        })
      } finally {
        loading.value = false
      }
    }

    const updateStats = () => {
      stats.totalKeys = translations.value.length
      stats.completedKeys = translations.value.filter(t => t.value && t.value.trim()).length
      stats.missingKeys = translations.value.filter(t => !t.value || !t.value.trim()).length
      stats.completionRate = stats.totalKeys > 0 ? 
        Math.round((stats.completedKeys / stats.totalKeys) * 100) : 0
    }

    const filterTranslations = () => {
      let filtered = translations.value

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(t => 
          t.key.toLowerCase().includes(query) ||
          (t.value && t.value.toLowerCase().includes(query))
        )
      }

      // Namespace filter
      if (namespaceFilter.value) {
        filtered = filtered.filter(t => t.namespace === namespaceFilter.value)
      }

      // Status filter
      if (statusFilter.value) {
        filtered = filtered.filter(t => {
          switch (statusFilter.value) {
            case 'completed':
              return t.value && t.value.trim()
            case 'missing':
              return !t.value
            case 'empty':
              return t.value === ''
            default:
              return true
          }
        })
      }

      // Missing only filter
      if (showMissingOnly.value) {
        filtered = filtered.filter(t => !t.value || !t.value.trim())
      }

      filteredTranslations.value = filtered
      currentPage.value = 1
    }

    const startEdit = (translation) => {
      editingKey.value = translation.key
      editingValue.value = translation.value || ''
    }

    const cancelEdit = () => {
      editingKey.value = null
      editingValue.value = ''
    }

    const saveTranslation = async () => {
      try {
        const response = await fetch('/api/admin/translations', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            key: editingKey.value,
            value: editingValue.value,
            locale: selectedLocale.value
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save translation')
        }

        // Update local data
        const translation = translations.value.find(t => t.key === editingKey.value)
        if (translation) {
          translation.value = editingValue.value
        }

        updateStats()
        filterTranslations()
        cancelEdit()

        notificationStore.addNotification({
          type: 'success',
          message: 'Translation saved successfully'
        })

      } catch (error) {
        console.error('Failed to save translation:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to save translation'
        })
      }
    }

    const deleteTranslation = async (translation) => {
      if (!confirm(`Are you sure you want to delete the translation key "${translation.key}"?`)) {
        return
      }

      try {
        const response = await fetch('/api/admin/translations', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            key: translation.key,
            locale: selectedLocale.value
          })
        })

        if (!response.ok) {
          throw new Error('Failed to delete translation')
        }

        // Remove from local data
        const index = translations.value.findIndex(t => t.key === translation.key)
        if (index !== -1) {
          translations.value.splice(index, 1)
        }

        updateStats()
        filterTranslations()

        notificationStore.addNotification({
          type: 'success',
          message: 'Translation deleted successfully'
        })

      } catch (error) {
        console.error('Failed to delete translation:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to delete translation'
        })
      }
    }

    const addTranslationKey = async () => {
      try {
        const response = await fetch('/api/admin/translations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.token}`
          },
          body: JSON.stringify({
            key: newKey.key,
            value: newKey.value,
            locale: selectedLocale.value,
            namespace: newKey.namespace || 'default'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to add translation')
        }

        // Add to local data
        translations.value.push({
          key: newKey.key,
          value: newKey.value,
          namespace: newKey.namespace || 'default'
        })

        updateStats()
        filterTranslations()

        // Reset form
        newKey.key = ''
        newKey.value = ''
        newKey.namespace = 'default'
        showAddKeyModal.value = false

        notificationStore.addNotification({
          type: 'success',
          message: 'Translation added successfully'
        })

      } catch (error) {
        console.error('Failed to add translation:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to add translation'
        })
      }
    }

    const exportTranslations = async () => {
      try {
        const response = await fetch(`/api/admin/translations/${selectedLocale.value}/export`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to export translations')
        }

        const data = await response.json()
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        })
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `translations-${selectedLocale.value}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        notificationStore.addNotification({
          type: 'success',
          message: 'Translations exported successfully'
        })

      } catch (error) {
        console.error('Failed to export translations:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to export translations'
        })
      }
    }

    const handleFileUpload = (event) => {
      const file = event.target.files[0]
      if (file) {
        importFile.value = file
      }
    }

    const importTranslations = async () => {
      if (!importFile.value) return

      importing.value = true

      try {
        const formData = new FormData()
        formData.append('file', importFile.value)
        formData.append('locale', importLocale.value)
        formData.append('format', importFormat.value)

        const response = await fetch('/api/admin/translations/import', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error('Failed to import translations')
        }

        const result = await response.json()

        // Reload translations if importing for current locale
        if (importLocale.value === selectedLocale.value) {
          await loadTranslations()
        }

        showImportModal.value = false
        importFile.value = null

        notificationStore.addNotification({
          type: 'success',
          message: `Successfully imported ${result.imported} translations`
        })

      } catch (error) {
        console.error('Failed to import translations:', error)
        notificationStore.addNotification({
          type: 'error',
          message: 'Failed to import translations'
        })
      } finally {
        importing.value = false
      }
    }

    // Utility functions
    const getTranslationStatus = (translation) => {
      if (!translation.value) return 'Missing'
      if (translation.value === '') return 'Empty'
      return 'Completed'
    }

    const getFileAccept = () => {
      switch (importFormat.value) {
        case 'json':
          return '.json'
        case 'csv':
          return '.csv'
        case 'xlsx':
          return '.xlsx'
        default:
          return '*'
      }
    }

    // Lifecycle
    onMounted(() => {
      loadTranslations()
    })

    return {
      // Reactive state
      loading,
      importing,
      selectedLocale,
      translations: paginatedTranslations,
      filteredTranslations,
      searchQuery,
      namespaceFilter,
      statusFilter,
      showMissingOnly,
      currentPage,
      totalPages,
      
      // Editing state
      editingKey,
      editingValue,
      
      // Modal state
      showAddKeyModal,
      showImportModal,
      
      // Form data
      newKey,
      importFormat,
      importLocale,
      importFile,
      
      // Computed
      availableLocales,
      namespaces,
      stats,
      
      // Methods
      loadTranslations,
      filterTranslations,
      startEdit,
      cancelEdit,
      saveTranslation,
      deleteTranslation,
      addTranslationKey,
      exportTranslations,
      handleFileUpload,
      importTranslations,
      getTranslationStatus,
      getFileAccept
    }
  }
}
</script>

<style scoped>
.translation-manager {
  background: #1a1a1a;
  color: white;
  min-height: 100vh;
  padding: 30px;
}

.manager-header {
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

.manager-subtitle {
  color: #ccc;
  margin: 0;
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.locale-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.locale-selector label {
  color: #ccc;
  font-weight: bold;
}

.locale-selector select {
  background: #2a2a2a;
  border: 1px solid #444;
  color: white;
  padding: 8px 12px;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.translation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 12px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #ccc;
}

.search-box input {
  width: 100%;
  padding: 12px 15px 12px 45px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #333;
  color: white;
  font-size: 1rem;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.filter-controls select {
  background: #333;
  border: 1px solid #444;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
}

.translations-table {
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 30px;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr 1fr;
  padding: 15px;
  border-bottom: 1px solid #333;
}

.table-header {
  background: #333;
  font-weight: bold;
  color: #ccc;
}

.table-row:hover {
  background: #333;
}

.table-row.missing {
  border-left: 4px solid #dc3545;
}

.table-row.empty {
  border-left: 4px solid #ffc107;
}

.table-row.editing {
  background: #333;
}

.col-key code {
  background: #444;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #FF0000;
}

.namespace-badge {
  background: rgba(255, 0, 0, 0.2);
  color: #FF0000;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-form textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #333;
  color: white;
  resize: vertical;
}

.edit-actions {
  display: flex;
  gap: 10px;
}

.translation-value .value-text {
  color: white;
}

.translation-value .missing-text {
  color: #dc3545;
  font-style: italic;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.completed {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.status-badge.missing {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.status-badge.empty {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #ccc;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 20px;
  color: #666;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.page-info {
  color: #ccc;
  font-weight: bold;
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

.add-key-form,
.import-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
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

.file-upload {
  display: flex;
  align-items: center;
  gap: 15px;
}

.file-name {
  color: #ccc;
  font-style: italic;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #333;
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
  .translation-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-section {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .filter-controls {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .translation-manager {
    padding: 20px;
  }
  
  .manager-header {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .translation-stats {
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
</style>
