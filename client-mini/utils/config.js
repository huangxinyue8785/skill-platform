// utils/config.js

// 服务器基础地址
const SERVER_URL = 'http://114.132.89.130:3000'

// 为所有环境提供一个默认的 baseUrl
let baseUrl = SERVER_URL

// #ifdef H5
baseUrl = 'http://114.132.89.130:3000'
// #endif

// #ifdef MP-WEIXIN
baseUrl = SERVER_URL
// #endif

// #ifdef APP-PLUS
// Android/iOS App 环境
baseUrl = SERVER_URL
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