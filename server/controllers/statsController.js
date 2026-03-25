/**
 * 统计相关的业务逻辑
 */
const db = require('../config/db')
const {success,error} = require('../utils/response')

/**
 * 获取首页统计 - 接口：GET /api/stats/home
 * 返回：服务总数、用户总数
 */
const getHomeStats = async (req,res)=>{
    try{
        const [serviceCountResult] = await db.query(
            `SELECT COUNT(*) as total FROM services WHERE status = 1`
        )
        const serviceCount = serviceCountResult[0].total

        const [userCountResult] = await db.query(
            'SELECT COUNT(*) as total FROM users WHERE status = 1'
        )
        const userCount = userCountResult[0].total

        res.json(success({
            serviceCount,
            userCount
        },'获取成功'))

    }catch (err){
        console.error('获取首页统计失败:', err)
        res.json(error('服务器错误', 500))
    }
}

/**
 * 获取管理员统计 - 接口：GET /api/stats/admin
 * 返回：总用户数、总服务数、总订单数、总交易额
 */
const getAdminStats = async (req,res)=>{
    try {
        // 1. 总用户数
        const [userTotalResult] = await db.query('SELECT COUNT(*) as total FROM users')
        const userTotal = userTotalResult[0].total

        // 2. 总服务数
        const [serviceTotalResult] = await db.query('SELECT COUNT(*) as total FROM services')
        const serviceTotal = serviceTotalResult[0].total

        // 3. 总订单数
        const [orderTotalResult] = await db.query('SELECT COUNT(*) as total FROM orders')
        const orderTotal = orderTotalResult[0].total

        // 4. 总交易额
        const [amountTotalResult] = await db.query(
            'SELECT SUM(amount) as total FROM orders WHERE status IN (1, 2)'
        )
        const amountTotal = amountTotalResult[0].total || 0

        res.json(success({
            userTotal,
            serviceTotal,
            orderTotal,
            amountTotal
        }, '获取成功'))

    }catch (err){
        console.error('获取管理员统计失败:', err)
        res.json(error('服务器错误', 500))
    }
}



module.exports = {
    getHomeStats,
    getAdminStats
}