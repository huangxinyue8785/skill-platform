<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAdminList, addAdmin, updateAdminStatus, deleteAdmin } from '@/api/admin'

const adminList = ref([])
const loading=ref(false)
const total=ref(0)

const pagination=reactive({
  page:1,
  pageSize:10
})

const dialogVisible=ref(false)
const submitting=ref(false)

const form=reactive({
  username:'',
  password:'',
  real_name:'',
  email:'',
  phone:'',
  is_super:0
})

const rules=reactive({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度3-20位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字、下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度6-20位', trigger: 'blur' }
  ],
  real_name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度2-20位', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
})

const formRef=ref(null)

const currentAdminId = computed(()=>{
  const adminInfo =localStorage.getItem('admin_info')
  if(adminInfo){
    return JSON.parse(adminInfo).id
  }
  return null
})

// 加载管理员列表
const loadAdminList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
      // 管理员列表不需要搜索，所以没有 keyword 和 status
    }
    const res = await getAdminList(params)
    if (res.code === 200 && res.data) {
      adminList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (err) {
    console.error('获取管理员列表失败', err)
    ElMessage.error('获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

// 打开弹窗，重置表单
const handleAdd=()=>{
  form.username=''
  form.password=''
  form.real_name=''
  form.email=''
  form.phone=''
  form.is_super=0
  dialogVisible.value = true
}

const handleSubmit=async ()=>{
  // 1. 表单验证 await formRef.value.validate()
  try{
    await formRef.value.validate()
  }catch (err){
    return
  }
  submitting.value = true
  try{
    // 2. 调用 addAdmin 接口
    const res=await addAdmin({
      username: form.username,
      password: form.password,
      real_name: form.real_name,
      email: form.email,
      phone: form.phone || null,
      is_super:form.is_super
    })
    // 3. 成功后关闭弹窗，刷新列表，提示成功
    if(res.code ===200){
      ElMessage.success('添加成功')
      dialogVisible.value=false
      loadAdminList()
    }
  }catch (err){
    // 4. 失败提示错误
    console.error('添加失败', err)
  }finally {
    submitting.value = false
  }
}

// 启用/禁用管理员
const handleToggleStatus = (row) => {
  // 1. 确定操作类型（启用/禁用）
  const newStatus = row.status === 1 ? 0 : 1
  const actionText = newStatus === 1 ? '启用' : '禁用'
  // 2. ElMessageBox.confirm 确认
  ElMessageBox.confirm(
    `确定要${actionText}管理员 "${row.username}" 吗？`,
    '提示',
    {
      confirmButtonText:'确定',
      cancelButtonText:'取消',
      type: 'warning'
    }
  ).then(async ()=>{
    try{
      // 3. 调用 updateAdminStatus 接口
      const res =await updateAdminStatus(row.id, newStatus)
      if(res.code ===200){
        ElMessage.success(res.message || `${actionText}成功`)
        loadAdminList()
      }
    }catch (err){
      console.error('操作失败', err)
    }
  }).catch(() => {})
  // 4. 成功后刷新列表
}

// 删除管理员
const handleDelete = (row) => {
  // 1. 检查是否是当前登录账号（不能删自己）
  if (row.id === currentAdminId.value) {
    ElMessage.warning('不能删除当前登录的账号')
    return
  }

  // 2. ElMessageBox.confirm 确认
  ElMessageBox.confirm(
    `确定要删除管理员 "${row.username}" 吗？此操作不可恢复！`,
    '危险操作',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      // 3. 调用 deleteAdmin 接口
      const res = await deleteAdmin(row.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        // 4. 成功后刷新列表
        loadAdminList()
      }
    } catch (err) {
      console.error('删除失败', err)
    }
  }).catch(() => {})
}

// 页码变化
const handlePageChange = (page) => {
  pagination.page = page
  loadAdminList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  loadAdminList()
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
  loadAdminList()
})
</script>

<template>
  <div class="admins-page">
    <!-- 头部操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加管理员
      </el-button>
    </div>

    <el-table
      :data="adminList"
      v-loading="loading"
      stripe
      style="width: 100%"
      class="admin-table"
      :header-cell-style="{ background: '#f5f9f2', color: '#7c8b72' }"
    >
      <el-table-column prop="id" label="ID" min-width="80" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="real_name" label="真实姓名" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="phone" label="手机号" min-width="130" />
      <el-table-column label="权限" min-width="120">
        <template #default="{ row }">
          <el-tag :type="row.is_super === 1 ? 'danger' : 'info'" size="small">
            {{ row.is_super === 1 ? '超级管理员' : '普通管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.create_time) }}
        </template>
      </el-table-column>
      <!-- 操作列固定在右侧，固定宽度 -->
      <el-table-column label="操作" fixed="right" width="180">
        <template #default="{ row }">
          <div class="action-buttons">
            <template v-if="row.id !== currentAdminId">
              <el-button
                :type="row.status === 1 ? 'warning' : 'success'"
                link
                size="small"
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
            <span v-else class="self-tip">当前账号</span>
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

    <!-- 添加管理员弹窗 -->
    <el-dialog v-model="dialogVisible" title="添加管理员" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-20位，字母数字下划线" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="6-20位" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="form.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号（可选）" />
        </el-form-item>
        <el-form-item label="权限" prop="is_super">
          <el-radio-group v-model="form.is_super">
            <el-radio :label="0">普通管理员</el-radio>
            <el-radio :label="1">超级管理员</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admins-page {
  background: #fafdf7;
  padding: 0;
}

/* 操作栏 */
.action-bar {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 表格容器 */
.admin-table {
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
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* 当前账号提示 */
.self-tip {
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
</style>
