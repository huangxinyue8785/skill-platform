/**
 * 管理员相关的路由
 * 定义接口地址对应的处理函数
 */
const express =require('express')
const router =express.Router()
const adminAuth = require('../middlewares/adminAuth')


const {
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
} =require('../controllers/adminController')

router.post('/login',adminLogin)
router.get('/users',adminAuth,getUserList)
// 处理用户违规
router.post('/users/violation', adminAuth, handleViolation)
router.get('/users/:id',adminAuth,getUserDetail)
router.put('/users/:id/status',adminAuth,updateUserStatus)
router.delete('/users/:id',adminAuth,deleteUser)
router.get('/admins',adminAuth,getAdminList)
router.post('/admins',adminAuth,addAdmin)
router.put('/admins/:id/status',adminAuth,updateAdminStatus)
router.delete('/admins/:id',adminAuth,deleteAdmin)
router.put('/services/:id/audit', adminAuth, auditService)
// 获取操作日志
router.get('/logs', adminAuth, getOperationLogs)
router.get('/users/:id/violations', adminAuth, getUserViolations)

module.exports=router