// api/upload.js
import { request } from '@/utils/request.js'

// 上传头像
// upload.js - uploadAvatar 函数
// api/upload.js
export const uploadAvatar = (filePath) => {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: 'http://10.64.29.106:3000/api/user/avatar',
      filePath: filePath,
      name: 'avatar',
      header: {
        'Authorization': 'Bearer ' + uni.getStorageSync('token')
      },
      success: (uploadRes) => {
        try {
          console.log('上传返回原始数据：', uploadRes.data)  // 添加调试
          const data = JSON.parse(uploadRes.data)
          console.log('解析后数据：', data)  // 添加调试
          
          // ✅ 根据后端实际返回的 code 判断
          if (data.code === 200) {
            resolve(data.data)  
          } else {
            // 后端返回错误时，显示具体错误信息
            uni.showToast({
              title: data.message || '上传失败',
              icon: 'none'
            })
            reject(data)
          }
        } catch (err) {
          console.error('解析返回数据失败', err)
          reject(err)
        }
      },
      fail: (err) => {
        console.error('上传请求失败', err)
        uni.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}


export const uploadServiceImages = (filePaths) => {
    console.log('uploadServiceImages 接收到的临时路径：', filePaths)
    return new Promise((resolve, reject) => {
        const uploadTasks = filePaths.map(filePath => {
            return new Promise((res, rej) => {
                uni.uploadFile({
                    // 使用批量上传接口
                    url: 'http://10.64.29.106:3000/api/upload/services',  // ← 注意是 services 复数
                    filePath: filePath,
                    name: 'image',  // ← 批量上传接口也用 image
                    header: {
                        'Authorization': 'Bearer ' + uni.getStorageSync('token')
                    },
                    success: (uploadRes) => {
                        console.log('上传返回原始数据：', uploadRes.data)
                        const data = JSON.parse(uploadRes.data)
                        console.log('解析后数据：', data)
                        if (data.code === 200) {
                            // 批量上传返回的是 { images: [{url, filename}] }
                            // 单张上传返回的是 { url, filename }
                            // 需要兼容两种情况
                            let imageUrl = ''
                            if (data.data.url) {
                                imageUrl = data.data.url
                            } else if (data.data.images && data.data.images[0]) {
                                imageUrl = data.data.images[0].url
                            }
                            console.log('上传成功，返回的URL：', imageUrl)
                            res(imageUrl)
                        } else {
                            rej(data)
                        }
                    },
                    fail: (err) => {
                        console.error('上传失败：', err)
                        rej(err)
                    }
                })
            })
        })
        
        Promise.all(uploadTasks)
            .then(urls => {
                console.log('所有图片上传完成，URLs：', urls)
                resolve(urls)
            })
            .catch(err => {
                console.error('上传失败：', err)
                reject(err)
            })
    })
}