<template>
  <v-container>
    <div class="flex flex-col min-h-screen bg-muted/40">
      <header class="py-4 px-6">
        <div class="container mx-auto flex items-center justify-between">
          <h1 class="font-bold">
            Bienvenido de nuevo, {{ fullName }}!
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
              {{ userRole }}
            </v-chip>
            <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1">
              HACIENDA: {{ haciendaName }}
            </v-chip>
          </h1>
        </div>
      </header>
      <main class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
        <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight">
              Last Messages
            </h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-6 w-6"
                >
                  <path
                    d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
                  ></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">Jane Doe</div>
                    <div class="text-xs text-muted-foreground">2h ago</div>
                  </div>
                  <p>Hey there! Just wanted to check in and see how you're doing.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-6 w-6"
                >
                  <path
                    d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
                  ></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">John Smith</div>
                    <div class="text-xs text-muted-foreground">4h ago</div>
                  </div>
                  <p>Did you see the latest update? I think we should discuss it.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-6 w-6"
                >
                  <path
                    d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
                  ></path>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                </svg>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">Sarah Lee</div>
                    <div class="text-xs text-muted-foreground">6h ago</div>
                  </div>
                  <p>Sounds good, let's schedule a meeting to discuss the next steps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight">
              Last Activities
            </h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div
                  class="bg-muted rounded-md flex items-center justify-center aspect-square w-10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-5 h-5 text-muted-foreground"
                  >
                    <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path>
                  </svg>
                </div>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">John Doe</div>
                    <div class="text-xs text-muted-foreground">Edited a post</div>
                  </div>
                  <p class="text-sm">Updated the team's project roadmap.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div
                  class="bg-muted rounded-md flex items-center justify-center aspect-square w-10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-5 h-5 text-muted-foreground"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" x2="12" y1="3" y2="15"></line>
                  </svg>
                </div>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">Jane Smith</div>
                    <div class="text-xs text-muted-foreground">Uploaded a file</div>
                  </div>
                  <p class="text-sm">Shared the latest design mockups.</p>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <div
                  class="bg-muted rounded-md flex items-center justify-center aspect-square w-10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-5 h-5 text-muted-foreground"
                  >
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                </div>
                <div class="grid gap-1">
                  <div class="flex items-center gap-2">
                    <div class="font-medium">Sarah Lee</div>
                    <div class="text-xs text-muted-foreground">Created an event</div>
                  </div>
                  <p class="text-sm">Scheduled a team meeting for next week.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </v-container>
</template>

<script>
import { computed } from 'vue'

import { useProfileStore } from '@/stores/profileStore'

import { useHaciendaStore } from '@/stores/haciendaStore'

export default {
  name: 'DashboardComponent',
  setup() {
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()

    const fullName = computed(() => profileStore.fullName)
    const haciendaName = computed(() => haciendaStore.mi_hacienda.name)
    const userRole = computed(() => profileStore.user.role)
    const avatarUrl = computed(() => profileStore.avatarUrl)

    return { fullName, haciendaName, userRole, avatarUrl }
  }
}
</script>
