/**
 * 统计相关的路由
 */
const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth')

const {
    getHomeStats,
    getAdminStats,
    getSchoolServiceStats
} = require('../controllers/statsController')

// 首页统计（公开）
router.get('/home', getHomeStats)

// 管理员统计（需要登录）
router.get('/admin', adminAuth, getAdminStats)

// 学校服务统计（用于地图，需要登录）
router.get('/school-service', adminAuth, getSchoolServiceStats)

module.exports = router