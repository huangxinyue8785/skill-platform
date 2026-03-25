/**
 * 分类相关的路由
 * 定义接口地址对应的处理函数
 */
const express =require("express");
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth')

const {
    getCategoryList,
    getParentCategories,
    getChildCategories,
    addCategory,
    updateCategory,
    deleteCategory,
} =require('../controllers/categoryController')

router.get('/', getCategoryList)
router.get('/parent', getParentCategories)
router.get('/:parentId/children',getChildCategories)
router.post('/',adminAuth,addCategory)
router.put('/:id',adminAuth,updateCategory)
router.delete('/:id',adminAuth,deleteCategory)

module.exports = router