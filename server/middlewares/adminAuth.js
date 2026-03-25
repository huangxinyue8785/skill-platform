/**
 * 验证管理员登录的中间件
 * 从请求头获取 token，验证通过后把管理员信息挂在 req.admin 上
 */
const jwt =require('jsonwebtoken')
const {error} =require('../utils/response')

const adminAuth = (req,res,next)=>{
    const authHeader =req.headers.authorization
    if(!authHeader){
        return res.json(error('请先登录',401))
    }

    const token =authHeader.split(' ')[1]
    if(!token){
        return res.json(error('token格式错误',401))
    }

    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)

        if(decoded.role !== 'admin'){
            return res.json(error('无权访问',403))
        }

        req.admin = decoded
        next()
    }catch (err){
        return res.json(error('token无效或过期',401))
    }
}

module.exports = adminAuth;