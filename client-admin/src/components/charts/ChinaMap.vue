<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  height: {
    type: String,
    default: '450px'
  }
})

const chartRef = ref(null)
let chart = null

// 获取服务数据并按学校聚合
const fetchData = async () => {
  try {
    // 调用后端接口获取学校服务统计数据
    const response = await fetch('/api/stats/school-service', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    })
    const res = await response.json()

    if (res.code === 200 && res.data) {
      const schoolStats = res.data

      // 转换为散点图数据格式
      const scatterData = schoolStats
        .filter(item => item.latitude && item.longitude)
        .map(item => ({
          name: item.school_name,
          value: [item.longitude, item.latitude, item.service_count]
        }))

      updateChart(scatterData)
    }
  } catch (err) {
    console.error('获取服务数据失败', err)
    // 使用模拟数据
    updateChart([
      { name: '北京大学', value: [116.31, 39.99, 15] },
      { name: '清华大学', value: [116.33, 40.00, 20] },
      { name: '上海交通大学', value: [121.43, 31.03, 12] }
    ])
  }
}

// 更新图表
const updateChart = (scatterData) => {
  if (!chart) return

  // 计算最大服务数
  const maxCount = Math.max(...scatterData.map(item => item.value[2]), 1)

  const option = {
    title: {
      text: '全国高校服务分布图',
      subtext: '气泡大小代表服务数量',
      left: 'center',
      top: 10,
      textStyle: { color: '#7c8b72', fontSize: 16 },
      subtextStyle: { color: '#b8c4ae', fontSize: 12 }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.componentSubType === 'effectScatter') {
          return `${params.name}<br/>服务数量: <strong>${params.value[2]}</strong>`
        }
        return params.name
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2eae0',
      textStyle: { color: '#5a6e7c' }
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.2,
      center: [108, 35],
      label: { show: false },
      emphasis: {
        label: { show: true, color: '#7c8b72' },
        itemStyle: { areaColor: '#e6ede2' }
      },
      itemStyle: {
        areaColor: '#f5f9f2',
        borderColor: '#d4decb',
        borderWidth: 1
      }
    },
    series: [{
      type: 'effectScatter',
      coordinateSystem: 'geo',
      data: scatterData,
      symbolSize: (val) => {
        // 气泡大小：最小12，最大50
        return 12 + (val[2] / maxCount) * 38
      },
      showEffectOn: 'render',
      rippleEffect: {
        brushType: 'stroke',
        scale: 3,
        period: 4
      },
      label: {
        show: false  // 太多学校会重叠，默认不显示标签
      },
      itemStyle: {
        color: '#9bb096',
        shadowBlur: 10,
        shadowColor: '#9bb096'
      },
      emphasis: {
        scale: 1.5,
        label: {
          show: true,
          formatter: '{b}',
          color: '#5a6e7c',
          fontSize: 11
        }
      }
    }],
    visualMap: {
      min: 0,
      max: maxCount,
      calculable: true,
      inRange: {
        color: ['#d4decb', '#9bb096', '#6b8c69']
      },
      textStyle: { color: '#7c8b72' },
      left: 'right',
      top: 'bottom'
    }
  }

  chart.setOption(option, true)
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    fetch('/china.json')
      .then(res => res.json())
      .then(data => {
        echarts.registerMap('china', data)
        fetchData()
      })
      .catch(() => {
        // 如果 china.json 还没下载，先用内置的简单地图
        console.warn('中国地图数据未找到，请下载 china.json 放到 public 目录')
        fetchData()
      })
  }
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => {
    chart?.resize()
  })
})
</script>
