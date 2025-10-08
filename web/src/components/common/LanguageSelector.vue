<template>
  <div class="language-selector" :class="{ 'rtl': isRTLMode }">
    <div class="selector-trigger" @click="toggleDropdown" ref="trigger">
      <div class="current-language">
        <span class="flag">{{ localeInfo.flag }}</span>
        <span v-if="showLabel" class="label">{{ localeInfo.nativeName }}</span>
        <i class="fas fa-chevron-down" :class="{ 'rotated': isOpen }"></i>
      </div>
    </div>

    <transition name="dropdown">
      <div v-if="isOpen" class="language-dropdown" ref="dropdown">
        <div class="dropdown-header">
          <h4>{{ t('common.language_selector.title') }}</h4>
          <button @click="closeDropdown" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="search-box" v-if="searchable">
          <i class="fas fa-search"></i>
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('common.language_selector.search')"
            @input="filterLanguages"
          />
        </div>

        <div class="language-list">
          <div class="language-group" v-if="popularLanguages.length > 0">
            <h5>{{ t('common.language_selector.popular') }}</h5>
            <div 
              v-for="language in popularLanguages" 
              :key="language.code"
              class="language-item"
              :class="{ 
                'active': language.code === locale,
                'rtl': language.rtl
              }"
              @click="selectLanguage(language.code)"
            >
              <span class="flag">{{ language.flag }}</span>
              <div class="language-info">
                <span class="name">{{ language.name }}</span>
                <span class="native-name">{{ language.nativeName }}</span>
              </div>
              <div class="completion-indicator" v-if="showCompletion && completionRates[language.code]">
                <div class="completion-bar">
                  <div 
                    class="completion-fill" 
                    :style="{ width: completionRates[language.code] + '%' }"
                  ></div>
                </div>
                <span class="completion-text">{{ completionRates[language.code] }}%</span>
              </div>
              <i v-if="language.code === locale" class="fas fa-check active-indicator"></i>
            </div>
          </div>

          <div class="language-group">
            <h5 v-if="popularLanguages.length > 0">{{ t('common.language_selector.all') }}</h5>
            <div 
              v-for="language in filteredLanguages" 
              :key="language.code"
              class="language-item"
              :class="{ 
                'active': language.code === locale,
                'rtl': language.rtl
              }"
              @click="selectLanguage(language.code)"
            >
              <span class="flag">{{ language.flag }}</span>
              <div class="language-info">
                <span class="name">{{ language.name }}</span>
                <span class="native-name">{{ language.nativeName }}</span>
              </div>
              <div class="completion-indicator" v-if="showCompletion && completionRates[language.code]">
                <div class="completion-bar">
                  <div 
                    class="completion-fill" 
                    :style="{ width: completionRates[language.code] + '%' }"
                  ></div>
                </div>
                <span class="completion-text">{{ completionRates[language.code] }}%</span>
              </div>
              <i v-if="language.code === locale" class="fas fa-check active-indicator"></i>
            </div>
          </div>
        </div>

        <div class="dropdown-footer" v-if="showFooter">
          <div class="help-text">
            <i class="fas fa-info-circle"></i>
            <span>{{ t('common.language_selector.help') }}</span>
          </div>
          <button @click="openTranslationHelp" class="help-btn">
            {{ t('common.language_selector.contribute') }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Overlay for mobile -->
    <div v-if="isOpen && isMobile" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

export default {
  name: 'LanguageSelector',
  props: {
    showLabel: {
      type: Boolean,
      default: true
    },
    searchable: {
      type: Boolean,
      default: true
    },
    showCompletion: {
      type: Boolean,
      default: false
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    popularLocales: {
      type: Array,
      default: () => ['en', 'es', 'fr', 'de', 'zh', 'ja']
    }
  },
  emits: ['language-changed'],
  setup(props, { emit }) {
    const { 
      t, 
      locale, 
      availableLocales, 
      isRTLMode, 
      localeInfo, 
      setLocale 
    } = useI18n()

    // Reactive state
    const isOpen = ref(false)
    const searchQuery = ref('')
    const filteredLanguages = ref([])
    const completionRates = ref({})
    const trigger = ref(null)
    const dropdown = ref(null)

    // Computed properties
    const isMobile = computed(() => {
      return window.innerWidth <= 768
    })

    const popularLanguages = computed(() => {
      return availableLocales.value.filter(lang => 
        props.popularLocales.includes(lang.code)
      )
    })

    const allLanguages = computed(() => {
      return availableLocales.value.filter(lang => 
        !props.popularLocales.includes(lang.code)
      )
    })

    // Methods
    const toggleDropdown = () => {
      isOpen.value = !isOpen.value
      if (isOpen.value) {
        loadCompletionRates()
        filterLanguages()
      }
    }

    const closeDropdown = () => {
      isOpen.value = false
      searchQuery.value = ''
    }

    const selectLanguage = async (languageCode) => {
      try {
        const success = await setLocale(languageCode)
        if (success) {
          emit('language-changed', languageCode)
          closeDropdown()
          
          // Save preference to server if user is logged in
          await saveLanguagePreference(languageCode)
        }
      } catch (error) {
        console.error('Failed to change language:', error)
      }
    }

    const filterLanguages = () => {
      if (!searchQuery.value) {
        filteredLanguages.value = allLanguages.value
        return
      }

      const query = searchQuery.value.toLowerCase()
      filteredLanguages.value = allLanguages.value.filter(lang => 
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
      )
    }

    const loadCompletionRates = async () => {
      if (!props.showCompletion) return

      try {
        const response = await fetch('/api/i18n/completion-rates')
        if (response.ok) {
          const data = await response.json()
          completionRates.value = data
        }
      } catch (error) {
        console.error('Failed to load completion rates:', error)
      }
    }

    const saveLanguagePreference = async (languageCode) => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            preferred_locale: languageCode
          })
        })
      } catch (error) {
        console.error('Failed to save language preference:', error)
      }
    }

    const openTranslationHelp = () => {
      // Open translation contribution page or modal
      window.open('/contribute/translations', '_blank')
    }

    const handleClickOutside = (event) => {
      if (
        isOpen.value && 
        trigger.value && 
        dropdown.value &&
        !trigger.value.contains(event.target) &&
        !dropdown.value.contains(event.target)
      ) {
        closeDropdown()
      }
    }

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen.value) {
        closeDropdown()
      }
    }

    // Lifecycle
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      filterLanguages()
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    })

    // Watch for changes
    watch(availableLocales, () => {
      filterLanguages()
    })

    return {
      // Reactive state
      isOpen,
      searchQuery,
      filteredLanguages,
      completionRates,
      trigger,
      dropdown,
      
      // Computed
      isMobile,
      popularLanguages,
      locale,
      isRTLMode,
      localeInfo,
      
      // Methods
      t,
      toggleDropdown,
      closeDropdown,
      selectLanguage,
      filterLanguages,
      openTranslationHelp
    }
  }
}
</script>

<style scoped>
.language-selector {
  position: relative;
  display: inline-block;
}

.language-selector.rtl {
  direction: rtl;
}

.selector-trigger {
  cursor: pointer;
  user-select: none;
}

.current-language {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: white;
  transition: all 0.3s ease;
}

.current-language:hover {
  background: #333;
  border-color: #FF0000;
}

.flag {
  font-size: 1.2rem;
}

.label {
  font-weight: 500;
  white-space: nowrap;
}

.fa-chevron-down {
  font-size: 0.8rem;
  color: #ccc;
  transition: transform 0.3s ease;
}

.fa-chevron-down.rotated {
  transform: rotate(180deg);
}

.language-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  min-width: 300px;
  max-width: 400px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
  background: #333;
}

.dropdown-header h4 {
  margin: 0;
  color: #FF0000;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 5px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #444;
  color: white;
}

.search-box {
  position: relative;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
}

.search-box i {
  position: absolute;
  left: 35px;
  top: 50%;
  transform: translateY(-50%);
  color: #ccc;
}

.search-box input {
  width: 100%;
  padding: 10px 15px 10px 35px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #333;
  color: white;
  font-size: 0.9rem;
}

.search-box input:focus {
  outline: none;
  border-color: #FF0000;
}

.language-list {
  max-height: 300px;
  overflow-y: auto;
}

.language-group {
  padding: 10px 0;
}

.language-group h5 {
  margin: 0 0 10px 0;
  padding: 0 20px;
  color: #ccc;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.language-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.language-item:hover {
  background: #333;
}

.language-item.active {
  background: rgba(255, 0, 0, 0.1);
  border-left-color: #FF0000;
}

.language-item.rtl {
  direction: rtl;
}

.language-item .flag {
  font-size: 1.3rem;
  min-width: 24px;
}

.language-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.language-info .name {
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
}

.language-info .native-name {
  color: #ccc;
  font-size: 0.8rem;
}

.completion-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 60px;
}

.completion-bar {
  width: 40px;
  height: 4px;
  background: #444;
  border-radius: 2px;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
  transition: width 0.3s ease;
}

.completion-text {
  font-size: 0.7rem;
  color: #ccc;
  min-width: 30px;
}

.active-indicator {
  color: #FF0000;
  font-size: 0.9rem;
}

.dropdown-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  background: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.help-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 0.8rem;
}

.help-text i {
  color: #FF0000;
}

.help-btn {
  background: none;
  border: 1px solid #FF0000;
  color: #FF0000;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.help-btn:hover {
  background: #FF0000;
  color: white;
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Mobile styles */
@media (max-width: 768px) {
  .language-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
  }

  .current-language {
    padding: 10px 15px;
  }

  .language-item {
    padding: 15px 20px;
  }

  .language-info .name {
    font-size: 1rem;
  }

  .language-info .native-name {
    font-size: 0.9rem;
  }
}

/* RTL specific styles */
.language-selector.rtl .language-dropdown {
  left: auto;
  right: 0;
}

.language-selector.rtl .search-box i {
  left: auto;
  right: 35px;
}

.language-selector.rtl .search-box input {
  padding: 10px 35px 10px 15px;
}

.language-selector.rtl .language-item {
  border-left: none;
  border-right: 3px solid transparent;
}

.language-selector.rtl .language-item.active {
  border-right-color: #FF0000;
}

/* Scrollbar styling */
.language-list::-webkit-scrollbar {
  width: 6px;
}

.language-list::-webkit-scrollbar-track {
  background: #333;
}

.language-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>
