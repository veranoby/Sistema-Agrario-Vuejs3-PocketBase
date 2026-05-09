const fs = require('fs');
const filePath = 'src/components/AiAssistant.vue';

let content = fs.readFileSync(filePath, 'utf8');

// Añadir imports y lógica al setup script para AiAssistant.vue
content = content.replace(
    /import \{ ref, computed \} from 'vue'/,
    `import { ref, computed, onMounted } from 'vue'\nimport { useSettingsStore } from '@/stores/settingsStore'\nimport { useAiUsageStore } from '@/stores/aiUsageStore'\nimport { useHaciendaStore } from '@/stores/haciendaStore'`
);

content = content.replace(
    /const drawer = ref\(false\)/,
    `const settingsStore = useSettingsStore()
const aiUsageStore = useAiUsageStore()
const haciendaStore = useHaciendaStore()

const isUsingGlobalKey = computed(() => !haciendaStore.mi_hacienda?.openrouter_key)
const remainingQuota = computed(() => {
    const limit = settingsStore.aiRateLimit || 5
    const used = aiUsageStore.getUsage
    return Math.max(0, limit - used)
})

onMounted(async () => {
    await settingsStore.fetchConfig()
    aiUsageStore.loadFromLocal()
})

const drawer = ref(false)`
);

// En handleGenerateSuggestion
content = content.replace(
    /suggestion\.value = await generateAIResponse\(prompt, context, true\)/,
    `try {
        suggestion.value = await generateAIResponse(prompt, context, true)
        if (isUsingGlobalKey.value) aiUsageStore.loadFromLocal()
    } catch (e) {
        suggestion.value = e.message || 'Error consultando la IA'
    }`
);

fs.writeFileSync(filePath, content);
console.log('AiAssistant.vue script patched.');
