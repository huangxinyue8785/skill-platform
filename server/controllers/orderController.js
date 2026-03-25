/**
 * 订单相关的业务逻辑
 */
const db = require('../config/db')
const {success,error} = require('../utils/response')

//支付宝SDK引入
const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;

//初始化支付宝SDK
const alipaySdk = new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
    gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
    signType: 'RSA2',
    charset: 'utf-8',
    version: '1.0'
});

const generateOrderNo = () =>{
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3,'0')
    return `ORD${timestamp}${random}`
}

// 创建订单 - 接口：POST /api/orders
const createOrder = async (req, res) => {
    // 获取数据库连接（用于事务）
    const connection = await db.getConnection()

    try {
        const buyerId = req.userId
        const { service_id, contact_info, requirements, service_time } = req.body

        // ========== 1. 参数验证 ==========
        if (!service_id) {
            connection.release()  // 释放连接
            return res.json(error('请选择要购买的服务', 400))
        }
        if (!contact_info || contact_info.trim() === '') {
            connection.release()
            return res.json(error('联系方式不能为空', 400))
        }
        if (contact_info.length > 200) {
            connection.release()
            return res.json(error('联系方式太长', 400))
        }
        if (requirements && requirements.length > 500) {
            connection.release()
            return res.json(error('特殊要求太长，最多500字', 400))
        }

        // ========== 2. 查询服务信息 ==========
        const [services] = await db.query(
            `SELECT s.id, s.title, s.price, s.user_id as seller_id, s.status, u.nickname as seller_nickname
             FROM services s
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.id = ?`,
            [service_id]
        )

        if (services.length === 0) {
            connection.release()
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        // 检查服务状态
        if (service.status !== 1) {
            connection.release()
            return res.json(error('该服务不可购买', 400))
        }

        // 检查不能买自己的服务
        if (service.seller_id === buyerId) {
            connection.release()
            return res.json(error('不能购买自己发布的服务', 400))
        }

        // ========== 3. 生成订单号 ==========
        const orderNo = generateOrderNo()

        // ========== 4. ✅ 开启事务 ==========
        await connection.beginTransaction()

        // ========== 5. 插入订单 ==========
        const [result] = await connection.query(
            `INSERT INTO orders (id, service_id, buyer_id, seller_id, amount, contact_info, requirements, service_time, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                orderNo,
                service_id,
                buyerId,
                service.seller_id,
                service.price,
                contact_info.trim(),
                requirements || null,
                service_time || null
            ]
        )

        // ========== 6. 更新用户的订单数量 ==========
        await connection.query(
            'UPDATE users SET order_count = order_count + 1 WHERE id = ?',
            [buyerId]
        )

        // ========== 7. ✅ 提交事务 ==========
        await connection.commit()

        // ========== 8. 查询完整的订单信息用于返回 ==========
        const [orders] = await connection.query(
            `SELECT
                o.id, o.service_id, o.amount, o.status, o.contact_info, o.requirements, o.service_time, o.create_time,
                s.title as service_title,
                seller.id as seller_id, seller.nickname as seller_nickname,
                buyer.id as buyer_id, buyer.nickname as buyer_nickname
             FROM orders o
             LEFT JOIN services s ON o.service_id = s.id
             LEFT JOIN users seller ON o.seller_id = seller.id
             LEFT JOIN users buyer ON o.buyer_id = buyer.id
             WHERE o.id = ?`,
            [orderNo]
        )

        const order = orders[0]

        const orderData = {
            id: order.id,
            amount: order.amount,
            status: order.status,
            statusText: '待支付',
            contactInfo: order.contact_info,
            requirements: order.requirements,
            serviceTime: order.service_time,
            createTime: order.create_time,
            service: {
                id: order.service_id,
                title: order.service_title
            },
            seller: {
                id: order.seller_id,
                nickname: order.seller_nickname
            },
            buyer: {
                id: order.buyer_id,
                nickname: order.buyer_nickname
            }
        }

        console.log(`【订单创建】用户 ${req.user.username} 创建了订单 ${orderNo}，金额：${order.amount}`)

        // 释放连接
        connection.release()
        res.json(success(orderData, '订单创建成功'))

    } catch (err) {
        // ========== ✅ 出错时回滚事务 ==========
        await connection.rollback()
        console.error('创建订单失败:', err)

        // 释放连接
        connection.release()
        res.json(error('服务器错误', 500))
    }
}

//获取订单列表 - 接口：GET /api/orders
const getOrderList = async (req,res)=>{
    try{
        const { userType, userId } = req
        const {
            page=1,
            pageSize=10,
            status,
            role='buyer',
            keyword  // ✅ 添加 keyword 参数
        } = req.query

        const offset = (page - 1) * pageSize

        let baseConditions = []
        let baseParams = []

        // 管理员：看所有订单，不加限制
        if (userType === 'admin') {
            baseConditions = []
            baseParams = []
        } else {
            // 普通用户：只能看自己的订单
            if(role === 'buyer'){
                baseConditions.push('o.buyer_id = ?')
            } else {
                baseConditions.push('o.seller_id = ?')
            }
            baseParams.push(userId)
        }

        // 状态筛选
        let listConditions = [...baseConditions]
        let listParams = [...baseParams]

        if(status !== undefined && status !== ''){
            const validStatus = [0,1,2,3]
            if(!validStatus.includes(parseInt(status))){
                return res.json(error('状态值不合法',400))
            }
            listConditions.push('o.status = ?')
            listParams.push(status)
        }

        // ✅ 添加关键词搜索（按订单号或服务标题）
        if (keyword && keyword.trim() !== '') {
            listConditions.push('(o.id LIKE ? OR s.title LIKE ?)')
            listParams.push(`%${keyword}%`, `%${keyword}%`)
        }

        const listWhereClause = listConditions.length > 0
            ? 'WHERE ' + listConditions.join(' AND ')
            : ''

        // 查询总数（需要 JOIN services 表）
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM orders o 
             LEFT JOIN services s ON o.service_id = s.id
             ${listWhereClause}`,
            listParams
        )
        const total = countResult[0].total

        // 查询数据
        const dataParams = [...listParams, parseInt(pageSize), offset]
        const [orders] = await db.query(
            `SELECT
                o.id, o.amount, o.status, o.contact_info, o.requirements,
                o.service_time, o.pay_time, o.create_time, o.update_time,
                s.id as service_id, s.title as service_title, s.description as service_description,
                s.price as service_price, s.images as service_images,
                buyer.id as buyer_id, buyer.nickname as buyer_nickname, buyer.avatar as buyer_avatar,
                seller.id as seller_id, seller.nickname as seller_nickname, seller.avatar as seller_avatar
            FROM orders o
            LEFT JOIN services s ON o.service_id = s.id
            LEFT JOIN users buyer ON o.buyer_id = buyer.id
            LEFT JOIN users seller ON o.seller_id = seller.id
            ${listWhereClause}
            ORDER BY o.create_time DESC
            LIMIT ? OFFSET ?`,
            dataParams
        )

        const formattedOrders = orders.map(order =>{
            let statusText = ''
            switch (order.status){
                case 0:statusText = '待支付';break;
                case 1:statusText = '已支付';break;
                case 2:statusText = '已完成';break;
                case 3:statusText = '已取消';break;
                default:statusText = '未知'
            }

            const images = order.service_images ? order.service_images.split(','):[]

            return{
                id:order.id,
                amount:order.amount,
                status:order.status,
                statusText:statusText,
                contactInfo:order.contact_info,
                requirements: order.requirements,
                serviceTime: order.service_time,
                payTime:order.pay_time,
                createTime:order.create_time,
                updateTime:order.update_time,
                service:{
                    id: order.service_id,
                    title: order.service_title,
                    description: order.service_description,
                    price: order.service_price,
                    images: images
                },
                buyer: {
                    id: order.buyer_id,
                    nickname: order.buyer_nickname,
                    avatar: order.buyer_avatar
                },
                seller: {
                    id: order.seller_id,
                    nickname: order.seller_nickname,
                    avatar: order.seller_avatar
                },
                currentRole: userType === 'admin' ? 'admin' : role
            }
        })

        res.json(success({
            list: formattedOrders,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    }catch (err){
        console.error('获取订单列表', err)
        res.json(error('服务器错误', 500))
    }
}

//获取订单详情 - 接口：GET /api/orders/:id
const getOrderDetail = async (req,res)=>{
    try{
        // 使用 combinedAuth 传入的 userId
        const userId = req.userId
        const orderId = req.params.id

        if(!orderId){
            return res.json(error('订单号不能为空',400))
        }

        const [orders] =await db.query(
            `SELECT
            o.id, o.amount, o.status, o.contact_info, o.requirements, 
                o.service_time, o.pay_time, o.create_time, o.update_time,
                s.id as service_id, s.title as service_title, s.description as service_description,
                s.price as service_price, s.images as service_images, s.contact as service_contact,
                c.id as category_id, c.name as category_name,
                buyer.id as buyer_id, buyer.username as buyer_username, 
                buyer.nickname as buyer_nickname, buyer.avatar as buyer_avatar,
                buyer.phone as buyer_phone,
                seller.id as seller_id, seller.username as seller_username,
                seller.nickname as seller_nickname, seller.avatar as seller_avatar,
                seller.phone as seller_phone
             FROM orders o
             LEFT JOIN services s ON o.service_id = s.id
             LEFT JOIN categories c ON s.category_id = c.id
             LEFT JOIN users buyer ON o.buyer_id = buyer.id
             LEFT JOIN users seller ON o.seller_id = seller.id
             WHERE o.id = ?`,
            [orderId]
        )

        if(orders.length === 0){
            return res.json(error('订单不存在',404))
        }
        const order = orders[0]

        // 管理员可以看到所有订单详情
        if (req.userType === 'admin') {
            // 管理员直接放行
        } else {
            // 普通用户只能看自己的订单
            if(order.buyer_id !== userId && order.seller_id !== userId){
                return res.json(error('无权查看此订单',403))
            }
        }

        let currentRole = ''
        if(order.buyer_id === userId){
            currentRole = 'buyer'
        }else if(order.seller_id === userId){
            currentRole = 'seller'
        } else if (req.userType === 'admin') {
            currentRole = 'admin'
        }

        let statusText = ''
        switch (order.status){
            case 0: statusText = '待支付'; break
            case 1: statusText = '已支付'; break
            case 2: statusText = '已完成'; break
            case 3: statusText = '已取消'; break
            default: statusText = '未知'
        }

        const images = order.service_images ? order.service_images.split(',') : []

        const orderDetail = {
            id: order.id,
            amount: order.amount,
            status: order.status,
            statusText: statusText,
            contactInfo: order.contact_info,
            requirements: order.requirements,
            serviceTime: order.service_time,
            payTime: order.pay_time,
            createTime: order.create_time,
            updateTime: order.update_time,
            currentRole: currentRole,
            service: {
                id: order.service_id,
                title: order.service_title,
                description: order.service_description,
                price: order.service_price,
                images: images,
                contact: order.service_contact,
                category: {
                    id: order.category_id,
                    name: order.category_name
                }
            },
            buyer: {
                id: order.buyer_id,
                username: order.buyer_username,
                nickname: order.buyer_nickname,
                avatar: order.buyer_avatar,
                phone: order.buyer_phone
            },
            seller: {
                id: order.seller_id,
                username: order.seller_username,
                nickname: order.seller_nickname,
                avatar: order.seller_avatar,
                phone: order.seller_phone
            },
            contact: currentRole === 'buyer' ? order.seller_phone : order.buyer_phone
        }

        res.json(success(orderDetail, '获取成功'))

    }catch (err){
        console.error('获取订单详情', err)
        res.json(error('服务器错误', 500))
    }
}

//支付订单 - 接口：POST /api/orders/:id/pay
const payOrder = async (req,res)=>{
    try{
        const userId = req.userId
        const orderId = req.params.id

        if(!orderId){
            return res.json(error('订单号不能为空',400))
        }

        const [orders] = await db.query(
            `SELECT o.*,s.title as service_title
            FROM orders o LEFT JOIN services s ON o.service_id = s.id
            WHERE o.id = ?`,
            [orderId]
        )

        if(orders.length === 0){
            return res.json(error('订单不存在',404))
        }

        const order = orders[0]

        if(order.buyer_id !== userId){
            return res.json(error('无权支付此订单',403))
        }

        if(order.status !== 0){
            return res.json(error('订单状态不正确，不能支付',400))
        }

        // ✅ 3.1.0 版本的写法
        const formData = new AlipayFormData()
        formData.setMethod('get')
        formData.addField('returnUrl', process.env.ALIPAY_RETURN_URL)
        formData.addField('notifyUrl', process.env.ALIPAY_NOTIFY_URL)

        formData.addField('bizContent', {
            out_trade_no: orderId,
            product_code: 'FAST_INSTANT_TRADE_PAY',
            total_amount: order.amount,
            subject: order.service_title || '校园技能汇-服务支付',
            body: `购买服务：${order.service_title}`,
            timeout_express: '30m'
        })

        const paymentUrl = await alipaySdk.exec(
            'alipay.trade.page.pay',
            {},
            { formData: formData }
        )

        console.log(`【支付创建】用户 ${req.user.username} 发起支付，订单：${orderId}，金额：${order.amount}`)

        res.json(success({
            orderId: order.id,
            amount: order.amount,
            paymentUrl: paymentUrl
        }, '支付订单创建成功'))

    }catch (err){
        console.error('创建支付失败', err)
        res.json(error('服务器错误：' + err.message, 500))
    }
}

//支付宝异步通知 - 接口：POST /api/orders/pay/notify
const alipayNotify = async (req,res)=>{
    try{
        // 获取支付宝POST过来的参数
        const params = req.body

        console.log('收到支付宝异步通知:', params)

        //支付宝验证签名，正式上线用
        // const signVerified = alipaySdk.checkNotifySign(params)
        // if(!signVerified){
        //     console.error('支付宝通知签名验证失败')
        //     return res.status(200).send('failure')
        // }

        const orderId = params.out_trade_no
        const tradeStatus = params.trade_status

        if(tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED'){
            await db.query(
                `UPDATE orders SET status = 1,pay_time = NOW() WHERE id = ? AND status = 0`,
                [orderId]
            )
            console.log(`【支付成功】订单 ${orderId} 已支付`)
        }

        res.status(200).send('success')

    }catch (err){
        console.error('处理支付宝通知失败:', err)
        res.status(200).send('failure')
    }
}

//取消订单 - 接口：PUT /api/orders/:id/cancel
const cancelOrder = async (req,res)=>{
    try{
        const userId = req.userId
        const orderId = req.params.id

        if(!orderId){
            return res.json(error('订单号不能为空',400))
        }

        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        )

        if(orders.length === 0){
            return res.json(error('订单不存在',404))
        }

        const order = orders[0]

        if(order.buyer_id !== userId){
            return res.json(error('无权取消此订单',403))
        }

        if(order.status !== 0){
            let msg = ''
            if(order.status === 1) msg = '订单已支付，不能取消'
            else if(order.status === 2) msg = '订单已完成，不能取消'
            else if(order.status === 3) msg = '订单已取消'
            else msg = '当前状态不能取消'

            return res.json(error(msg,400))
        }

        await db.query(
            `UPDATE orders SET status = 3 WHERE id = ?`,
            [orderId]
        )

        console.log(`【订单取消】用户 ${req.user.username} 取消了订单 ${orderId}`)

        res.json(success(null, '订单取消成功'))

    }catch (err){
        console.error('取消订单失败：', err)
        res.json(error('服务器错误', 500))
    }
}

//完成订单 - 接口：PUT /api/orders/:id/complete
const completeOrder = async (req,res)=>{
    try{
        const userId = req.userId
        const orderId = req.params.id

        if(!orderId){
            return res.json(error('订单号不能为空',400))
        }

        const [orders] = await db.query(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        )

        if(orders.length === 0){
            return res.json(error('订单不存在', 404))
        }

        const order = orders[0]

        if (order.seller_id !== userId) {
            return res.json(error('无权操作此订单', 403))
        }

        if (order.status !== 1) {
            let msg = ''
            if (order.status === 0) msg = '订单待支付，不能完成'
            else if (order.status === 2) msg = '订单已完成'
            else if (order.status === 3) msg = '订单已取消'
            else msg = '当前状态不能标记完成'

            return res.json(error(msg, 400))
        }

        await db.query(
            `UPDATE orders SET status = 2 WHERE id = ?`,
            [orderId]
        )

        console.log(`【订单完成】卖家 ${req.user.username} 标记订单 ${orderId} 为已完成`)

        res.json(success(null, '订单已完成'))

    }catch (err){
        console.error('完成订单失败：', err)
        res.json(error('服务器错误', 500))
    }
}

//删除订单 - 接口：DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
    try {
        const userId = req.userId
        const orderId = req.params.id

        if (!orderId) {
            return res.json(error('订单号不能为空', 400))
        }

        // 查询订单
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        )

        if (orders.length === 0) {
            return res.json(error('订单不存在', 404))
        }

        const order = orders[0]

        // 只能删除已完成(2)或已取消(3)的订单
        if (order.status !== 2 && order.status !== 3) {
            return res.json(error('只能删除已完成或已取消的订单', 400))
        }

        // 验证权限：买家或卖家都可以删
        if (order.buyer_id !== userId && order.seller_id !== userId) {
            return res.json(error('无权删除此订单', 403))
        }

        // 执行删除
        await db.query('DELETE FROM orders WHERE id = ?', [orderId])

        console.log(`用户 ${req.user.username} 删除了订单 ${orderId}`)

        res.json(success(null, '订单删除成功'))

    } catch (err) {
        console.error('删除订单失败', err)
        res.json(error('服务器错误', 500))
    }
}

module.exports = {
    createOrder,
    getOrderList,
    getOrderDetail,
    payOrder,
    alipayNotify,
    cancelOrder,
    completeOrder,
    deleteOrder
}