# 校园技能汇 - 大学生技能交易平台

> 一个专为大学生设计的技能交易平台，让校园内的技能和需求精准匹配，实现同学之间的技能互助与价值交换

## 📖 项目简介

### 项目背景

在校园生活中，同学们经常有各种需求：想找人辅导功课、代取快递、拍摄写真、组队旅游...但往往找不到合适的渠道。本平台就是为解决这个问题而诞生的。

### 项目定位

校园技能汇是一个连接大学生技能供需的在线交易平台。学生可以发布自己的技能服务（如数学辅导、PPT制作、摄影约拍等），也可以购买其他同学的服务。平台提供完整的交易闭环：**发布 → 审核 → 下单 → 支付 → 完成订单**。

### 解决的问题

| 问题             | 解决方案                               |
| ---------------- | -------------------------------------- |
| 技能找不到买家   | 平台聚合展示，分类筛选，精准匹配       |
| 需求找不到服务者 | 搜索功能，按学校筛选，快速找到身边同学 |
| 交易不放心       | 平台审核机制，订单系统，保障交易安全   |
| 支付不方便       | 集成支付宝支付，支持真实支付流程       |

## ✨ 核心功能

### 👤 用户端（微信小程序）

| 功能模块     | 具体功能     | 详细说明                                                     |
| ------------ | ------------ | ------------------------------------------------------------ |
| **账号系统** | 用户注册     | 支持用户名+密码注册，带完整验证（用户名格式、密码长度、手机号格式、邮箱格式） |
|              | 用户登录     | JWT token 认证，7天有效期，登录后记录最后登录时间和IP        |
|              | 个人信息管理 | 修改头像、昵称、手机号、邮箱、性别、生日、学校               |
|              | 修改密码     | 旧密码验证，新密码加密存储，新旧密码不能相同                 |
|              | 上传头像     | 支持图片裁剪，2MB限制，自动删除旧头像                        |
| **服务管理** | 发布服务     | 支持标题、分类、描述、价格、图片(最多9张)、联系方式、所在学校 |
|              | 编辑服务     | 修改已有服务信息，重新提交审核，状态重置为待审核             |
|              | 删除服务     | 删除自己发布的服务（需无进行中订单），同时删除服务图片       |
|              | 下架服务     | 手动下架已上架的服务，下架后不再展示                         |
| **服务浏览** | 首页推荐     | 展示已上架服务，按发布时间排序                               |
|              | 学校筛选     | 切换学校，只看本校服务，支持"全部学校"                       |
|              | 分类筛选     | 按一级/二级分类浏览，点击分类进入分类列表页                  |
|              | 关键词搜索   | 实时搜索服务标题和描述，支持防抖                             |
|              | 价格排序     | 升序/降序排列                                                |
|              | 分页加载     | 滚动到底部自动加载更多                                       |
| **订单系统** | 创建订单     | 填写联系方式（必填）、预约时间（可选）、特殊要求（可选）     |
|              | 支付订单     | 支付宝沙箱支付，复制链接到浏览器完成支付                     |
|              | 取消订单     | 待支付状态可取消，取消后订单状态变为已取消                   |
|              | 完成订单     | 卖家标记订单完成，完成后订单状态变为已完成                   |
|              | 删除订单     | 删除已完成/已取消的订单                                      |
|              | 订单详情     | 查看完整订单信息，包含买家/卖家联系方式                      |
| **即时通讯** | 联系卖家     | 服务详情页点击「联系卖家」进入聊天，支持实时文字沟通         |
|              | 会话列表     | 展示所有聊天记录，按最新消息排序                             |
|              | 未读红点     | 有新消息时显示未读数，点击进入聊天后自动消除                 |
|              | 标记已读     | 进入聊天页面自动标记已读，消除未读红点                       |
|              | 账号切换     | 切换账号时自动退出旧会话，登录新账号                         |
| **收藏功能** | 添加收藏     | 收藏喜欢的服务，收藏数量+1                                   |
|              | 取消收藏     | 左滑删除或批量删除，收藏数量-1                               |
|              | 收藏列表     | 查看所有收藏的服务，支持编辑模式批量操作                     |
|              | 收藏检查     | 服务详情页自动检查是否已收藏                                 |
| **个人中心** | 我的发布     | 管理自己发布的服务，支持按状态筛选（全部/待审核/已上架/已下架/不通过） |
|              | 我的订单     | 买家/卖家双视角，支持按状态筛选（全部/待支付/已支付/已完成/已取消） |
|              | 我的收藏     | 管理收藏的服务，支持编辑模式批量取消收藏                     |
|              | 个人资料     | 编辑个人信息，上传头像                                       |
|              | 联系客服     | 小程序内联系客服，非小程序环境拨打电话                       |

### 👨‍💼 管理员端（PC后台）

| 功能模块       | 具体功能   | 详细说明                                                     |
| -------------- | ---------- | ------------------------------------------------------------ |
| **仪表盘**     | 数据统计   | 总用户数、总服务数、总订单数、总交易额                       |
|                | 图表可视化 | 近7天用户增长趋势折线图、订单趋势折线图、服务分类分布饼图、服务数量排行柱状图 |
|                | 待办事项   | 待审核服务数量提醒，点击跳转服务审核页                       |
|                | 最近订单   | 最近5条订单记录，点击查看详情                                |
| **用户管理**   | 用户列表   | 分页展示所有用户，支持头像显示                               |
|                | 搜索筛选   | 按用户名/昵称搜索，按状态（正常/禁用/冻结）筛选              |
|                | 用户操作   | 禁用/启用、冻结/解冻、删除用户                               |
|                | 违规处理   | 记录违规类型和原因，根据违规次数自动处罚                     |
|                | 用户详情   | 查看用户完整信息（基本信息、统计数据、违规记录）             |
| **服务审核**   | 待审核列表 | 查看所有待审核服务，支持搜索和筛选                           |
|                | 审核操作   | 通过/拒绝，拒绝需填写原因                                    |
|                | 服务详情   | 弹窗查看完整服务信息（标题、描述、价格、图片、联系方式）     |
| **订单管理**   | 订单列表   | 分页展示所有订单                                             |
|                | 搜索筛选   | 按订单号搜索，按状态筛选                                     |
|                | 订单详情   | 弹窗查看完整订单信息                                         |
| **分类管理**   | 分类列表   | 树形结构展示一级/二级分类，卡片式布局                        |
|                | 分类操作   | 添加一级分类、添加子分类、编辑、删除分类                     |
|                | 删除保护   | 有子分类或有服务使用时不能删除                               |
| **管理员管理** | 管理员列表 | 查看所有管理员                                               |
|                | 添加管理员 | 超级管理员可添加，需填写用户名、密码、真实姓名、邮箱、手机号 |
|                | 权限管理   | 设置超级管理员/普通管理员                                    |
|                | 状态管理   | 禁用/启用管理员，不能修改自己的状态                          |
| **操作日志**   | 日志列表   | 记录所有管理员操作（谁、什么时候、做了什么）                 |
|                | 筛选查询   | 按管理员ID、操作类型、时间范围筛选                           |

### ⚠️ 违规处理系统

| 违规次数    | 处罚措施 | 说明                           |
| ----------- | -------- | ------------------------------ |
| 第1次违规   | 冻结3天  | 临时限制，到期自动解封         |
| 第2次违规   | 冻结7天  | 加重处罚                       |
| 第3次及以上 | 永久封禁 | 账号永久禁用，需管理员手动解封 |

**违规类型**：
- 发布违规内容
- 恶意刷单
- 骚扰其他用户
- 虚假服务
- 诱导交易
- 其他违规

**记录内容**：
- 违规时间
- 违规类型
- 违规原因
- 处罚类型
- 操作管理员

## 🛠 技术栈详解

### 后端技术

| 技术       | 版本 | 用途                | 说明                               |
| ---------- | ---- | ------------------- | ---------------------------------- |
| Node.js    | 20.x | JavaScript 运行环境 | 高性能、事件驱动、非阻塞I/O        |
| Express    | 4.x  | Web 框架            | 轻量级、灵活的路由和中间件系统     |
| MySQL      | 8.4  | 关系型数据库        | 支持事务、外键约束、索引优化       |
| JWT        | 9.x  | 用户身份认证        | 无状态认证，支持过期时间           |
| bcrypt     | 5.x  | 密码加密            | 盐值加密，不可逆                   |
| Multer     | 1.x  | 文件上传处理        | 支持多文件上传，文件类型和大小限制 |
| alipay-sdk | 3.x  | 支付宝支付集成      | 支持沙箱环境，RSA2签名             |
| cors       | 2.x  | 跨域资源共享        | 允许前端跨域请求                   |
| dotenv     | 16.x | 环境变量管理        | 敏感信息不提交到代码仓库           |
| nodemon    | 3.x  | 开发热重载          | 代码修改自动重启服务               |

### 前端-小程序端

| 技术    | 版本 | 用途           | 说明                                      |
| ------- | ---- | -------------- | ----------------------------------------- |
| uni-app | 3.x  | 跨平台开发框架 | 一套代码，多端运行（微信小程序、App、H5） |
| Vue 3   | 3.x  | 响应式框架     | Composition API，更好的类型支持           |
| Pinia   | 2.x  | 状态管理       | Vuex 的替代品，更轻量、更直观             |
| uni-ui  | 最新 | UI 组件库      | 官方组件库，与 uni-app 完美配合           |
| SCSS    | -    | CSS 预处理器   | 支持变量、嵌套、混入                      |

### 前端-PC后台

| 技术         | 版本 | 用途           | 说明                            |
| ------------ | ---- | -------------- | ------------------------------- |
| Vue 3        | 3.x  | 响应式框架     | Composition API，更好的开发体验 |
| Vite         | 5.x  | 构建工具       | 极速热更新，按需编译            |
| Element Plus | 2.x  | UI 组件库      | 企业级组件库，丰富美观          |
| ECharts      | 5.x  | 数据可视化图表 | 折线图、柱状图、饼图            |
| Axios        | 1.x  | HTTP 请求      | 拦截器、请求/响应转换           |
| Vue Router   | 4.x  | 路由管理       | 路由守卫，权限控制              |

### 即时通讯（腾讯云 IM）

| 技术       | 版本 | 用途              | 说明                               |
| ---------- | ---- | ----------------- | ---------------------------------- |
| tim-wx-sdk | 2.x  | 微信小程序 IM SDK | 腾讯云即时通讯，支持单聊、会话管理 |

**IM 核心功能**：
- ✅ 实时文字聊天
- ✅ 会话列表管理
- ✅ 未读消息计数（红点）
- ✅ 用户资料同步（头像、昵称）
- ✅ 账号切换自动退出/登录

## 📁 项目结构（详细版）

~~~ text
skill-platform/
│
├── server/                          # 后端服务
│   ├── config/                      # 配置文件
│   │   └── db.js                   # MySQL 数据库连接池配置
│   ├── controllers/                 # 控制器（业务逻辑）
│   │   ├── userController.js       # 用户：注册、登录、个人信息、密码、头像
│   │   ├── serviceController.js    # 服务：发布、列表、详情、编辑、删除、下架
│   │   ├── orderController.js      # 订单：创建、列表、详情、支付、取消、完成、删除
│   │   ├── adminController.js      # 管理员：登录、用户管理、服务审核、订单管理
│   │   ├── categoryController.js   # 分类：增删改查、树形结构
│   │   ├── favoritesController.js  # 收藏：添加、取消、列表、检查
│   │   ├── schoolController.js     # 学校：列表、搜索
│   │   ├── statsController.js      # 统计：首页统计、管理员统计
│   │   └── uploadController.js     # 上传：图片上传
│   ├── middlewares/                 # 中间件
│   │   ├── auth.js                 # 用户 JWT 认证
│   │   ├── adminAuth.js            # 管理员 JWT 认证
│   │   ├── upload.js               # Multer 文件上传配置（头像、服务图片）
│   │   └── log.js                  # 操作日志记录中间件
│   ├── routes/                      # 路由
│   │   ├── userRoutes.js           # 用户路由：/api/user/*
│   │   ├── adminRoutes.js          # 管理员路由：/api/admin/*
│   │   ├── serviceRoutes.js        # 服务路由：/api/services/*
│   │   ├── orderRoutes.js          # 订单路由：/api/orders/*
│   │   ├── categoryRoutes.js       # 分类路由：/api/categories/*
│   │   ├── favoriteRoutes.js       # 收藏路由：/api/favorites/*
│   │   ├── schoolRoutes.js         # 学校路由：/api/schools/*
│   │   ├── statsRoutes.js          # 统计路由：/api/stats/*
│   │   └── uploadRoutes.js         # 上传路由：/api/upload/*
│   ├── utils/                       # 工具函数
│   │   └── response.js             # 统一响应格式 { code, message, data }
│   ├── uploads/                     # 上传文件目录（gitignore）
│   │   ├── avatars/                # 用户头像
│   │   └── services/               # 服务图片
│   ├── app.js                       # Express 应用入口
│   ├── package.json                 # 项目依赖
│   └── .env                         # 环境变量（需自行创建）
│
├── client-mini/                     # 小程序端
│   ├── api/                         # API 请求封装
│   │   ├── user.js                 # 用户 API（注册、登录、个人信息、修改密码、上传头像）
│   │   ├── service.js              # 服务 API（发布、列表、详情、编辑、删除、下架）
│   │   ├── order.js                # 订单 API（创建、列表、详情、支付、取消、完成、删除）
│   │   ├── category.js             # 分类 API（列表、一级分类、子分类）
│   │   ├── favorite.js             # 收藏 API（添加、取消、列表、检查）
│   │   ├── school.js               # 学校 API（列表、搜索）
│   │   └── upload.js               # 上传 API（上传图片）
│   ├── components/                  # 公共组件
│   │   ├── publish-form/           # 发布/编辑表单组件（复用）
│   │   ├── service-card/           # 服务卡片组件（首页、分类列表）
│   │   ├── publish-card/           # 发布卡片组件（我的发布）
│   │   └── custom-nav-bar/         # 自定义导航栏（首页）
│   ├── pages/                       # 页面
│   │   ├── index/                  # 首页（服务列表、分类导航）
│   │   ├── login/                  # 登录页
│   │   ├── register/               # 注册页
│   │   ├── publish/                # 发布服务
│   │   ├── edit-publish/           # 编辑服务
│   │   ├── service-detail/         # 服务详情
│   │   ├── create-order/           # 创建订单
│   │   ├── pay/                    # 支付页（支付宝支付）
│   │   ├── order/                  # 订单详情
│   │   ├── my-orders/              # 我的订单
│   │   ├── my-publish/             # 我的发布
│   │   ├── my-favorites/           # 我的收藏
│   │   ├── profile/                # 个人资料
│   │   ├── change-password/        # 修改密码
│   │   ├── school-search/          # 学校搜索
│   │   ├── skill-search/           # 技能搜索
│   │   ├── category-list/          # 分类列表
│   │   ├── webview/                # WebView 页面（支付结果）
│   │   └── user/                   # 用户中心
│   ├── stores/                      # Pinia 状态管理
│   │   └── user.js                 # 用户状态（token、用户信息）
│   ├── utils/                       # 工具函数
│   │   ├── request.js              # Axios 请求封装（拦截器、baseURL）
│   │   ├── im.js                   # 腾讯云 IM SDK 封装（登录、消息收发、会话管理、资料同步）
│   │   ├── auth.js                 # 认证工具（检查登录状态）
│   │   ├── config.js               # 配置文件
│   │   └── system.js               # 系统工具（获取状态栏高度）
│   ├── static/                      # 静态资源
│   │   ├── tab/                    # Tab 图标（首页、发布、我的）
│   │   ├── collection.png          # 收藏图标
│   │   ├── collection-finish.png   # 已收藏图标
│   │   ├── contact.png             # 联系图标
│   │   ├── default-avatar.png      # 默认头像
│   │   └── empty.png               # 空状态图
│   ├── App.vue                      # 应用入口
│   ├── main.js                      # 主入口文件
│   ├── manifest.json                # 小程序配置（AppID、权限等）
│   ├── pages.json                   # 页面路由配置
│   ├── uni.scss                     # 全局样式变量
│   └── package.json                 # 项目依赖
│
└── client-admin/                    # PC 后台
    ├── src/
    │   ├── api/                     # API 请求
    │   │   └── admin.js            # 管理员 API（登录、用户管理、服务审核、订单管理）
    │   ├── components/              # 公共组件
    │   │   ├── FloatingShapes.vue  # 登录页漂浮动画
    │   │   └── charts/             # 图表组件
    │   │       ├── LineChart.vue   # 折线图（用户增长、订单趋势）
    │   │       ├── BarChart.vue    # 柱状图（服务数量排行）
    │   │       └── PieChart.vue    # 饼图（服务分类分布）
    │   ├── layouts/                 # 布局组件
    │   │   └── MainLayout.vue      # 主布局（侧边栏+头部+内容区）
    │   ├── router/                  # 路由配置
    │   │   └── index.js            # 路由守卫（权限控制、登录验证）
    │   ├── utils/                   # 工具函数
    │   │   └── request.js          # Axios 请求封装（拦截器、baseURL）
    │   ├── views/                   # 页面
    │   │   ├── login/              # 登录页
    │   │   │   └── LoginPage.vue
    │   │   ├── dashboard/          # 仪表盘
    │   │   │   └── DashboardPage.vue
    │   │   ├── users/              # 用户管理
    │   │   │   └── UsersPage.vue
    │   │   ├── services/           # 服务审核
    │   │   │   └── ServicesPage.vue
    │   │   ├── orders/             # 订单管理
    │   │   │   └── OrdersPage.vue
    │   │   ├── categories/         # 分类管理
    │   │   │   └── CategoriesPage.vue
    │   │   ├── admins/             # 管理员管理
    │   │   │   └── AdminsPage.vue
    │   │   └── logs/               # 操作日志
    │   │       └── LogsPage.vue
    │   ├── App.vue                  # 应用入口
    │   └── main.js                  # 主入口文件
    ├── index.html                   # HTML 模板
    ├── vite.config.js               # Vite 配置
    └── package.json                 # 项目依赖
~~~

## 📊 数据库设计

### 表结构详细说明

#### users 表（用户表）

| 字段               | 类型         | 说明                    |
| ------------------ | ------------ | ----------------------- |
| id                 | INT          | 主键，自增              |
| username           | VARCHAR(50)  | 用户名，唯一，登录用    |
| password           | VARCHAR(255) | 密码，bcrypt 加密       |
| nickname           | VARCHAR(50)  | 昵称，显示用            |
| avatar             | VARCHAR(500) | 头像URL                 |
| phone              | VARCHAR(20)  | 手机号                  |
| email              | VARCHAR(100) | 邮箱                    |
| gender             | TINYINT      | 性别：0未知 1男 2女     |
| birthday           | DATE         | 生日                    |
| school_id          | INT          | 学校ID，关联 schools 表 |
| status             | TINYINT      | 状态：0禁用 1正常 2冻结 |
| service_count      | INT          | 发布服务数量            |
| order_count        | INT          | 下单数量                |
| favorite_count     | INT          | 收藏数量                |
| violation_count    | INT          | 违规次数                |
| freeze_expire_time | DATETIME     | 冻结到期时间            |
| create_time        | DATETIME     | 注册时间                |
| update_time        | DATETIME     | 更新时间                |
| last_login_time    | DATETIME     | 最后登录时间            |
| last_login_ip      | VARCHAR(50)  | 最后登录IP              |

#### schools 表（学校表）

| 字段        | 类型          | 说明           |
| ----------- | ------------- | -------------- |
| id          | INT           | 主键，自增     |
| name        | VARCHAR(100)  | 学校名称，唯一 |
| province    | VARCHAR(50)   | 所在省份       |
| city        | VARCHAR(50)   | 所在城市       |
| latitude    | DECIMAL(10,8) | 纬度           |
| longitude   | DECIMAL(11,8) | 经度           |
| create_time | DATETIME      | 创建时间       |

#### categories 表（分类表）

| 字段        | 类型         | 说明                    |
| ----------- | ------------ | ----------------------- |
| id          | INT          | 主键，自增              |
| name        | VARCHAR(50)  | 分类名称                |
| parent_id   | INT          | 父分类ID，0表示一级分类 |
| icon        | VARCHAR(100) | 分类图标                |
| sort        | INT          | 排序，越小越靠前        |
| create_time | DATETIME     | 创建时间                |

#### services 表（服务表）

| 字段        | 类型          | 说明                                  |
| ----------- | ------------- | ------------------------------------- |
| id          | INT           | 主键，自增                            |
| user_id     | INT           | 发布人ID，关联 users 表               |
| category_id | INT           | 分类ID，关联 categories 表            |
| title       | VARCHAR(100)  | 服务标题                              |
| description | TEXT          | 服务描述                              |
| price       | DECIMAL(10,2) | 价格                                  |
| images      | TEXT          | 图片URL，多个用逗号分隔               |
| contact     | VARCHAR(200)  | 联系方式                              |
| school_id   | INT           | 服务所在学校，关联 schools 表         |
| status      | TINYINT       | 状态：0待审核 1已上架 2已下架 3不通过 |
| view_count  | INT           | 浏览次数                              |
| create_time | DATETIME      | 发布时间                              |
| update_time | DATETIME      | 更新时间                              |

#### orders 表（订单表）

| 字段         | 类型          | 说明                                  |
| ------------ | ------------- | ------------------------------------- |
| id           | VARCHAR(50)   | 订单号，主键，格式：ORD+时间戳+随机数 |
| service_id   | INT           | 服务ID，关联 services 表              |
| buyer_id     | INT           | 买家ID，关联 users 表                 |
| seller_id    | INT           | 卖家ID，关联 users 表                 |
| amount       | DECIMAL(10,2) | 订单金额                              |
| status       | TINYINT       | 状态：0待支付 1已支付 2已完成 3已取消 |
| contact_info | VARCHAR(200)  | 买家联系方式                          |
| requirements | TEXT          | 特殊要求                              |
| service_time | DATETIME      | 预约服务时间                          |
| pay_time     | DATETIME      | 支付时间                              |
| create_time  | DATETIME      | 创建时间                              |
| update_time  | DATETIME      | 更新时间                              |

#### favorites 表（收藏表）

| 字段        | 类型     | 说明                     |
| ----------- | -------- | ------------------------ |
| id          | INT      | 主键，自增               |
| user_id     | INT      | 用户ID，关联 users 表    |
| service_id  | INT      | 服务ID，关联 services 表 |
| create_time | DATETIME | 收藏时间                 |

#### user_violations 表（违规记录表）

| 字段               | 类型        | 说明                         |
| ------------------ | ----------- | ---------------------------- |
| id                 | INT         | 主键，自增                   |
| user_id            | INT         | 用户ID，关联 users 表        |
| admin_id           | INT         | 操作管理员ID，关联 admins 表 |
| violation_type     | VARCHAR(50) | 违规类型                     |
| violation_reason   | TEXT        | 违规原因                     |
| punishment_type    | VARCHAR(20) | 处罚类型                     |
| freeze_days        | INT         | 冻结天数                     |
| freeze_expire_time | DATETIME    | 冻结到期时间                 |
| create_time        | DATETIME    | 违规时间                     |

#### operation_logs 表（操作日志表）

| 字段        | 类型         | 说明                     |
| ----------- | ------------ | ------------------------ |
| id          | INT          | 主键，自增               |
| admin_id    | INT          | 管理员ID，关联 admins 表 |
| admin_name  | VARCHAR(50)  | 管理员用户名             |
| action      | VARCHAR(50)  | 操作类型                 |
| target_type | VARCHAR(50)  | 操作对象类型             |
| target_id   | INT          | 操作对象ID               |
| detail      | TEXT         | 操作详情（JSON格式）     |
| ip          | VARCHAR(50)  | 操作IP                   |
| user_agent  | VARCHAR(255) | 浏览器信息               |
| create_time | DATETIME     | 操作时间                 |

#### admins 表（管理员表）

| 字段        | 类型         | 说明                        |
| ----------- | ------------ | --------------------------- |
| id          | INT          | 主键，自增                  |
| username    | VARCHAR(50)  | 用户名，唯一                |
| password    | VARCHAR(255) | 密码，bcrypt 加密           |
| real_name   | VARCHAR(50)  | 真实姓名                    |
| email       | VARCHAR(100) | 邮箱，唯一                  |
| phone       | VARCHAR(20)  | 手机号                      |
| is_super    | TINYINT      | 是否超级管理员：0普通 1超级 |
| status      | TINYINT      | 状态：0禁用 1正常           |
| create_time | DATETIME     | 创建时间                    |
| update_time | DATETIME     | 更新时间                    |

### 外键约束

| 约束                                 | 说明                                     |
| ------------------------------------ | ---------------------------------------- |
| users.school_id → schools.id         | 用户关联学校，删除学校时设为 NULL        |
| services.user_id → users.id          | 服务关联发布者，删除用户时级联删除       |
| services.category_id → categories.id | 服务关联分类，有服务时不能删除分类       |
| orders.service_id → services.id      | 订单关联服务，有订单时不能删除服务       |
| orders.buyer_id → users.id           | 订单买家，删除用户时限制                 |
| orders.seller_id → users.id          | 订单卖家，删除用户时限制                 |
| favorites.user_id → users.id         | 收藏关联用户，删除用户时级联删除         |
| favorites.service_id → services.id   | 收藏关联服务，删除服务时级联删除         |
| user_violations.user_id → users.id   | 违规记录关联用户，删除用户时级联删除     |
| user_violations.admin_id → admins.id | 违规记录关联管理员，删除管理员时级联删除 |
| operation_logs.admin_id → admins.id  | 操作日志关联管理员，删除管理员时级联删除 |

## 🚀 快速启动（详细步骤）

### 环境要求

| 软件           | 版本要求    | 说明                        |
| -------------- | ----------- | --------------------------- |
| Node.js        | 18.x 或更高 | 运行环境，建议使用 LTS 版本 |
| MySQL          | 8.0 或更高  | 数据库，支持事务和外键      |
| npm            | 9.x 或更高  | 包管理器，Node.js 自带      |
| 微信开发者工具 | 最新版      | 小程序调试工具              |
| Git            | 2.x 或更高  | 版本控制（可选）            |

### 第一步：克隆项目

```bash
# 克隆项目到本地
git clone https://gitee.com/healer_xy/skill-platform.git

# 进入项目目录
cd skill-platform
```

如果没有安装 Git，也可以直接下载 ZIP 压缩包解压。

### 第二步：后端配置与启动

####  进入后端目录并安装依赖

```bash
cd server
npm install
```

等待依赖安装完成，会生成 `node_modules` 文件夹。

####  配置环境变量

创建 `.env` 文件（复制示例文件）：

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

编辑 `.env` 文件，填写以下配置：

```env
# ========== 服务器配置 ==========
PORT=3000                                    # 服务端口
JWT_SECRET=your_jwt_secret_key_here          # JWT 密钥，随意输入一串字符

# ========== 数据库配置 ==========
DB_HOST=localhost                            # 数据库地址
DB_USER=root                                 # 数据库用户名
DB_PASSWORD=your_mysql_password               # 数据库密码
DB_NAME=campus_skill                         # 数据库名称

# ========== 支付宝沙箱配置 ==========
# 1. 登录 https://open.alipay.com/
# 2. 进入「控制台」→「沙箱应用」
# 3. 复制以下信息：

ALIPAY_APP_ID=202100011xxxxx                  # 沙箱应用的 APPID
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"               # 应用私钥（你生成的）
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
...
-----END PUBLIC KEY-----"                    # 支付宝公钥（沙箱控制台获取）

# 支付回调地址（部署后改为真实域名）
ALIPAY_NOTIFY_URL=https://your-domain/api/orders/pay/notify
ALIPAY_RETURN_URL=https://your-domain/pages/result/result
```

#### 初始化数据库

**方法一：命令行导入**

```bash
# 导入数据库结构（确保 MySQL 已启动）
mysql -u root -p < campus_skill.sql
```

输入 MySQL 密码，等待导入完成。

**方法二：使用 Navicat 导入**

1. 打开 Navicat，连接本地 MySQL
2. 右键点击连接 → 新建数据库，名称 `campus_skill`
3. 双击打开数据库
4. 右键 → 运行 SQL 文件
5. 选择 `campus_skill.sql`，点击开始

#### 启动后端

```bash
# 开发模式（热重载，推荐）
npm run dev

# 生产模式
npm start
```

启动成功显示：

```
服务器运行在 http://localhost:3000
数据库连接成功
```

### 第三步：小程序端配置与启动

####  进入小程序目录并安装依赖

```bash
cd client-mini
npm install
```

####  配置请求地址

编辑 `utils/request.js`：

```javascript
// 开发环境（电脑模拟器用）
const baseURL = 'http://localhost:3000/api'

// 手机真机预览（电脑 IP 地址）
// 打开 cmd，输入 ipconfig 查看 IPv4 地址
// 假设你的 IP 是 192.168.1.100
// const baseURL = 'http://192.168.1.100:3000/api'
```

#### 微信开发者工具配置

1. 打开微信开发者工具
2. 点击「导入项目」
3. 选择 `client-mini` 目录
4. AppID 选择「测试号」（或填写你自己的）
5. 点击「确定」

**重要配置**：
- 点击右上角「详情」
- 选择「本地设置」
- ✅ 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
- ✅ 勾选「启用 HTTPS」

####  运行小程序

点击工具栏的「编译」按钮，即可在模拟器中预览。

### 第四步：PC后台配置与启动

####  进入后台目录并安装依赖

```bash
cd client-admin
npm install
```

#### 配置请求地址

编辑 `.env.development`：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

#### 启动开发服务器

```bash
npm run dev
```

启动成功后显示：

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

访问 `http://localhost:5173`

**默认管理员账号**：
- 用户名：`admin`
- 密码：`123456`

## 💳 支付宝沙箱支付详细说明

### 什么是沙箱环境？

支付宝沙箱是支付宝提供的**模拟支付环境**，用于开发者测试支付功能，**不涉及真实资金**。所有支付都是模拟的，不会产生真实扣款。

**特点**：
- 完全模拟真实支付流程
- 使用虚拟资金，无需真实充值
- 支持所有支付接口测试
- 独立的沙箱账号，与真实账号隔离

### 沙箱账号获取步骤

1. 登录 [支付宝开放平台](https://open.alipay.com/)
2. 使用支付宝账号登录（可以是个人账号）
3. 进入「控制台」
4. 在左侧菜单找到「沙箱应用」
5. 点击进入沙箱应用详情
6. 查看「沙箱账号」部分：
   - **买家账号**：`xxxxx@sandbox.com`（用于测试支付）
   - **登录密码**：`111111`
   - **支付密码**：`111111`
   - **卖家账号**：`xxxxx@sandbox.com`（收款方）

### 支付测试完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户操作流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 在小程序中选择服务 → 点击「购买」→ 填写信息 → 提交订单          │
│                              ↓                                  │
│  2. 进入支付页 → 选择「支付宝支付」→ 点击「确认支付」               │
│                              ↓                                  │
│  3. 系统弹出提示 → 复制支付链接                                   │
│                              ↓                                  │
│  4. 打开手机浏览器 → 粘贴链接 → 访问                              │
│                              ↓                                  │
│  5. 输入沙箱买家账号和密码 → 登录                                 │
│                              ↓                                  │
│  6. 确认支付 → 输入支付密码 111111                                │
│                              ↓                                  │
│  7. 支付成功 → 返回小程序                                         │
│                              ↓                                  │
│  8. 点击「我已支付完成」或等待自动检测 → 订单状态更新               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 支付回调说明

由于微信小程序无法直接唤起支付宝，本系统采用「手动确认 + 自动检测」双保险机制：

| 机制         | 触发方式                           | 说明                       |
| ------------ | ---------------------------------- | -------------------------- |
| **手动确认** | 用户支付后点击「我已支付完成」按钮 | 立即查询订单状态，更新页面 |
| **自动检测** | 进入订单详情页                     | 延迟3秒自动查询支付状态    |

**优势**：即使用户忘记点击确认，也能自动更新订单状态，不会卡在待支付。

### 常见问题

| 问题                     | 原因             | 解决方案                           |
| ------------------------ | ---------------- | ---------------------------------- |
| 支付宝沙箱页面打不开     | 沙箱服务器不稳定 | 等待几分钟后重试，或使用手机浏览器 |
| 支付成功后订单状态未更新 | 支付宝回调延迟   | 点击「我已支付完成」或稍后刷新     |
| 提示「系统有点儿忙」     | 沙箱环境问题     | 换个时间段再试，这是正常的         |
| 复制链接后无法访问       | 链接格式问题     | 检查是否完整复制，包含所有字符     |

## 🔐 权限说明

### 用户角色权限矩阵

| 功能               | 普通用户 | 管理员 | 超级管理员 |
| ------------------ | -------- | ------ | ---------- |
| 注册/登录          | ✅        | ❌      | ❌          |
| 发布/编辑/删除服务 | ✅        | ❌      | ❌          |
| 购买服务/创建订单  | ✅        | ❌      | ❌          |
| 管理自己的订单     | ✅        | ❌      | ❌          |
| 查看所有用户       | ❌        | ✅      | ✅          |
| 管理用户状态       | ❌        | ✅      | ✅          |
| 审核服务           | ❌        | ✅      | ✅          |
| 查看所有订单       | ❌        | ✅      | ✅          |
| 管理分类           | ❌        | ✅      | ✅          |
| 添加/删除管理员    | ❌        | ❌      | ✅          |
| 管理管理员状态     | ❌        | ❌      | ✅          |
| 查看操作日志       | ❌        | ✅      | ✅          |

### JWT Token 结构

**普通用户 Token**：
```json
{
  "id": 1,
  "username": "zhangsan",
  "role": "user",
  "iat": 1734567890,
  "exp": 1735172690
}
```

**管理员 Token**：
```json
{
  "id": 1,
  "username": "admin",
  "real_name": "系统管理员",
  "role": "admin",
  "is_super": 1,
  "iat": 1734567890,
  "exp": 1735172690
}
```

## 🎯 项目亮点

| 亮点                   | 详细说明                                                     |
| ---------------------- | ------------------------------------------------------------ |
| **完整业务闭环**       | 从发布服务 → 审核 → 下单 → 支付 → 完成订单，流程完整，体验流畅 |
| **三级权限管理**       | 超级管理员、管理员、普通用户三级权限，不同角色看到不同功能   |
| **支付宝沙箱支付集成** | 真实对接支付宝沙箱，模拟真实支付流程，支持手动确认+自动检测  |
| **违规自动处罚系统**   | 根据违规次数自动处罚（冻结3天/7天/永久封禁），记录完整历史   |
| **操作日志审计**       | 所有管理员操作都有记录（谁、什么时候、做了什么），便于追踪和审计 |
| **数据库设计规范**     | 外键约束保证数据完整性，索引优化查询性能，事务保证数据一致性 |
| **图片智能管理**       | 编辑服务时只删除被移除的图片，保留仍使用的图片，避免误删     |
| **自动检测支付**       | 进入订单详情页自动检测支付状态，用户无需手动确认             |
| **智能返回导航**       | 支付完成后返回首页，其他情况返回上一页，体验友好             |
| **代码规范**           | Controller-Service 分层，统一响应格式，中间件分离            |
| **腾讯云 IM 集成**     | 集成腾讯云即时通讯 SDK，实现买家和卖家实时沟通，聊天记录云端存储，无需维护本地消息表；支持会话列表、未读红点、消息已读、账号自动切换等完整功能 |

## 📝 TODO

| 功能         | 优先级 | 说明                     |
| ------------ | ------ | ------------------------ |
| 评价系统     | 中     | 订单完成后买家评价卖家   |
| 消息通知     | 中     | 订单状态变化时推送消息   |
| 图片消息     | 中     | 聊天支持发送图片         |
| 微信支付接入 | 低     | 支持微信支付             |
| 用户申诉功能 | 低     | 违规用户可申诉           |
| 数据导出     | 低     | 订单、用户数据导出 Excel |
| Redis缓存    | 低     | 缓存热门服务，提升性能   |

## 👨‍💻 作者

| 项目     | 信息                                       |
| -------- | ------------------------------------------ |
| 作者     | healer                                     |
| 邮箱     | your-email@example.com                     |
| Gitee    | https://gitee.com/healer_xy                |
| 项目地址 | https://gitee.com/healer_xy/skill-platform |

## 🙏 致谢

- 感谢支付宝开放平台提供的沙箱支付服务
- 感谢 Element Plus 提供的优秀 UI 组件
- 感谢 uni-app 提供的跨平台开发能力
- 感谢所有开源社区贡献者

## 📄 许可证

MIT License

Copyright (c) 2026 healer_xy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.