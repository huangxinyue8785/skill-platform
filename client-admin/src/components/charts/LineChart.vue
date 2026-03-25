<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup>
import {ref, onMounted, watch} from 'vue'
import * as echarts from 'echarts'
import {getOrderList, getUserList} from '@/api/admin'

const props = defineProps({
  type: {
    type: String,
    default: 'user', // 'user' 或 'order'
    required: true
  },
  height: {
    type: String,
    default: '300px'
  }
})

const chartRef = ref(null)
let chart = null
const loading = ref(false)
const chartData = ref({xAxis: [], series: [], yAxisName: ''})

// 获取近7天日期数组
const getLast7Days = () => {
  const days = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const month = date.getMonth() + 1
    const day = date.getDate()
    days.push(`${month}/${day}`)
  }
  return days
}

// 获取用户增长趋势数据
const fetchUserTrend = async () => {
  try {
    const res = await getUserList({page: 1, pageSize: 1000})
    if (res.code === 200 && res.data) {
      const users = res.data.list || []
      const days = getLast7Days()
      const counts = []

      days.forEach(day => {
        const [month, dayNum] = day.split('/')
        const count = users.filter(user => {
          if (!user.create_time) return false
          const date = new Date(user.create_time)
          return date.getMonth() + 1 === parseInt(month) && date.getDate() === parseInt(dayNum)
        }).length
        counts.push(count)
      })

      chartData.value = {
        xAxis: days,
        series: [{name: '新增用户', data: counts, color: '#9bb096'}],
        yAxisName: '用户数'
      }
    }
  } catch (err) {
    console.error('获取用户趋势失败', err)
    // 降级使用模拟数据
    const days = getLast7Days()
    chartData.value = {
      xAxis: days,
      series: [{name: '新增用户', data: [12, 18, 15, 22, 28, 35, 42], color: '#9bb096'}],
      yAxisName: '用户数'
    }
  }
}

// 获取订单趋势数据
const fetchOrderTrend = async () => {
  try {
    const res = await getOrderList({page: 1, pageSize: 1000})
    if (res.code === 200 && res.data) {
      const orders = res.data.list || []
      const days = getLast7Days()
      const counts = []

      days.forEach(day => {
        const [month, dayNum] = day.split('/')
        const count = orders.filter(order => {
          if (!order.createTime) return false
          const date = new Date(order.createTime)
          return date.getMonth() + 1 === parseInt(month) && date.getDate() === parseInt(dayNum)
        }).length
        counts.push(count)
      })

      chartData.value = {
        xAxis: days,
        series: [{name: '订单数', data: counts, color: '#b87c5a'}],
        yAxisName: '订单数'
      }
    }
  } catch (err) {
    console.error('获取订单趋势失败', err)
    const days = getLast7Days()
    chartData.value = {
      xAxis: days,
      series: [{name: '订单数', data: [8, 12, 10, 15, 18, 22, 25], color: '#b87c5a'}],
      yAxisName: '订单数'
    }
  }
}

// 获取数据
const fetchData = async () => {
  if (props.type === 'user') {
    await fetchUserTrend()
  } else {
    await fetchOrderTrend()
  }
  updateChart()
}

// 获取渐变色
const getGradient = (color) => {
  const rgbaColor = color === '#9bb096' ? 'rgba(155, 176, 150' : 'rgba(184, 124, 90'
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    {offset: 0, color: `${rgbaColor}, 0.6)`},
    {offset: 0.5, color: `${rgbaColor}, 0.3)`},
    {offset: 1, color: `${rgbaColor}, 0.05)`}
  ])
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
      axisPointer: {type: 'shadow'},
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2eae0',
      borderWidth: 1,
      textStyle: {color: '#5a6e7c'}
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
      boundaryGap: false,
      axisLabel: {fontSize: 12, color: '#8faa8a'},
      axisLine: {lineStyle: {color: '#e2eae0'}},
      axisTick: {show: false}
    },
    yAxis: {
      type: 'value',
      name: chartData.value.yAxisName,
      nameTextStyle: {fontSize: 12, color: '#8faa8a'},
      axisLabel: {fontSize: 12, color: '#8faa8a'},
      splitLine: {lineStyle: {color: '#e9ede5', type: 'dashed'}},
      axisLine: {show: false},
      axisTick: {show: false}
    },
    series: chartData.value.series.map((item) => ({
      name: item.name,
      type: 'line',
      data: item.data,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: true,
      lineStyle: {width: 2.5, color: item.color},
      areaStyle: {color: getGradient(item.color)},
      itemStyle: {
        color: item.color,
        borderColor: '#fff',
        borderWidth: 2
      },
      emphasis: {
        focus: 'series',
        lineStyle: {width: 3}
      }
    }))
  }

  chart.setOption(option, true)
}

// 监听类型变化
watch(() => props.type, () => {
  fetchData()
})

// 窗口大小变化时重绘
onMounted(async () => {
  initChart()
  await fetchData()
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})
</script>
