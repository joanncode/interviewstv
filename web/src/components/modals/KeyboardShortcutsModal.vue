<template>
  <div v-if="isVisible" class="shortcuts-modal-overlay" @click="closeModal">
    <div class="shortcuts-modal" @click.stop>
      <div class="shortcuts-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-btn" @click="closeModal" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="shortcuts-content">
        <div class="shortcuts-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search shortcuts..."
            class="search-input"
            @keydown.esc="closeModal"
          />
        </div>
        
        <div class="shortcuts-categories">
          <div
            v-for="(shortcuts, category) in filteredShortcuts"
            :key="category"
            class="shortcuts-category"
          >
            <h3 class="category-title">{{ formatCategoryName(category) }}</h3>
            <div class="shortcuts-list">
              <div
                v-for="shortcut in shortcuts"
                :key="shortcut.key"
                class="shortcut-item"
                :class="{ disabled: !shortcut.enabled }"
              >
                <div class="shortcut-keys">
                  <kbd
                    v-for="key in formatShortcutKey(shortcut.key)"
                    :key="key"
                    class="key"
                  >
                    {{ key }}
                  </kbd>
                </div>
                <div class="shortcut-description">
                  {{ shortcut.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="Object.keys(filteredShortcuts).length === 0" class="no-results">
          <i class="fas fa-search"></i>
          <p>No shortcuts found matching "{{ searchQuery }}"</p>
        </div>
      </div>
      
      <div class="shortcuts-footer">
        <div class="shortcuts-toggle">
          <label class="toggle-label">
            <input
              v-model="shortcutsEnabled"
              type="checkbox"
              class="toggle-input"
              @change="toggleShortcuts"
            />
            <span class="toggle-slider"></span>
            Enable keyboard shortcuts
          </label>
        </div>
        
        <div class="shortcuts-tips">
          <p><strong>Tips:</strong></p>
          <ul>
            <li>Use <kbd>Ctrl</kbd> + <kbd>/</kbd> to open this dialog anytime</li>
            <li>Vim-style shortcuts work without modifiers (e.g., <kbd>g</kbd><kbd>h</kbd> for home)</li>
            <li>Shortcuts are disabled when typing in form fields</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import keyboardShortcuts from '@/utils/keyboard-shortcuts'

export default {
  name: 'KeyboardShortcutsModal',
  setup() {
    const isVisible = ref(false)
    const searchQuery = ref('')
    const shortcutsEnabled = ref(true)
    
    const allShortcuts = computed(() => {
      return keyboardShortcuts.getShortcutsByCategory()
    })
    
    const filteredShortcuts = computed(() => {
      if (!searchQuery.value) {
        return allShortcuts.value
      }
      
      const query = searchQuery.value.toLowerCase()
      const filtered = {}
      
      for (const [category, shortcuts] of Object.entries(allShortcuts.value)) {
        const matchingShortcuts = shortcuts.filter(shortcut => 
          shortcut.description.toLowerCase().includes(query) ||
          shortcut.key.toLowerCase().includes(query) ||
          category.toLowerCase().includes(query)
        )
        
        if (matchingShortcuts.length > 0) {
          filtered[category] = matchingShortcuts
        }
      }
      
      return filtered
    })
    
    const showModal = () => {
      isVisible.value = true
      shortcutsEnabled.value = keyboardShortcuts.isEnabled
      document.body.style.overflow = 'hidden'
    }
    
    const closeModal = () => {
      isVisible.value = false
      searchQuery.value = ''
      document.body.style.overflow = ''
    }
    
    const formatCategoryName = (category) => {
      const names = {
        navigation: 'Navigation',
        actions: 'Actions',
        vim: 'Vim-style',
        quick: 'Quick Actions',
        general: 'General'
      }
      return names[category] || category.charAt(0).toUpperCase() + category.slice(1)
    }
    
    const formatShortcutKey = (key) => {
      if (key.includes('+')) {
        return key.split('+').map(k => {
          const keyMap = {
            ctrl: 'Ctrl',
            alt: 'Alt',
            shift: 'Shift',
            meta: 'Cmd'
          }
          return keyMap[k] || k.toUpperCase()
        })
      } else {
        // For sequences, split each character
        return key.split('').map(k => k.toUpperCase())
      }
    }
    
    const toggleShortcuts = () => {
      keyboardShortcuts.setEnabled(shortcutsEnabled.value)
      keyboardShortcuts.savePreferences()
    }
    
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && isVisible.value) {
        closeModal()
      }
    }
    
    const handleShowShortcuts = () => {
      showModal()
    }
    
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
      window.addEventListener('show-shortcuts-modal', handleShowShortcuts)
    })
    
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('show-shortcuts-modal', handleShowShortcuts)
    })
    
    return {
      isVisible,
      searchQuery,
      shortcutsEnabled,
      filteredShortcuts,
      showModal,
      closeModal,
      formatCategoryName,
      formatShortcutKey,
      toggleShortcuts
    }
  }
}
</script>

<style scoped>
.shortcuts-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.shortcuts-modal {
  background: #1a1a1a;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  border-bottom: 1px solid #333;
  margin-bottom: 24px;
}

.shortcuts-header h2 {
  color: #fff;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: #fff;
  background: #333;
}

.shortcuts-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
}

.shortcuts-search {
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #FF0000;
}

.search-input::placeholder {
  color: #999;
}

.shortcuts-categories {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shortcuts-category {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #333;
}

.category-title {
  color: #FF0000;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #333;
  transition: opacity 0.2s ease;
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-item.disabled {
  opacity: 0.5;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
  align-items: center;
}

.key {
  background: #333;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #555;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  min-width: 24px;
  text-align: center;
}

.shortcut-description {
  color: #ccc;
  font-size: 14px;
  flex: 1;
  text-align: right;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-results i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.shortcuts-footer {
  padding: 24px;
  border-top: 1px solid #333;
  background: #222;
  border-radius: 0 0 12px 12px;
}

.shortcuts-toggle {
  margin-bottom: 20px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: #444;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-input:checked + .toggle-slider {
  background: #FF0000;
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.shortcuts-tips {
  color: #999;
  font-size: 12px;
}

.shortcuts-tips p {
  margin: 0 0 8px 0;
  color: #ccc;
}

.shortcuts-tips ul {
  margin: 0;
  padding-left: 16px;
}

.shortcuts-tips li {
  margin-bottom: 4px;
}

.shortcuts-tips kbd {
  background: #333;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  border: 1px solid #555;
}

@media (max-width: 768px) {
  .shortcuts-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }
  
  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .shortcut-description {
    text-align: left;
  }
}
</style>
