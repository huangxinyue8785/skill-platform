<template>
	<view class="login-container">
		<view class="circle-wrapper">
			<view class="circle-big"></view>
			<view class="circle-small-left circle-small"></view>
			<view class="circle-small-right circle-small"></view>
		</view>

		<view class="header">
			<view class="title">校园技能汇，欢迎登录！</view>
		</view>

		<view class="form">
			<!-- 表单主体 - 自动撑开 -->
			<view class="form-main">
				<view class="input-item">
					<input class="input" v-model="username" type="text" placeholder="用户名"
						placeholder-class="placeholder-style">
				</view>
				<view class="input-item">
					<input class="input" v-model="password" :type="showPassword ? 'text' : 'password'"
						:password="!showPassword" placeholder="密码" placeholder-class="placeholder-style">
					<uni-icons :type="showPassword ? 'eye-filled' : 'eye-slash-filled'" size="24" color="#999999"
						@click="toggleShowPassword" class="eye-icon"></uni-icons>

				</view>

				<view class="forgot-password">
					<text>忘记密码？</text>
				</view>

				<button class="login-btn" @click="handleLogin" :disabled="isLoading">
					{{ isLoading ? '登录中...' : '登录' }}
				</button>

				<view class="register-tip">
					<text>没有账号？</text>
					<text class="register-link" @click="goToRegister">去注册</text>
				</view>
			</view>

			<!-- 协议区域 - 固定在底部 -->
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
	import {
		ref
	} from 'vue'
	import { onLoad } from '@dcloudio/uni-app'
	import {
		login
	} from '@/api/user.js'
	import {
		useUserStore
	} from '@/stores/user.js'

	const username = ref('')
	const password = ref('')
	const isAgreed = ref(false)
	const isLoading = ref(false)
	const showPassword = ref(false)
	const redirect = ref('')
	const pageOptions = ref({})

	const userStore = useUserStore()

	// 接收页面参数
	onLoad((options) => {
		if (options.redirect) {
			redirect.value = decodeURIComponent(options.redirect)
		}
		if (options.options) {
			try {
				pageOptions.value = JSON.parse(decodeURIComponent(options.options))
			} catch (e) {
				console.error('解析参数失败', e)
			}
		}
	})

	const showToast = (title, icon = 'none') => {
		uni.showToast({
			title,
			icon,
			duration: 2000
		})
	}

	// login.vue - handleLogin 函数
	const handleLogin = async () => {
	  if (!isAgreed.value) {
	    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
	    return
	  }
	
	  if (!username.value.trim() || !password.value.trim()) {
	    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
	    return
	  }
	
	  isLoading.value = true
	  try {
	    const res = await login(username.value, password.value)
	    userStore.setUserInfo(res.user, res.token)
	
	    uni.showToast({ title: '登录成功', icon: 'success' })
	
	    setTimeout(() => {
	      // 如果有 redirect 参数，说明是从其他页面跳过来的
	      if (redirect.value) {
	        // 触发事件，让原页面刷新数据
	        uni.$emit('loginSuccess', pageOptions.value)
	        // 返回上一页
	        uni.navigateBack()
	      } else {
	        // 没有 redirect，说明是直接进入登录页，跳转到首页
	        uni.switchTab({
	          url: '/pages/index/index'
	        })
	      }
	    }, 1500)
	
	  } catch (err) {
	    console.error('登录失败：', err)
	  } finally {
	    isLoading.value = false
	  }
	}

	// 切换密码显示状态
	const toggleShowPassword = () => {
		showPassword.value = !showPassword.value
	}

	// 切换协议勾选状态
	const toggleAgree = () => {
		isAgreed.value = !isAgreed.value
	}

	// 跳转到注册页
	const goToRegister = () => {
		uni.navigateTo({
			url: '/pages/register/register'
		})
	}

	// 打开用户协议（现在先提示，后面可以跳转到协议页面）
	const openUserAgreement = () => {
		uni.showToast({
			title: '用户协议（开发中）',
			icon: 'none'
		})
	}

	// 打开隐私协议
	const openPrivacyAgreement = () => {
		uni.showToast({
			title: '隐私协议（开发中）',
			icon: 'none'
		})
	}
</script>

<style lang="scss" scoped>
	.login-container {
		min-height: 100vh;
		position: relative;
		overflow: hidden;

		// 整个容器变成 flex 列布局
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

			// 表单也变成 flex 列布局
			display: flex;
			flex-direction: column;
			flex: 1; // 占满剩余空间

			// 表单主体 - 自动撑开
			.form-main {
				flex: 1; // 这部分自动撑开
			}

			.input-item {
				border: 1px solid #cbcbcb;
				border-radius: 50rpx;
				margin-bottom: 40rpx;
				padding: 20rpx;
				display: flex;
				align-items: center;


				.input {
					width: 100%;
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

			.forgot-password {
				text-align: right;
				margin: 20rpx 0 50rpx;
				font-size: 28rpx;
				color: #999999;
			}

			.login-btn {
				background: linear-gradient(135deg, rgba(254, 222, 101, 100), rgba(203, 244, 253, 100));
				color: #333333;
				border-radius: 50rpx;
				height: 100rpx; // 固定高度
				line-height: 100rpx; // 固定行高
				font-size: 34rpx;
				font-weight: 500;
				letter-spacing: 4rpx;
				margin-bottom: 40rpx;

				// 确保按钮不被压缩
				flex-shrink: 0;

				&:active {
					opacity: 0.8;
				}
			}

			.register-tip {
				text-align: center;
				font-size: 30rpx;
				color: #666666;
				margin-bottom: 60rpx;
				flex-shrink: 0; // 确保不被压缩

				.register-link {
					color: #333333;
					font-weight: 500;
					margin-left: 8rpx;
				}
			}

			// 协议区域 - 固定在底部
			.agreement {
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-wrap: wrap;
				font-size: 26rpx;
				color: #999999;

				margin-top: auto; // 上边距自动，推到最下面
				padding: 30rpx 0 40rpx;

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