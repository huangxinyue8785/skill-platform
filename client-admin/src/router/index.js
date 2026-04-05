import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginPage.vue')
    },
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardPage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/users/UsersPage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('@/views/services/ServicesPage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/orders/OrdersPage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/views/categories/CategoriesPage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'admins',
          name: 'admins',
          component: () => import('@/views/admins/AdminsPage.vue'),
          meta: { requiresAuth: true, requiresSuper: true }
        },
        {
          path: 'logs',
          name: 'logs',
          component: () => import('@/views/logsper/LogsPage.vue'),
          meta: { requiresAuth: true }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from) => {
  // 检查是否需要登录
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      return '/login'
    }
  }

  // 检查是否需要超级管理员权限
  if (to.meta.requiresSuper) {
    const adminInfo = localStorage.getItem('admin_info')
    if (adminInfo) {
      const info = JSON.parse(adminInfo)
      if (info.is_super !== 1) {
        return '/dashboard'
      }
    } else {
      return '/login'
    }
  }
  return true
})

export default router
