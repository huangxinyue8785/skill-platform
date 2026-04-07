/**
 * 文件上传配置
 * 使用 multer 处理图片上传（内存存储，直接上传到COS）
 */
const multer = require("multer");

// 改用内存存储（不存硬盘，直接拿到文件内容后上传到COS）
const storage = multer.memoryStorage();

// 文件类型筛选（只允许图片）
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('文件格式错误，只支持jpeg、png、jpg、webp、gif格式的图片'), false);
    }
};

// 头像上传中间件（单张，2MB限制）
const uploadAvatar = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: fileFilter
});

// 服务图片上传中间件（多张，最多9张，每张5MB）
const uploadService = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

module.exports = {
    uploadAvatar,
    uploadService
};