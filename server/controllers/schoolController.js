/**
 * 学校相关的业务逻辑
 */
const db = require('../config/db')
const {success,error} = require('../utils/response')

//获取学校列表 - 接口：GET /api/schools
const getSchoolList = async (req,res)=>{
    try{
        const {
            page = 1,
            pageSize = 20,
            keyword = ''
        } =req.query

        const offset = (page - 1) * pageSize

        let whereConditions = ['1=1']
        let queryParams = []

        if(keyword && keyword.trim() !== ''){
            whereConditions.push('(name LIKE ? OR province LIKE ? OR city LIKE ?)')
            queryParams.push(`%${keyword}%`,`%${keyword}%`,`%${keyword}%`)
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ')

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM schools ${whereClause}`,
            queryParams
        )
        const total =countResult[0].total

        const dataParams = [...queryParams,parseInt(pageSize),offset]
        const [schools] = await db.query(
            `SELECT 
                id, name, province, city, latitude, longitude
             FROM schools
             ${whereClause}
             ORDER BY name ASC
             LIMIT ? OFFSET ?`,
            dataParams
        )

        res.json(success({
            list: schools,
            total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(total / pageSize)
        }, '获取成功'))

    }catch (err){
        console.error('获取学校列表失败:', err)
        res.json(error('服务器错误', 500))
    }
}

//搜索学校 - 接口：GET /api/schools/search
const searchSchools = async (req,res)=>{
    try{
        const {keyword} =req.query

        if(!keyword || keyword.trim() === ''){
            return res.json(success([],'请输入关键词'))
        }

        const [schools] = await db.query(
            `SELECT 
                id,name,province,city
                FROM schools
                WHERE name LIKE ? OR province LIKE ? OR city LIKE ?
                ORDER BY
                    CASE  WHEN name LIKE ? THEN 1
                    WHEN province LIKE ? THEN 2
                    WHEN city LIKE ? THEN 3
                    ELSE 4
                    END,
                    name ASC
                    LIMIT 10`,
            [`%${keyword}%`,`%${keyword}%`,`%${keyword}%`,`%${keyword}%`,`%${keyword}%`,`%${keyword}%`]
        )

        res.json(success(schools,'获取成功'))

    }catch (err){
        console.error('搜索学校失败:', err)
        res.json(error('服务器错误', 500))
    }
}

module.exports = {
    getSchoolList,
    searchSchools
}