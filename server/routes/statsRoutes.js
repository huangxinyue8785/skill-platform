/**
 * 统计相关的路由
 */
const express = require('express');
const router = express.Router();
const adminAuth =require('../middlewares/adminAuth')

const {
    getHomeStats,
    getAdminStats
} = require('../controllers/statsController')

router.get('/home', getHomeStats)        // 首页统计（公开）
router.get('/admin', adminAuth, getAdminStats)  // 管理员统计（需要登录）

module.exports = router