<script setup>
import { ref, onMounted } from 'vue'
import { User, Goods, ShoppingCart, Money } from '@element-plus/icons-vue'
import { getAdminStats, getOrderList, getServiceList } from '@/api/admin'
import LineChart from '@/components/charts/LineChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import ChinaMap from '@/components/charts/ChinaMap.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const stats = ref({
  userTotal: 0,
  serviceTotal: 0,
  orderTotal: 0,
  amountTotal: 0
})

const pendingServicesCount = ref(0)

const fetchPendingServices = async () => {
  try {
    const res = await getServiceList({ page: 1, pageSize: 1, status: 0 })
    if (res.code === 200 && res.data) {
      pendingServicesCount.value = res.data.total || 0
    }
  } catch (err) {
    console.error('获取待审核服务数失败', err)
  }
}

const goToServices = () => {
  router.push('/services')
}

const recentOrders = ref([])

const fetchStats = async () => {
  try {
    const res = await getAdminStats()
    if (res.code === 200 && res.data) {
      stats.value = {
        userTotal: res.data.userTotal || 0,
        serviceTotal: res.data.serviceTotal || 0,
        orderTotal: res.data.orderTotal || 0,
        amountTotal: res.data.amountTotal || 0
      }
    }
  } catch (err) {
    console.error('获取统计数据失败', err)
  }
}

const fetchRecentOrders = async () => {
  try {
    const res = await getOrderList({ page: 1, pageSize: 5 })
    if (res.code === 200 && res.data) {
      recentOrders.value = res.data.list || []
    }
  } catch (err) {
    console.error('获取订单列表失败', err)
  }
}

const goToOrderDetail = (row) => {
  console.log('跳转到订单详情', row.id)
}

const formatPrice = (price) => {
  if (!price && price !== 0) return '¥0.00'
  return '¥' + parseFloat(price).toFixed(2)
}

const formatDateTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

const getStatusInfo = (status) => {
  const statusMap = {
    0: { text: '待支付', class: 'status-pending' },
    1: { text: '已支付', class: 'status-paid' },
    2: { text: '已完成', class: 'status-completed' },
    3: { text: '已取消', class: 'status-cancelled' }
  }
  return statusMap[status] || { text: '未知', class: '' }
}

onMounted(() => {
  fetchStats()
  fetchRecentOrders()
  fetchPendingServices()
})
</script>

<template>
  <div class="dashboard-page">
    <!-- 1. 统计卡片（KPI）- 四个横排 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon user-icon">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.userTotal }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon service-icon">
          <el-icon :size="28"><Goods /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.serviceTotal }}</div>
          <div class="stat-label">总服务数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon order-icon">
          <el-icon :size="28"><ShoppingCart /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.orderTotal }}</div>
          <div class="stat-label">总订单数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amount-icon">
          <el-icon :size="28"><Money /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ formatPrice(stats.amountTotal) }}</div>
          <div class="stat-label">总交易额</div>
        </div>
      </div>
    </div>

    <!-- 2. 全国地图（独占一行，很大） -->
    <div class="map-card">
      <ChinaMap height="630px" />
    </div>

    <!-- 3. 两个折线图 -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header"><h4>近7天用户增长趋势</h4></div>
        <LineChart type="user" height="280px" />
      </div>
      <div class="chart-card">
        <div class="chart-header"><h4>近7天订单趋势</h4></div>
        <LineChart type="order" height="280px" />
      </div>
    </div>

    <!-- 4. 饼图 + 柱状图 -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header"><h4>服务分类分布</h4></div>
        <PieChart height="320px" />
      </div>
      <div class="chart-card">
        <div class="chart-header"><h4>服务数量排行</h4></div>
        <BarChart height="320px" />
      </div>
    </div>

    <!-- 5. 待办事项卡片 -->
    <div class="todo-card">
      <div class="todo-header">
        <h3>待办事项</h3>
        <span class="more-link" @click="goToServices">查看更多 &gt;</span>
      </div>
      <div class="todo-items">
        <div class="todo-item" @click="goToServices">
          <div class="todo-icon pending-icon">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="todo-info">
            <div class="todo-title">待审核服务</div>
            <div class="todo-desc">用户发布的服务需要审核</div>
          </div>
          <div class="todo-count">{{ pendingServicesCount }}</div>
          <el-button type="primary" link size="small">去处理 &gt;</el-button>
        </div>
      </div>
    </div>

    <!-- 6. 最近订单 -->
    <div class="recent-orders">
      <div class="section-header">
        <h3>最近订单</h3>
        <span class="more-link">查看更多 &gt;</span>
      </div>

      <el-table :data="recentOrders" style="width: 100%" @row-click="goToOrderDetail" :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }">
        <el-table-column prop="id" label="订单号" min-width="180">
          <template #default="{ row }">
            <span class="order-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="service.title" label="服务名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="买家/卖家" min-width="140">
          <template #default="{ row }">
            <span>{{ row.buyer?.nickname || '-' }} / {{ row.seller?.nickname || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" min-width="100">
          <template #default="{ row }">
            <span class="amount">{{ formatPrice(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="90">
          <template #default="{ row }">
            <span :class="['status-badge', getStatusInfo(row.status).class]">
              {{ getStatusInfo(row.status).text }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
        </el-table-column>
      </el-table>

      <div v-if="recentOrders.length === 0" class="empty-orders">
        暂无订单数据
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  background: #fafdf7;
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 20px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef3f0;
  color: #9bb096;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e4e;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #8faa8a;
}

/* 地图卡片 */
.map-card {
  background: white;
  border-radius: 20px;
  padding: 8px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.map-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

/* 待办事项卡片 */
.todo-card {
  background: white;
  border-radius: 20px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.todo-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ede5;
}

.todo-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e4e;
  margin: 0;
}

.todo-items {
  display: flex;
  gap: 20px;
}

.todo-item {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #fafdf7;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.todo-item:hover {
  background: #f5f9f2;
  transform: translateY(-2px);
}

.todo-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.pending-icon {
  background: #fff9e6;
  color: #e6a23c;
}

.todo-info {
  flex: 1;
}

.todo-title {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e4e;
  margin-bottom: 4px;
}

.todo-desc {
  font-size: 12px;
  color: #8faa8a;
}

.todo-count {
  font-size: 28px;
  font-weight: 600;
  color: #b87c5a;
  margin-right: 16px;
}

/* 图表区域 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.chart-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ede5;
}

.chart-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e4e;
  margin: 0;
}

/* 最近订单区域 */
.recent-orders {
  background: white;
  border-radius: 20px;
  padding: 20px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 16px 24px;
  border-bottom: 1px solid #e9ede5;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e4e;
  margin: 0;
}

.more-link {
  font-size: 13px;
  color: #9bb096;
  cursor: pointer;
}

.more-link:hover {
  color: #b87c5a;
}

/* 表格样式 */
:deep(.el-table) {
  --el-table-border-color: #e9ede5;
  --el-table-header-bg-color: #fafdf7;
}

:deep(.el-table th) {
  font-weight: 500;
  color: #7c8b72;
  padding: 12px 0;
}

:deep(.el-table td) {
  color: #5a6e7c;
  padding: 12px 0;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background: #fafdf7;
}

:deep(.el-table__inner-wrapper) {
  width: 100%;
}

.order-id {
  font-family: monospace;
  font-size: 13px;
  color: #9bb096;
}

.amount {
  font-weight: 500;
  color: #b87c5a;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff9e6;
  color: #e6a23c;
}

.status-paid {
  background: #eef3f0;
  color: #9bb096;
}

.status-completed {
  background: #eef3f0;
  color: #67c23a;
}

.status-cancelled {
  background: #f5f2ea;
  color: #b8c4ae;
}

.empty-orders {
  text-align: center;
  padding: 60px 0;
  color: #b8c4ae;
  font-size: 14px;
}
</style>
