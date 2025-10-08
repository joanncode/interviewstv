<template>
  <div class="accessibility-toolbar" :class="{ 'toolbar-expanded': isExpanded }">
    <button
      class="toolbar-toggle"
      @click="toggleToolbar"
      :aria-expanded="isExpanded"
      aria-label="Accessibility options"
      title="Accessibility options"
    >
      <i class="fas fa-universal-access" aria-hidden="true"></i>
      <span class="sr-only">Accessibility</span>
    </button>
    
    <div v-if="isExpanded" class="toolbar-content" role="region" aria-label="Accessibility controls">
      <div class="toolbar-header">
        <h3>Accessibility Options</h3>
        <button
          class="close-btn"
          @click="closeToolbar"
          aria-label="Close accessibility options"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
      
      <div class="toolbar-sections">
        <!-- Font Size Controls -->
        <div class="toolbar-section">
          <h4>Text Size</h4>
          <div class="font-size-controls" role="group" aria-label="Font size controls">
            <button
              v-for="size in fontSizes"
              :key="size.value"
              class="font-size-btn"
              :class="{ active: currentFontSize === size.value }"
              @click="setFontSize(size.value)"
              :aria-pressed="currentFontSize === size.value"
              :title="size.label"
            >
              {{ size.icon }}
              <span class="btn-label">{{ size.label }}</span>
            </button>
          </div>
        </div>
        
        <!-- Contrast Controls -->
        <div class="toolbar-section">
          <h4>Display</h4>
          <div class="display-controls">
            <button
              class="control-btn"
              :class="{ active: highContrast }"
              @click="toggleHighContrast"
              :aria-pressed="highContrast"
              title="Toggle high contrast mode"
            >
              <i class="fas fa-adjust" aria-hidden="true"></i>
              <span class="btn-label">High Contrast</span>
            </button>
            
            <button
              class="control-btn"
              :class="{ active: reducedMotion }"
              @click="toggleReducedMotion"
              :aria-pressed="reducedMotion"
              title="Reduce animations and motion"
            >
              <i class="fas fa-pause-circle" aria-hidden="true"></i>
              <span class="btn-label">Reduce Motion</span>
            </button>
          </div>
        </div>
        
        <!-- Navigation Aids -->
        <div class="toolbar-section">
          <h4>Navigation</h4>
          <div class="navigation-controls">
            <button
              class="control-btn"
              @click="showKeyboardShortcuts"
              title="View keyboard shortcuts"
            >
              <i class="fas fa-keyboard" aria-hidden="true"></i>
              <span class="btn-label">Keyboard Shortcuts</span>
            </button>
            
            <button
              class="control-btn"
              @click="focusMainContent"
              title="Jump to main content"
            >
              <i class="fas fa-arrow-down" aria-hidden="true"></i>
              <span class="btn-label">Skip to Content</span>
            </button>
            
            <button
              class="control-btn"
              @click="showLandmarks"
              title="Show page landmarks"
            >
              <i class="fas fa-map-signs" aria-hidden="true"></i>
              <span class="btn-label">Page Landmarks</span>
            </button>
          </div>
        </div>
        
        <!-- Screen Reader -->
        <div class="toolbar-section">
          <h4>Screen Reader</h4>
          <div class="reader-controls">
            <button
              class="control-btn"
              :class="{ active: announcements }"
              @click="toggleAnnouncements"
              :aria-pressed="announcements"
              title="Toggle page change announcements"
            >
              <i class="fas fa-volume-up" aria-hidden="true"></i>
              <span class="btn-label">Announcements</span>
            </button>
            
            <button
              class="control-btn"
              @click="readPageSummary"
              title="Read page summary"
            >
              <i class="fas fa-play" aria-hidden="true"></i>
              <span class="btn-label">Read Summary</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="toolbar-footer">
        <button
          class="reset-btn"
          @click="resetSettings"
          title="Reset all accessibility settings to default"
        >
          <i class="fas fa-undo" aria-hidden="true"></i>
          Reset Settings
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import accessibilityManager from '@/utils/accessibility'

export default {
  name: 'AccessibilityToolbar',
  setup() {
    const isExpanded = ref(false)
    const currentFontSize = ref('normal')
    const highContrast = ref(false)
    const reducedMotion = ref(false)
    const announcements = ref(true)
    
    const fontSizes = [
      { value: 'small', label: 'Small', icon: 'A' },
      { value: 'normal', label: 'Normal', icon: 'A' },
      { value: 'large', label: 'Large', icon: 'A' },
      { value: 'extra-large', label: 'Extra Large', icon: 'A' }
    ]
    
    const toggleToolbar = () => {
      isExpanded.value = !isExpanded.value
      
      if (isExpanded.value) {
        accessibilityManager.announce('Accessibility toolbar opened')
      } else {
        accessibilityManager.announce('Accessibility toolbar closed')
      }
    }
    
    const closeToolbar = () => {
      isExpanded.value = false
      accessibilityManager.announce('Accessibility toolbar closed')
    }
    
    const setFontSize = (size) => {
      currentFontSize.value = size
      accessibilityManager.setFontSize(size)
    }
    
    const toggleHighContrast = () => {
      highContrast.value = !highContrast.value
      document.documentElement.classList.toggle('high-contrast', highContrast.value)
      
      const message = highContrast.value ? 'High contrast enabled' : 'High contrast disabled'
      accessibilityManager.announce(message)
      
      saveSettings()
    }
    
    const toggleReducedMotion = () => {
      reducedMotion.value = !reducedMotion.value
      document.documentElement.classList.toggle('reduce-motion', reducedMotion.value)
      
      const message = reducedMotion.value ? 'Reduced motion enabled' : 'Reduced motion disabled'
      accessibilityManager.announce(message)
      
      saveSettings()
    }
    
    const toggleAnnouncements = () => {
      announcements.value = !announcements.value
      
      const message = announcements.value ? 'Page announcements enabled' : 'Page announcements disabled'
      accessibilityManager.announce(message)
      
      saveSettings()
    }
    
    const showKeyboardShortcuts = () => {
      window.dispatchEvent(new CustomEvent('show-shortcuts-modal'))
      closeToolbar()
    }
    
    const focusMainContent = () => {
      const main = document.querySelector('main, [role="main"], #main-content')
      if (main) {
        main.focus()
        main.scrollIntoView({ behavior: 'smooth', block: 'start' })
        accessibilityManager.announce('Focused main content')
      }
      closeToolbar()
    }
    
    const showLandmarks = () => {
      const landmarks = document.querySelectorAll('main, nav, header, footer, aside, section[aria-label], [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"]')
      
      if (landmarks.length > 0) {
        const landmarkList = Array.from(landmarks).map(landmark => {
          const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase()
          const label = landmark.getAttribute('aria-label') || landmark.getAttribute('aria-labelledby') || role
          return `${label} (${role})`
        }).join(', ')
        
        accessibilityManager.announce(`Page landmarks: ${landmarkList}`)
      } else {
        accessibilityManager.announce('No landmarks found on this page')
      }
      
      closeToolbar()
    }
    
    const readPageSummary = () => {
      const title = document.title
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 3)
      const headingText = headings.map(h => h.textContent.trim()).join(', ')
      
      const summary = `Page title: ${title}. Main headings: ${headingText || 'None found'}.`
      accessibilityManager.announce(summary)
      
      closeToolbar()
    }
    
    const resetSettings = () => {
      currentFontSize.value = 'normal'
      highContrast.value = false
      reducedMotion.value = false
      announcements.value = true
      
      accessibilityManager.setFontSize('normal')
      document.documentElement.classList.remove('high-contrast', 'reduce-motion')
      
      saveSettings()
      accessibilityManager.announce('Accessibility settings reset to default')
    }
    
    const saveSettings = () => {
      try {
        const settings = {
          fontSize: currentFontSize.value,
          highContrast: highContrast.value,
          reducedMotion: reducedMotion.value,
          announcements: announcements.value
        }
        localStorage.setItem('accessibility-toolbar-settings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save accessibility settings:', error)
      }
    }
    
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem('accessibility-toolbar-settings')
        if (settings) {
          const parsed = JSON.parse(settings)
          currentFontSize.value = parsed.fontSize || 'normal'
          highContrast.value = parsed.highContrast || false
          reducedMotion.value = parsed.reducedMotion || false
          announcements.value = parsed.announcements !== false
          
          // Apply settings
          accessibilityManager.setFontSize(currentFontSize.value)
          document.documentElement.classList.toggle('high-contrast', highContrast.value)
          document.documentElement.classList.toggle('reduce-motion', reducedMotion.value)
        }
      } catch (error) {
        console.error('Failed to load accessibility settings:', error)
      }
    }
    
    onMounted(() => {
      loadSettings()
      
      // Close toolbar when clicking outside
      document.addEventListener('click', (event) => {
        const toolbar = event.target.closest('.accessibility-toolbar')
        if (!toolbar && isExpanded.value) {
          closeToolbar()
        }
      })
      
      // Close toolbar on escape key
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isExpanded.value) {
          closeToolbar()
        }
      })
    })
    
    return {
      isExpanded,
      currentFontSize,
      highContrast,
      reducedMotion,
      announcements,
      fontSizes,
      toggleToolbar,
      closeToolbar,
      setFontSize,
      toggleHighContrast,
      toggleReducedMotion,
      toggleAnnouncements,
      showKeyboardShortcuts,
      focusMainContent,
      showLandmarks,
      readPageSummary,
      resetSettings
    }
  }
}
</script>

<style scoped>
.accessibility-toolbar {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.toolbar-toggle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #FF0000;
  color: white;
  border: 2px solid #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.toolbar-toggle:hover,
.toolbar-toggle:focus {
  background: #cc0000;
  transform: scale(1.1);
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.toolbar-content {
  position: absolute;
  top: 60px;
  right: 0;
  width: 320px;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: #fff;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.toolbar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.close-btn:hover,
.close-btn:focus {
  color: #fff;
  outline: 1px solid #555;
}

.toolbar-sections {
  padding: 16px 20px;
}

.toolbar-section {
  margin-bottom: 20px;
}

.toolbar-section:last-child {
  margin-bottom: 0;
}

.toolbar-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #FF0000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.font-size-controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.font-size-btn {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.font-size-btn:hover,
.font-size-btn:focus {
  background: #333;
  border-color: #555;
  outline: none;
}

.font-size-btn.active {
  background: #FF0000;
  border-color: #FF0000;
}

.display-controls,
.navigation-controls,
.reader-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-btn {
  background: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  text-align: left;
  transition: all 0.2s ease;
}

.control-btn:hover,
.control-btn:focus {
  background: #333;
  border-color: #555;
  outline: none;
}

.control-btn.active {
  background: #FF0000;
  border-color: #FF0000;
}

.control-btn i {
  width: 16px;
  text-align: center;
}

.btn-label {
  flex: 1;
}

.toolbar-footer {
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.reset-btn {
  width: 100%;
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.reset-btn:hover,
.reset-btn:focus {
  background: #444;
  outline: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* High contrast mode styles */
:global(.high-contrast) .accessibility-toolbar {
  filter: contrast(2) brightness(1.2);
}

/* Reduced motion styles */
:global(.reduce-motion) .accessibility-toolbar * {
  animation: none !important;
  transition: none !important;
}

/* Font size styles */
:global(.font-large) .accessibility-toolbar {
  font-size: 1.2em;
}

:global(.font-extra-large) .accessibility-toolbar {
  font-size: 1.4em;
}

@media (max-width: 768px) {
  .accessibility-toolbar {
    top: 10px;
    right: 10px;
  }
  
  .toolbar-content {
    width: 280px;
  }
  
  .font-size-controls {
    grid-template-columns: 1fr;
  }
}
</style>
