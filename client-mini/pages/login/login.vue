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
			<view class="form-main">
				<view class="input-item">
					<input class="input" v-model="username" type="text" placeholder="用户名"
						placeholder-class="placeholder-style">
				</view>
				<view class="input-item">
				  <!-- 隐藏密码状态 -->
				  <input 
				    v-if="!showPassword"
				    class="input" 
				    v-model="password" 
				    type="password"
				    placeholder="密码" 
				    placeholder-class="placeholder-style"
				  >
				  <!-- 显示密码状态 -->
				  <input 
				    v-else
				    class="input" 
				    v-model="password" 
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
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		login
	} from '@/api/user.js'
	import {
		useUserStore
	} from '@/stores/user.js'
	import config from '@/utils/config.js' 
	import {
		loginIM,
		updateMyProfile,
		waitForSDKReady,
		logoutIM, // ✅ 添加这个
		getTIM
	} from '@/utils/im'

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

	// login.vue 中的 handleLogin 函数
	const handleLogin = async () => {
	  if (!isAgreed.value) {
	    uni.showToast({
	      title: '请先同意用户协议',
	      icon: 'none'
	    })
	    return
	  }
	
	  if (!username.value.trim() || !password.value.trim()) {
	    uni.showToast({
	      title: '请输入用户名和密码',
	      icon: 'none'
	    })
	    return
	  }
	
	  isLoading.value = true
	  try {
	    // 1. 后端登录
	    const res = await login(username.value, password.value)
	    console.log('后端登录成功:', res)
	
	    // 2. 检查并退出旧的 IM 登录
	    const tim = getTIM()
	    try {
	      const currentIMUser = tim._userID || null
	      if (currentIMUser && String(currentIMUser) !== String(res.user.id)) {
	        console.log(`检测到 IM 登录用户 ${currentIMUser} 与即将登录用户 ${res.user.id} 不一致，先退出 IM`)
	        await logoutIM()
	        await new Promise(resolve => setTimeout(resolve, 500))
	      }
	    } catch (err) {
	      console.log('获取 IM 登录状态失败', err)
	    }
	
	    // 3. 保存用户信息
	    userStore.setUserInfo(res.user, res.token)
	
	    // 4. 获取 UserSig
	    const imRes = await uni.request({
	      url: `${config.serverUrl}/api/user/im/usersig`,
	      method: 'GET',
	      header: {
	        'Authorization': `Bearer ${res.token}`
	      }
	    })
	
	    if (imRes.data.code === 200) {
	      // 5. 登录 IM
	      await loginIM(String(res.user.id), imRes.data.data.userSig)
	      console.log('IM 登录完成')
	
	      // 6. 等待 SDK 就绪
	      await waitForSDKReady()
	      console.log('SDK 已就绪')
	
	      // ✅ 7. 关键：立即同步用户资料（包括头像）
	      const avatarUrl = res.user.avatar ?
	        `${config.serverUrl}${res.user.avatar}` : '' 
	      
	      console.log('正在同步用户资料，头像URL:', avatarUrl)
	      
	      await updateMyProfile(
	        res.user.nickname || '用户',
	        avatarUrl
	      )
	      console.log('用户资料同步完成')
	    }
	
	    uni.showToast({
	      title: '登录成功',
	      icon: 'success'
	    })
	
	    setTimeout(() => {
	      if (redirect.value) {
	        uni.$emit('loginSuccess', pageOptions.value)
	        uni.navigateBack()
	      } else {
	        uni.switchTab({
	          url: '/pages/index/index'
	        })
	      }
	    }, 1500)
	
	  } catch (err) {
	    console.error('登录失败：', err)
	    uni.showToast({
	      title: err.message || '登录失败',
	      icon: 'none'
	    })
	  } finally {
	    isLoading.value = false
	  }
	}
	
	// 切换密码显示
	const toggleShowPassword = () => {
		showPassword.value = !showPassword.value
	}

	// 切换协议
	const toggleAgree = () => {
		isAgreed.value = !isAgreed.value
	}

	// 跳转注册
	const goToRegister = () => {
		uni.navigateTo({
			url: '/pages/register/register'
		})
	}

	// 打开用户协议
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
				height: 100rpx;
				line-height: 100rpx;
				font-size: 34rpx;
				font-weight: 500;
				letter-spacing: 4rpx;
				margin-bottom: 40rpx;
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