require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// 引入日志中间件
const logMiddleware = require('./middlewares/log');

app.use(cors()); // 解决跨域问题
app.use(express.json()); // 解析前端传来的JSON数据
app.use(express.urlencoded({ extended: true }));
app.use(logMiddleware)

//uploads目录可以被公开访问
app.use('/uploads',express.static(path.join(__dirname,'uploads')));

const userRouter = require('./routes/userRoutes');
const adminRouter =require('./routes/adminRoutes')
const categoryRouter = require('./routes/categoryRoutes');
const serviceRouter = require('./routes/serviceRoutes');
const orderRouter = require('./routes/orderRoutes')
const favoritePouter = require('./routes/favoriteRoutes');
const schoolRouter = require('./routes/schoolRoutes');
const statsRouter = require('./routes/statsRoutes')
const uploadRouter = require('./routes/uploadRoutes')

app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/categories', categoryRouter );
app.use('/api/services',serviceRouter);
app.use('/api/orders',orderRouter)
app.use('/api/favorites',favoritePouter);
app.use('/api/schools', schoolRouter);
app.use('/api/stats', statsRouter);
app.use('/api/upload', uploadRouter);

// 测试接口
app.get('/', (req, res) => {
    res.json({ code: 200, message: "服务器运行正常~~" })
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});