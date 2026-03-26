/**
 * 用户相关的路由
 * 定义接口地址对应的处理函数
 */
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth')
const { uploadAvatar:uploadAvatarMiddleware  } = require('../middlewares/upload')

const {
    userRegister,
    userLogin,
    getUserInfo,
    updateUserInfo,
    updatePassword,
    uploadAvatar,
    getUserSig,
    getUserInfoById
} = require('../controllers/userController');

router.post('/register', userRegister);
router.post('/login', userLogin);
router.get('/info',auth,getUserInfo);
router.put('/info',auth,updateUserInfo);
router.put('/password',auth,updatePassword);
router.post('/avatar',auth,uploadAvatarMiddleware.single('avatar'),uploadAvatar)
// 获取 IM UserSig（需要登录）
router.get('/im/usersig', auth, getUserSig);
// 获取指定用户信息（公开接口）
router.get('/info/:id', getUserInfoById);

module.exports = router;