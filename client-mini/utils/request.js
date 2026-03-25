// utils/request.js

import { config } from './config.js'

export const getImageUrl = (path) => {
    console.log('========== getImageUrl 被调用 ==========')
    console.log('1. 传入的原始path:', path)
    console.log('2. path类型:', typeof path)
    
    if (!path) {
        console.log('3. path为空，返回默认图')
        return '/static/default-avatar.png'
    }
    
    // 如果是本地临时文件（以 wxfile:// 开头），直接返回，不拼接
    if (typeof path === 'string' && path.startsWith('wxfile://')) {
        console.log('3. 是本地临时文件，直接返回:', path)
        return path
    }
    
    // 如果已经是完整URL
    if (typeof path === 'string' && path.startsWith('http')) {
        console.log('3. 已经是完整URL:', path)
        return path
    }
    
    // 如果是本地静态资源
    if (typeof path === 'string' && path.startsWith('/static')) {
        console.log('3. 本地静态资源:', path)
        return path
    }
    
    // 其他情况才拼接服务器地址
    const normalizedPath = typeof path === 'string' 
        ? (path.startsWith('/') ? path : '/' + path)
        : ''
    
    // 👇 修改这一行：把 IMAGE_BASE_URL 改成 config.imageBaseUrl
    const fullUrl = config.imageBaseUrl + normalizedPath
    console.log('3. 拼接后的完整URL:', fullUrl)
    console.log('=======================================')
    
    return fullUrl
}

// 修改 request 函数，添加重试参数
export const request = (options, retryCount = 3) => {
    return new Promise((resolve, reject) => {
        uni.request({
            url: config.baseUrl + '/api' + options.url,
            method: options.method || 'GET',
            data: options.data || {},
            header: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + uni.getStorageSync('token')
            },
            success: (res) => {
                if (res.data.code === 200) {
                    resolve(res.data.data)
                } else {
                    uni.showToast({
                        title: res.data.message || '请求失败',
                        icon: 'none'
                    })
                    reject(res.data)
                }
            },
            fail: (err) => {
                // 如果有剩余重试次数，则重试
                if (retryCount > 0) {
                    console.log(`请求失败，剩余重试次数：${retryCount}`, err)
                    setTimeout(() => {
                        // 递归调用自己，重试次数减1
                        request(options, retryCount - 1)
                            .then(resolve)
                            .catch(reject)
                    }, 1000) // 等待1秒后重试
                } else {
                    // 重试次数用完，真正报错
                    uni.showToast({
                        title: '网络失败，请检查服务器',
                        icon: 'none'
                    })
                    reject(err)
                }
            }
        })
    })
}