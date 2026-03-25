<script setup>
import { ref, reactive } from "vue";
import { useRouter } from 'vue-router'
import { ElMessage } from "element-plus";
import { User, Lock } from '@element-plus/icons-vue'
import FloatingShapes from "@/components/FloatingShapes.vue";
import { adminLogin } from '@/api/admin'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    await formRef.value.validate()
  } catch (err) {
    console.error('表单验证失败', err)
    return
  }

  loading.value = true

  try {
    const res = await adminLogin({
      username: form.username,
      password: form.password
    })

    // 登录成功
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_info', JSON.stringify(res.data.admin))
    ElMessage.success('登录成功')
    router.push('/dashboard')

  } catch (err) {
    console.error('登录失败', err)
    // ✅ 捕获异常，显示错误信息
    const errorMsg = err.message || (err.data?.message) || '用户名或密码错误'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- 背景渐变 - 浅灰绿 -->
    <div class="bg-gradient"></div>

    <FloatingShapes/>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="card-header">
        <h1>校园技能汇</h1>
        <p>管理员后台登录</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="账号"
            size="large"
            class="custom-input"
          >
            <template #prefix>
              <el-icon class="input-icon">
                <User/>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            class="custom-input"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon class="input-icon">
                <Lock/>
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="forgot-password">
          <span>忘记密码？</span>
        </div>

        <el-form-item>
          <el-button
            type="primary"
            @click="handleLogin"
            :loading="loading"
            class="login-btn"
            size="large"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 背景渐变 - 浅灰绿 */
.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f9f2 0%, #eef3e8 100%);
  z-index: 0;
}

/* 登录卡片 */
.login-card {
  width: 480px;
  background: white;
  border-radius: 48px;
  padding: 56px 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 10;
  transition: transform 0.3s ease;
}

.login-card:hover {
  transform: translateY(-5px);
}

/* 标题 */
.card-header {
  text-align: center;
  margin-bottom: 48px;
}

.card-header h1 {
  font-size: 36px;
  font-weight: 600;
  background: linear-gradient(135deg, #b8c4ae 0%, #9bb096 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 12px;
}

.card-header p {
  font-size: 14px;
  color: #9bb096;
}

/* 输入框 */
.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.custom-input :deep(.el-input__wrapper) {
  border-radius: 60px;
  padding: 20px 24px;
  background: #f8fafc;
  border: 1px solid #e2eae0;
  transition: all 0.3s;
  box-shadow: none;
}

.custom-input :deep(.el-input__wrapper:hover) {
  background: white;
  border-color: #b8c4ae;
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  background: white;
  border-color: #9bb096;
  box-shadow: 0 0 0 3px rgba(155, 176, 150, 0.2);
}

.custom-input :deep(.el-input__inner) {
  font-size: 16px;
  height: 28px;
  line-height: 28px;
}

.input-icon {
  font-size: 20px;
  color: #b8c4ae;
  margin-right: 8px;
}

/* 忘记密码 */
.forgot-password {
  text-align: right;
  margin: -12px 0 32px;
  font-size: 14px;
  color: #b8c4ae;
  cursor: pointer;
}

.forgot-password:hover {
  color: #9bb096;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 56px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 60px;
  background: linear-gradient(135deg, #b8c4ae 0%, #9bb096 100%);
  border: none;
  color: white;
  transition: all 0.3s;
  cursor: pointer;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(155, 176, 150, 0.3);
}

.login-btn:active {
  transform: translateY(0);
}

/* 响应式 */
@media (max-width: 550px) {
  .login-card {
    width: 90%;
    padding: 40px 32px;
  }

  .card-header h1 {
    font-size: 28px;
  }
}
</style>
