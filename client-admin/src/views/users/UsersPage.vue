<script setup>
import { ref, onMounted, reactive } from 'vue'
import { WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getUserList, updateUserStatus, deleteUser, handleViolation } from '@/api/admin'
import { getImageUrl } from '@/utils/request'

// 列表数据
const userList = ref([])
const loading = ref(false)
const total = ref(0)

// 搜索参数
const searchForm = reactive({
  keyword: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 状态选项
const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
  { label: '冻结', value: 2 }
]

// ==================== 用户详情弹窗 ====================
const detailDialogVisible = ref(false)
const currentDetailUser = ref(null)
const detailLoading = ref(false)

// 查看详情
const handleViewDetail = (row) => {
  currentDetailUser.value = row
  detailDialogVisible.value = true
}

// ==================== 违规处理弹窗 ====================
const violationDialogVisible = ref(false)
const currentViolationUser = ref(null)
const submittingViolation = ref(false)

const violationForm = reactive({
  violationType: '',
  violationReason: ''
})

const violationTypeOptions = [
  { label: '发布违规内容', value: '发布违规内容' },
  { label: '恶意刷单', value: '恶意刷单' },
  { label: '骚扰其他用户', value: '骚扰用户' },
  { label: '虚假服务', value: '虚假服务' },
  { label: '诱导交易', value: '诱导交易' },
  { label: '其他违规', value: '其他' }
]

// 打开违规处理弹窗
const openViolationDialog = (row) => {
  currentViolationUser.value = row
  violationForm.violationType = ''
  violationForm.violationReason = ''
  violationDialogVisible.value = true
}

// 提交违规处理
const submitViolation = async () => {
  if (!violationForm.violationType) {
    ElMessage.warning('请选择违规类型')
    return
  }

  submittingViolation.value = true

  try {
    const res = await handleViolation({
      userId: currentViolationUser.value.id,
      violationType: violationForm.violationType,
      violationReason: violationForm.violationReason
    })

    if (res.code === 200) {
      ElMessage.success(res.data?.message || '处理成功')
      violationDialogVisible.value = false
      loadUserList()
    }
  } catch (err) {
    console.error('违规处理失败', err)
    ElMessage.error(err.message || '操作失败')
  } finally {
    submittingViolation.value = false
  }
}

// ==================== 手动操作函数 ====================
// 手动禁用用户（永久封号）
const handleDisable = (row) => {
  ElMessageBox.confirm(
    `确定要永久禁用用户 "${row.username}" 吗？禁用后用户将无法登录，此操作可恢复。`,
    '提示',
    {
      confirmButtonText: '确定禁用',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await updateUserStatus(row.id, 0)
      if (res.code === 200) {
        ElMessage.success('禁用成功')
        loadUserList()
      }
    } catch (err) {
      console.error('禁用失败', err)
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

// 手动启用用户（解封）
const handleEnable = (row) => {
  ElMessageBox.confirm(
    `确定要启用用户 "${row.username}" 吗？启用后用户可以正常登录。`,
    '提示',
    {
      confirmButtonText: '确定启用',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await updateUserStatus(row.id, 1)
      if (res.code === 200) {
        ElMessage.success('启用成功')
        loadUserList()
      }
    } catch (err) {
      console.error('启用失败', err)
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

// 手动解冻用户
const handleUnfreeze = (row) => {
  ElMessageBox.confirm(
    `确定要解冻用户 "${row.username}" 吗？解冻后用户可以正常登录。`,
    '提示',
    {
      confirmButtonText: '确定解冻',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await updateUserStatus(row.id, 1)
      if (res.code === 200) {
        ElMessage.success('解冻成功')
        loadUserList()
      }
    } catch (err) {
      console.error('解冻失败', err)
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

// ==================== 原有函数 ====================
// 获取状态文本
const getStatusText = (status) => {
  const map = { 0: '禁用', 1: '正常', 2: '冻结' }
  return map[status] || '未知'
}

// 获取性别文本
const getGenderText = (gender) => {
  const map = { 0: '未知', 1: '男', 2: '女' }
  return map[gender] || '未知'
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
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 加载用户列表
const loadUserList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status !== '' ? searchForm.status : undefined,
    }
    console.log('请求参数：', params)

    const res = await getUserList(params)
    if (res.code === 200 && res.data) {
      userList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('获取用户列表失败', err)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadUserList()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  loadUserList()
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  loadUserList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadUserList()
}

// 删除用户
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${row.username}" 吗？此操作不可恢复！`,
    '危险操作',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      const res = await deleteUser(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        if (userList.value.length === 1 && pagination.page > 1) {
          pagination.page--
        }
        loadUserList()
      }
    } catch (err) {
      console.error('删除失败', err)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadUserList()
})
</script>

<template>
  <div class="users-page">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchForm.keyword"
        placeholder="请输入用户名/昵称"
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
        placeholder="用户状态"
        clearable
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
      :data="userList"
      v-loading="loading"
      stripe
      style="width: 100%"
      class="user-table"
      :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }"
    >
      <el-table-column prop="id" label="ID" min-width="40" />
      <el-table-column label="头像" min-width="60">
        <template #default="{ row }">
          <el-avatar :size="36" :src="getImageUrl(row.avatar)">
            {{ row.nickname?.charAt(0) || '用' }}
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" min-width="90" />
      <el-table-column prop="nickname" label="昵称" min-width="80" />
      <el-table-column prop="phone" label="手机号" min-width="110" />
      <el-table-column label="性别" min-width="60">
        <template #default="{ row }">
          {{ getGenderText(row.gender) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="70">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'danger' : 'warning'" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="service_count" label="发布数" min-width="60" />
      <el-table-column prop="order_count" label="订单数" min-width="60" />
      <el-table-column label="注册时间" min-width="120">
        <template #default="{ row }">
          {{ formatDateTime(row.create_time) }}
        </template>
      </el-table-column>
      <!-- 操作列 -->
      <el-table-column label="操作" fixed="right" width="280">
        <template #default="{ row }">
          <div class="action-buttons">
            <!-- 详情 -->
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              详情
            </el-button>

            <!-- 违规处理 -->
            <el-button type="warning" link size="small" @click="openViolationDialog(row)">
              违规处理
            </el-button>

            <!-- 根据状态显示不同按钮 -->
            <!-- 正常状态：显示禁用（永久封号） -->
            <el-button
              v-if="row.status === 1"
              type="danger"
              link
              size="small"
              @click="handleDisable(row)"
            >
              禁用
            </el-button>

            <!-- 冻结状态：显示解冻 -->
            <el-button
              v-if="row.status === 2"
              type="success"
              link
              size="small"
              @click="handleUnfreeze(row)"
            >
              解冻
            </el-button>

            <!-- 禁用状态：显示启用 -->
            <el-button
              v-if="row.status === 0"
              type="success"
              link
              size="small"
              @click="handleEnable(row)"
            >
              启用
            </el-button>

            <!-- 删除 -->
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
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

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" :title="`用户详情 - ${currentDetailUser?.username || ''}`" width="550px">
      <div v-loading="detailLoading" class="user-detail">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-info">
            <div class="avatar">
              <el-avatar :size="80" :src="getImageUrl(currentDetailUser?.avatar)">
                {{ currentDetailUser?.nickname?.charAt(0) || '用' }}
              </el-avatar>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">用户名：</span>
                <span class="value">{{ currentDetailUser?.username }}</span>
              </div>
              <div class="info-item">
                <span class="label">昵称：</span>
                <span class="value">{{ currentDetailUser?.nickname }}</span>
              </div>
              <div class="info-item">
                <span class="label">手机号：</span>
                <span class="value">{{ currentDetailUser?.phone || '未设置' }}</span>
              </div>
              <div class="info-item">
                <span class="label">邮箱：</span>
                <span class="value">{{ currentDetailUser?.email || '未设置' }}</span>
              </div>
              <div class="info-item">
                <span class="label">性别：</span>
                <span class="value">{{ getGenderText(currentDetailUser?.gender) }}</span>
              </div>
              <div class="info-item">
                <span class="label">学校：</span>
                <span class="value">{{ currentDetailUser?.school_name || '未设置' }}</span>
              </div>
              <div class="info-item">
                <span class="label">账号状态：</span>
                <el-tag :type="currentDetailUser?.status === 1 ? 'success' : currentDetailUser?.status === 0 ? 'danger' : 'warning'" size="small">
                  {{ getStatusText(currentDetailUser?.status) }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="label">注册时间：</span>
                <span class="value">{{ formatDateTime(currentDetailUser?.create_time) }}</span>
              </div>
              <div class="info-item">
                <span class="label">最后登录：</span>
                <span class="value">{{ formatDateTime(currentDetailUser?.last_login_time) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 统计数据 -->
        <div class="detail-section">
          <h4>统计数据</h4>
          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-number">{{ currentDetailUser?.service_count || 0 }}</div>
              <div class="stat-label">发布服务</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ currentDetailUser?.order_count || 0 }}</div>
              <div class="stat-label">订单数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ currentDetailUser?.favorite_count || 0 }}</div>
              <div class="stat-label">收藏数</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ currentDetailUser?.violation_count || 0 }}</div>
              <div class="stat-label">违规次数</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 违规处理弹窗 -->
    <el-dialog v-model="violationDialogVisible" title="违规处理" width="500px">
      <el-form :model="violationForm" label-width="80px">
        <el-form-item label="用户">
          <span class="user-info">
            {{ currentViolationUser?.username }} ({{ currentViolationUser?.nickname }})
          </span>
        </el-form-item>

        <el-form-item label="违规类型" required>
          <el-select v-model="violationForm.violationType" placeholder="请选择违规类型" style="width: 100%">
            <el-option
              v-for="item in violationTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="违规原因">
          <el-input
            v-model="violationForm.violationReason"
            type="textarea"
            :rows="3"
            placeholder="请输入违规原因（选填）"
          />
        </el-form-item>

        <el-form-item label="处罚规则">
          <div class="punishment-rules">
            <div class="rule-item rule-level-1">
              <el-icon><WarningFilled /></el-icon>
              <span>第1次违规：冻结3天</span>
            </div>
            <div class="rule-item rule-level-2">
              <el-icon><WarningFilled /></el-icon>
              <span>第2次违规：冻结7天</span>
            </div>
            <div class="rule-item rule-level-3">
              <el-icon><CircleCloseFilled /></el-icon>
              <span>第3次及以上：永久封号</span>
            </div>
          </div>
        </el-form-item>

        <div v-if="currentViolationUser" class="violation-info">
          <div class="info-title">当前违规记录：</div>
          <div class="info-content">
            已违规次数：<span class="count">{{ currentViolationUser.violation_count || 0 }}</span> 次
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="violationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitViolation" :loading="submittingViolation">
          确定处罚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
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
.user-table {
  background: white;
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  flex-wrap: wrap;
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

/* 用户详情弹窗样式 */
.user-detail {
  padding: 0 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e4e;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ede5;
}

.detail-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.avatar {
  flex-shrink: 0;
}

.info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}

.info-item {
  display: flex;
  align-items: baseline;
  font-size: 14px;
}

.info-item .label {
  width: 70px;
  color: #8faa8a;
  flex-shrink: 0;
}

.info-item .value {
  color: #5a6e7c;
}

/* 统计数据卡片 */
.stats-cards {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 80px;
  text-align: center;
  padding: 16px 12px;
  background: #f5f9f2;
  border-radius: 12px;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #9bb096;
  line-height: 1.2;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #b8c4ae;
}

/* 违规处理弹窗样式 */
.user-info {
  font-weight: 500;
  color: #2c3e4e;
}

.punishment-rules {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-level-1 {
  background: #fff7e6;
  color: #e6a23c;
}

.rule-level-1 .el-icon {
  color: #e6a23c;
}

.rule-level-2 {
  background: #fef0e6;
  color: #f39c12;
}

.rule-level-2 .el-icon {
  color: #f39c12;
}

.rule-level-3 {
  background: #fef0f0;
  color: #f56c6c;
}

.rule-level-3 .el-icon {
  color: #f56c6c;
}

.violation-info {
  margin-top: 16px;
  padding: 12px;
  background: #f5f9f2;
  border-radius: 8px;
}

.info-title {
  font-size: 13px;
  font-weight: 500;
  color: #7c8b72;
  margin-bottom: 8px;
}

.info-content {
  font-size: 14px;
  color: #5a6e7c;
}

.info-content .count {
  font-size: 18px;
  font-weight: 600;
  color: #e6a23c;
}
</style>
