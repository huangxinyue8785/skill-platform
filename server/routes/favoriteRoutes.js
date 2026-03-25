/**
 * 收藏相关的路由
 */
const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')

const {
    addFavorite,
    removeFavorite,
    getFavoriteList,
    checkFavorite,
} = require('../controllers/favoritesController')

router.post('/',auth,addFavorite)
router.delete('/:id',auth,removeFavorite)
router.get('/', auth, getFavoriteList)
router.get('/check/:serviceId', auth, checkFavorite)

module.exports = router