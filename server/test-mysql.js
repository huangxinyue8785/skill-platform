// test-mysql.js
require('dotenv').config();
const mysql = require('mysql2');

console.log('正在测试数据库连接...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    connectTimeout: 10000
});

connection.connect((err) => {
    if (err) {
        console.error('\n❌ 数据库连接失败！');
        console.error('错误代码:', err.code);
        console.error('错误信息:', err.message);

        console.error('\n📋 问题诊断:');
        if (err.code === 'ENOTFOUND') {
            console.error('  → 域名解析失败，请检查 DB_HOST 地址是否正确');
            console.error('  → 正确格式应该是: rm-bp10zglbrx7p1sd00.u0o.mysql.rds.aliyuncs.com');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('  → 账号或密码错误');
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
            console.error('  → 网络连接超时，请检查:');
            console.error('    1. 白名单是否包含您当前的IP (61.144.33.185)');
            console.error('    2. 防火墙是否阻止了3306端口');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('  → 数据库名错误');
        }

        connection.end();
        return;
    }

    console.log('\n✅ 数据库连接成功！');

    connection.query('SHOW TABLES', (err, results) => {
        connection.end();

        if (err) {
            console.error('查询表失败:', err.message);
            return;
        }

        console.log('\n📊 数据库中的表:');
        results.forEach(row => {
            console.log('  -', Object.values(row)[0]);
        });
    });
});