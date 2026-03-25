/**
 * 管理员相关的业务逻辑
 * 登录、用户管理、审核等都写在这里
 */
const db = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {success,error} =require('../utils/response')

// 管理员登录 接口地址：POST /api/admin/login
const adminLogin = async (req, res) =>{
    try{
        const {username,password} =req.body

        //非空验证
        if(!username || !password){
            return res.json(error('用户名和密码不能为空'))
        }
        if (username.length < 3 || username.length > 20) {
            return res.json(error('用户名长度必须在3-20位之间'));
        }
        if (password.length < 6 || password.length > 20) {
            return res.json(error('密码长度必须在6-20位之间'));
        }
        //查询管理员
        const [admins] = await db.query(
            'SELECT * FROM admins WHERE username=?',
            [username]
        )
        //查询管理员是否存在
        if(admins.length===0){
            return res.json(error('用户名或密码错误',401))
        }
        const admin=admins[0]

        //检查管理员账号是否正常
        if(admin.status !== 1){
            return res.json(error('账号已被禁用',403))
        }

        //验证密码
        const isValid=bcrypt.compareSync(password,admin.password)
        if(!isValid){
            return res.json(error('用户名或密码错误',401))
        }

        //生成JWT token（带上真实姓名）
        const token =jwt.sign({
            id:admin.id,
            username:admin.username,
            real_name: admin.real_name,
            role:'admin',
            is_super:admin.is_super
        },
            process.env.JWT_SECRET,
            {expiresIn: '7d'})

        // ✅ 设置登录日志（用于中间件记录）
        req.tempAdmin = {
            id: admin.id,
            username: admin.username,
            real_name: admin.real_name
        }
        req.logAction = '管理员登录'
        req.logTargetType = 'admin'
        req.logTargetId = admin.id
        req.logDetail = {
            username: admin.username,
            realName: admin.real_name,
            loginTime: new Date().toLocaleString()
        }

        //返回管理员信息
        delete admin.password
        res.json(success({
            token,
            admin:{
                id:admin.id,
                username:admin.username,
                real_name: admin.real_name,
                email:admin.email,
                phone: admin.phone,
                is_super:admin.is_super,
                status:admin.status
            }
        },'登录成功'))
    }catch (err){
        console.error('管理员登录失败',err)
        res.json(error('服务器错误', 500));
    }
}

//获取用户列表 - 接口：GET /api/admin/users
const getUserList = async (req,res)=>{
    try{
        const{
            page = 1,
            pageSize = 10,
            keyword = '',
            status
        } = req.query

        const offset = (page - 1) * pageSize

        // ✅ 去掉 is_deleted，恢复为原来的
        let whereConditions = ['1=1']
        let queryParams = []

        if (status !== undefined && status !== '') {
            whereConditions.push('u.status = ?')
            queryParams.push(parseInt(status))
        }

        if(keyword && keyword.trim() !== ''){
            whereConditions.push('(u.username LIKE ? OR u.nickname LIKE ?)')
            queryParams.push(`%${keyword}%`,`%${keyword}%`)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        const dataParams = [...queryParams, parseInt(pageSize), offset]
        const [users] = await db.query(
            `SELECT
                u.id, u.username, u.nickname, u.avatar, u.phone, u.email, u.gender, u.birthday, 
                u.school_id, u.status, u.service_count, u.order_count, u.favorite_count, u.violation_count,
                u.create_time, u.last_login_time,
                s.name as school_name
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            ${whereClause}
            ORDER BY u.create_time DESC
            LIMIT ? OFFSET ?`,
            dataParams
        )

        res.json(success({
            list: users,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))
    }catch (err){
        console.error('获取用户列表失败',err)
        res.json(error('服务器错误',500))
    }
}

// 处理用户违规（根据违规次数自动处罚）
const handleViolation = async (req, res) => {
    try {
        const { userId, violationType, violationReason } = req.body
        const adminId = req.admin.id  // 获取当前操作的管理员ID

        // 查询用户
        const [users] = await db.query(
            'SELECT id, username, status, violation_count FROM users WHERE id = ?',
            [userId]
        )

        if (users.length === 0) {
            return res.json(error('用户不存在', 404))
        }

        const user = users[0]

        // 如果已经是永久封禁，不能再次处罚
        if (user.status === 0) {
            return res.json(error('该用户已被永久封禁', 400))
        }

        // 违规次数 +1
        const newViolationCount = user.violation_count + 1

        let newStatus = user.status
        let freezeDays = 0
        let freezeExpireTime = null
        let punishmentType = ''
        let message = ''

        // 根据违规次数决定处罚
        if (newViolationCount === 1) {
            // 第一次：冻结3天
            newStatus = 2
            freezeDays = 3
            punishmentType = '冻结3天'
            message = '因违规操作，账号已被冻结3天'
        } else if (newViolationCount === 2) {
            // 第二次：冻结7天
            newStatus = 2
            freezeDays = 7
            punishmentType = '冻结7天'
            message = '因再次违规，账号已被冻结7天'
        } else {
            // 第三次及以上：永久封号
            newStatus = 0
            punishmentType = '永久封禁'
            message = '因多次违规，账号已被永久封禁'
        }

        // 计算冻结到期时间
        if (freezeDays > 0) {
            freezeExpireTime = new Date()
            freezeExpireTime.setDate(freezeExpireTime.getDate() + freezeDays)
        }

        // ✅ 使用事务
        const connection = await db.getConnection()
        await connection.beginTransaction()

        try {
            // 1. 更新用户状态
            await connection.query(
                `UPDATE users 
                 SET status = ?, 
                     violation_count = ?,
                     freeze_expire_time = ?
                 WHERE id = ?`,
                [newStatus, newViolationCount, freezeExpireTime, userId]
            )

            // 2. 插入违规记录
            await connection.query(
                `INSERT INTO user_violations 
                 (user_id, admin_id, violation_type, violation_reason, punishment_type, freeze_days, freeze_expire_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, adminId, violationType, violationReason || '', punishmentType, freezeDays, freezeExpireTime]
            )

            await connection.commit()
            connection.release()

            console.log(`管理员 ${req.admin.username} 处理用户 ${user.username}：第${newViolationCount}次，处罚：${punishmentType}，原因：${violationReason || '无'}`)

            res.json(success({
                violationCount: newViolationCount,
                punishmentType: punishmentType,
                message: message
            }, message))

        } catch (err) {
            await connection.rollback()
            connection.release()
            throw err
        }

    } catch (err) {
        console.error('处理违规失败', err)
        res.json(error('服务器错误', 500))
    }
}

//获取用户详情 - 接口：GET /api/admin/users/:id
const getUserDetail = async (req,res)=>{
    try{
        const userId = req.params.id

        if(!userId){
            return res.json(error('用户ID不能为空',400))
        }

        const [users] = await db.query(
            `SELECT
                u.id,u.username,u.nickname,u.avatar,u.phone,u.email,u.gender,u.birthday,u.school_id,
                s.name as school_name,u.status,u.service_count,u.order_count,u.favorite_count,u.create_time,
                u.last_login_time,u.last_login_ip
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.id = ?`,
            [userId]
        )

        if(users.length === 0){
            return res.json(error('用户不存在',404))
        }

        const user = users[0]
        let genderText = '未知'
        if(user.gender === 1) genderText = '男'
        if(user.gender === 2) genderText = '女'

        const userDetail = {
            ...user,
            gender_text:genderText
        }

        res.json(success(userDetail,'获取成功'))

    }catch (err){
        console.error('获取用户详情失败',err)
        res.json(error('服务器错误',500))
    }
}

//更新用户状态 - 接口：PUT /api/admin/users/:id/status
const updateUserStatus = async (req,res)=>{
    try{
        const userId = req.params.id

        const {status} =req.body

        if(!userId){
            return res.json(error('用户ID不能为空',400))
        }

        const validStatus = [0,1,2]
        if(status === undefined || status === null){
            return res.json(error('状态不能为空',400))
        }
        if(!validStatus.includes(parseInt(status))){
            return res.json(error('状态值不合法，只能是0、1、2',400))
        }

        const [users] = await db.query(
            'SELECT id,username,status FROM users WHERE id = ?',
            [userId]
        )

        if(users.length === 0){
            return res.json(error('用户不存在',404))
        }

        const user = users[0]

        if(user.status === parseInt(status)){
            return res.json(success(null,'状态未变化'))
        }

        await db.query(
            'UPDATE users SET status = ? WHERE id = ?',
            [parseInt(status),userId]
        )

        console.log(`管理员${req.admin.username}将用户${user.username}的状态从${user.status}改为${status}`)

        let statusText = ''
        if(status === 0) statusText = '禁用'
        else if(status === 1) statusText = '启用'
        else if(status === 2) statusText = '冻结'

        req.logAction = status === 0 ? '禁用用户' : (status === 2 ? '冻结用户' : '启用用户')
        req.logTargetType = 'user'
        req.logTargetId = userId
        req.logDetail = {
            username: user.username,
            oldStatus: user.status === 1 ? '正常' : (user.status === 0 ? '禁用' : '冻结'),
            newStatus: status === 0 ? '禁用' : (status === 2 ? '冻结' : '启用')
        }

        res.json(success(null,`用户已${statusText}`))

    }catch (err){
        console.error('更新用户状态失败',err)
        res.json(error('服务器错误',500))
    }
}

//删除用户 - 接口：DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id
        if (!userId) {
            return res.json(error('用户ID不能为空', 400))
        }

        // 查询用户是否存在
        const [users] = await db.query(
            'SELECT id, username, nickname FROM users WHERE id = ?',
            [userId]
        )

        if (users.length === 0) {
            return res.json(error('用户不存在', 404))
        }

        const user = users[0]

        // ✅ 检查用户是否有订单（作为买家或卖家）
        const [orderCheck] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE buyer_id = ? OR seller_id = ?',
            [userId, userId]
        )

        if (orderCheck[0].count > 0) {
            return res.json(error(`该用户有 ${orderCheck[0].count} 条订单，无法删除。请先处理关联订单。`, 400))
        }

        // ✅ 无订单 → 物理删除（彻底清除）
        const connection = await db.getConnection()
        await connection.beginTransaction()

        try {
            // 1. 删除用户的收藏
            await connection.query(
                'DELETE FROM favorites WHERE user_id = ?',
                [userId]
            )

            // 2. 删除用户的服务（会触发服务图片删除）
            await connection.query(
                'DELETE FROM services WHERE user_id = ?',
                [userId]
            )

            // 3. 删除用户的违规记录
            await connection.query(
                'DELETE FROM user_violations WHERE user_id = ?',
                [userId]
            )

            // 4. 最后删除用户
            await connection.query(
                'DELETE FROM users WHERE id = ?',
                [userId]
            )

            await connection.commit()
            connection.release()

            req.logAction = '删除用户'
            req.logTargetType = 'user'
            req.logTargetId = userId
            req.logDetail = {
                username: user.username,
                nickname: user.nickname
            }

            console.log(`管理员 ${req.admin.username} 删除了用户 ${user.username}（ID：${userId}）`)

            res.json(success(null, '用户删除成功'))

        } catch (err) {
            await connection.rollback()
            connection.release()
            throw err
        }

    } catch (err) {
        console.error('删除用户失败', err)
        res.json(error('服务器错误：' + err.message, 500))
    }
}

//获取管理员列表 - 接口：GET /api/admin/admins (需要超级管理员权限)
const getAdminList = async (req,res) =>{
    try{
        if(req.admin.is_super !== 1){
            return res.json(error('只有超级管理员可以查看管理员列表',403))
        }
        const {
            page = 1,
            pageSize = 10,
            keyword = '',
        } = req.query

        const offset = (page - 1) * pageSize

        let whereConditions = ['1=1']
        let queryParams = []

        if(keyword && keyword.trim() !== ''){
            whereConditions.push('(username LIKE ? OR real_name LIKE ?)')
            queryParams.push(`%${keyword}%`,`%${keyword}%`)
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM admins ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        const dataParams = [...queryParams,parseInt(pageSize),offset]
        const [admins] =await db.query(
            `SELECT
            id,username,real_name,email,phone,is_super,status,create_time,update_time
            FROM admins
            ${whereClause}
            ORDER BY
                is_super DESC,
                create_time DESC
            LIMIT ? OFFSET ?`,
            dataParams
        )

        const formattedAdmins = admins.map(admin => ({
            ...admin,
            is_super_text:admin.is_super === 1 ? '超级管理员' : '普通管理员',
            status_text:admin.status === 1 ? '正常' : '禁用'
        }))

        res.json(success({
            list:formattedAdmins,
            total,
            page:parseInt(page),
            pageSize:parseInt(pageSize),
            totalPages:Math.ceil(total / pageSize)
        },'获取成功'))

    }catch (err){
        console.error('获取管理员列表失败',err)
        res.json(error('服务器错误',500))
    }
}

//添加管理员 - 接口：POST /api/admin/admins (只有超级管理员可以操作)
const addAdmin = async (req,res)=>{
    try{
        if(req.admin.is_super !== 1){
            return res.json(error('只有超级管理员才能添加管理员',403))
        }

        const {username,password,real_name,email,phone,is_super} = req.body

        if(!username || !password || !real_name || !email){
            return res.json(error('用户名、密码、真实姓名、邮箱不能为空',400))
        }

        if(username.length < 3 || username.length > 20){
            return res.json(error('用户名长度必须在3-20位之间',400))
        }
        const usernameRegex = /^[a-zA-Z0-9_]+$/
        if(!usernameRegex.test(username)){
            return res.json(error('用户名只能包含字母、数字和下划线',400))
        }

        if(password.length < 6 || password.length > 20){
            return res.json(error('密码长度必须在6-20位之间',400))
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(email)){
            return res.json(error('邮箱格式不正确',400))
        }

        if(phone){
            const phoneRegex = /^1[3-9]\d{9}$/
            if(!phoneRegex.test(phone)){
                return res.json(error('手机号格式不正确',400))
            }
        }

        const [existingUsername] = await db.query(
            'SELECT id FROM admins WHERE username = ?',
            [username]
        )
        if(existingUsername.length > 0){
            return res.json(error('用户名已存在',400))
        }

        const [existingEmail] = await db.query(
            'SELECT id FROM admins WHERE email = ?',
            [email]
        )
        if(existingEmail.length > 0){
            return res.json(error('邮箱已被使用',400))
        }

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(password,salt)

        const [result] =await db.query(
            `INSERT INTO admins (username,password,real_name,email,phone,is_super,status)
            VALUES (?,?,?,?,?,?,1)`,
            [username,hash,real_name,email,phone || null ,is_super || 0]
        )

        console.log(`[操作日志] 超级管理员 ${req.admin.username} 于 ${new Date().toLocaleString()} 添加了管理员：
            - 用户名：${username}
            - 真实姓名：${real_name}
            - 邮箱：${email}
            - 手机：${phone || '无'}
            - 权限：${is_super === 1 ? '超级管理员' : '普通管理员'}`)

        // 在返回之前，设置日志信息
        req.logAction = '添加管理员'
        req.logTargetType = 'admin'
        req.logTargetId = result.insertId
        req.logDetail = {
            username: username,
            realName: real_name,
            email: email,
            isSuper: is_super === 1 ? '超级管理员' : '普通管理员'
        }

        res.json(success({
            adminId:result.insertId
        },'管理员添加成功'))

    }catch (err){
        console.error('添加管理员失败',err)
        res.json(error('服务器错误',500))
    }
}

//更新管理员状态 - 接口：PUT /api/admin/admins/:id/status
const updateAdminStatus = async (req,res)=>{
    try{
        if(req.admin.is_super !== 1){
            return res.json(error('只有超级管理员才能更新管理员状态',403))
        }

        const adminId = req.params.id
        const {status} = req.body

        if(!adminId){
            return res.json(error('管理员ID不能为空',400))
        }

        const validStatus = [0,1]
        if(status === undefined || status === null){
            return res.json(error('状态不能为空',400))
        }
        if(!validStatus.includes(parseInt(status))){
            return res.json(error('状态值不合法，只能为0或1',400))
        }

        const [admins] = await db.query(
            'SELECT id ,username,real_name,is_super,status FROM admins WHERE id = ?',
            [adminId]
        )

        if(admins.length === 0){
            return res.json(error('管理员不存在',404))
        }

        const targetAdmin = admins[0]

        if(req.admin.id === parseInt(adminId)){
            return res.json(error('不能修改自己的状态',400))
        }

        if(targetAdmin.is_super === 1 && req.admin.is_super !== 1){
            return res.json(error('不能修改超级管理员的状态',403))
        }

        if(targetAdmin.status === parseInt(status)){
            return res.json(success(null,'状态未变化'))
        }

        await db.query(
            'UPDATE admins SET status = ? WHERE id = ?',
            [parseInt(status),adminId]
        )

        console.log(`[操作日志] 超级管理员 ${req.admin.username} 于 ${new Date().toLocaleString()} 
            将管理员 ${targetAdmin.username} 的状态从 ${targetAdmin.status === 1 ? '正常' : '禁用'} 改为 ${status === 1 ? '正常' : '禁用'}`);

        let statusText = status === 1 ? '启用' : '禁用';

        // 在返回之前，设置日志信息
        req.logAction = status === 1 ? '启用管理员' : '禁用管理员'
        req.logTargetType = 'admin'
        req.logTargetId = adminId
        req.logDetail = {
            adminName: targetAdmin.username,
            oldStatus: targetAdmin.status === 1 ? '正常' : '禁用',
            newStatus: status === 1 ? '正常' : '禁用'
        }

        res.json(success(null, `管理员已${statusText}`));

    }catch (err){
        console.error('更新管理员状态失败',err)
        res.json(error('服务器错误',500))
    }
}

//删除管理员 - 接口：DELETE /api/admin/admins/:id
const deleteAdmin = async (req,res) =>{
    try{
        if(req.admin.is_super !== 1){
            return res.json(error('只有超级管理员可以删除管理员',403))
        }

        const adminId = req.params.id

        if(!adminId){
            return res.json(error('管理员ID不能为空',400))
        }

        if(req.admin.id === parseInt(adminId)){
            return res.json(error('不能删除当前登录的超级管理员账号',400))
        }

        const [admins] = await db.query(
            'SELECT id,username,real_name,is_super FROM admins WHERE id = ?',
            [adminId]
        )

        if(admins.length === 0){
            return res.json(error('管理员不存在',400))
        }

        const targetAdmin = admins[0]

        if(targetAdmin.is_super === 1){
            const [superAdmins] = await db.query(
                'SELECT COUNT(*) as count FROM admins WHERE is_super = 1'
            )

            if(superAdmins[0].count <= 1){
                return res.json(error('系统必须至少保留一个超级管理员',400))
            }

            console.log(`⚠️【重要操作】超级管理员 ${req.admin.username} 删除了超级管理员 ${targetAdmin.username}`)
        }else{
            console.log(`【操作日志】超级管理员 ${req.admin.username} 删除了普通管理员 ${targetAdmin.username}`)
        }

        // 在返回之前，设置日志信息
        req.logAction = '删除管理员'
        req.logTargetType = 'admin'
        req.logTargetId = adminId
        req.logDetail = {
            adminName: targetAdmin.username,
            realName: targetAdmin.real_name
        }

        await db.query('DELETE FROM admins WHERE id = ?',[adminId])

        res.json(success(null,'管理员删除成功'))

    }catch (err){
        console.error('删除管理员失败',err)
        res.json(error('服务器错误',500))
    }
}

// 审核服务 - 接口：PUT /api/admin/services/:id/audit
const auditService = async (req, res) => {
    try {
        const serviceId = req.params.id
        const { status, reason } = req.body

        console.log('收到审核请求:', { serviceId, status, reason })

        // 验证状态
        const validStatus = [1, 3]
        if (!validStatus.includes(status)) {
            return res.json(error('状态值不合法，只能为1(通过)或3(拒绝)', 400))
        }

        // 查询服务是否存在
        const [services] = await db.query(
            `SELECT id, title, status, user_id 
             FROM services 
             WHERE id = ?`,
            [serviceId]
        )

        console.log('查询到的服务:', services)

        if (services.length === 0) {
            return res.json(error('服务不存在', 404))
        }

        const service = services[0]

        // 只能审核待审核的服务 (status=0)
        if (service.status !== 0) {
            return res.json(error('该服务已审核过，不能重复审核', 400))
        }

        // 更新服务状态
        await db.query(
            'UPDATE services SET status = ? WHERE id = ?',
            [status, serviceId]
        )

        console.log('更新状态成功')

        // ✅ 设置日志信息
        req.logAction = status === 1 ? '审核通过' : '审核拒绝'
        req.logTargetType = 'service'
        req.logTargetId = serviceId
        req.logDetail = {
            serviceTitle: service.title,
            newStatus: status === 1 ? '已上架' : '不通过',
            reason: reason || null
        }

        console.log('设置日志:', req.logAction)

        res.json(success(null, `审核${status === 1 ? '通过' : '拒绝'}成功`))

    } catch (err) {
        console.error('审核服务失败详情:', err)
        res.json(error('服务器错误：' + err.message, 500))
    }
}

// 获取操作日志列表 - 接口：GET /api/admin/logs
const getOperationLogs = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            admin_id,
            action,
            start_time,
            end_time
        } = req.query

        const offset = (page - 1) * pageSize

        let whereConditions = ['1=1']
        let queryParams = []

        // 按管理员筛选
        if (admin_id) {
            whereConditions.push('admin_id = ?')
            queryParams.push(admin_id)
        }

        // 按操作类型筛选
        if (action) {
            whereConditions.push('action = ?')
            queryParams.push(action)
        }

        // 按时间范围筛选
        if (start_time) {
            whereConditions.push('create_time >= ?')
            queryParams.push(start_time)
        }
        if (end_time) {
            whereConditions.push('create_time <= ?')
            queryParams.push(end_time + ' 23:59:59')
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        // 查询总数
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM operation_logs ${whereClause}`,
            queryParams
        )
        const total = countResult[0].total

        // 查询数据
        const dataParams = [...queryParams, parseInt(pageSize), offset]
        const [logs] = await db.query(
            `SELECT id, admin_id, admin_name, action, target_type, target_id, detail, ip, user_agent, create_time
             FROM operation_logs
             ${whereClause}
             ORDER BY create_time DESC
             LIMIT ? OFFSET ?`,
            dataParams
        )

        // 解析 detail JSON
        const formattedLogs = logs.map(log => ({
            ...log,
            detail: log.detail ? JSON.parse(log.detail) : null
        }))

        res.json(success({
            list: formattedLogs,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    } catch (err) {
        console.error('获取操作日志失败', err)
        res.json(error('服务器错误', 500))
    }
}

// 获取用户违规记录
const getUserViolations = async (req, res) => {
    try {
        const userId = req.params.id

        const [violations] = await db.query(
            `SELECT v.id, v.violation_type, v.violation_reason, v.punishment_type, 
                    v.freeze_days, v.freeze_expire_time, v.create_time,
                    a.username as admin_name
             FROM user_violations v
             LEFT JOIN admins a ON v.admin_id = a.id
             WHERE v.user_id = ?
             ORDER BY v.create_time DESC`,
            [userId]
        )

        res.json(success(violations, '获取成功'))
    } catch (err) {
        console.error('获取违规记录失败', err)
        res.json(error('服务器错误', 500))
    }
}

module.exports={
    adminLogin,
    getUserList,
    handleViolation,
    getUserDetail,
    updateUserStatus,
    deleteUser,
    getAdminList,
    addAdmin,
    updateAdminStatus,
    deleteAdmin,
    auditService,
    getOperationLogs,
    getUserViolations
}