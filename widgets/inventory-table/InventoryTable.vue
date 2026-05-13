<script setup lang="ts">
import type { InventoryListItem } from '~/shared/api/types'

const props = defineProps<{
  items: InventoryListItem[]
}>()

function sparkPath(points: number[]) {
  if (!points.length) return ''
  const width = 90
  const height = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = Math.max(max - min, 1)
  const step = points.length > 1 ? width / (points.length - 1) : 0

  return points
    .map((value, idx) => {
      const x = idx * step
      const y = height - ((value - min) / range) * height
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function trendColor(points: number[]) {
  if (points.length < 2) return 'stroke-zinc-400'
  return points[points.length - 1]! >= points[0]! ? 'stroke-emerald-500' : 'stroke-red-500'
}

function singlePointY(points: number[]) {
  if (!points.length) return 14
  const value = points[0] ?? 0
  return Number.isFinite(value) ? 14 : 14
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <table class="min-w-full text-sm">
      <thead class="bg-zinc-100 text-left dark:bg-zinc-800/80">
        <tr>
          <th class="px-4 py-3 font-medium">Артикул</th>
          <th class="px-4 py-3 font-medium">Назва</th>
          <th class="px-4 py-3 font-medium">Залишок</th>
          <th class="px-4 py-3 font-medium">Мін.</th>
          <th class="px-4 py-3 font-medium">Динаміка</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" class="border-t border-zinc-200 dark:border-zinc-800">
          <td class="px-4 py-3">{{ item.sku }}</td>
          <td class="px-4 py-3">{{ item.name }}</td>
          <td class="px-4 py-3">{{ item.currentStock }}</td>
          <td class="px-4 py-3">{{ item.minStockLevel }}</td>
          <td class="px-4 py-3">
            <svg width="90" height="28" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line v-if="!item.trendPoints.length" x1="4" y1="14" x2="86" y2="14" class="stroke-zinc-300 dark:stroke-zinc-700" stroke-width="1.5" stroke-dasharray="3 3" />
              <path
                v-else-if="item.trendPoints.length > 1"
                :d="sparkPath(item.trendPoints)"
                :class="trendColor(item.trendPoints)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
              <circle
                v-else
                cx="45"
                :cy="singlePointY(item.trendPoints)"
                r="3"
                class="fill-zinc-400 dark:fill-zinc-500"
              />
            </svg>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
