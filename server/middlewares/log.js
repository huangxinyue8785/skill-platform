const db = require('../config/db')

/**
 * 获取真实客户端 IP 地址
 * 支持：直接访问、Nginx代理、CDN等场景
 */
const getRealIp = (req) => {
    // 1. 从 X-Forwarded-For 获取（最标准，支持多层代理）
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) {
        const ips = forwarded.split(',')
        const clientIp = ips[0].trim()
        if (clientIp !== '::1' && clientIp !== '127.0.0.1') {
            return clientIp
        }
    }

    // 2. 从 X-Real-IP 获取（Nginx 常用）
    const realIp = req.headers['x-real-ip']
    if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') {
        return realIp
    }

    // 3. 从连接获取（直接访问场景）
    let ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress

    if (ip === '::1') {
        return '127.0.0.1'
    }
    if (ip && ip.startsWith('::ffff:')) {
        return ip.substring(7)
    }
    if (ip && ip.startsWith('fe80:')) {
        return '127.0.0.1'
    }

    return ip || 'unknown'
}

const logOperation = async (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
        // 记录日志的条件：
        // 1. 有 logAction（说明需要记录）
        // 2. 响应成功 (code === 200)
        // 3. 有管理员信息（req.admin）或者有临时管理员信息（req.tempAdmin）
        const shouldLog = data && data.code === 200 && req.logAction

        if (shouldLog) {
            // 优先使用 req.admin，如果没有则使用 req.tempAdmin（登录时设置）
            const adminInfo = req.admin || req.tempAdmin

            if (adminInfo) {
                const logData = {
                    admin_id: adminInfo.id,
                    admin_name: adminInfo.username || adminInfo.real_name,
                    action: req.logAction,
                    target_type: req.logTargetType || null,
                    target_id: req.logTargetId || null,
                    detail: req.logDetail ? JSON.stringify(req.logDetail) : null,
                    ip: getRealIp(req),
                    user_agent: (req.headers['user-agent'] || '').substring(0, 255)
                }

                console.log('准备记录日志:', logData)  // 调试用

                // 异步插入日志，不阻塞响应
                db.query(
                    `INSERT INTO operation_logs 
                     (admin_id, admin_name, action, target_type, target_id, detail, ip, user_agent) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [logData.admin_id, logData.admin_name, logData.action,
                        logData.target_type, logData.target_id, logData.detail,
                        logData.ip, logData.user_agent]
                ).catch(err => console.error('记录操作日志失败:', err))
            } else {
                console.log('没有管理员信息，跳过日志记录', {
                    hasAdmin: !!req.admin,
                    hasTempAdmin: !!req.tempAdmin,
                    logAction: req.logAction
                })
            }
        }

        return originalJson.call(this, data)
    }

    next()
}

module.exports = logOperation