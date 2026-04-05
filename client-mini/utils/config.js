// utils/config.js

// 直接用电脑 IP
const DEV_URL = 'http://10.64.29.106:3000'

// #ifdef MP-WEIXIN
// 小程序环境
const baseUrl = DEV_URL
// #endif

// #ifdef H5
// H5环境
const baseUrl = 'http://localhost:3000'
// #endif

export const config = {
    baseUrl,
    imageBaseUrl: baseUrl,
    isDev: true
}

export default config