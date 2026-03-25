// utils/config.js

// 开发环境用电脑IP（就是你之前用的 10.64.29.106）
const DEV_IP = '10.64.29.106'
const DEV_PORT = '3000'

// 生产环境用正式域名（现在用不到，以后上线再改）
// const PROD_DOMAIN = 'https://api.yourdomain.com'

// #ifdef MP-WEIXIN
// 小程序环境
const baseUrl = `http://${DEV_IP}:${DEV_PORT}`
// #endif

// #ifdef H5
// H5环境
const baseUrl = `http://localhost:${DEV_PORT}`
// #endif

export const config = {
    baseUrl,           // API请求地址
    imageBaseUrl: baseUrl,  // 图片地址
    isDev: true
}

export default config