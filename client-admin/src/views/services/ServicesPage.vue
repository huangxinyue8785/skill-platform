<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, View, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { getServiceList, auditService } from '@/api/admin'
import { getImageUrl } from '@/utils/request'

// 列表数据
const serviceList = ref([])
const loading = ref(false)
const total = ref(0)

// 搜索参数
const searchForm = reactive({
  keyword: '',
  status: ''  // 默认显示待审核
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: '0' },
  { label: '已上架', value: '1' },
  { label: '已下架', value: '2' },
  { label: '不通过', value: '3' }
]

// 详情弹窗
const detailVisible = ref(false)
const currentService = ref(null)

// 审核弹窗
const auditVisible = ref(false)
const auditForm = reactive({
  id: null,
  status: 1,
  reason: ''
})

// 获取状态文本
const getStatusText = (status) => {
  const map = { 0: '待审核', 1: '已上架', 2: '已下架', 3: '不通过' }
  return map[status] || '未知'
}

// 获取状态样式
const getStatusType = (status) => {
  const map = { 0: 'warning', 1: 'success', 2: 'info', 3: 'danger' }
  return map[status] || 'info'
}

// 加载服务列表
const loadServiceList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: searchForm.status !== '' ? parseInt(searchForm.status) : undefined,
      keyword: searchForm.keyword || undefined
    }
    const res = await getServiceList(params)
    console.log('服务列表返回：', res)
    if (res.code === 200 && res.data) {
      // 后端返回的 list 可能直接就是数组
      serviceList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('获取服务列表失败', err)
    ElMessage.error('获取服务列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadServiceList()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  loadServiceList()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  loadServiceList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadServiceList()
}

// 查看详情
const handleViewDetail = (row) => {
  currentService.value = row
  detailVisible.value = true
}

// 打开审核弹窗
const handleOpenAudit = (row, status) => {
  auditForm.id = row.id
  auditForm.status = status
  auditForm.reason = ''
  auditVisible.value = true
}

// 提交审核
const handleAudit = async () => {
  if (auditForm.status === 3 && !auditForm.reason.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }

  const actionText = auditForm.status === 1 ? '通过' : '拒绝'

  try {
    const res = await auditService(auditForm.id, auditForm.status, auditForm.reason)
    if (res.code === 200) {
      ElMessage.success(`审核${actionText}成功`)
      auditVisible.value = false
      loadServiceList()
    }
  } catch (err) {
    console.error('审核失败', err)
  }
}

// 格式化价格
const formatPrice = (price) => {
  if (!price && price !== 0) return '¥0'
  return '¥' + parseFloat(price).toFixed(2)
}

// 格式化日期时间（完整版）
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
  loadServiceList()
})
</script>

<template>
  <div class="services-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchForm.keyword"
        placeholder="请输入服务标题"
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
        placeholder="审核状态"
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
      :data="serviceList"
      v-loading="loading"
      stripe
      style="width: 100%"
      class="service-table"
      :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }"
    >
      <el-table-column prop="id" label="ID" min-width="60" />
      <el-table-column label="图片" min-width="70">
        <template #default="{ row }">
          <el-image
            v-if="row.images && row.images[0]"
            :src="getImageUrl(row.images[0])"
            fit="cover"
            style="width: 40px; height: 40px; border-radius: 8px;"
          >
            <template #error>
              <div class="image-placeholder">无图</div>
            </template>
          </el-image>
          <div v-else class="image-placeholder">无图</div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="服务标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="user_nickname" label="发布人" min-width="100" />
      <el-table-column prop="price" label="价格" min-width="90">
        <template #default="{ row }">
          {{ formatPrice(row.price) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.create_time) }}
        </template>
      </el-table-column>
      <!-- 操作列固定在右侧，固定宽度 -->
      <el-table-column label="操作" fixed="right" width="180">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <template v-if="row.status === 0">
              <el-button type="success" link size="small" @click="handleOpenAudit(row, 1)">
                <el-icon><CircleCheck /></el-icon>
                通过
              </el-button>
              <el-button type="danger" link size="small" @click="handleOpenAudit(row, 3)">
                <el-icon><CircleClose /></el-icon>
                拒绝
              </el-button>
            </template>
            <span v-else class="audited-text">已审核</span>
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
    <el-dialog v-model="detailVisible" title="服务详情" width="600px">
      <div v-if="currentService" class="service-detail">
        <div class="detail-row">
          <span class="label">服务标题：</span>
          <span class="value">{{ currentService.title }}</span>
        </div>
        <div class="detail-row">
          <span class="label">发布人：</span>
          <span class="value">{{ currentService.user_nickname }}</span>
        </div>
        <div class="detail-row">
          <span class="label">价格：</span>
          <span class="value price">{{ formatPrice(currentService.price) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">联系方式：</span>
          <span class="value">{{ currentService.contact }}</span>
        </div>
        <div class="detail-row">
          <span class="label">服务描述：</span>
          <div class="value desc">{{ currentService.description }}</div>
        </div>
        <div v-if="currentService.images && currentService.images.length" class="detail-row">
          <span class="label">服务图片：</span>
          <div class="images-list">
            <el-image
              v-for="(img, idx) in currentService.images"
              :key="idx"
              :src="getImageUrl(img)"
              fit="cover"
              class="detail-image"
              :preview-src-list="currentService.images.map(i => getImageUrl(i))"
            />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditVisible" :title="auditForm.status === 1 ? '审核通过' : '审核拒绝'" width="450px">
      <el-form :model="auditForm" ref="auditFormRef">
        <el-form-item
          v-if="auditForm.status === 3"
          label="拒绝原因"
          prop="reason"
          :rules="[{ required: true, message: '请填写拒绝原因', trigger: 'blur' }]"
        >
          <el-input
            v-model="auditForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拒绝原因（必填）"
          />
        </el-form-item>
        <el-form-item v-else label="确认通过">
          <p>确认该服务内容符合规范，通过审核后将在首页展示。</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAudit" :loading="auditSubmitting">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.services-page {
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
.service-table {
  background: white;
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 表格内容最小宽度 */
.service-table :deep(.el-table__body-wrapper) {
  min-width: 1000px;
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

/* 图片占位 */
.image-placeholder {
  width: 40px;
  height: 40px;
  background: #f5f2ea;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #b8c4ae;
}

/* 已审核文字 */
.audited-text {
  color: #b8c4ae;
  font-size: 12px;
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
.service-detail {
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

.images-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
}

/* 操作按钮组样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
}
</style>

