/**
 * 上传相关的业务逻辑
 */
const { success, error } = require('../utils/response')
const path = require('path')
const fs = require('fs')

// 上传服务图片（单张）
// 上传服务图片（单张）
// const uploadServiceImage = (req, res) => {
//     try {
//         if (!req.file) {
//             return res.json(error('请选择要上传的图片', 400))
//         }
//
//         // ✅ 只返回相对路径
//         const imagePath = `/uploads/services/${req.file.filename}`
//
//         res.json(success({
//             url: imagePath,  // 现在是相对路径
//             filename: req.file.filename
//         }, '上传成功'))
//     } catch (err) {
//         console.error('上传失败', err)
//         res.json(error('服务器错误', 500))
//     }
// }

// 批量上传
const uploadServiceImages = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.json(error('请选择要上传的图片', 400))
        }

        // 如果只有一张图片，也返回相同格式
        const images = req.files.map(file => ({
            url: `/uploads/services/${file.filename}`,
            filename: file.filename
        }))

        // 单张图片时也返回 images 数组，保持格式一致
        res.json(success({ images }, '上传成功'))
    } catch (err) {
        console.error('批量上传失败', err)
        res.json(error('服务器错误', 500))
    }
}

module.exports = {
    // uploadServiceImage,
    uploadServiceImages
}