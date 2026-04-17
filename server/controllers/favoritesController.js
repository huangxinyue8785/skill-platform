/**
 * 收藏相关的业务逻辑
 */
const db = require('../config/db')
const {success, error} = require('../utils/response')

//添加收藏 - 接口：POST /api/favorites
const addFavorite = async (req, res) => {
    const connection = await db.getConnection()
    try {
        const userId = req.user.id
        const { service_id } = req.body

        if (!service_id) {
            connection.release()
            return res.json(error('请选择要收藏的服务', 400))
        }

        // 检查服务是否存在且已上架
        const [services] = await connection.query(
            'SELECT id FROM services WHERE id = ? AND status = 1',
            [service_id]
        )

        if (services.length === 0) {
            connection.release()
            return res.json(error('服务不存在或已下架', 404))
        }

        // 检查是否已收藏
        const [existing] = await connection.query(
            'SELECT id FROM favorites WHERE user_id = ? AND service_id = ?',
            [userId, service_id]
        )

        if (existing.length > 0) {
            connection.release()
            return res.json(error('已经收藏过了', 400))
        }

        // ✅ 开启事务
        await connection.beginTransaction()

        // 插入收藏记录
        const [result] = await connection.query(
            'INSERT INTO favorites (user_id, service_id) VALUES (?, ?)',
            [userId, service_id]
        )

        // ✅ 重新计算并更新 favorite_count（确保准确）
        const [countResult] = await connection.query(
            'SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?',
            [userId]
        )
        await connection.query(
            'UPDATE users SET favorite_count = ? WHERE id = ?',
            [countResult[0].cnt, userId]
        )

        // 提交事务
        await connection.commit()
        connection.release()

        console.log(`【添加收藏】用户 ${req.user.username} 收藏了服务 ${service_id}`)

        res.json(success({
            favoriteId: result.insertId,
        }, '收藏成功'))

    } catch (err) {
        // 出错回滚
        await connection.rollback()
        connection.release()
        console.error('添加收藏失败', err)
        res.json(error('服务器错误', 500))
    }
}

//取消收藏 - 接口：DELETE /api/favorites/:id
const removeFavorite = async (req, res) => {
    const connection = await db.getConnection()
    try {
        const userId = req.user.id
        const favoriteId = req.params.id

        if (!favoriteId) {
            connection.release()
            return res.json(error('收藏ID不能为空', 400))
        }

        // 检查收藏是否存在
        const [favorites] = await connection.query(
            'SELECT id, service_id FROM favorites WHERE id = ? AND user_id = ?',
            [favoriteId, userId]
        )

        if (favorites.length === 0) {
            connection.release()
            return res.json(error('收藏不存在', 400))
        }

        // ✅ 开启事务
        await connection.beginTransaction()

        // 删除收藏记录
        await connection.query('DELETE FROM favorites WHERE id = ?', [favoriteId])

        // ✅ 重新计算并更新 favorite_count（确保准确）
        const [countResult] = await connection.query(
            'SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?',
            [userId]
        )
        await connection.query(
            'UPDATE users SET favorite_count = ? WHERE id = ?',
            [countResult[0].cnt, userId]
        )

        // 提交事务
        await connection.commit()
        connection.release()

        console.log(`【取消收藏】用户 ${req.user.username} 取消了收藏 ${favoriteId}`)

        res.json(success(null, '取消收藏成功'))

    } catch (err) {
        // 出错回滚
        await connection.rollback()
        connection.release()
        console.error('取消收藏失败', err)
        res.json(error('服务器错误', 500))
    }
}

//获取收藏列表 - 接口：GET /api/favorites
const getFavoriteList = async (req, res) => {
    try {
        const userId = req.user.id
        const {
            page = 1,
            pageSize = 10
        } = req.query

        const offset = (page - 1) * pageSize

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
            [userId]
        )
        const total = countResult[0].total

        const [favorites] = await db.query(
            `SELECT 
                f.id as favorite_id,
                f.create_time as favorite_time,
                s.id as service_id,
                s.title,
                s.description,
                s.price,
                s.images,
                s.view_count,
                s.status,
                u.id as user_id,
                u.nickname as user_nickname,
                u.avatar as user_avatar,
                c.id as category_id,
                c.name as category_name
             FROM favorites f
             LEFT JOIN services s ON f.service_id = s.id
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN categories c ON s.category_id = c.id
             WHERE f.user_id = ?
             ORDER BY f.create_time DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(pageSize), offset]
        )

        const formattedList = favorites.map(item => {
            const images = item.images ? item.images.split(',') : []

            return {
                favoriteId: item.favorite_id,
                favoriteTime: item.favorite_time,
                service: {
                    id: item.service_id,
                    title: item.title,
                    description: item.description,
                    price: item.price,
                    images: images,
                    viewCount: item.view_count,
                    status: item.status,
                    statusText: item.status === 1 ? '已上架' : '已下架',
                    user: {
                        id: item.user_id,
                        nickname: item.user_nickname,
                        avatar: item.user_avatar
                    },
                    category: {
                        id: item.category_id,
                        name: item.category_name
                    }
                }
            }
        })

        res.json(success({
            list: formattedList,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    } catch (err) {
        console.error('获取收藏列表失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//检查是否收藏 - 接口：GET /api/favorites/check/:serviceId
const checkFavorite = async (req, res) => {
    try {
        const userId = req.user.id
        const serviceId = req.params.serviceId

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400))
        }

        const [favorites] = await db.query(
            'SELECT id FROM favorites WHERE user_id = ? AND service_id = ?',
            [userId, serviceId]
        )

        const isFavorited = favorites.length > 0
        const favoriteId = isFavorited ? favorites[0].id : null

        res.json(success({
            isFavorited,
            favoriteId
        }, '获取成功'))

    } catch (err) {
        console.error('检查是否收藏失败:', err)
        res.json(error('服务器错误', 500))
    }
}

module.exports = {
    addFavorite,
    removeFavorite,
    getFavoriteList,
    checkFavorite,
}