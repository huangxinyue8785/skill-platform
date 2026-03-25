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
const chartData = ref([])

// 获取服务分类分布
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

      const pieData = []
      for (let [name, value] of categoryMap) {
        pieData.push({ name, value })
      }
      chartData.value = pieData.length ? pieData : [
        { name: '学习辅导', value: 15 },
        { name: '生活服务', value: 12 },
        { name: '技能特长', value: 10 },
        { name: '娱乐休闲', value: 8 }
      ]
      updateChart()
    }
  } catch (err) {
    console.error('获取分类分布失败', err)
    chartData.value = [
      { name: '学习辅导', value: 15 },
      { name: '生活服务', value: 12 },
      { name: '技能特长', value: 10 },
      { name: '娱乐休闲', value: 8 }
    ]
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
      trigger: 'item',
      formatter: '{b}: {d}%'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#7c8b72' }
    },
    series: [
      {
        name: '服务分类',
        type: 'pie',
        radius: '55%',
        center: ['50%', '50%'],
        data: chartData.value,
        label: {
          show: true,
          formatter: '{b}: {d}%',
          color: '#5a6e7c'
        },
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        }
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
