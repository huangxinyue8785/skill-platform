// utils/auth.js
export const checkLogin = (options = {}) => {
  const token = uni.getStorageSync('token')
  
  if (token) {
    return true
  }

  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const currentRoute = currentPage.route

  // 构建跳转 URL - 只传路径，不传参数
  const redirectUrl = `/${currentRoute}`
  
  // 保存页面参数
  const pageOptions = {
    ...options,
    ...(currentRoute.includes('service-detail') && { id: options.serviceId })
  }

  uni.navigateTo({
    url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}&options=${encodeURIComponent(JSON.stringify(pageOptions))}`
  })
  return false
}