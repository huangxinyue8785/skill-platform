/**
 * 上传相关的业务逻辑
 * 图片上传到腾讯云COS
 */
const { success, error } = require('../utils/response');
const cos = require('../config/cos');

// 生成唯一文件名
const generateFileName = (prefix, originalName) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = originalName.split('.').pop();
    return `${prefix}-${timestamp}-${random}.${ext}`;
};

// 批量上传服务图片
const uploadServiceImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.json(error('请选择要上传的图片', 400));
        }

        const uploadPromises = req.files.map(async (file) => {
            const filename = generateFileName('service', file.originalname);
            const key = `services/${filename}`;

            const result = await cos.putObject({
                Bucket: 'campus-skills-1416065980',
                Region: 'ap-guangzhou',
                Key: key,
                Body: file.buffer,
                ACL: 'public-read'
            });

            const url = `https://${result.Location}`;
            return { url, filename };
        });

        const images = await Promise.all(uploadPromises);
        res.json(success({ images }, '上传成功'));
    } catch (err) {
        console.error('批量上传失败', err);
        res.json(error('服务器错误：' + err.message, 500));
    }
};

// 上传头像（单张）
const uploadAvatarToCOS = async (req, res) => {
    try {
        if (!req.file) {
            return res.json(error('请选择要上传的图片', 400));
        }

        const filename = generateFileName('avatar', req.file.originalname);
        const key = `avatars/${filename}`;

        const result = await cos.putObject({
            Bucket: 'campus-skills-1416065980',
            Region: 'ap-guangzhou',
            Key: key,
            Body: req.file.buffer,
            ACL: 'public-read'
        });

        const url = `https://${result.Location}`;
        res.json(success({ avatarUrl: url }, '头像上传成功'));
    } catch (err) {
        console.error('上传头像失败', err);
        res.json(error('服务器错误：' + err.message, 500));
    }
};

// 删除COS图片（供其他地方调用）
const deleteImageFromCOS = async (imageUrl) => {
    try {
        if (!imageUrl) return false;

        // 从URL中提取Key
        const match = imageUrl.match(/\.myqcloud\.com\/(.+)$/);
        if (!match) return false;
        const key = match[1];

        await cos.deleteObject({
            Bucket: 'campus-skills-1416065980',
            Region: 'ap-guangzhou',
            Key: key
        });
        console.log('删除成功:', key);
        return true;
    } catch (err) {
        console.error('删除图片失败', err);
        return false;
    }
};

module.exports = {
    uploadServiceImages,
    uploadAvatarToCOS,
    deleteImageFromCOS
};