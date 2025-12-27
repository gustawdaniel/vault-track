<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'

const items = ref<ContextMenuItem[][]>([
  [
    {
      label: 'Appearance',
      children: [
        {
          label: 'System',
          icon: 'i-lucide-monitor'
        },
        {
          label: 'Light',
          icon: 'i-lucide-sun'
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon'
        }
      ]
    }
  ],
  [
    {
      label: 'Show Sidebar',
      kbds: ['meta', 's']
    },
    {
      label: 'Show Toolbar',
      kbds: ['shift', 'meta', 'd']
    },
    {
      label: 'Collapse Pinned Tabs',
      disabled: true
    }
  ],
  [
    {
      label: 'Refresh the Page'
    },
    {
      label: 'Clear Cookies and Refresh'
    },
    {
      label: 'Clear Cache and Refresh'
    },
    {
      type: 'separator'
    },
    {
      label: 'Developer',
      children: [
        [
          {
            label: 'View Source',
            kbds: ['meta', 'shift', 'u']
          },
          {
            label: 'Developer Tools',
            kbds: ['option', 'meta', 'i']
          },
          {
            label: 'Inspect Elements',
            kbds: ['option', 'meta', 'c']
          }
        ],
        [
          {
            label: 'JavaScript Console',
            kbds: ['option', 'meta', 'j']
          }
        ]
      ]
    }
  ]
])
</script>

<template>
  <UContextMenu
    :items="items"
    :ui="{
      content: 'min-w-48 bg-white dark:bg-gray-900 shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg overflow-hidden'
    }"
  >
    <div
      class="flex items-center justify-center rounded-md border border-dashed border-gray-400 dark:border-gray-600 text-sm aspect-video w-72 bg-gray-50 dark:bg-gray-800/50"
    >
      Right click here
    </div>
  </UContextMenu>
</template>
