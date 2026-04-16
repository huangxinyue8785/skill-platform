<template>
	<view class="container">
		<view class="form-card">
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
			
			<!-- 密码强度提示（可选） -->
			<view class="strength-tip" v-if="form.newPassword">
				<text class="strength-text">密码强度：</text>
				<view class="strength-bars">
					<view 
						class="strength-bar" 
						:class="getStrengthClass(1)"
					></view>
					<view 
						class="strength-bar" 
						:class="getStrengthClass(2)"
					></view>
					<view 
						class="strength-bar" 
						:class="getStrengthClass(3)"
					></view>
				</view>
				<text class="strength-level">{{ strengthLevel }}</text>
			</view>
			
			<!-- 提交按钮 -->
			<button 
				class="submit-btn" 
				@click="handleSubmit"
				:disabled="submitting"
			>{{ submitting ? '提交中...' : '确认修改' }}</button>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { updatePassword } from '@/api/user.js'

const submitting = ref(false)

// 表单数据
const form = ref({
	oldPassword: '',
	newPassword: '',
	confirmPassword: ''
})

// 密码显示控制
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 切换密码显示
const toggleOldPassword = () => showOldPassword.value = !showOldPassword.value
const toggleNewPassword = () => showNewPassword.value = !showNewPassword.value
const toggleConfirmPassword = () => showConfirmPassword.value = !showConfirmPassword.value

// ========== 密码强度计算 ==========
const calculateStrength = computed(() => {
	const pwd = form.value.newPassword
	if (!pwd) return 0
	
	let score = 0
	
	// 长度>=8 加1分
	if (pwd.length >= 8) score++
	
	// 包含数字 加1分
	if (/\d/.test(pwd)) score++
	
	// 包含字母 加1分
	if (/[a-zA-Z]/.test(pwd)) score++
	
	// 包含特殊字符 加1分
	if (/[^a-zA-Z0-9]/.test(pwd)) score++
	
	return score
})

// 强度等级文字
const strengthLevel = computed(() => {
	const score = calculateStrength.value
	if (score <= 1) return '弱'
	if (score <= 2) return '中'
	if (score <= 3) return '强'
	return '非常强'
})

// 强度条样式
const getStrengthClass = (index) => {
	const score = calculateStrength.value
	if (score >= index) {
		if (score <= 1) return 'weak'
		if (score <= 2) return 'medium'
		if (score <= 3) return 'strong'
		return 'very-strong'
	}
	return ''
}

// ========== 表单验证 ==========
const validateForm = () => {
	if (!form.value.oldPassword) {
		uni.showToast({ title: '请输入旧密码', icon: 'none' })
		return false
	}
	
	if (!form.value.newPassword) {
		uni.showToast({ title: '请输入新密码', icon: 'none' })
		return false
	}
	
	if (form.value.newPassword.length < 6 || form.value.newPassword.length > 20) {
		uni.showToast({ title: '新密码长度必须在6-20位之间', icon: 'none' })
		return false
	}
	
	if (form.value.newPassword !== form.value.confirmPassword) {
		uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
		return false
	}
	
	if (form.value.oldPassword === form.value.newPassword) {
		uni.showToast({ title: '新密码不能与旧密码相同', icon: 'none' })
		return false
	}
	
	return true
}

// ========== 提交修改 ==========
const handleSubmit = async () => {
	if (!validateForm()) return
	
	submitting.value = true
	uni.showLoading({ title: '修改中...' })
	
	try {
		await updatePassword({
			oldPassword: form.value.oldPassword,
			newPassword: form.value.newPassword
		})
		
		uni.hideLoading()
		uni.showToast({ title: '密码修改成功', icon: 'success' })
		
		// 延迟返回上一页
		setTimeout(() => {
			uni.navigateBack()
		}, 1500)
		
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '修改失败', icon: 'none' })
		console.error('修改密码失败', err)
	} finally {
		submitting.value = false
	}
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 80vh;
	// background-color: #f5f5f5;
	padding: 30rpx;
}

.form-card {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 40rpx 30rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.form-item {
	margin-bottom: 40rpx;
	
	.label {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
		display: block;
		margin-bottom: 16rpx;
	}
	
	.input-wrapper {
		height: 80rpx;
		background-color: #f5f5f5;
		border-radius: 12rpx;
		padding: 0 20rpx;
		display: flex;
		align-items: center;
		
		input {
			flex: 1;
			font-size: 28rpx;
			height: 100%;
		}
		
		.placeholder {
			color: #999;
			font-size: 28rpx;
		}
	}
	
	.tip {
		font-size: 22rpx;
		color: #999;
		margin-top: 8rpx;
		display: block;
	}
}

/* 密码强度提示 */
.strength-tip {
	display: flex;
	align-items: center;
	margin-bottom: 40rpx;
	
	.strength-text {
		font-size: 24rpx;
		color: #666;
		margin-right: 16rpx;
	}
	
	.strength-bars {
		display: flex;
		gap: 8rpx;
		margin-right: 16rpx;
		
		.strength-bar {
			width: 40rpx;
			height: 8rpx;
			background-color: #eee;
			border-radius: 4rpx;
			transition: all 0.3s;
			
			&.weak {
				background-color: #f56c6c;
			}
			
			&.medium {
				background-color: #e6a23c;
			}
			
			&.strong {
				background-color: #07c160;
			}
			
			&.very-strong {
				background-color: #3a7cb9;
			}
		}
	}
	
	.strength-level {
		font-size: 24rpx;
		color: #666;
	}
}

/* 提交按钮 */
.submit-btn {
	height: 90rpx;
	line-height: 90rpx;
	background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
	color: #333;
	border-radius: 45rpx;
	font-size: 32rpx;
	font-weight: 500;
	
	&::after {
		border: none;
	}
	
	&[disabled] {
		opacity: 0.5;
	}
}
</style>