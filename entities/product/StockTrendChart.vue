<script setup lang="ts">
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { ProductTrendPoint, TrendPointReason } from '~/shared/api/types'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps<{
  points: ProductTrendPoint[]
}>()

function reasonLabel(reason: TrendPointReason): string {
  if (reason === 'BASELINE') return 'Початок періоду'
  if (reason === 'SNAPSHOT') return 'Поточний знімок'
  if (reason === 'REPLENISHMENT') return 'Поповнення'
  if (reason === 'ORDER') return 'Замовлення'
  return 'Списання'
}

const chartSeriesData = computed(() => {
  return [...props.points]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      value: [new Date(point.date).getTime(), point.balanceAfter] as [number, number],
      reason: point.reason as TrendPointReason,
      reasonNote: point.reasonNote,
    }))
})

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross', label: { backgroundColor: '#0f172a' } },
    formatter: (raw: unknown) => {
      const params = (Array.isArray(raw) ? raw : [raw]) as Array<{
        dataIndex?: number
        data?: { value?: [number, number]; reason?: TrendPointReason; reasonNote?: string | null }
      }>
      const p0 = params[0]
      const idx = p0?.dataIndex
      const ent =
        typeof idx === 'number' && idx >= 0 && chartSeriesData.value[idx]
          ? chartSeriesData.value[idx]
          : p0?.data?.value
            ? {
                value: p0.data.value,
                reason: (p0.data.reason ?? 'ORDER') as TrendPointReason,
                reasonNote: p0.data.reasonNote ?? null,
              }
            : undefined
      if (!ent?.value) return ''
      const [ts, qty] = ent.value
      const dateStr = new Date(ts).toLocaleString('uk-UA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const reason = reasonLabel(ent.reason)
      const note = ent.reasonNote?.trim()
      const lines = [
        `<div style="font-weight:600;margin-bottom:4px">${dateStr}</div>`,
        `<div>Залишок: <b>${qty}</b> шт.</div>`,
        `<div style="margin-top:6px;color:#94a3b8">Операція: ${reason}</div>`,
      ]
      if (note) {
        lines.push(`<div style="margin-top:4px;font-size:12px;max-width:240px">${note}</div>`)
      }
      return lines.join('')
    },
  },
  legend: { data: ['Залишок'], textStyle: { color: '#94a3b8' } },
  grid: { left: 16, right: 16, top: 36, bottom: 16, containLabel: true },
  xAxis: {
    type: 'time',
    axisLine: { lineStyle: { color: '#334155' } },
    splitLine: { show: true, lineStyle: { color: '#1e293b', type: 'dashed' } },
    axisLabel: {
      color: '#94a3b8',
      formatter: (value: number) => new Date(value).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' }),
    },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLine: { lineStyle: { color: '#334155' } },
    splitLine: { lineStyle: { color: '#1e293b' } },
    axisLabel: { color: '#94a3b8' },
  },
  series: [
    {
      name: 'Залишок',
      type: 'line',
      smooth: 0.35,
      showSymbol: chartSeriesData.value.length <= 14,
      symbolSize: 8,
      data: chartSeriesData.value,
      lineStyle: {
        width: 2.5,
        color: '#2dd4bf',
      },
      itemStyle: {
        color: '#5eead4',
        borderColor: '#0f766e',
        borderWidth: 1,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(45, 212, 191, 0.45)' },
            { offset: 0.55, color: 'rgba(45, 212, 191, 0.12)' },
            { offset: 1, color: 'rgba(15, 23, 42, 0.02)' },
          ],
        },
      },
    },
  ],
}))
</script>

<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-none"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base font-semibold text-slate-900 dark:text-zinc-100">Динаміка залишків</h2>
      <span
        class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
      >
        Поточний місяць
      </span>
    </div>
    <p v-if="!points.length" class="mt-2 text-sm text-slate-500 dark:text-zinc-400">
      Немає точок для графіка.
    </p>
    <ClientOnly v-else>
      <VChart class="mt-3 h-80 w-full min-h-[18rem]" :option="option" autoresize />
    </ClientOnly>
  </div>
</template>
