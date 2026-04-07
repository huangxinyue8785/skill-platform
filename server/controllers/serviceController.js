
/**
 * 服务相关的业务逻辑
 * 发布服务、获取服务列表等都写在这里
 */
const db = require('../config/db')
const {success, error} = require('../utils/response')
const jwt = require('jsonwebtoken')  // 添加这行
const util = require("node:util");
const path = require('path')  // 添加这一行
const fs = require('fs')      // 添加这一行
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
            status  // 管理员筛选用
        } = req.query

        const offset = (page - 1) * pageSize

        // 判断是否是管理员（通过 token 中的 role）
        // 注意：serviceRoutes.js 中 getServiceList 没有加 auth 中间件
        // 所以 req.user 可能不存在，需要从 token 解析
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
                // token 无效或不存在，当作普通用户
                isAdmin = false
            }
        }

        //构建查询条件
        let whereConditions = []
        let queryParams = []

        if (isAdmin) {
            // 管理员：如果有 status 参数，按状态筛选
            if (status !== undefined && status !== '') {
                whereConditions.push('s.status = ?')
                queryParams.push(parseInt(status))
            }
            // 不传 status 时，显示所有状态（不加状态条件）
        } else {
            // 普通用户：只显示已上架
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

        // 按关键词搜索
        if (keyword) {
            whereConditions.push('(s.title LIKE ? OR s.description LIKE ?)')
            queryParams.push(`%${keyword}%`, `%${keyword}%`)
        }

        //构建where子句
        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : ''

        //排序方式
        let orderBy = 's.create_time DESC'
        if (sort === 'price_asc') {
            orderBy = 's.price ASC'
        } else if (sort === 'price_desc') {
            orderBy = 's.price DESC'
        }

        //查询总条数
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM services s ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        //把分页参数加到查询参数里
        const dataParams = [...queryParams, parseInt(pageSize), offset]
        const [services] = await db.query(
            `SELECT
        s.id, s.title, s.description, s.price, s.images, s.contact, s.view_count, s.status, s.create_time,
        u.id as user_id, u.nickname as user_nickname, u.avatar as user_avatar,
        c.id as category_id, c.name as category_name,
        sc.id as school_id, sc.name as school_name
     FROM services s
     LEFT JOIN users u ON s.user_id = u.id
     LEFT JOIN categories c ON s.category_id = c.id
     LEFT JOIN schools sc ON s.school_id = sc.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
            dataParams
        )

        //处理图片字段
        const formattedServices = services.map(service => ({
            ...service,
            images: service.images ? service.images.split(',').map(img => {
                if (img && img.includes('localhost:3000')) {
                    return img.replace('http://localhost:3000', '')
                }
                return img
            }) : []
        }))

        //返回数据
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
            u.service_count,  -- ✅ 添加这一行
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

        // ✅ 保留这个验证：公开接口只能看已上架
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
                serviceCount: service.service_count || 0  // ✅ 添加这一行
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
                case 0:
                    statusText = '待审核';
                    break;
                case 1:
                    statusText = '已上架';
                    break;
                case 2:
                    statusText = '已下架';
                    break;
                case 3:
                    statusText = '审核不通过';
                    break;
                default:
                    statusText = '未知'
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
        const { title, description, price, images, contact, school_id, delete_old_images } = req.body

        if (!serviceId) {
            return res.json(error('服务ID不能为空', 400))
        }

        // 先查询旧的服务信息（用于后面删除图片）
        const [oldServices] = await db.query(
            'SELECT id, user_id, images FROM services WHERE id = ?',
            [serviceId]
        )

        if (oldServices.length === 0) {
            return res.json(error('服务不存在', 404))
        }
        const oldService = oldServices[0]

        // 验证权限
        if (oldService.user_id !== userId) {
            return res.json(error('无权修改他人的服务', 403))
        }

        // 构建更新字段
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

        // 处理图片
        let newImagesArray = []
        if (images !== undefined) {
            // 解析新的图片列表
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

        // 处理 school_id
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
        updateValues.push(0)  // 更新后重置为待审核

        updateFields.push('update_time = NOW()')

        updateValues.push(serviceId)

        // 执行更新
        await db.query(
            `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        )

        console.log(`【操作日志】用户 ${req.user.username} 于 ${new Date().toLocaleString()} 更新了服务 ID:${serviceId}`);

        // ========== 删除旧图片（只删除不在新列表中的） ==========
        if (oldService.images) {
            const oldImageUrls = oldService.images.split(',')

            // 获取新图片列表（从提交的 images 中解析）
            let currentImages = []
            if (images !== undefined) {
                if (typeof images === 'string') {
                    currentImages = images ? images.split(',') : []
                } else if (Array.isArray(images)) {
                    currentImages = images
                }
            }

            // 提取文件名进行比较
            const getFilename = (url) => path.basename(url)

            // 找出需要删除的图片：在旧列表中但不在新列表中
            const imagesToDelete = oldImageUrls.filter(oldUrl => {
                if (!oldUrl) return false
                const oldFilename = getFilename(oldUrl)
                // 检查这个旧图片是否还在新列表中
                const stillExists = currentImages.some(newUrl => {
                    if (!newUrl) return false
                    const newFilename = getFilename(newUrl)
                    return oldFilename === newFilename
                })
                return !stillExists  // 不在新列表中，需要删除
            })

            // 删除需要删除的图片文件（从COS中删除）
            for (const imageUrl of imagesToDelete) {
                try {
                    await deleteImageFromCOS(imageUrl);
                    console.log(`删除旧图片：${imageUrl}`)
                } catch (fileErr) {
                    console.error('删除图片失败：', fileErr)
                }
            }
        }

        // 查询更新后的服务信息
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

        // 先查询要删除的服务（包括图片路径）
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

        // ✅ 1. 检查是否有进行中的订单（待支付、已支付）
        const [activeOrders] = await db.query(
            'SELECT id FROM orders WHERE service_id = ? AND status IN (0,1) LIMIT 1',
            [serviceId]
        )

        if (activeOrders.length > 0) {
            return res.json(error('该服务有进行中的订单，无法删除', 400))
        }

        // ✅ 2. 如果有已完成或已取消的订单，先删除它们
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

        // ✅ 3. 删除服务关联的图片文件（从COS中删除）
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

        // 先查询当前用户的 service_count
        const [user] = await db.query(
            'SELECT service_count FROM users WHERE id = ?',
            [userId]
        )

        // 执行删除
        await db.query(
            'DELETE FROM services WHERE id = ?',
            [serviceId]
        )

        // 只有在 service_count > 0 时才减1
        if (user[0].service_count > 0) {
            await db.query(
                'UPDATE users SET service_count = service_count - 1 WHERE id = ?',
                [userId]
            )
            console.log(`用户 ${req.user.username} 删除服务成功，service_count 从 ${user[0].service_count} 减到 ${user[0].service_count - 1}`)
        } else {
            console.log(`⚠️ 警告：用户 ${userId} 的 service_count 已经是 ${user[0].service_count}，但仍在尝试删除服务，已跳过减1操作`)
        }

        console.log(`【操作日志】用户 ${req.user.username} 于 ${new Date().toLocaleString()} 删除了服务：
            - 服务ID：${serviceId}
            - 服务标题：${service.title}`);

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

        // 2. 查询服务是否存在
        const [services] = await db.query(
            'SELECT id, user_id, title, status FROM services WHERE id = ?',
            [serviceId]
        )

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        // 3. 权限验证：只能下架自己的服务
        if (service.user_id !== userId) {
            return res.json(error('无权操作他人的服务', 403))
        }

        // 4. 状态验证：只有已上架(status=1)的服务才能下架
        if (service.status !== 1) {
            let msg = ''
            if (service.status === 0) msg = '服务待审核中，不能下架'
            else if (service.status === 2) msg = '服务已下架，无需重复操作'
            else if (service.status === 3) msg = '审核不通过的服务不能下架'
            else msg = '当前状态不允许下架'

            return res.json(error(msg, 400))
        }

        // 5. 执行下架（状态改为2：已下架）
        const [result] = await db.query(
            'UPDATE services SET status = 2 WHERE id = ?',
            [serviceId]
        )

        // 6. 日志记录
        console.log(`【用户操作】用户 ${req.user.username} 于 ${new Date().toLocaleString()} 下架了服务：
            - 服务ID：${serviceId}
            - 服务标题：${service.title}
            - 原状态：${service.status} → 新状态：2(已下架)`);

        // 7. 返回成功
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
            u.service_count,  -- ✅ 添加这一行
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

        // 验证权限：只能编辑自己的服务
        if (service.user_id !== userId) {
            return res.json(error('无权编辑他人的服务', 403))
        }

        // ✅ 不验证 status，所有状态都能查看

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
                serviceCount: service.service_count || 0  // ✅ 添加这一行
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