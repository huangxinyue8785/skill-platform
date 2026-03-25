<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, View } from '@element-plus/icons-vue'
import { getOrderList, getOrderDetail } from '@/api/admin'

// 列表数据
const orderList=ref([])
const loading=ref(false)
const total=ref(0)

// 搜索参数
const searchForm = reactive({
  keyword: '',
  status: ''
})

// 分页
const pagination =reactive({
  page:1,
  pageSize:10
})

// 状态选项
const statusOptions=[
  {label:'全部',value:''},
  { label: '待支付', value: '0' },
  { label: '已支付', value: '1' },
  { label: '已完成', value: '2' },
  { label: '已取消', value: '3' }
]

//详情弹窗
const detailVisible = ref(false)
const currentOrder = ref(null)
const detailLoading = ref(false)

// 获取状态文本
const getStatusText = (status) =>{
  const map={ 0: '待支付', 1: '已支付', 2: '已完成', 3: '已取消'}
  return map[status] || '未知'
}

// 获取状态样式
const getStatusType = (status) =>{
  const map = { 0: 'warning', 1: 'success', 2: 'info', 3: 'danger' }
  return map[status] || 'info'
}

// 加载订单列表
const loadOrderList = async ()=>{
  loading.value = true
  try{
    const params ={
      page:pagination.page,
      pageSize:pagination.pageSize,
      status:searchForm.status !== '' ? parseInt(searchForm.status) : undefined,
      keyword:searchForm.keyword || undefined
    }
    const res = await getOrderList(params)
    console.log('订单列表返回：',res)
    if(res.code === 200 && res.data){
      orderList.value =res.data.list || []
      total.value=res.data.total || 0
    }
  }catch (err){
    console.error('获取订单列表失败',err)
    ElMessage.error('获取订单列表失败')
  }finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadOrderList()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  loadOrderList()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  loadOrderList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadOrderList()
}

// 查看详情
const handleViewDetail = async (row) => {
  detailLoading.value = true
  detailVisible.value = true
  try {
    const res = await getOrderDetail(row.id)
    if (res.code === 200 && res.data) {
      currentOrder.value = res.data
    }
  } catch (err) {
    console.error('获取订单详情失败', err)
    ElMessage.error('获取订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 格式化金额
const formatPrice = (price) => {
  if (!price && price !== 0) return '¥0.00'
  return '¥' + parseFloat(price).toFixed(2)
}

// 格式化日期时间
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

onMounted(() => {
  loadOrderList()
})
</script>

<template>
<div class="orders-page">
  <!-- 搜索栏 -->
  <div class="search-bar">
    <el-input
      v-model="searchForm.keyword"
      placeholder="请输入订单号"
      clearable
      style="width: 250px"
      @keyup.enter="handleSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <el-select
      v-model="searchForm.status"
      placeholder="订单状态"
      style="width: 120px"
      @change="handleSearch"
    >
      <el-option
        v-for="item in statusOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>

    <el-button type="primary" @click="handleSearch">
      <el-icon><Search /></el-icon>
      搜索
    </el-button>
    <el-button @click="handleReset">
      <el-icon><Refresh /></el-icon>
      重置
    </el-button>
  </div>

  <el-table
    :data="orderList"
    v-loading="loading"
    stripe
    style="width: 100%"
    class="order-table"
    :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }"
  >
    <el-table-column prop="id" label="订单号" min-width="200" />
    <el-table-column prop="service.title" label="服务名称" min-width="180" show-overflow-tooltip />
    <el-table-column label="买家" min-width="100">
      <template #default="{ row }">
        {{ row.buyer?.nickname || '-' }}
      </template>
    </el-table-column>
    <el-table-column label="卖家" min-width="100">
      <template #default="{ row }">
        {{ row.seller?.nickname || '-' }}
      </template>
    </el-table-column>
    <el-table-column prop="amount" label="金额" min-width="100">
      <template #default="{ row }">
        {{ formatPrice(row.amount) }}
      </template>
    </el-table-column>
    <el-table-column label="状态" min-width="90">
      <template #default="{ row }">
        <el-tag :type="getStatusType(row.status)" size="small">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="创建时间" min-width="160">
      <template #default="{ row }">
        {{ formatDateTime(row.createTime) }}
      </template>
    </el-table-column>
    <!-- 操作列固定在右侧，固定宽度 -->
    <el-table-column label="操作" fixed="right" width="80">
      <template #default="{ row }">
        <div class="action-buttons">
          <el-button type="primary" link size="small" @click.stop="handleViewDetail(row)">
            <el-icon><View /></el-icon>
            详情
          </el-button>
        </div>
      </template>
    </el-table-column>
  </el-table>

  <!-- 分页 -->
  <div class="pagination">
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />
  </div>

  <!-- 详情弹窗 -->
  <el-dialog v-model="detailVisible" title="订单详情" width="600px" v-loading="detailLoading">
    <div v-if="currentOrder" class="order-detail">
      <div class="detail-row">
        <span class="label">订单号：</span>
        <span class="value">{{ currentOrder.id }}</span>
      </div>
      <div class="detail-row">
        <span class="label">服务名称：</span>
        <span class="value">{{ currentOrder.service?.title }}</span>
      </div>
      <div class="detail-row">
        <span class="label">买家：</span>
        <span class="value">{{ currentOrder.buyer?.nickname }} ({{ currentOrder.buyer?.phone || '无电话' }})</span>
      </div>
      <div class="detail-row">
        <span class="label">卖家：</span>
        <span class="value">{{ currentOrder.seller?.nickname }} ({{ currentOrder.seller?.phone || '无电话' }})</span>
      </div>
      <div class="detail-row">
        <span class="label">订单金额：</span>
        <span class="value price">{{ formatPrice(currentOrder.amount) }}</span>
      </div>
      <div class="detail-row">
        <span class="label">订单状态：</span>
        <el-tag :type="getStatusType(currentOrder.status)" size="small">
          {{ getStatusText(currentOrder.status) }}
        </el-tag>
      </div>
      <div class="detail-row">
        <span class="label">联系方式：</span>
        <span class="value">{{ currentOrder.contactInfo || '-' }}</span>
      </div>
      <div class="detail-row">
        <span class="label">特殊要求：</span>
        <div class="value desc">{{ currentOrder.requirements || '无' }}</div>
      </div>
      <div class="detail-row">
        <span class="label">预约时间：</span>
        <span class="value">{{ currentOrder.serviceTime ? formatDateTime(currentOrder.serviceTime) : '无' }}</span>
      </div>
      <div class="detail-row">
        <span class="label">支付时间：</span>
        <span class="value">{{ currentOrder.payTime ? formatDateTime(currentOrder.payTime) : '未支付' }}</span>
      </div>
      <div class="detail-row">
        <span class="label">创建时间：</span>
        <span class="value">{{ formatDateTime(currentOrder.createTime) }}</span>
      </div>
    </div>
  </el-dialog>
</div>
</template>

<style scoped>
.orders-page {
  background: #fafdf7;
  padding: 0;
}

/* 搜索栏 */
.search-bar {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 表格容器 */
.order-table {
  background: white;
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

/* 确保表格占满宽度 */
:deep(.el-table__inner-wrapper) {
  width: 100%;
}

:deep(.el-table th) {
  background: #f5f9f2;
  color: #7c8b72;
  font-weight: 500;
  padding: 12px 0;
}

:deep(.el-table td) {
  color: #5a6e7c;
  padding: 12px 0;
}

/* 操作按钮组样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* 分页 */
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  background: white;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 详情弹窗样式 */
.order-detail {
  padding: 8px 0;
}

.detail-row {
  display: flex;
  margin-bottom: 16px;
}

.detail-row .label {
  width: 90px;
  color: #7c8b72;
  flex-shrink: 0;
}

.detail-row .value {
  color: #5a6e7c;
  flex: 1;
}

.detail-row .price {
  color: #b87c5a;
  font-weight: 500;
}

.detail-row .desc {
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
