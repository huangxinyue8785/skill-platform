<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getOperationLogs } from '@/api/admin'
import {
  Check,
  Close,
  Lock,
  Unlock,
  Delete,
  Plus,
  Edit,
  IceCream,
  User,
  Service,
  Document,
  Setting,
  Folder,
  FolderAdd,
  FolderDelete,
  FolderOpened
} from '@element-plus/icons-vue'

// 列表数据
const logList = ref([])
const loading = ref(false)
const total = ref(0)

// 搜索参数
const searchForm = reactive({
  admin_id: '',
  action: '',
  start_time: '',
  end_time: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20
})

// 操作类型选项
const actionOptions = [
  { label: '全部', value: '' },
  // 登录相关
  { label: '管理员登录', value: '管理员登录' },
  // 审核相关
  { label: '审核通过', value: '审核通过' },
  { label: '审核拒绝', value: '审核拒绝' },
  // 用户管理
  { label: '禁用用户', value: '禁用用户' },
  { label: '启用用户', value: '启用用户' },
  { label: '冻结用户', value: '冻结用户' },
  { label: '删除用户', value: '删除用户' },
  // 管理员管理
  { label: '添加管理员', value: '添加管理员' },
  { label: '禁用管理员', value: '禁用管理员' },
  { label: '启用管理员', value: '启用管理员' },
  { label: '删除管理员', value: '删除管理员' },
  // 分类管理
  { label: '添加分类', value: '添加分类' },
  { label: '编辑分类', value: '编辑分类' },
  { label: '删除分类', value: '删除分类' }
]

// 获取操作类型配置
const getActionConfig = (action) => {
  // 登录相关
  if (action === '管理员登录') {
    return { type: 'primary', icon: User }
  }
  // 审核相关
  if (action.includes('通过')) {
    return { type: 'success', icon: Check }
  }
  if (action.includes('拒绝')) {
    return { type: 'danger', icon: Close }
  }
  // 用户管理
  if (action === '禁用用户' || action === '禁用管理员') {
    return { type: 'warning', icon: Lock }
  }
  if (action === '启用用户' || action === '启用管理员') {
    return { type: 'success', icon: Unlock }
  }
  if (action === '冻结用户') {
    return { type: 'info', icon: IceCream }
  }
  if (action === '删除用户' || action === '删除管理员') {
    return { type: 'danger', icon: Delete }
  }
  // 管理员管理
  if (action === '添加管理员') {
    return { type: 'primary', icon: Plus }
  }
  // 分类管理
  if (action === '添加分类') {
    return { type: 'success', icon: FolderAdd }
  }
  if (action === '编辑分类') {
    return { type: 'primary', icon: FolderOpened }
  }
  if (action === '删除分类') {
    return { type: 'danger', icon: FolderDelete }
  }
  return { type: 'info', icon: Edit }
}

// 获取目标类型图标
const getTargetIcon = (targetType) => {
  if (targetType === 'user') return User
  if (targetType === 'admin') return Setting
  if (targetType === 'service') return Service
  if (targetType === 'order') return Document
  if (targetType === 'category') return Folder
  return Edit
}

// 加载日志列表
const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      admin_id: searchForm.admin_id || undefined,
      action: searchForm.action || undefined,
      start_time: searchForm.start_time || undefined,
      end_time: searchForm.end_time || undefined
    }
    const res = await getOperationLogs(params)
    if (res.code === 200 && res.data) {
      logList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('获取操作日志失败', err)
    ElMessage.error('获取操作日志失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadLogs()
}

// 重置
const handleReset = () => {
  searchForm.admin_id = ''
  searchForm.action = ''
  searchForm.start_time = ''
  searchForm.end_time = ''
  pagination.page = 1
  loadLogs()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  loadLogs()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadLogs()
}

// 格式化时间
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

// 格式化详情显示
const formatDetailValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// 获取操作类型样式（用于标签）
const getActionType = (action) => {
  // 登录相关
  if (action === '管理员登录') return 'primary'
  // 审核相关
  if (action.includes('通过')) return 'success'
  if (action.includes('拒绝')) return 'danger'
  // 用户管理
  if (action.includes('禁用') || action.includes('删除')) return 'danger'
  if (action.includes('启用')) return 'success'
  if (action.includes('冻结')) return 'info'
  // 分类管理
  if (action === '添加分类') return 'success'
  if (action === '编辑分类') return 'primary'
  if (action === '删除分类') return 'danger'
  return 'info'
}

onMounted(() => {
  loadLogs()
})
</script>

<template>
  <div class="logs-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchForm.admin_id"
        placeholder="管理员ID"
        clearable
        style="width: 120px"
      />

      <el-select
        v-model="searchForm.action"
        placeholder="操作类型"
        clearable
        style="width: 140px"
        @change="handleSearch"
      >
        <el-option
          v-for="item in actionOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-date-picker
        v-model="searchForm.start_time"
        type="date"
        placeholder="开始日期"
        style="width: 140px"
        value-format="YYYY-MM-DD"
      />
      <span>至</span>
      <el-date-picker
        v-model="searchForm.end_time"
        type="date"
        placeholder="结束日期"
        style="width: 140px"
        value-format="YYYY-MM-DD"
      />

      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="handleReset">
        <el-icon><Refresh /></el-icon>
        重置
      </el-button>
    </div>

    <!-- 日志表格 -->
    <el-table
      :data="logList"
      v-loading="loading"
      stripe
      style="width: 100%"
      class="log-table"
      :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }"
    >
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-tag :type="getActionType(row.action)" size="small">
            <el-icon style="margin-right: 4px">
              <component :is="getActionConfig(row.action).icon" />
            </el-icon>
            {{ row.action }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="admin_name" label="操作人" width="120">
        <template #default="{ row }">
          {{ row.admin_name || row.admin_id || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作对象" min-width="130">
        <template #default="{ row }">
          <span v-if="row.target_type" class="target-info">
            <el-icon style="margin-right: 4px; font-size: 12px">
              <component :is="getTargetIcon(row.target_type)" />
            </el-icon>
            <span class="target-type">{{ row.target_type }}</span>
            <span class="target-id">#{{ row.target_id }}</span>
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作详情" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <div v-if="row.detail && Object.keys(row.detail).length" class="detail-content">
            <template v-if="row.action === '编辑分类' && row.detail.changes">
              <!-- 编辑分类特殊展示 -->
              <div class="detail-item">
                <span class="detail-key">分类:</span>
                <span class="detail-value">{{ row.detail.categoryName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-key">变更:</span>
                <span class="detail-value">{{ row.detail.changes.join('、') }}</span>
              </div>
            </template>
            <template v-else>
        <span v-for="(value, key) in row.detail" :key="key" class="detail-item">
          <span class="detail-key">{{ key }}:</span>
          <span class="detail-value">{{ formatDetailValue(value) }}</span>
        </span>
            </template>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP地址" width="140">
        <template #default="{ row }">
          <code>{{ row.ip || '-' }}</code>
        </template>
      </el-table-column>
      <el-table-column label="操作时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.create_time) }}
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
  </div>
</template>

<style scoped>
.logs-page {
  background: #fafdf7;
  padding: 0;
}

/* 搜索栏 - 与其他页面一致 */
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

/* 表格容器 - 与其他页面一致 */
.log-table {
  background: white;
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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

/* 操作对象信息 */
.target-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f5f9f2;
  padding: 2px 8px;
  border-radius: 12px;
}

.target-type {
  font-weight: 500;
  color: #7c8b72;
  text-transform: capitalize;
}

.target-id {
  color: #b8c4ae;
  font-family: monospace;
}

/* 详情内容 */
.detail-content {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-item {
  font-size: 12px;
  background: #f5f9f2;
  padding: 2px 8px;
  border-radius: 12px;
}

.detail-key {
  color: #8faa8a;
  margin-right: 4px;
}

.detail-value {
  color: #5a6e7c;
}

/* IP地址样式 */
code {
  background: #f5f9f2;
  padding: 2px 6px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  color: #5a6e7c;
}

/* 分页 - 与其他页面一致 */
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  background: white;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
</style>
