/**
 * 学校相关的路由
 */
const express = require('express');
const router = express.Router();

const {
    getSchoolList,
    searchSchools
} = require('../controllers/schoolController')

router.get('/', getSchoolList);
router.get('/search',searchSchools);

module.exports = router