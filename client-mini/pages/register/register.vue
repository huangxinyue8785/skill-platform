<template>
	<view class="login-container">
		<view class="circle-wrapper">
			<view class="circle-big"></view>
			<view class="circle-small-left circle-small"></view>
			<view class="circle-small-right circle-small"></view>
		</view>

		<view class="header">
			<view class="title">校园技能汇，欢迎注册！</view>
		</view>

		<view class="form">
			<view class="form-main">
				<!-- 1. 用户名 -->
				<view class="input-item">
					<input 
						class="input" 
						v-model="form.username" 
						type="text" 
						placeholder="用户名"
						placeholder-class="placeholder-style"
					>
				</view>
				
				<!-- 2. 昵称 -->
				<view class="input-item">
					<input 
						class="input" 
						v-model="form.nickname" 
						type="text" 
						placeholder="昵称"
						placeholder-class="placeholder-style"
					>
				</view>
				
				<!-- 3. 密码 -->
				<view class="input-item">
				  <!-- 隐藏密码状态 -->
				  <input 
				    v-if="!showPassword"
				    class="input" 
				    v-model="form.password" 
				    type="password"
				    placeholder="密码"
				    placeholder-class="placeholder-style"
				  >
				  <!-- 显示密码状态 -->
				  <input 
				    v-else
				    class="input" 
				    v-model="form.password" 
				    type="text"
				    placeholder="密码"
				    placeholder-class="placeholder-style"
				  >
				  <uni-icons 
				    :type="showPassword ? 'eye-filled' : 'eye-slash-filled'" 
				    size="24" 
				    color="#999999"
				    @click="toggleShowPassword"
				    class="eye-icon"
				  ></uni-icons>
				</view>
				
				<!-- 4. 确认密码 -->
				<view class="input-item">
				  <!-- 隐藏确认密码状态 -->
				  <input 
				    v-if="!showConfirmPassword"
				    class="input" 
				    v-model="form.confirmPassword"
				    type="password"
				    placeholder="确认密码"
				    placeholder-class="placeholder-style"
				  >
				  <!-- 显示确认密码状态 -->
				  <input 
				    v-else
				    class="input" 
				    v-model="form.confirmPassword"
				    type="text"
				    placeholder="确认密码"
				    placeholder-class="placeholder-style"
				  >
				  <uni-icons 
				    :type="showConfirmPassword ? 'eye-filled' : 'eye-slash-filled'" 
				    size="24" 
				    color="#999999"
				    @click="toggleShowConfirmPassword"
				    class="eye-icon"
				  ></uni-icons>
				</view>
				
				<!-- 5. 手机号 -->
				<view class="input-item">
					<input 
						class="input" 
						v-model="form.phone" 
						type="number" 
						placeholder="手机号"
						placeholder-class="placeholder-style"
					>
				</view>
				
				<!-- 6. 邮箱 -->
				<view class="input-item">
					<input 
						class="input" 
						v-model="form.email" 
						type="text" 
						placeholder="邮箱"
						placeholder-class="placeholder-style"
					>
				</view>

				<!-- 注册按钮 -->
				<button 
					class="login-btn" 
					@click="handleRegister" 
					:disabled="isLoading"
				>
					{{ isLoading ? '注册中...' : '注册' }}
				</button>

				<!-- 跳转登录 -->
				<view class="register-tip">
					<text>已有账号？</text>
					<text class="register-link" @click="goToLogin">去登录</text>
				</view>
			</view>

			<!-- 协议区域 -->
			<view class="agreement">
				<view class="checkbox-wrapper" @tap="toggleAgree">
					<view class="checkbox" :class="{ 'checked': isAgreed }">
						<text v-if="isAgreed" class="checkmark">✓</text>
					</view>
					<text class="agreement-text">我已阅读并同意</text>
				</view>
				<text class="agreement-link" @tap="openUserAgreement">《用户协议》</text>
				<text class="agreement-text">和</text>
				<text class="agreement-link" @tap="openPrivacyAgreement">《隐私协议》</text>
			</view>
		</view>
		<view class="safe-area-inset-bottom"></view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { register } from '@/api/user.js'  

// 表单数据统一管理
const form = ref({
	username: '',
	nickname: '',
	password: '',
	confirmPassword: '',
	phone: '',
	email: ''
})

const isAgreed = ref(false)
const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)  

const showToast = (title, icon = 'none') => {
	uni.showToast({ title, icon, duration: 2000 })
}

// 切换密码显示
const toggleShowPassword = () => {
	showPassword.value = !showPassword.value
}

// 切换确认密码显示
const toggleShowConfirmPassword = () => {
	showConfirmPassword.value = !showConfirmPassword.value
}

// 处理注册
const handleRegister = async () => {
	// 1. 验证协议
	if (!isAgreed.value) {
		showToast('请先同意用户协议')
		return
	}

	// 2. 验证用户名
	if (!form.value.username.trim()) {
		showToast('请输入用户名')
		return
	}
	if (form.value.username.length < 3 || form.value.username.length > 20) {
		showToast('用户名长度必须在3-20位之间')
		return
	}
	const usernameRegex = /^[a-zA-Z0-9_]+$/
	if (!usernameRegex.test(form.value.username)) {
		showToast('用户名只能包含字母、数字和下划线')
		return
	}

	// 3. 验证昵称
	if (!form.value.nickname.trim()) {
		showToast('请输入昵称')
		return
	}
	if (form.value.nickname.length < 2 || form.value.nickname.length > 10) {
		showToast('昵称长度必须在2-10位之间')
		return
	}

	// 4. 验证密码
	if (!form.value.password) {
		showToast('请输入密码')
		return
	}
	if (form.value.password.length < 6 || form.value.password.length > 20) {
		showToast('密码长度必须在6-20位之间')
		return
	}

	// 5. 验证确认密码
	if (form.value.password !== form.value.confirmPassword) {
		showToast('两次密码不一致')
		return
	}

	// 6. 验证手机号（如果填了）
	if (form.value.phone) {
		const phoneRegex = /^1[3-9]\d{9}$/
		if (!phoneRegex.test(form.value.phone)) {
			showToast('手机号格式不正确')
			return
		}
	}

	// 7. 验证邮箱（如果填了）
	if (form.value.email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(form.value.email)) {
			showToast('邮箱格式不正确')
			return
		}
	}

	isLoading.value = true
	try {
		// 调用注册接口（去掉 confirmPassword）
		const { confirmPassword, ...registerData } = form.value
		await register(registerData)

		showToast('注册成功', 'success')

		// 跳转到登录页
		setTimeout(() => {
			uni.redirectTo({
				url: '/pages/login/login'
			})
		}, 1500)

	} catch (err) {
		console.error('注册失败：', err)
	} finally {
		isLoading.value = false
	}
}

// 切换协议勾选状态
const toggleAgree = () => {
	isAgreed.value = !isAgreed.value
}

// 跳转到登录页
const goToLogin = () => {
	uni.redirectTo({
		url: '/pages/login/login'
	})
}

// 打开用户协议
const openUserAgreement = () => {
	uni.showToast({ title: '用户协议（开发中）', icon: 'none' })
}

// 打开隐私协议
const openPrivacyAgreement = () => {
	uni.showToast({ title: '隐私协议（开发中）', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.login-container {
	min-height: 100vh;
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;

	.circle-wrapper {
		position: relative;
		width: 100%;
		height: 400rpx;

		.circle-big {
			width: 400rpx;
			height: 400rpx;
			background: rgba(254, 251, 236, 100);
			margin-left: auto;
			border-radius: 0 0 0 80%;
			opacity: 0.8;
		}

		.circle-small {
			position: absolute;
			width: 150rpx;
			height: 150rpx;
			bottom: 40rpx;
			border-radius: 50%;
		}

		.circle-small-left {
			margin-left: 20rpx;
			background: rgba(203, 244, 253, 100);
		}

		.circle-small-right {
			margin-left: 120rpx;
			background: rgba(254, 222, 101, 100);
		}
	}

	.header {
		margin: 10rpx 40rpx 60rpx;

		.title {
			font-size: 48rpx;
			font-weight: 600;
			color: #333333;
		}
	}

	.form {
		margin: 0 40rpx;
		display: flex;
		flex-direction: column;
		flex: 1;

		.form-main {
			flex: 1;
		}

		.input-item {
			border: 1px solid #cbcbcb;
			border-radius: 50rpx;
			margin-bottom: 30rpx;  // 稍微调小一点，因为字段变多了
			padding: 20rpx;
			display: flex;
			align-items: center;

			.input {
				flex: 1;
				font-size: 32rpx;
			}

			.eye-icon {
				width: 60rpx;
				text-align: center;
			}

			.placeholder-style {
				color: #999999;
				font-size: 32rpx;
			}
		}

		.login-btn {
			background: linear-gradient(135deg, rgba(254, 222, 101, 100), rgba(203, 244, 253, 100));
			color: #333333;
			border-radius: 50rpx;
			height: 100rpx;
			line-height: 100rpx;
			font-size: 34rpx;
			font-weight: 500;
			letter-spacing: 4rpx;
			margin: 40rpx 0 30rpx;
			flex-shrink: 0;

			&:active {
				opacity: 0.8;
			}
		}

		.register-tip {
			text-align: center;
			font-size: 30rpx;
			color: #666666;
			margin-bottom: 40rpx;
			flex-shrink: 0;

			.register-link {
				color: #333333;
				font-weight: 500;
				margin-left: 8rpx;
			}
		}

		.agreement {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			font-size: 26rpx;
			color: #999999;
			margin-top: auto;
			padding: 20rpx 0 30rpx;  // 稍微调小一点

			.checkbox-wrapper {
				display: flex;
				align-items: center;
				margin-right: 4rpx;
				padding: 10rpx 0;

				.checkbox {
					width: 34rpx;
					height: 34rpx;
					border: 2rpx solid #d0d0d0;
					border-radius: 6rpx;
					margin-right: 8rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					transition: all 0.2s ease;
					background: #ffffff;

					&.checked {
						background: #333333;
						border-color: #333333;

						.checkmark {
							color: white;
							font-size: 22rpx;
							font-weight: bold;
						}
					}

					&:active {
						transform: scale(0.95);
						opacity: 0.8;
					}
				}
			}

			.agreement-text {
				color: #999999;
			}

			.agreement-link {
				color: rgba(254, 222, 101, 100);
				margin: 0 4rpx;

				&:active {
					opacity: 0.7;
				}
			}
		}
	}
}
</style>