<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  height: {
    type: String,
    default: '600px'  // 调高一点
  }
})

const chartRef = ref(null)
let chart = null

// 获取服务数据并按学校聚合
const fetchData = async () => {
  try {
    const response = await fetch('/api/stats/school-service', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    })
    const res = await response.json()

    if (res.code === 200 && res.data) {
      const schoolStats = res.data

      // 转换为散点图数据格式，只取服务数量 > 0 的学校
      const scatterData = schoolStats
        .filter(item => item.latitude && item.longitude && item.service_count > 0)
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
      {name: '北京大学', value: [116.31, 39.99, 15]},
      {name: '清华大学', value: [116.33, 40.00, 20]},
      {name: '上海交通大学', value: [121.43, 31.03, 12]}
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
      subtext: `共 ${scatterData.length} 所学校有服务，气泡大小代表服务数量`,
      left: 'center',
      top: 5,
      textStyle: {color: '#7c8b72', fontSize: 16},
      subtextStyle: {color: '#b8c4ae', fontSize: 12}
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.componentSubType === 'scatter') {
          return `${params.name}<br/>服务数量: <strong>${params.value[2]}</strong>`
        }
        return params.name
      },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2eae0',
      textStyle: {color: '#5a6e7c'}
    },
    geo: {
      map: 'china',
      roam: true,           // 允许缩放和拖拽
      zoom: 1.8,            // ✅ 初始缩放更大，显示更全
      center: [108, 32],    // ✅ 中国地图中心（兰州附近）
      aspectScale: 0.75,    // ✅ 宽高比，让地图更协调
      label: {show: false},
      emphasis: {
        label: {show: true, color: '#7c8b72'},
        itemStyle: {areaColor: '#e6ede2'}
      },
      itemStyle: {
        areaColor: '#f5f9f2',
        borderColor: '#d4decb',
        borderWidth: 0.5
      }
    },
    series: [{
      type: 'scatter',      // ✅ 改成普通散点图，不用涟漪动画（减少卡顿）
      coordinateSystem: 'geo',
      data: scatterData,
      symbolSize: (val) => {
        // ✅ 气泡调小：最小6，最大25
        return 6 + (val[2] / maxCount) * 19
      },
      label: {
        show: false
      },
      itemStyle: {
        color: '#9bb096',
        shadowBlur: 5,
        shadowColor: '#9bb096',
        opacity: 0.8        // ✅ 半透明，重叠时也能看到密度
      },
      emphasis: {
        scale: 1.3,
        itemStyle: {
          opacity: 1,
          shadowBlur: 10
        },
        label: {
          show: true,
          formatter: '{b}',
          color: '#5a6e7c',
          fontSize: 11,
          offset: [0, -10]
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
      textStyle: {color: '#7c8b72'},
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
