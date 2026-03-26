/**
 * 用户相关的业务逻辑
 * 注册、登录、获取信息等都写在这里
 */
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');
const fs = require('fs')
const path = require('path');
const TLSSigAPIv2 = require('tls-sig-api-v2');

// 用户注册 接口地址：POST /api/user/register
const userRegister = async (req, res) => {
    try {
        const { username, password, nickname, phone, email } = req.body;

        //用户名验证
        if(!username){
            return res.json(error('用户名不能为空'))
        }
        if (username.length < 3 || username.length > 20) {
            return res.json(error('用户名长度必须在3-20位之间'));
        }
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if(!usernameRegex.test(username)){
            return res.json(error('用户名只能包含字母、数字和下划线'))
        }

        //密码验证
        if(!password){
            return res.json(error('密码不能为空'))
        }
        if (password.length < 6 || password.length > 20) {
            return res.json(error('密码长度必须在6-20位之间'));
        }

        //昵称验证
        if(!nickname){
            return res.json(error('昵称不能为空'))
        }
        if(nickname.length<2 || nickname.length>10){
            return res.json(error('昵称必须在2-10位之间'))
        }

        //手机号验证（如果提供了）
        if(phone){
            const phoneRegex = /^1[3-9]\d{9}$/;
            if(!phoneRegex.test(phone)){
                return res.json(error('手机号格式不正确'))
            }
        }

        //邮箱验证（如果提供了）
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  // 简单的邮箱正则
            if (!emailRegex.test(email)) {
                return res.json(error('邮箱格式不正确'));
            }
        }

        //验证用户名是否已存在
        const [existing] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        if (existing.length > 0) {
            return res.json(error('用户名已存在'));
        }

        //密码加密
        const salt = bcrypt.genSaltSync(10); // 生成盐
        const hash = bcrypt.hashSync(password, salt); // 加密

        //插入数据库
        await db.query(
            `INSERT INTO users (username, password, nickname, phone, email)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hash, nickname, phone || null, email || null]
        );

        res.json(success(null, '注册成功'));
    } catch (err) {
        console.error('注册失败:', err);
        res.json(error('服务器错误', 500));
    }
};

// 用户登录 接口地址：POST /api/user/login
const userLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. 非空验证
        if (!username || !password) {
            return res.json(error('用户名和密码不能为空'));
        }

        // 2. 长度验证
        if (username.length < 3 || username.length > 20) {
            return res.json(error('用户名长度必须在3-20位之间'));
        }
        if (password.length < 6 || password.length > 20) {
            return res.json(error('密码长度必须在6-20位之间'));
        }

        // 3. 用户名格式验证
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.json(error('用户名只能包含字母、数字和下划线'));
        }

        // 4. 查询用户
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        )

        if (users.length === 0) {
            return res.json(error('用户名或密码错误', 401))
        }
        const user = users[0]

        // ✅ 检查永久封禁
        if (user.status === 0) {
            return res.json(error('账号已被永久封禁，请联系管理员', 403))
        }

        // ✅ 检查冻结状态，并判断是否到期
        if (user.status === 2 && user.freeze_expire_time) {
            const now = new Date()
            const expireTime = new Date(user.freeze_expire_time)

            if (now >= expireTime) {
                // 到期自动解封
                await db.query(
                    'UPDATE users SET status = 1, freeze_expire_time = NULL WHERE id = ?',
                    [user.id]
                )
                // 继续登录
            } else {
                // 还在冻结期
                const daysLeft = Math.ceil((expireTime - now) / (1000 * 60 * 60 * 24))
                return res.json(error(`账号已被冻结，剩余 ${daysLeft} 天解封`, 403))
            }
        }

        // 6. 验证密码
        const isValid = bcrypt.compareSync(password, user.password)
        if (!isValid) {
            return res.json(error('用户名或密码错误', 401))
        }

        // 7. 生成 JWT token
        const token = jwt.sign({
            id: user.id,
            username: user.username,
            role: 'user'
        }, process.env.JWT_SECRET, { expiresIn: '7d' })

        // 8. 更新最后登录时间
        await db.query(
            'UPDATE users SET last_login_time = NOW() WHERE id = ?',
            [user.id]
        )

        // 9. 计算订单数量
        const [orderResult] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE buyer_id = ?',
            [user.id]
        )
        const actualOrderCount = orderResult[0].count

        // 10. 返回用户信息
        delete user.password;
        const userInfo = {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            phone: user.phone,
            email: user.email,
            gender: user.gender,
            status: user.status,
            role: 'user',
            service_count: user.service_count || 0,
            order_count: actualOrderCount,
            favorite_count: user.favorite_count || 0
        }

        res.json(success({
            token,
            user: userInfo
        }, '登录成功'));

    } catch (err) {
        console.error('登录失败:', err);
        res.json(error('服务器错误', 500));
    }
}

//获取当前登录用户信息 接口地址：GET /api/user/info
const getUserInfo = async (req, res) => {
    try {
        const userId = req.user.id

        // 1. 查询用户基本信息（关联学校表，获取学校名称）
        // ✅ 使用 DATE_FORMAT 直接格式化生日
        const [users] = await db.query(
            `SELECT u.id, u.username, u.nickname, u.avatar, u.phone, u.email,
                    u.gender, DATE_FORMAT(u.birthday, '%Y-%m-%d') as birthday, 
                    u.school_id, u.status,
                    u.service_count, u.order_count, u.favorite_count,
                    u.create_time, u.last_login_time,
                    s.name as school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.id = ?`,
            [userId]
        )

        if (users.length === 0) {
            return res.json(error('用户不存在', 404))
        }

        const user = users[0]

        // 2. 重新计算订单数量（从 orders 表统计）
        const [orderResult] = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE buyer_id = ?',
            [userId]
        )
        const actualOrderCount = orderResult[0].count

        // 3. 返回用户信息
        const userInfo = {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            phone: user.phone,
            email: user.email,
            gender: user.gender,
            birthday: user.birthday,  // 已经是 'YYYY-MM-DD' 格式
            school_id: user.school_id,
            school_name: user.school_name,
            status: user.status,
            service_count: user.service_count || 0,
            order_count: actualOrderCount,
            favorite_count: user.favorite_count || 0,
            create_time: user.create_time,
            last_login_time: user.last_login_time
        }

        res.json(success(userInfo, '获取成功'))
    } catch (err) {
        console.error('获取用户信息失败', err)
        res.json(error('服务器错误', 500))
    }
}

//更新用户信息 - 接口：PUT /api/user/info
const updateUserInfo = async (req,res)=>{
    try{
        const userId = req.user.id
        const {nickname,avatar,phone,email,gender,birthday,school_id} = req.body

        let updateFields = []
        let updateValues = []

        if(nickname !== undefined){
            if(nickname.length < 2 || nickname.length > 10){
                return res.json(error('昵称必须在2-10位之间'))
            }
            updateFields.push('nickname = ?')
            updateValues.push(nickname)
        }

        if(avatar !== undefined){
            updateFields.push('avatar = ?')
            updateValues.push(avatar)
        }

        if(phone !== undefined){
            if(phone && !/^1[3-9]\d{9}$/.test(phone)){
                return res.json(error('手机号格式不正确'))
            }
            updateFields.push('phone = ?')
            updateValues.push(phone || null)
        }

        if(email !== undefined){
            if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
                return res.json(error('邮箱格式不正确'))
            }
            updateFields.push('email = ?')
            updateValues.push(email)
        }

        if(gender !== undefined){
            // 验证 gender 是否合法（0=未知, 1=男, 2=女）
            if(![0, 1, 2].includes(gender)){
                return res.json(error('性别值不合法', 400))
            }
            updateFields.push('gender = ?')
            updateValues.push(gender)
        }

        if(birthday !== undefined){
            // 处理日期格式
            let formattedBirthday = birthday
            if (birthday && typeof birthday === 'string') {
                // 如果是 ISO 格式（包含 T），只取日期部分
                if (birthday.includes('T')) {
                    formattedBirthday = birthday.split('T')[0]
                }
            }
            updateFields.push('birthday = ?')
            updateValues.push(formattedBirthday || null)
        }

        if(school_id !== undefined){
            if(school_id){
                const [schools] = await db.query('SELECT id FROM schools WHERE id = ?',[school_id])
                if(schools.length === 0){
                    return res.json(error('选择的学校不存在'))
                }
            }
            updateFields.push('school_id = ?')
            updateValues.push(school_id || null)
        }

        if(updateFields.length === 0){
            return res.json(success(null,'没有要更新的内容'))
        }

        updateValues.push(userId)

        const [result] = await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        )

        if(result.affectedRows === 0){
            return res.json(error('用户不存在',404))
        }

        const [users] = await db.query(
            `SELECT u.id, u.username, u.nickname, u.avatar, u.phone, u.email,
                    u.gender, DATE_FORMAT(u.birthday, '%Y-%m-%d') as birthday, 
                    u.school_id, u.status,
                    u.service_count, u.order_count, u.favorite_count, u.create_time,
                    s.name as school_name
             FROM users u
             LEFT JOIN schools s ON u.school_id = s.id
             WHERE u.id = ?`,
            [userId]
        )

        const updatedUser = users[0]
        res.json(success(updatedUser, '更新成功'));

    }catch (err){
        console.error('更新用户信息失败',err)
        res.json(error('服务器错误',500))
    }
}

//修改密码 - 接口：PUT /api/user/password
const updatePassword = async (req,res)=>{
    try{
        const userId = req.user.id
        const {oldPassword, newPassword} = req.body
        if(!oldPassword){
            return res.json(error('旧密码和新密码都不能为空',400))
        }
        if(newPassword.length < 6 || newPassword.length > 20){
            return res.json(error('新密码长度必须在6-20位之间',400))
        }
        const [users] = await db.query(
            'SELECT id,username,password FROM users WHERE id = ?',
            [userId]
        )
        if(users.length === 0){
            return res.json(error('用户名不存在',404))
        }
        const user = users[0]

        const isValid = bcrypt.compareSync(oldPassword,user.password)
        if(!isValid){
            return res.json(error('旧密码错误',401))
        }
        if(oldPassword === newPassword){
            return res.json(error('新密码不能与旧密码相同',400))
        }

        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(newPassword,salt)

        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hash,userId]
        )

        console.log(`用户${user.username}修改了密码`)
        res.json(success(null,'密码修改成功'))

    }catch (err){
        console.error('修改密码失败',err)
        res.json(error('服务器错误',500))
    }
}

//上传头像 - 接口：POST /api/user/avatar
const uploadAvatar = async (req,res)=>{
    try{
        if(!req.file){
            return res.json(error('请选择要上传的图片',400))
        }

        const userId = req.user.id

        // 先查询旧头像
        const [users] = await db.query(
            'SELECT avatar FROM users WHERE id = ?',
            [userId]
        )
        const oldAvatarUrl = users[0]?.avatar
        console.log('旧头像URL:', oldAvatarUrl)

        const avatarPath = `/uploads/avatars/${req.file.filename}`
        console.log('新头像路径:', avatarPath)

        // 更新用户表的头像
        await db.query(
            'UPDATE users SET avatar = ? WHERE id = ?',
            [avatarPath, userId]
        )
        console.log('用户表更新成功')

        // ✅ 删除这段代码：不用更新 services 表

        // 删除旧头像（如果有）
        if (oldAvatarUrl) {
            try {
                const oldFilename = path.basename(oldAvatarUrl)
                const oldFilePath = path.join(__dirname, '../uploads/avatars', oldFilename)
                console.log('尝试删除旧头像文件:', oldFilePath)

                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath)
                    console.log('旧头像删除成功')
                } else {
                    console.log('旧头像文件不存在')
                }
            } catch (fileErr) {
                console.error('删除旧头像失败:', fileErr)
            }
        }

        res.json(success({
            avatarUrl: avatarPath
        },'头像上传成功'))

    }catch (err){
        console.error('上传头像失败:', err)
        res.json(error('服务器错误',500))
    }
}

// 生成 IM 的 UserSig
const getUserSig = async (req, res) => {
    try {
        const userId = req.user.id;

        // 你的腾讯云 IM 配置
        const sdkAppId = 1600133706;
        const secretKey = '4063cf400a97f0a97659c844bb810c02db3a9f6e7ef564d34d2c59cfdae1d685';

        // 生成 UserSig，有效期 180 天
        const api = new TLSSigAPIv2.Api(sdkAppId, secretKey);
        const userSig = api.genSig(userId.toString(), 86400 * 180);

        console.log(`用户 ${userId} 生成 UserSig 成功`);
        res.json(success({ userSig }, '获取成功'));

    } catch (err) {
        console.error('生成 UserSig 失败:', err);
        res.json(error('服务器错误', 500));
    }
};

// 获取指定用户信息（公开）
const getUserInfoById = async (req, res) => {
    try {
        const userId = req.params.id;

        const [users] = await db.query(
            `SELECT id, username, nickname, avatar FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.json(error('用户不存在', 404));
        }

        res.json(success(users[0], '获取成功'));
    } catch (err) {
        console.error('获取用户信息失败', err);
        res.json(error('服务器错误', 500));
    }
};

module.exports = {
    userRegister,
    userLogin,
    getUserInfo,
    updateUserInfo,
    updatePassword,
    uploadAvatar,
    getUserSig,
    getUserInfoById
};