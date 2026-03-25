import request from '@/utils/request'

/**
 * 获取分类列表（树形结构）
 */
export const getCategoryList = () => {
  return request.get('/categories')
}

/**
 * 获取一级分类
 */
export const getParentCategories = () => {
  return request.get('/categories/parent')
}

/**
 * 获取子分类
 */
export const getChildCategories = (parentId) => {
  return request.get(`/categories/${parentId}/children`)
}

/**
 * 添加分类
 */
export const addCategory = (data) => {
  return request.post('/categories', data)
}

/**
 * 更新分类
 */
export const updateCategory = (id, data) => {
  return request.put(`/categories/${id}`, data)
}

/**
 * 删除分类
 */
export const deleteCategory = (id) => {
  return request.delete(`/categories/${id}`)
}
