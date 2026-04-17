/**
 * 服务相关的业务逻辑
 * 发布服务、获取服务列表等都写在这里
 */
const db = require('../config/db')
const {success, error} = require('../utils/response')
const jwt = require('jsonwebtoken')
const util = require("node:util");
const path = require('path')
const fs = require('fs')
const { deleteImageFromCOS } = require('./uploadController');

// 发布服务 接口地址：POST /api/services
const publishService = async (req, res) => {
    try {
        const userId = req.user.id

        const {category_id, title, description, price, images, contact, school_id} = req.body

        if (!category_id) {
            return res.json(error('请选择服务分类'))
        }
        if (!title || title.trim() === '') {
            return res.json(error('服务标题不能为空'))
        }
        if (title.length < 2 || title.length > 50) {
            return res.json(error('服务标题长度必须在2-50位之间'))
        }
        if (!description || description.trim() === '') {
            return res.json(error('服务描述不能为空'));
        }
        if (description.length < 10) {
            return res.json(error('服务描述至少10个字符'))
        }
        if (!price) {
            return res.json(error('请输入价格'));
        }
        if (isNaN(price) || price <= 0) {
            return res.json(error('价格必须是大于0的数字'));
        }
        if (!contact || contact.trim() === '') {
            return res.json(error('联系方式不能为空'));
        }

        const [category] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [category_id]
        )
        if (category.length === 0) {
            return res.json(error('选择的分类不存在'))
        }

        const [result] = await db.query(
            `INSERT INTO services
            (user_id,category_id,title,description,price,images,contact,school_id,status)
            VALUES (?,?,?,?,?,?,?,?,0)`,
            [
                userId,
                category_id,
                title.trim(),
                description.trim(),
                price,
                images || null,
                contact.trim(),
                school_id || null
            ]
        )

        await db.query(
            'UPDATE users SET service_count = service_count + 1 WHERE id = ?',
            [userId]
        )

        res.json(success({
            serviceId: result.insertId
        }, '发布成功，请等待审核'))

    } catch (err) {
        console.error('发布服务失败', err)
        res.json(error('服务器错误', 500))
    }
}

//获取服务列表 接口地址：GET /api/services
const getServiceList = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 10,
            category_id,
            keyword,
            school_id,
            sort = 'time',
            status
        } = req.query

        const offset = (page - 1) * pageSize

        let isAdmin = false
        const authHeader = req.headers.authorization

        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1]
                const decoded = jwt.verify(token, process.env.JWT_SECRET)
                if (decoded.role === 'admin') {
                    isAdmin = true
                }
            } catch (e) {
                isAdmin = false
            }
        }

        let whereConditions = []
        let queryParams = []

        if (isAdmin) {
            if (status !== undefined && status !== '') {
                whereConditions.push('s.status = ?')
                queryParams.push(parseInt(status))
            }
        } else {
            whereConditions.push('s.status = 1')
        }

        // 按分类筛选
        if (category_id) {
            const [category] = await db.query(
                'SELECT parent_id FROM categories WHERE id = ?',
                [category_id]
            )

            if (category.length > 0 && category[0].parent_id === 0) {
                const [children] = await db.query(
                    'SELECT id FROM categories WHERE parent_id = ?',
                    [category_id]
                )
                const childIds = children.map(c => c.id)

                if (childIds.length > 0) {
                    whereConditions.push('s.category_id IN (?)')
                    queryParams.push(childIds)
                } else {
                    whereConditions.push('1=0')
                }
            } else {
                whereConditions.push('s.category_id = ?')
                queryParams.push(category_id)
            }
        }

        // 按学校筛选
        if (school_id) {
            whereConditions.push('s.school_id = ?')
            queryParams.push(school_id)
        }

        // ========== 关键词搜索（支持父分类） ==========
        if (keyword) {
            const trimmedKeyword = keyword.trim()
            whereConditions.push(
                '(s.title LIKE ? OR s.description LIKE ? OR sc.name LIKE ? OR sc.city LIKE ? OR sc.province LIKE ? OR c.name LIKE ? OR pc.name LIKE ? OR u.nickname LIKE ?)'
            )
            queryParams.push(`%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`, `%${trimmedKeyword}%`)
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : ''

        let orderBy = 's.create_time DESC'
        if (sort === 'price_asc') {
            orderBy = 's.price ASC'
        } else if (sort === 'price_desc') {
            orderBy = 's.price DESC'
        }

        // COUNT 查询（需要 JOIN pc 表）
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total 
             FROM services s
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN categories c ON s.category_id = c.id
             LEFT JOIN categories pc ON c.parent_id = pc.id
             LEFT JOIN schools sc ON s.school_id = sc.id
             ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        const dataParams = [...queryParams, parseInt(pageSize), offset]
        const [services] = await db.query(
            `SELECT
                s.id, s.title, s.description, s.price, s.images, s.contact, 
                s.view_count, s.status, s.create_time,
                u.id as user_id, u.nickname as user_nickname, u.avatar as user_avatar,
                c.id as category_id, c.name as category_name,
                pc.id as parent_category_id, pc.name as parent_category_name,
                sc.id as school_id, sc.name as school_name,
                sc.city as school_city, sc.province as school_province
             FROM services s
             LEFT JOIN users u ON s.user_id = u.id
             LEFT JOIN categories c ON s.category_id = c.id
             LEFT JOIN categories pc ON c.parent_id = pc.id
             LEFT JOIN schools sc ON s.school_id = sc.id
             ${whereClause}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            dataParams
        )

        const formattedServices = services.map(service => ({
            ...service,
            images: service.images ? service.images.split(',').map(img => {
                if (img && img.includes('localhost:3000')) {
                    return img.replace('http://localhost:3000', '')
                }
                return img
            }) : []
        }))

        res.json(success({
            list: formattedServices,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    } catch (err) {
        console.error('获取服务列表失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//获取服务详情 - 接口：GET /api/services/:id
const getServiceDetail = async (req, res) => {
    try {
        const serviceId = req.params.id
        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400));
        }

        const [services] = await db.query(
            `SELECT
            s.id,s.title,s.description,s.price,s.images,s.contact,s.view_count,s.status,s.create_time,s.update_time,
            u.id as user_id,
            u.username as user_username,
            u.nickname as user_nickname,
            u.avatar as user_avatar,
            u.phone as user_phone,
            u.service_count,
            c.id as category_id,
            c.name as category_name,
            c.parent_id as category_parent_id,
            pc.name as parent_category_name,
            sc.id as school_id,
            sc.name as school_name,
            sc.province as school_province,
            sc.city as school_city
            FROM services s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE s.id = ?`,
            [serviceId]
        )

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }
        const service = services[0]

        if (service.status !== 1) {
            return res.json(error('服务不存在或已下架', 404))
        }

        await db.query(
            'UPDATE services SET view_count = view_count + 1 WHERE id = ?',
            [serviceId]
        )

        const images = service.images ? service.images.split(',').map(img => {
            if (img && img.includes('localhost:3000')) {
                return img.replace('http://localhost:3000', '')
            }
            return img
        }) : []

        const serviceDetail = {
            id: service.id,
            title: service.title,
            description: service.description,
            price: service.price,
            images: images,
            contact: service.contact,
            viewCount: service.view_count + 1,
            status: service.status,
            createTime: service.create_time,
            updateTime: service.update_time,
            user: {
                id: service.user_id,
                username: service.user_username,
                nickname: service.user_nickname,
                avatar: service.user_avatar,
                phone: service.user_phone,
                serviceCount: service.service_count || 0
            },
            category: {
                id: service.category_id,
                name: service.category_name,
                parentId: service.category_parent_id,
                parentName: service.parent_category_name
            },
            school: service.school_id ? {
                id: service.school_id,
                name: service.school_name,
                province: service.school_province,
                city: service.school_city
            } : null
        }

        res.json(success(serviceDetail, '获取成功'))

    } catch (err) {
        console.error('获取服务详情失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//获取我的服务 - 接口：GET /api/services/my
const getMyServices = async (req, res) => {
    try {
        const userId = req.user.id

        const {
            page = 1,
            pageSize = 10,
            status
        } = req.query

        const offset = (page - 1) * pageSize

        let whereConditions = ['user_id = ?']
        let queryParams = [userId]

        if (status !== undefined && status !== '') {
            const validStatus = [0, 1, 2, 3]
            if (!validStatus.includes(parseInt(status))) {
                return res.json(error('状态值不合法', 400))
            }
            whereConditions.push('status = ?')
            queryParams.push(status)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM services ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        const dataParams = [...queryParams, parseInt(pageSize), offset]

        const [services] = await db.query(
            `SELECT 
            s.id,s.title,s.description,s.price,s.images,s.contact,s.view_count,s.status,s.create_time,s.update_time,
            c.id as category_id,c.name as category_name,
            sc.id as school_id,sc.name as school_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            ${whereClause}
            ORDER BY s.create_time DESC
            LIMIT ? OFFSET ?`,
            dataParams
        )

        const formattedServices = services.map(service => {
            const images = service.images ? service.images.split(',').map(img => {
                if (img && img.includes('localhost:3000')) {
                    return img.replace('http://localhost:3000', '')
                }
                return img
            }) : []

            let statusText = ''
            switch (service.status) {
                case 0: statusText = '待审核'; break;
                case 1: statusText = '已上架'; break;
                case 2: statusText = '已下架'; break;
                case 3: statusText = '审核不通过'; break;
                default: statusText = '未知'
            }

            return {
                id: service.id,
                title: service.title,
                description: service.description,
                price: service.price,
                images: images,
                contact: service.contact,
                viewCount: service.view_count,
                status: service.status,
                statusText: statusText,
                createTime: service.create_time,
                updateTime: service.update_time,
                category: {
                    id: service.category_id,
                    name: service.category_name
                },
                school: service.school_id ? {
                    id: service.school_id,
                    name: service.school_name
                } : null
            }
        })

        res.json(success({
            list: formattedServices,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    } catch (err) {
        console.error('获取我的服务失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//更新服务 - 接口：PUT /api/services/:id
const updateService = async (req, res) => {
    try {
        const userId = req.user.id
        const serviceId = req.params.id
        const { title, description, price, images, contact, school_id } = req.body

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400))
        }

        const [oldServices] = await db.query(
            'SELECT id, user_id, images FROM services WHERE id = ?',
            [serviceId]
        )

        if (oldServices.length === 0) {
            return res.json(error('服务不存在', 404))
        }
        const oldService = oldServices[0]

        if (oldService.user_id !== userId) {
            return res.json(error('无权修改他人的服务', 403))
        }

        let updateFields = []
        let updateValues = []

        if (title !== undefined) {
            if (!title || title.trim() === '') {
                return res.json(error('服务标题不能为空', 400))
            }
            if (title.length < 2 || title.length > 50) {
                return res.json(error('服务标题长度必须在2-50位之间', 400))
            }
            updateFields.push('title = ?')
            updateValues.push(title.trim())
        }

        if (description !== undefined) {
            if (!description || description.trim() === '') {
                return res.json(error('服务描述不能为空', 400))
            }
            if (description.length < 10) {
                return res.json(error('服务描述至少10个字符', 400))
            }
            updateFields.push('description = ?')
            updateValues.push(description.trim())
        }

        if (price !== undefined) {
            if (!price) {
                return res.json(error('请输入价格', 400))
            }
            if (isNaN(price) || price <= 0) {
                return res.json(error('价格必须是大于0的数字', 400))
            }
            updateFields.push('price = ?')
            updateValues.push(price)
        }

        let newImagesArray = []
        if (images !== undefined) {
            if (typeof images === 'string') {
                newImagesArray = images ? images.split(',') : []
            } else if (Array.isArray(images)) {
                newImagesArray = images
            } else {
                newImagesArray = []
            }

            const imagesStr = newImagesArray.length ? newImagesArray.join(',') : null
            updateFields.push('images = ?')
            updateValues.push(imagesStr)
        }

        if (contact !== undefined) {
            if (!contact || contact.trim() === '') {
                return res.json(error('联系方式不能为空', 400))
            }
            updateFields.push('contact = ?');
            updateValues.push(contact.trim());
        }

        if (school_id !== undefined) {
            if (school_id) {
                const [schools] = await db.query('SELECT id FROM schools WHERE id = ?', [school_id])
                if (schools.length === 0) {
                    return res.json(error('选择的学校不存在', 400))
                }
            }
            updateFields.push('school_id = ?')
            updateValues.push(school_id || null)
        }

        if (updateFields.length === 0) {
            return res.json(success(null, '没有要更新的内容'))
        }

        updateFields.push('status = ?')
        updateValues.push(0)
        updateFields.push('update_time = NOW()')
        updateValues.push(serviceId)

        await db.query(
            `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        )

        console.log(`【操作日志】用户 ${req.user.username} 更新了服务 ID:${serviceId}`);

        if (oldService.images) {
            const oldImageUrls = oldService.images.split(',')
            let currentImages = []
            if (images !== undefined) {
                if (typeof images === 'string') {
                    currentImages = images ? images.split(',') : []
                } else if (Array.isArray(images)) {
                    currentImages = images
                }
            }

            const getFilename = (url) => path.basename(url)

            const imagesToDelete = oldImageUrls.filter(oldUrl => {
                if (!oldUrl) return false
                const oldFilename = getFilename(oldUrl)
                const stillExists = currentImages.some(newUrl => {
                    if (!newUrl) return false
                    const newFilename = getFilename(newUrl)
                    return oldFilename === newFilename
                })
                return !stillExists
            })

            for (const imageUrl of imagesToDelete) {
                try {
                    await deleteImageFromCOS(imageUrl);
                    console.log(`删除旧图片：${imageUrl}`)
                } catch (fileErr) {
                    console.error('删除图片失败：', fileErr)
                }
            }
        }

        const [updated] = await db.query(
            `SELECT 
                s.id, s.title, s.description, s.price, s.images, s.contact, s.status, s.create_time, s.update_time,
                c.id as category_id, c.name as category_name,
                sc.id as school_id, sc.name as school_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE s.id = ?`,
            [serviceId]
        );

        const serviceData = updated[0];
        const imagesArray = serviceData.images ? serviceData.images.split(',').map(img => {
            if (img && img.includes('localhost:3000')) {
                return img.replace('http://localhost:3000', '')
            }
            return img
        }) : [];

        const result = {
            id: serviceData.id,
            title: serviceData.title,
            description: serviceData.description,
            price: serviceData.price,
            images: imagesArray,
            contact: serviceData.contact,
            status: serviceData.status,
            statusText: serviceData.status === 0 ? '待审核' : '未知',
            createTime: serviceData.create_time,
            updateTime: serviceData.update_time,
            category: {
                id: serviceData.category_id,
                name: serviceData.category_name
            },
            school: serviceData.school_id ? {
                id: serviceData.school_id,
                name: serviceData.school_name
            } : null
        };

        res.json(success(result, '服务更新成功，请等待审核'));

    } catch (err) {
        console.error('更新服务失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//删除服务 - 接口：DELETE /api/services/:id
const deleteService = async (req, res) => {
    try {
        const userId = req.user.id
        const serviceId = req.params.id

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400))
        }

        const [services] = await db.query(
            'SELECT id, user_id, title, images FROM services WHERE id = ?',
            [serviceId]
        )

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        if (service.user_id !== userId) {
            return res.json(error('无权删除他人的服务', 403))
        }

        const [activeOrders] = await db.query(
            'SELECT id FROM orders WHERE service_id = ? AND status IN (0,1) LIMIT 1',
            [serviceId]
        )

        if (activeOrders.length > 0) {
            return res.json(error('该服务有进行中的订单，无法删除', 400))
        }

        const [oldOrders] = await db.query(
            'SELECT id FROM orders WHERE service_id = ? AND status IN (2,3)',
            [serviceId]
        )

        if (oldOrders.length > 0) {
            await db.query(
                'DELETE FROM orders WHERE service_id = ? AND status IN (2,3)',
                [serviceId]
            )
            console.log(`删除了 ${oldOrders.length} 条关联的旧订单`)
        }

        if (service.images) {
            const imageUrls = service.images.split(',')
            for (const imageUrl of imageUrls) {
                if (imageUrl) {
                    try {
                        await deleteImageFromCOS(imageUrl);
                        console.log(`删除服务图片：${imageUrl}`)
                    } catch (fileErr) {
                        console.error('删除图片失败：', fileErr)
                    }
                }
            }
        }

        const [user] = await db.query(
            'SELECT service_count FROM users WHERE id = ?',
            [userId]
        )

        await db.query(
            'DELETE FROM services WHERE id = ?',
            [serviceId]
        )

        if (user[0].service_count > 0) {
            await db.query(
                'UPDATE users SET service_count = service_count - 1 WHERE id = ?',
                [userId]
            )
        }

        console.log(`【操作日志】用户 ${req.user.username} 删除了服务：服务ID：${serviceId}，标题：${service.title}`);

        res.json(success(null, '服务删除成功'))

    } catch (err) {
        console.error('删除服务失败', err)
        res.json(error('服务器错误', 500))
    }
}

//下架服务 - 接口：PUT /api/services/:id/offline
const offlineService = async (req, res) => {
    try {
        const userId = req.user.id
        const serviceId = req.params.id

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400))
        }

        const [services] = await db.query(
            'SELECT id, user_id, title, status FROM services WHERE id = ?',
            [serviceId]
        )

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        if (service.user_id !== userId) {
            return res.json(error('无权操作他人的服务', 403))
        }

        if (service.status !== 1) {
            let msg = ''
            if (service.status === 0) msg = '服务待审核中，不能下架'
            else if (service.status === 2) msg = '服务已下架，无需重复操作'
            else if (service.status === 3) msg = '审核不通过的服务不能下架'
            else msg = '当前状态不允许下架'
            return res.json(error(msg, 400))
        }

        await db.query(
            'UPDATE services SET status = 2 WHERE id = ?',
            [serviceId]
        )

        console.log(`【用户操作】用户 ${req.user.username} 下架了服务：${serviceId} - ${service.title}`);

        res.json(success(null, '服务下架成功'))

    } catch (err) {
        console.error('下架服务失败', err)
        res.json(error('服务器错误', 500))
    }
}

//获取服务详情（供编辑用）- 接口：GET /api/services/:id/edit
const getServiceDetailForEdit = async (req, res) => {
    try {
        const serviceId = req.params.id
        const userId = req.user.id

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400));
        }

        const [services] = await db.query(
            `SELECT
            s.id,s.title,s.description,s.price,s.images,s.contact,s.view_count,s.status,s.create_time,s.update_time,
            u.id as user_id,
            u.username as user_username,
            u.nickname as user_nickname,
            u.avatar as user_avatar,
            u.phone as user_phone,
            u.service_count,
            c.id as category_id,
            c.name as category_name,
            c.parent_id as category_parent_id,
            pc.name as parent_category_name,
            sc.id as school_id,
            sc.name as school_name,
            sc.province as school_province,
            sc.city as school_city
            FROM services s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN categories pc ON c.parent_id = pc.id
            LEFT JOIN schools sc ON s.school_id = sc.id
            WHERE s.id = ?`,
            [serviceId]
        )

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        if (service.user_id !== userId) {
            return res.json(error('无权编辑他人的服务', 403))
        }

        const images = service.images ? service.images.split(',').map(img => {
            if (img && img.includes('localhost:3000')) {
                return img.replace('http://localhost:3000', '')
            }
            return img
        }) : []

        const serviceDetail = {
            id: service.id,
            title: service.title,
            description: service.description,
            price: service.price,
            images: images,
            contact: service.contact,
            viewCount: service.view_count,
            status: service.status,
            createTime: service.create_time,
            updateTime: service.update_time,
            user: {
                id: service.user_id,
                username: service.user_username,
                nickname: service.user_nickname,
                avatar: service.user_avatar,
                phone: service.user_phone,
                serviceCount: service.service_count || 0
            },
            category: {
                id: service.category_id,
                name: service.category_name,
                parentId: service.category_parent_id,
                parentName: service.parent_category_name
            },
            school: service.school_id ? {
                id: service.school_id,
                name: service.school_name,
                province: service.school_province,
                city: service.school_city
            } : null
        }

        res.json(success(serviceDetail, '获取成功'))

    } catch (err) {
        console.error('获取服务详情失败:', err)
        res.json(error('服务器错误', 500))
    }
}


module.exports = {
    publishService,
    getServiceList,
    getServiceDetail,
    getMyServices,
    updateService,
    deleteService,
    offlineService,
    getServiceDetailForEdit
}