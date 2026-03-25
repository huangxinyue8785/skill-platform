/**
 * 上传相关的路由
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const { uploadService } = require('../middlewares/upload')
const {  uploadServiceImages } = require('../controllers/uploadController')

// 单张上传服务图片
// router.post('/service', auth, uploadService.single('image'), uploadServiceImage)

// 批量上传服务图片（支持1-9张）
router.post('/services', auth, uploadService.array('image', 9), uploadServiceImages)  // ← 改成 image

module.exports = router