import axios from 'axios'
import { ElMessage } from 'element-plus'

// 根据环境自动切换 API 地址
const baseURL = 'http://114.132.89.130:3000/api'

const request = axios.create({
  baseURL,
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
request.interceptors.response.use(
  response => {
    const res = response.data
    // ✅ 登录接口的错误不要在拦截器里弹窗，让业务代码自己处理
    // 判断是否是登录接口
    const isLoginApi = response.config.url === '/admin/login'

    if (res.code !== 200) {
      // 登录接口不自动弹窗，直接返回错误
      if (isLoginApi) {
        return Promise.reject(res)
      }
      // 非登录接口才自动弹窗
      ElMessage.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        window.location.href = '/login'
      }
      return Promise.reject(res)
    }
    return res
  },
  error => {
    // 网络错误时显示提示
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        // 不自动跳转，让业务代码处理
      } else if (status === 403) {
        ElMessage.error('没有权限访问')
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在')
      } else if (status >= 500) {
        ElMessage.error('服务器错误，请稍后重试')
      } else {
        ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

/**
 * 获取完整的图片URL
 * @param {string} path - 图片相对路径
 * @returns {string} 完整URL
 */
export const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  // 后端地址
  const baseURL = 'http://114.132.89.130:3000'
  return baseURL + path
}

export default request
