-- ============================================
-- 校园技能汇 - 数据库结构
-- 作者: healer_xy
-- 日期: 2026-03-26
-- ============================================

-- 1. 删除旧数据库
DROP DATABASE IF EXISTS campus_skill;

-- 2. 创建新数据库
CREATE DATABASE campus_skill 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

-- 3. 使用数据库
USE campus_skill;

-- ============================================
-- 表1: schools - 学校表
-- ============================================
CREATE TABLE schools (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '学校ID',
  name VARCHAR(100) NOT NULL UNIQUE COMMENT '学校名称',
  province VARCHAR(50) DEFAULT NULL COMMENT '所在省份',
  city VARCHAR(50) DEFAULT NULL COMMENT '所在城市',
  latitude DECIMAL(10,8) DEFAULT NULL COMMENT '纬度（用于定位）',
  longitude DECIMAL(11,8) DEFAULT NULL COMMENT '经度（用于定位）',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学校表';

-- ============================================
-- 表2: users - 用户表
-- ============================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名（登录用）',
  password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  nickname VARCHAR(50) NOT NULL COMMENT '昵称（显示用）',
  avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  gender TINYINT DEFAULT 0 COMMENT '性别：0未知 1男 2女',
  birthday DATE DEFAULT NULL COMMENT '生日',
  school_id INT DEFAULT NULL COMMENT '学校ID（关联schools表）',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1正常 2冻结',
  service_count INT DEFAULT 0 COMMENT '发布服务数量',
  order_count INT DEFAULT 0 COMMENT '下单数量',
  favorite_count INT DEFAULT 0 COMMENT '收藏数量',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
  last_login_ip VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  violation_count INT DEFAULT 0 COMMENT '违规次数',
  freeze_expire_time DATETIME DEFAULT NULL COMMENT '冻结到期时间',
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  INDEX idx_username (username),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_school_id (school_id),
  INDEX idx_status (status),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='普通用户表';

-- ============================================
-- 表3: admins - 管理员表
-- ============================================
CREATE TABLE admins (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '管理员ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名（登录用）',
  password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  real_name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  is_super TINYINT DEFAULT 0 COMMENT '是否超级管理员：0普通 1超级',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用 1正常',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- ============================================
-- 表4: categories - 分类表
-- ============================================
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  parent_id INT DEFAULT 0 COMMENT '父分类ID（0表示一级分类）',
  icon VARCHAR(100) DEFAULT NULL COMMENT '分类图标',
  sort INT DEFAULT 0 COMMENT '排序（越小越靠前）',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_parent_id (parent_id),
  INDEX idx_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

-- ============================================
-- 表5: services - 服务表
-- ============================================
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '服务ID',
  user_id INT NOT NULL COMMENT '发布人ID',
  category_id INT NOT NULL COMMENT '分类ID',
  title VARCHAR(100) NOT NULL COMMENT '服务标题',
  description TEXT NOT NULL COMMENT '服务描述',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  images TEXT DEFAULT NULL COMMENT '图片URL（多个用逗号分隔）',
  contact VARCHAR(200) NOT NULL COMMENT '联系方式',
  school_id INT DEFAULT NULL COMMENT '服务所在学校',
  status TINYINT DEFAULT 0 COMMENT '状态：0待审核 1已上架 2已下架 3不通过',
  view_count INT DEFAULT 0 COMMENT '浏览次数',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_school_id (school_id),
  INDEX idx_status (status),
  INDEX idx_create_time (create_time),
  INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务表';

-- ============================================
-- 表6: orders - 订单表
-- ============================================
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY COMMENT '订单号（格式：ORD+时间戳+随机数）',
  service_id INT NOT NULL COMMENT '服务ID',
  buyer_id INT NOT NULL COMMENT '买家ID',
  seller_id INT NOT NULL COMMENT '卖家ID',
  amount DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  status TINYINT DEFAULT 0 COMMENT '状态：0待支付 1已支付 2已完成 3已取消',
  contact_info VARCHAR(200) NOT NULL COMMENT '买家联系方式',
  requirements TEXT DEFAULT NULL COMMENT '特殊要求',
  service_time DATETIME DEFAULT NULL COMMENT '预约服务时间',
  pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_service_id (service_id),
  INDEX idx_status (status),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ============================================
-- 表7: favorites - 收藏表
-- ============================================
CREATE TABLE favorites (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
  user_id INT NOT NULL COMMENT '用户ID',
  service_id INT NOT NULL COMMENT '服务ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_service (user_id, service_id),
  INDEX idx_user_id (user_id),
  INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表';

-- ============================================
-- 表8: operation_logs - 操作日志表
-- ============================================
CREATE TABLE operation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  admin_id INT NOT NULL COMMENT '管理员ID',
  admin_name VARCHAR(50) NOT NULL COMMENT '管理员用户名',
  action VARCHAR(50) NOT NULL COMMENT '操作类型',
  target_type VARCHAR(50) DEFAULT NULL COMMENT '操作对象类型',
  target_id INT DEFAULT NULL COMMENT '操作对象ID',
  detail TEXT DEFAULT NULL COMMENT '操作详情（JSON格式）',
  ip VARCHAR(50) DEFAULT NULL COMMENT '操作IP',
  user_agent VARCHAR(255) DEFAULT NULL COMMENT '浏览器信息',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action (action),
  INDEX idx_target_type (target_type),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- ============================================
-- 表9: user_violations - 用户违规记录表
-- ============================================
CREATE TABLE user_violations (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  admin_id INT NOT NULL COMMENT '操作管理员ID',
  violation_type VARCHAR(50) NOT NULL COMMENT '违规类型',
  violation_reason TEXT COMMENT '违规原因详情',
  punishment_type VARCHAR(20) NOT NULL COMMENT '处罚类型（冻结3天/冻结7天/永久封禁）',
  freeze_days INT DEFAULT 0 COMMENT '冻结天数',
  freeze_expire_time DATETIME DEFAULT NULL COMMENT '冻结到期时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户违规记录表';

-- ============================================
-- 插入分类数据
-- ============================================
-- 一级分类
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('学习辅导', 0, 'book', 1),
('生活服务', 0, 'life', 2),
('技能特长', 0, 'skill', 3),
('娱乐休闲', 0, 'fun', 4),
('编程辅导', 0, 'code', 5),
('考试考证', 0, 'exam', 6),
('语言学习', 0, 'language', 7),
('艺术培训', 0, 'art', 8),
('运动健身', 0, 'sport', 9),
('IT认证', 0, 'it', 10),
('职场技能', 0, 'work', 11),
('兴趣爱好', 0, 'hobby', 12),
('二手交易', 0, 'recycle', 13);

-- 学习辅导的子分类 (parent_id=1)
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('数学', 1, 'math', 1),
('英语', 1, 'english', 2),
('编程', 1, 'code', 3),
('考研', 1, 'graduate', 4);

-- 生活服务的子分类 (parent_id=2)
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('代取快递', 2, 'express', 1),
('宿舍维修', 2, 'repair', 2),
('陪玩陪聊', 2, 'chat', 3),
('遛狗', 2, 'dog', 4);

-- 技能特长的子分类 (parent_id=3)
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('PPT制作', 3, 'ppt', 1),
('PS修图', 3, 'ps', 2),
('视频剪辑', 3, 'video', 3),
('摄影约拍', 3, 'photo', 4);

-- 娱乐休闲的子分类 (parent_id=4)
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('游戏陪玩', 4, 'game', 1),
('桌游组局', 4, 'board', 2),
('运动健身', 4, 'sport', 3),
('旅游向导', 4, 'travel', 4);

-- 编程辅导的子分类 (parent_id=5)
INSERT INTO categories (name, parent_id, icon, sort) VALUES 
('编程', 5, 'code', 10),
('C++', 5, NULL, 20),
('node.js', 5, NULL, 30),
('JAVA', 5, NULL, 40),
('python', 5, NULL, 50);

-- ============================================
-- 插入管理员数据（密码: 123456）
-- ============================================
INSERT INTO admins (username, password, real_name, email, is_super, status) VALUES
('admin', '$2b$10$4YZ85xEPUW1HS69uzxrADOkNoqYAbntqTqmuhfssihIOTgfptOVUa', '超级管理员', 'admin@campus.com', 1, 1),
('shenhe', '$2b$10$bdWeEi3kMxJ2eHEi5.VyQeEOYb9XSWXmCZF3MZrb8DLVdjDemxulW', '审核员', 'shenhe@campus.com', 0, 1);

-- ============================================
-- 插入测试用户（密码: 123456）
-- ============================================
INSERT INTO users (username, password, nickname, phone, email, gender, status) VALUES
('zhangsan', '$2b$10$BOrBHIiYyyOKm4j6BROuE.3qFTlWptHN7mpi0qm2dJZzTkNNfykLC', '苏新皓', '13800138999', 'newemail@test.com', 1, 1),
('lisi', '$2a$10$xJwY5Q9zX8y7v6u5t4r3e2', '李四', '13800138002', 'lisi@test.com', 2, 1),
('wangwu', '$2a$10$xJwY5Q9zX8y7v6u5t4r3e2', '王五', '13800138003', 'wangwu@test.com', 1, 1);

-- ============================================
-- 插入测试服务
-- ============================================
INSERT INTO services (user_id, category_id, title, description, price, contact, status) VALUES
(1, 5, '高等数学辅导', '我是数学系研究生，可以辅导高等数学、线性代数', 100, '微信：zhangsan123', 1),
(2, 6, '英语四六级辅导', '英语专业八级，有3年教学经验', 80, '电话：13800138002', 1),
(3, 9, '代取快递', '每天下午没课，可以帮取快递', 5, 'QQ：123456789', 1);

-- ============================================
-- 插入测试订单
-- ============================================
INSERT INTO orders (id, service_id, buyer_id, seller_id, amount, status, contact_info, requirements) VALUES
('ORD20250226001', 1, 2, 1, 100, 2, '微信联系', '需要辅导高等数学第二章'),
('ORD20250226002', 2, 1, 2, 80, 1, '电话联系', '准备六级考试');

-- ============================================
-- 插入测试收藏
-- ============================================
INSERT INTO favorites (user_id, service_id) VALUES
(1, 2),
(2, 1);

-- ============================================
-- 完成
-- ============================================
SELECT '数据库结构创建完成！共9张表' AS '状态';