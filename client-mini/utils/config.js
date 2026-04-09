// utils/config.js

// 服务器基础地址
const SERVER_URL = 'http://114.132.89.130:3000'

// #ifdef MP-WEIXIN
// 小程序环境
const baseUrl = SERVER_URL
// #endif

// #ifdef H5
// H5环境
const baseUrl = 'http://localhost:3000'
// #endif

export const config = {
    baseUrl,
    imageBaseUrl: baseUrl,
    isDev: true,
    // 导出服务器地址，方便其他地方使用
    serverUrl: SERVER_URL
}

// 辅助函数：获取完整的图片URL
export const getFullImageUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/')) return `${SERVER_URL}${path}`
    return `${SERVER_URL}/${path}`
}

export default config