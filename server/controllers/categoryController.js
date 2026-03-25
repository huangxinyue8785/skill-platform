/**
 * 分类相关的业务逻辑
 * 获取分类列表、添加分类等都写在这里
 */
const db = require('../config/db');
const { success, error } = require('../utils/response')

// 获取分类列表（树形结构）- 接口： GET /api/categories
const getCategoryList = async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT id, name, parent_id, sort FROM categories ORDER BY sort ASC'
        )

        const categoryTree = buildTree(categories)

        res.json(success(categoryTree, '获取成功'))

    } catch (err) {
        console.error('获取分类列表失败', err)
        res.json(error('服务器错误', 500))
    }
}

// 获取一级分类 - 接口： GET /api/categories/parent
const getParentCategories = async (req, res) => {
    try {
        const [categories] = await db.query(
            'SELECT id, name, sort FROM categories WHERE parent_id = 0 ORDER BY sort ASC'
        )

        res.json(success(categories, '获取成功'))

    } catch (err) {
        console.error('获取一级分类失败', err)
        res.json(error('服务器错误', 500))
    }
}

// 获取子分类 - 接口： GET /api/categories/:parentId/children
const getChildCategories = async (req, res) => {
    try {
        const parentId = req.params.parentId

        const [categories] = await db.query(
            `SELECT id, name, sort FROM categories WHERE parent_id = ? ORDER BY sort ASC`,
            [parentId]
        )
        res.json(success(categories, '获取成功'))
    } catch (err) {
        console.error('获取子分类失败', err)
        res.json(error('服务器错误', 500))
    }
}

// 辅助函数：构建树形结构
const buildTree = (categories, parentId = 0) => {
    const tree = []
    for (const category of categories) {
        if (category.parent_id === parentId) {
            const children = buildTree(categories, category.id)

            if (children.length > 0) {
                category.children = children
            }
            tree.push(category)
        }
    }
    return tree
}

// 添加分类 - 接口：POST /api/categories
const addCategory = async (req, res) => {
    try {
        const { name, parent_id } = req.body  // 不再从前端接收 sort
        if (!name || name.trim() === '') {
            return res.json(error('分类名称不能为空', 400))
        }
        if (name.length < 2 || name.length > 20) {
            return res.json(error('分类名称长度必须在2-20位之间', 400))
        }

        // 获取父分类名称（如果有）
        let parentCategoryName = null
        if (parent_id && parent_id !== 0) {
            const [parent] = await db.query(
                'SELECT id, name FROM categories WHERE id = ?', [parent_id]
            )
            if (parent.length === 0) {
                return res.json(error('父分类不存在', 400))
            }
            parentCategoryName = parent[0].name
        }

        const [existing] = await db.query(
            'SELECT id FROM categories WHERE name = ? AND parent_id = ?',
            [name, parent_id || 0]
        )

        if (existing.length > 0) {
            return res.json(error('该层级下已存在相同名称的分类', 400))
        }

        // ✅ 获取当前父分类下的最大 sort 值，新分类的 sort = max + 1
        const [maxSortResult] = await db.query(
            'SELECT MAX(sort) as maxSort FROM categories WHERE parent_id = ?',
            [parent_id || 0]
        )
        const maxSort = maxSortResult[0].maxSort || 0
        const newSort = maxSort + 1

        const [result] = await db.query(
            `INSERT INTO categories (name, parent_id, sort)
            VALUES (?, ?, ?)`,
            [name, parent_id || 0, newSort]
        )

        console.log(`【操作日志】管理员 ${req.admin?.username} 于 ${new Date().toLocaleString()} 添加了分类：
            - 分类名称：${name}
            - 父分类ID：${parent_id || 0}
            - 父分类名称：${parentCategoryName || '无'}
            - 排序：${newSort}`);

        // ✅ 设置日志信息（用于中间件记录）
        req.logAction = '添加分类'
        req.logTargetType = 'category'
        req.logTargetId = result.insertId
        req.logDetail = {
            categoryName: name,
            parentId: parent_id || 0,
            parentName: parentCategoryName || '无',
            sort: newSort
        }

        res.json(success({
            categoryId: result.insertId,
            name: name,
            parent_id: parent_id || 0,
            sort: newSort
        }, '分类添加成功'));

    } catch (err) {
        console.error('添加分类失败', err)
        res.json(error('服务器错误', 500))
    }
}

// 更新分类 - 接口：PUT /api/categories/:id
const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, sort } = req.body;

        if (!categoryId) {
            return res.json(error('分类ID不能为空', 400));
        }

        // 查询要更新的分类是否存在
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE id = ?',
            [categoryId]
        );

        if (categories.length === 0) {
            return res.json(error('分类不存在', 404));
        }

        const oldCategory = categories[0];

        // 获取父分类名称
        let parentCategoryName = null
        if (oldCategory.parent_id && oldCategory.parent_id !== 0) {
            const [parent] = await db.query(
                'SELECT name FROM categories WHERE id = ?', [oldCategory.parent_id]
            )
            if (parent.length > 0) {
                parentCategoryName = parent[0].name
            }
        }

        let changedFields = [];  // 记录有变化的字段
        let updateFields = [];
        let updateValues = [];

        // 处理name：如果传了且和原来不一样，才更新
        if (name !== undefined) {
            if (name.length < 2 || name.length > 20) {
                return res.json(error('分类名称长度必须在2-20位之间', 400));
            }

            // 检查是否真的变了
            if (name !== oldCategory.name) {
                // 检查重名
                const [existing] = await db.query(
                    'SELECT id FROM categories WHERE name = ? AND parent_id = ? AND id != ?',
                    [name, oldCategory.parent_id, categoryId]
                );

                if (existing.length > 0) {
                    return res.json(error('该层级下已存在相同名称的分类', 400));
                }

                updateFields.push('name = ?');
                updateValues.push(name);
                changedFields.push(`名称: ${oldCategory.name} → ${name}`);
            }
        }

        // 处理sort：如果传了且和原来不一样，才更新
        if (sort !== undefined) {
            if (sort !== oldCategory.sort) {
                updateFields.push('sort = ?');
                updateValues.push(sort);
                changedFields.push(`排序: ${oldCategory.sort} → ${sort}`);
            }
        }

        // ===== 如果没有字段真的变化，直接返回 =====
        if (updateFields.length === 0) {
            return res.json(success(null, '没有检测到变化，无需更新'));
        }

        // 执行更新
        updateValues.push(categoryId);
        await db.query(
            `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // 记录日志（只记录真正变化的内容）
        if (changedFields.length > 0) {
            console.log(`【操作日志】管理员 ${req.admin?.username} 于 ${new Date().toLocaleString()} 更新了分类 ID:${categoryId}
                修改内容：${changedFields.join('、')}`);
        }

        // ✅ 设置日志信息（用于中间件记录）
        req.logAction = '编辑分类'
        req.logTargetType = 'category'
        req.logTargetId = categoryId
        req.logDetail = {
            categoryName: oldCategory.name,
            parentId: oldCategory.parent_id,
            parentName: parentCategoryName || '无',
            changes: changedFields
        }

        // 查询更新后的分类信息
        const [updated] = await db.query(
            'SELECT id, name, parent_id, sort FROM categories WHERE id = ?',
            [categoryId]
        );

        res.json(success(updated[0], '分类更新成功'));

    } catch (err) {
        console.error('更新分类失败:', err);
        res.json(error('服务器错误', 500));
    }
}

// 删除分类 - 接口：DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        if (!categoryId) {
            return res.json(error('分类ID不能为空', 400))
        }

        const [categories] = await db.query(
            'SELECT id, name, parent_id, sort FROM categories WHERE id = ?',
            [categoryId]
        )
        if (categories.length === 0) {
            return res.json(error('分类不存在', 404))
        }
        const category = categories[0]

        // 获取父分类名称
        let parentCategoryName = null
        if (category.parent_id && category.parent_id !== 0) {
            const [parent] = await db.query(
                'SELECT name FROM categories WHERE id = ?', [category.parent_id]
            )
            if (parent.length > 0) {
                parentCategoryName = parent[0].name
            }
        }

        const [children] = await db.query(
            'SELECT id, name FROM categories WHERE parent_id = ?',
            [categoryId]
        )

        if (children.length > 0) {
            const childNames = children.map(c => c.name).join('、')
            return res.json(error(
                `该分类有子分类（${childNames}），请先删除子分类`, 400
            ))
        }

        const [services] = await db.query(
            'SELECT id, title FROM services WHERE category_id = ? LIMIT 5', [categoryId]
        )

        if (services.length > 0) {
            const serviceTitles = services.map(s => s.title).join('、')
            const more = services.length >= 5 ? '...等' : ''
            return res.json(error(
                `该分类有服务（${serviceTitles}${more}）在使用，不能删除`, 400
            ))
        }

        await db.query('DELETE FROM categories WHERE id = ?', [categoryId])

        console.log(`【操作日志】管理员 ${req.admin?.username} 于 ${new Date().toLocaleString()} 删除了分类：
            - 分类ID：${categoryId}
            - 分类名称：${category.name}
            - 父分类ID：${category.parent_id}
            - 父分类名称：${parentCategoryName || '无'}`);

        // ✅ 设置日志信息（用于中间件记录）
        req.logAction = '删除分类'
        req.logTargetType = 'category'
        req.logTargetId = categoryId
        req.logDetail = {
            categoryName: category.name,
            parentId: category.parent_id,
            parentName: parentCategoryName || '无'
        }

        res.json(success(null, '分类删除成功'));

    } catch (err) {
        console.error('删除分类失败:', err);
        res.json(error('服务器错误', 500));
    }
}

module.exports = {
    getCategoryList,
    getParentCategories,
    getChildCategories,
    addCategory,
    updateCategory,
    deleteCategory,
}