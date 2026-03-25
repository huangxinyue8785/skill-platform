/**
 * 服务相关的路由
 * 发布服务、获取服务列表等都写在这里
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')

const {
    publishService,
    getServiceList,
    getServiceDetail,
    getMyServices,
    updateService,
    deleteService,
    offlineService,
    getServiceDetailForEdit
} = require('../controllers/serviceController')

router.post('/',auth,publishService)
router.get('/',getServiceList)
router.get('/my',auth,getMyServices)
router.get('/:id',getServiceDetail)
router.put('/:id', auth, updateService)
router.delete('/:id',auth,deleteService)
router.put('/:id/offline',auth,offlineService )
router.get('/:id/edit',auth,getServiceDetailForEdit)

module.exports=router