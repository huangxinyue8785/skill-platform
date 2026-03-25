<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import { getServiceList } from '@/api/admin'

const props = defineProps({
  height: {
    type: String,
    default: '300px'
  }
})

const chartRef = ref(null)
let chart = null
const chartData = ref({ xAxis: [], series: [] })

// 获取服务分类排行数据
const fetchData = async () => {
  try {
    const res = await getServiceList({ page: 1, pageSize: 100, status: 1 })
    if (res.code === 200 && res.data) {
      const list = res.data.list || []
      const categoryMap = new Map()
      list.forEach(service => {
        const categoryName = service.category_name || '其他'
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
      })

      // 转换为数组并排序（按数量降序）
      const sorted = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8) // 取前8个

      chartData.value = {
        xAxis: sorted.map(item => item[0]),
        series: sorted.map(item => item[1])
      }
      updateChart()
    }
  } catch (err) {
    console.error('获取分类排行失败', err)
    chartData.value = {
      xAxis: ['学习辅导', '生活服务', '技能特长', '娱乐休闲'],
      series: [15, 12, 10, 8]
    }
    updateChart()
  }
}

const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
  }
}

const updateChart = () => {
  if (!chart) return

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2eae0',
      borderWidth: 1,
      textStyle: { color: '#5a6e7c' },
      formatter: (params) => {
        return `${params[0].name}<br/>服务数量: <strong>${params[0].value}</strong>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.value.xAxis,
      axisLabel: {
        fontSize: 11,
        color: '#8faa8a',
        rotate: 15,
        interval: 0
      },
      axisLine: { lineStyle: { color: '#e2eae0' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '服务数量',
      nameTextStyle: { fontSize: 12, color: '#8faa8a' },
      axisLabel: { fontSize: 12, color: '#8faa8a' },
      splitLine: { lineStyle: { color: '#e9ede5', type: 'dashed' } },
      axisLine: { show: false }
    },
    series: [
      {
        name: '服务数量',
        type: 'bar',
        data: chartData.value.series,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#9bb096' },
            { offset: 1, color: '#b8c4ae' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#5a6e7c',
          fontSize: 11
        },
        barWidth: '50%'
      }
    ]
  }

  chart.setOption(option, true)
}

onMounted(() => {
  initChart()
  fetchData()
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})
</script>
