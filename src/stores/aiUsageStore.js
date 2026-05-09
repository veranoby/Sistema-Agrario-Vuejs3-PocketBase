import { defineStore } from 'pinia'

export const useAiUsageStore = defineStore('aiUsage', {
  state: () => ({
    usageCount: 0,
    windowStart: Date.now()
  }),

  getters: {
    getUsage: (state) => state.usageCount,
    getWindowStart: (state) => state.windowStart
  },

  actions: {
    incrementUsage(limit, windowMs) {
      const now = Date.now()
      if (now - this.windowStart > windowMs) {
        // Reset window
        this.windowStart = now
        this.usageCount = 1
      } else {
        if (this.usageCount < limit) {
          this.usageCount++
        }
      }
      this.saveToLocal()
    },

    canUseAi(limit, windowMs) {
      const now = Date.now()
      if (now - this.windowStart > windowMs) {
        return true
      }
      return this.usageCount < limit
    },

    saveToLocal() {
      localStorage.setItem('ai_usage_stats', JSON.stringify({
        usageCount: this.usageCount,
        windowStart: this.windowStart
      }))
    },

    loadFromLocal() {
      const data = localStorage.getItem('ai_usage_stats')
      if (data) {
        const parsed = JSON.parse(data)
        this.usageCount = parsed.usageCount || 0
        this.windowStart = parsed.windowStart || Date.now()
      }
    }
  }
})
