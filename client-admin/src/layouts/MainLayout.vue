<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataAnalysis, User, Goods, List, Setting, Expand, Fold, Grid,Document
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const adminInfo = computed(() => {
  const info = localStorage.getItem('admin_info')
  return info ? JSON.parse(info) : null
})

const isCollapse = ref(false)

const menuList = [
  { path: '/dashboard', name: '仪表盘', icon: DataAnalysis },
  { path: '/users', name: '用户管理', icon: User },
  { path: '/services', name: '服务审核', icon: Goods },
  { path: '/orders', name: '订单管理', icon: List },
  { path: '/categories', name: '分类管理', icon: Grid },
  { path: '/logsper', name: '操作日志', icon: Document },
]

if (adminInfo.value?.is_super === 1) {
  menuList.push({ path: '/admins', name: '管理员管理', icon: Setting })
}

const activeMenu = computed(() => route.path)

const handleMenuSelect = (path) => {
  console.log('点击菜单，目标路径：', path)  // 添加这行
  console.log('当前路由：', route.path)       // 添加这行
  router.push(path)
  console.log('跳转后路由：', route.path)     // 添加这行
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    ElMessage.success('已退出登录')
    router.push('/login')
  }).catch(() => {})
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}
</script>

<template>
  <div class="main-layout">
    <!-- 侧边栏 - 浅灰绿 -->
    <div class="sidebar" :class="{ collapsed: isCollapse }">
      <div class="logo">
        <svg class="logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
        </svg>
        <span v-if="!isCollapse" class="logo-text">校园技能汇</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#eef3f0"
        text-color="#7c8b72"
        active-text-color="#9bb096"
        @select="handleMenuSelect"
      >
        <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.name }}</template>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 右侧主区域 -->
    <div class="main-content">
      <div class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleLogout">
            <div class="user-info">
              <el-avatar :size="32" :src="adminInfo?.avatar">
                {{ adminInfo?.real_name?.charAt(0) || '管' }}
              </el-avatar>
              <span class="username">{{ adminInfo?.real_name || '管理员' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* ========== 侧边栏 - 浅灰绿 ========== */
.sidebar {
  width: 220px;
  background: #eef3f0;
  transition: width 0.3s;
  flex-shrink: 0;
  border-right: 1px solid #e2eae0;
}

.sidebar.collapsed {
  width: 64px;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #e6ede2;
  border-bottom: 1px solid #e2eae0;
}

.logo-svg {
  width: 28px;
  height: 28px;
  color: #9bb096;
  flex-shrink: 0;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 1px;
  white-space: nowrap;
  color: #7c8b72;
}

/* 菜单样式 */
:deep(.el-menu) {
  border-right: none;
  background: transparent;
}

:deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 6px 12px;
  padding-left: 12px !important;
  border-radius: 12px;
  color: #7c8b72;
  transition: all 0.2s;
  width: calc(100% - 24px);
}

:deep(.el-menu-item .el-icon) {
  margin-right: 12px;
  font-size: 18px;
  width: 20px;
  text-align: center;
}

:deep(.el-menu-item) {
  justify-content: flex-start;
}

/* 选中状态 - 背景完全覆盖图标和文字 */
:deep(.el-menu-item.is-active) {
  background: #dee8d8 !important;
  color: #9bb096 !important;
  margin: 6px 12px;
  padding-left: 12px !important;
}

:deep(.el-menu-item.is-active .el-icon) {
  color: #9bb096 !important;
}

/* 悬停状态 */
:deep(.el-menu-item:hover) {
  background: #e6ede2 !important;
  color: #9bb096 !important;
}

:deep(.el-menu-item:hover .el-icon) {
  color: #9bb096 !important;
}

/* 折叠时的样式调整 - 让图标在侧边栏正中间 */
.sidebar.collapsed :deep(.el-menu-item) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  justify-content: center;
  margin: 6px 0;
  width: 100%;
  display: flex;
  align-items: center;
}

.sidebar.collapsed :deep(.el-menu-item .el-icon) {
  margin-right: 0;
}

.sidebar.collapsed :deep(.el-menu-item.is-active) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  justify-content: center;
  margin: 6px 0;
  width: 100%;
  display: flex;
  align-items: center;
}

/* ========== 右侧主区域 ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafdf7;
}

/* 顶部栏 */
.header {
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
  border-bottom: 1px solid #e9ede5;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #9bb096;
  transition: all 0.3s;
}

.collapse-btn:hover {
  color: #b8c4ae;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 32px;
  transition: all 0.3s ease;
  background: #f5f9f2;
}

.user-info:hover {
  background: #eef3e8;
}

.username {
  font-size: 14px;
  color: #7c8b72;
  font-weight: 500;
}

:deep(.el-avatar) {
  background: #dee8d8;
  color: #7c8b72;
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fafdf7;
}

/* 滚动条 */
.content::-webkit-scrollbar {
  width: 6px;
}

.content::-webkit-scrollbar-track {
  background: #f0ede8;
  border-radius: 3px;
}

.content::-webkit-scrollbar-thumb {
  background: #d4decb;
  border-radius: 3px;
}

.content::-webkit-scrollbar-thumb:hover {
  background: #b8c4ae;
}
</style>
