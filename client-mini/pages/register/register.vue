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
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">用户名</text>
					</view>
					<view class="item-input">
						<input 
							class="input" 
							v-model="form.username" 
							type="text" 
							placeholder="请输入用户名"
							placeholder-class="placeholder-style"
						>
					</view>
				</view>
				
				<!-- 2. 昵称 -->
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">昵称</text>
					</view>
					<view class="item-input">
						<input 
							class="input" 
							v-model="form.nickname" 
							type="text" 
							placeholder="请输入昵称"
							placeholder-class="placeholder-style"
						>
					</view>
				</view>
				
				<!-- 3. 密码 -->
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">密码</text>
					</view>
					<view class="item-input">
						<input 
							v-if="!showPassword"
							class="input" 
							v-model="form.password" 
							type="password"
							placeholder="请输入密码"
							placeholder-class="placeholder-style"
						>
						<input 
							v-else
							class="input" 
							v-model="form.password" 
							type="text"
							placeholder="请输入密码"
							placeholder-class="placeholder-style"
						>
						<uni-icons 
							:type="showPassword ? 'eye-filled' : 'eye-slash-filled'" 
							size="20" 
							color="#999"
							@click="toggleShowPassword"
							class="eye-icon"
						></uni-icons>
					</view>
				</view>
				
				<!-- 4. 确认密码 -->
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">确认密码</text>
					</view>
					<view class="item-input">
						<input 
							v-if="!showConfirmPassword"
							class="input" 
							v-model="form.confirmPassword"
							type="password"
							placeholder="请再次输入"
							placeholder-class="placeholder-style"
						>
						<input 
							v-else
							class="input" 
							v-model="form.confirmPassword"
							type="text"
							placeholder="请再次输入"
							placeholder-class="placeholder-style"
						>
						<uni-icons 
							:type="showConfirmPassword ? 'eye-filled' : 'eye-slash-filled'" 
							size="20" 
							color="#999"
							@click="toggleShowConfirmPassword"
							class="eye-icon"
						></uni-icons>
					</view>
				</view>
				
				<!-- 5. 手机号 -->
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">手机号</text>
					</view>
					<view class="item-input">
						<input 
							class="input" 
							v-model="form.phone" 
							type="number" 
							placeholder="请输入手机号"
							placeholder-class="placeholder-style"
							maxlength="11"
						>
					</view>
				</view>
				
				<!-- 6. 所在学校 -->
				<view class="form-item">
					<view class="item-label">
						<text class="required-star">*</text>
						<text class="label-text">所在学校</text>
					</view>
					<view class="item-input picker-input" @click="showSchoolPicker = true">
						<text :class="['picker-text', {'selected': schoolName}]">
							{{ schoolName || '请选择学校' }}
						</text>
						<uni-icons type="right" size="16" color="#999"></uni-icons>
					</view>
				</view>
				
				<!-- 7. 邮箱（选填） -->
				<view class="form-item">
					<view class="item-label">
						<text class="label-text">邮箱</text>
						<text class="optional-tag">选填</text>
					</view>
					<view class="item-input">
						<input 
							class="input" 
							v-model="form.email" 
							type="text" 
							placeholder="请输入邮箱"
							placeholder-class="placeholder-style"
						>
					</view>
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
		
		<!-- 学校选择弹窗 -->
		<school-picker
			v-model:visible="showSchoolPicker"
			:value="{ id: schoolId, name: schoolName }"
			@confirm="onSchoolConfirm"
		/>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { register } from '@/api/user.js'
import SchoolPicker from '@/components/school-picker/school-picker.vue'

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

const schoolId = ref('')
const schoolName = ref('')
const showSchoolPicker = ref(false)

const showToast = (title, icon = 'none') => {
	uni.showToast({ title, icon, duration: 2000 })
}

const toggleShowPassword = () => {
	showPassword.value = !showPassword.value
}

const toggleShowConfirmPassword = () => {
	showConfirmPassword.value = !showConfirmPassword.value
}

const onSchoolConfirm = (school) => {
	if (school) {
		schoolId.value = school.id
		schoolName.value = school.name
	}
}

const handleRegister = async () => {
	if (!isAgreed.value) {
		showToast('请先同意用户协议')
		return
	}
	if (!form.value.username.trim()) {
		showToast('请输入用户名')
		return
	}
	if (form.value.username.length < 3 || form.value.username.length > 20) {
		showToast('用户名长度必须在3-20位之间')
		return
	}
	if (!/^[a-zA-Z0-9_]+$/.test(form.value.username)) {
		showToast('用户名只能包含字母、数字和下划线')
		return
	}
	if (!form.value.nickname.trim()) {
		showToast('请输入昵称')
		return
	}
	if (form.value.nickname.length < 2 || form.value.nickname.length > 10) {
		showToast('昵称长度必须在2-10位之间')
		return
	}
	if (!form.value.password) {
		showToast('请输入密码')
		return
	}
	if (form.value.password.length < 6 || form.value.password.length > 20) {
		showToast('密码长度必须在6-20位之间')
		return
	}
	if (form.value.password !== form.value.confirmPassword) {
		showToast('两次密码不一致')
		return
	}
	if (!form.value.phone) {
		showToast('请输入手机号')
		return
	}
	if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
		showToast('手机号格式不正确')
		return
	}
	if (!schoolId.value) {
		showToast('请选择所在学校')
		return
	}
	if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
		showToast('邮箱格式不正确')
		return
	}

	isLoading.value = true
	try {
		const { confirmPassword, ...baseData } = form.value
		await register({ ...baseData, school_id: schoolId.value })
		showToast('注册成功', 'success')
		setTimeout(() => {
			uni.redirectTo({ url: '/pages/login/login' })
		}, 1500)
	} catch (err) {
		console.error('注册失败：', err)
	} finally {
		isLoading.value = false
	}
}

const toggleAgree = () => {
	isAgreed.value = !isAgreed.value
}

const goToLogin = () => {
	uni.redirectTo({ url: '/pages/login/login' })
}

const openUserAgreement = () => {
	uni.showToast({ title: '用户协议（开发中）', icon: 'none' })
}

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
	background: #fff;

	.circle-wrapper {
		position: relative;
		width: 100%;
		height: 350rpx;

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
		margin: 0 40rpx 30rpx;

		.title {
			font-size: 40rpx;
			font-weight: 600;
			color: #333333;
		}
	}

	.form {
		margin: 0 30rpx;
		display: flex;
		flex-direction: column;
		flex: 1;

		.form-main {
			flex: 1;
		}

		.form-item {
			display: flex;
			align-items: center;
			margin-bottom: 24rpx;
			gap: 12rpx;

			.item-label {
				width: 150rpx;
				display: flex;
				align-items: center;
				flex-shrink: 0;

				.required-star {
					color: #ff4d4f;
					font-size: 26rpx;
					margin-right: 4rpx;
				}

				.label-text {
					font-size: 28rpx;
					color: #333;
					font-weight: 500;
				}

				.optional-tag {
					font-size: 20rpx;
					color: #999;
					margin-left: 6rpx;
					padding: 2rpx 8rpx;
					background: #f5f5f5;
					border-radius: 6rpx;
				}
			}

			.item-input {
				flex: 1;
				display: flex;
				align-items: center;
				border: 1px solid #e0e0e0;
				border-radius: 40rpx;
				padding: 16rpx 24rpx;
				background: #fff;

				.input {
					flex: 1;
					font-size: 28rpx;
					text-align: left;
					color: #333333;
				}

				.eye-icon {
					width: 44rpx;
					text-align: center;
					margin-left: 8rpx;
				}

				.placeholder-style {
					color: #bbbbbb;
					font-size: 28rpx;
				}
			}

			.picker-input {
				.picker-text {
					flex: 1;
					font-size: 28rpx;
					color: #999;

					&.selected {
						color: #333333;
					}
				}
			}
		}

		.login-btn {
			background: linear-gradient(135deg, #fed665, #cbf4fd);
			color: #333333;
			border-radius: 50rpx;
			height: 90rpx;
			line-height: 90rpx;
			font-size: 34rpx;
			font-weight: 500;
			letter-spacing: 4rpx;
			margin: 40rpx 0 30rpx;
			border: none;

			&:active {
				opacity: 0.8;
			}
			
			&[disabled] {
				opacity: 0.6;
			}
		}

		.register-tip {
			text-align: center;
			font-size: 28rpx;
			color: #666666;
			margin-bottom: 30rpx;

			.register-link {
				color: #333333;
				font-weight: 500;
				margin-left: 8rpx;
			}
		}

		.agreement {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			font-size: 24rpx;
			color: #999999;
			padding: 20rpx 0 30rpx;

			.checkbox-wrapper {
				display: flex;
				align-items: center;
				margin-right: 4rpx;

				.checkbox {
					width: 30rpx;
					height: 30rpx;
					border: 2rpx solid #d0d0d0;
					border-radius: 4rpx;
					margin-right: 6rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					background: #ffffff;

					&.checked {
						background: #333333;
						border-color: #333333;

						.checkmark {
							color: white;
							font-size: 20rpx;
							font-weight: bold;
						}
					}
				}
			}

			.agreement-text {
				color: #999999;
			}

			.agreement-link {
				color: #fed665;
				margin: 0 4rpx;
			}
		}
	}
}
</style>