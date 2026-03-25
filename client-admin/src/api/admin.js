import request from '@/utils/request'

/**
 * 管理员登录
 * @param {Object} data - { username, password }
 */
export const adminLogin=(data)=>{
  return request.post('/admin/login',data)
}

/**
 * 获取管理员统计数据
 */
export const getAdminStats = () => {
  return request.get('/stats/admin')
}

/**
 * 获取订单列表（用于仪表盘）
 * @param {Object} params - { page, pageSize }
 */
export const getOrderList = (params) => {
  return request.get('/orders', { params })
}

/**
 * 获取用户列表
 * @param {Object} params - { page, pageSize, keyword, status }
 */
export const getUserList = (params) => {
  return request.get('/admin/users', { params })
}

/**
 * 获取用户详情
 * @param {Number} id - 用户ID
 */
export const getUserDetail = (id) => {
  return request.get(`/admin/users/${id}`)
}

/**
 * 更新用户状态
 * @param {Number} id - 用户ID
 * @param {Number} status - 状态（0禁用 1正常 2冻结）
 */
export const updateUserStatus = (id, status) => {
  return request.put(`/admin/users/${id}/status`, { status })
}

/**
 * 删除用户
 * @param {Number} id - 用户ID
 */
export const deleteUser = (id) => {
  return request.delete(`/admin/users/${id}`)
}

// ========== 服务审核 ==========

/**
 * 获取服务列表（用于审核）
 * @param {Object} params - { page, pageSize, status, keyword }
 */
export const getServiceList = (params) => {
  return request.get('/services', { params })
}

/**
 * 审核服务
 * @param {Number} id - 服务ID
 * @param {Number} status - 状态（1通过 3拒绝）
 * @param {String} reason - 拒绝原因
 */
export const auditService = (id, status, reason) => {
  return request.put(`/admin/services/${id}/audit`, { status, reason })
}

// ========== 订单管理 ==========

/**
 * 获取订单详情
 * @param {String} id - 订单号
 */
export const getOrderDetail = (id) => {
  return request.get(`/orders/${id}`)
}

// ========== 管理员管理 ==========

/**
 * 获取管理员列表
 */
export const getAdminList = (params) => {
  return request.get('/admin/admins', { params })
}

/**
 * 添加管理员
 * @param {Object} data - { username, password, real_name, email, phone, is_super }
 */
export const addAdmin = (data) => {
  return request.post('/admin/admins', data)
}

/**
 * 更新管理员状态
 * @param {Number} id - 管理员ID
 * @param {Number} status - 状态（0禁用 1正常）
 */
export const updateAdminStatus = (id, status) => {
  return request.put(`/admin/admins/${id}/status`, { status })
}

/**
 * 删除管理员
 * @param {Number} id - 管理员ID
 */
export const deleteAdmin = (id) => {
  return request.delete(`/admin/admins/${id}`)
}

/**
 * 获取操作日志
 * @param {Object} params - { page, pageSize, admin_id, action, start_time, end_time }
 */
export const getOperationLogs = (params) => {
  return request.get('/admin/logs', { params })
}

// 处理用户违规
export const handleViolation = (data) => {
  return request.post('/admin/users/violation', data)
}
