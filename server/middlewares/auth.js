/**
 * 验证用户登录的中间件
 * 从请求头获取 token，验证通过后把用户信息挂在 req.user 上
 */
const jwt = require('jsonwebtoken');
const {error} =require('../utils/response')

const auth = (req,res,next)=>{
    const authHeader = req.headers.authorization
    if(!authHeader){
        return res.json(error('请先登录',401))
    }

    const token = authHeader.split(' ')[1]
    if(!token){
        return res.json(error('token格式错误',401))
    }

    try{
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    }catch (err){
        return res.json(error('token无效或已过期',401))
    }
}

module.exports = auth;