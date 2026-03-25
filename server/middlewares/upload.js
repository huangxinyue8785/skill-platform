/**
 * 文件上传配置
 * 使用 multer 处理图片上传
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 定义上传目录
const avatarDir = path.join(__dirname, '../uploads/avatars')
const serviceDir = path.join(__dirname, '../uploads/services')

// 检查目录是否存在，不存在就自动创建
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true })
    console.log('创建头像上传目录：', avatarDir)
}
if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true })
    console.log('创建服务图片上传目录：', serviceDir)
}

// 头像上传的存储规则
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, avatarDir)
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now()
        const random = Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        const filename = 'avatar-' + timestamp + '-' + random + ext
        cb(null, filename)
    }
})

// 服务图片上传的存储规则
const serviceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, serviceDir)
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now()
        const random = Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        const filename = 'service-' + timestamp + '-' + random + ext
        cb(null, filename)
    }
})

// 文件类型筛选（只允许图片）
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', '文件格式错误，只支持jpeg、png、jpg、webp、gif格式的图片'), false)
    }
}

// 创建上传中间件
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: fileFilter
})

const uploadService = multer({
    storage: serviceStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 服务图片可以大一点，5MB
    },
    fileFilter: fileFilter
})

module.exports = {
    uploadAvatar,
    uploadService
}