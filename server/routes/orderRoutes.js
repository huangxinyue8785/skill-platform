/**
 * 订单相关的路由
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { error } = require('../utils/response')

const {
    createOrder,
    getOrderList,
    getOrderDetail,
    payOrder,
    alipayNotify,
    cancelOrder,
    queryPayStatus,
    completeOrder,
    deleteOrder
} = require('../controllers/orderController')

// 自定义中间件：同时支持普通用户和管理员
const combinedAuth = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.json(error('请先登录', 401))
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
        return res.json(error('token格式错误', 401))
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (decoded.role === 'admin') {
            // 管理员
            req.userType = 'admin'
            req.userId = decoded.id
            req.user = decoded
        } else {
            // 普通用户
            req.userType = 'user'
            req.userId = decoded.id
            req.user = decoded
        }
        next()
    } catch (err) {
        console.error('token验证失败:', err.message)
        return res.json(error('token无效或已过期', 401))
    }
}

// 订单列表：管理员看全部，普通用户看自己的
router.get('/', combinedAuth, getOrderList)

// 订单详情：根据用户类型判断权限
router.get('/:id', combinedAuth, getOrderDetail)

// 以下接口只能普通用户操作（需要登录才能买/付/取消）
router.post('/', combinedAuth, createOrder)
router.post('/:id/pay', combinedAuth, payOrder)
router.put('/:id/cancel', combinedAuth, cancelOrder)
router.put('/:id/complete', combinedAuth, completeOrder)
// ✅ 添加删除订单路由
router.delete('/:id', combinedAuth, deleteOrder)
// 主动查询支付状态
router.post('/:id/query-pay', combinedAuth, queryPayStatus)

router.post('/pay/notify', alipayNotify)


module.exports = router