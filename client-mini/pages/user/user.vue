<template>
	<!-- 加载状态 -->
	<view class="loadingLayout" v-if="loading">
		<view :style="{height: getNavBarHeight() + 'px'}"></view>
		<uni-load-more status="loading"></uni-load-more>
	</view>

	<!-- 主内容 -->
	<view class="user-container pageBg" v-else>
		<!-- 顶部留白，防止被导航栏挡住 -->
		<view :style="{height: getNavBarHeight() + 40 +'px'}"></view>

		<!-- 用户信息卡片 - 未登录状态 -->
		<view class="user-card" @click="goToLogin" v-if="!userStore.userInfo">
			<view class="avatar">
				<image src="/static/default-avatar.png" mode="aspectFill"></image>
			</view>
			<view class="info">
				<text class="nickname">点击登录</text>
				<text class="tip">登录后查看更多功能</text>
			</view>
			<uni-icons type="arrowright" size="20" color="#999"></uni-icons>
		</view>

		<!-- 用户信息卡片 - 已登录状态 -->
		<view class="user-card" @click="goToProfile" v-else>
			<view class="avatar">
				<image :src="getImageUrl(userStore.userInfo.avatar)" mode="aspectFill"></image>
			</view>
			<view class="info">
				<text class="nickname">{{ userStore.userInfo.nickname }}</text>
				<text class="tip">账号：{{ userStore.userInfo.username }}</text>
			</view>
			<uni-icons type="arrowright" size="20" color="#999"></uni-icons>
		</view>

		<!-- 功能入口 -->
		<view class="section">
			<view class="list">
				<!-- 我的发布 -->
				<view class="row" @click="goToMyPublish">
					<view class="left">
						<uni-icons type="list" size="20" color="#333"></uni-icons>
						<text class="text">我的发布</text>
					</view>
					<view class="right">
						<text class="text">{{ userStore.userInfo?.service_count || 0 }}</text>
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</view>

				<!-- 我的订单 -->
				<view class="row" @click="goToMyOrders">
					<view class="left">
						<uni-icons type="cart" size="20" color="#333"></uni-icons>
						<text class="text">我的订单</text>
					</view>
					<view class="right">
						<text class="text">{{ userStore.userInfo?.order_count || 0 }}</text>
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</view>

				<!-- 我的收藏 -->
				<view class="row" @click="goToMyFavorites">
					<view class="left">
						<uni-icons type="star" size="20" color="#333"></uni-icons>
						<text class="text">我的收藏</text>
					</view>
					<view class="right">
						<text class="text">{{ Math.max(0, userStore.userInfo?.favorite_count || 0) }}</text>
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- 更多服务 -->
		<view class="section">
			<view class="list">
				<!-- 联系客服 (H5和APP端) -->
				<!-- #ifdef H5 || APP-PLUS -->
				<view class="row" @click="handleContact">
					<view class="left">
						<uni-icons type="chat" size="20" color="#333"></uni-icons>
						<text class="text">联系客服</text>
					</view>
					<view class="right">
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</view>
				<!-- #endif -->

				<!-- 联系客服 (微信小程序端) -->
				<!-- #ifdef MP-WEIXIN -->
				<button class="row contact-row" open-type="contact" @contact="handleContactCallback">
					<view class="left">
						<uni-icons type="chat" size="20" color="#333"></uni-icons>
						<text class="text">联系客服</text>
					</view>
					<view class="right">
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</button>
				<!-- #endif -->

				<!-- 设置 -->
				<view class="row" @click="goToSettings">
					<view class="left">
						<uni-icons type="gear" size="20" color="#333"></uni-icons>
						<text class="text">设置</text>
					</view>
					<view class="right">
						<uni-icons type="arrowright" size="15" color="#aaa"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- 退出登录按钮 -->
		<view class="logout-btn" @click="handleLogout" v-if="userStore.userInfo">
			<text>退出登录</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNavBarHeight } from "@/utils/system.js"
import { useUserStore } from '@/stores/user.js'
import { getUserInfo } from '@/api/user.js'
import { checkLogin } from '@/utils/auth'
import { getImageUrl } from '@/utils/request.js'

const userStore = useUserStore()
const loading = ref(false)

// 客服电话
const SERVICE_PHONE = '18898860375'

// 客服处理方法（H5和APP端）
const handleContact = () => {
	uni.showModal({
		title: '联系客服',
		content: `客服电话：${SERVICE_PHONE}`,
		confirmText: '复制号码',
		cancelText: '取消',
		success: (res) => {
			if (res.confirm) {
				uni.setClipboardData({
					data: SERVICE_PHONE,
					success: () => {
						uni.showToast({
							title: '号码已复制',
							icon: 'success',
							duration: 2000
						})
					},
					fail: () => {
						uni.showToast({
							title: '复制失败',
							icon: 'none'
						})
					}
				})
			}
		}
	})
}

// 微信小程序客服消息回调
const handleContactCallback = (e) => {
	console.log('客服消息回调', e)
}

// 加载用户最新信息
const loadUserInfo = async () => {
	if (!userStore.userInfo) return
	
	loading.value = true
	try {
		const res = await getUserInfo()
		userStore.setUserInfo(res, userStore.token)
	} catch (err) {
		console.error('获取用户信息失败', err)
	} finally {
		loading.value = false
	}
}

// 每次页面显示时刷新数据
onShow(() => {
	if (userStore.userInfo) {
		loadUserInfo()
	}
})

const goToLogin = () => {
	uni.navigateTo({
		url: '/pages/login/login'
	})
}

const goToProfile = () => {
	uni.navigateTo({
		url: '/pages/profile/profile'
	})
}

// 我的发布
const goToMyPublish = () => {
	if (!checkLogin()) return
	uni.navigateTo({ url: '/pages/my-publish/my-publish' })
}

// 我的订单
const goToMyOrders = () => {
	if (!checkLogin()) return
	uni.navigateTo({ url: '/pages/my-orders/my-orders' })
}

// 我的收藏
const goToMyFavorites = () => {
	if (!checkLogin()) return
	uni.navigateTo({ url: '/pages/my-favorites/my-favorites' })
}

// 设置
const goToSettings = () => {
	uni.showToast({ title: '开发中', icon: 'none' })
}

// 退出登录
const handleLogout = () => {
	uni.showModal({
		title: '提示',
		content: '确定要退出登录吗？',
		success: (res) => {
			if (res.confirm) {
				userStore.logout()
				uni.showToast({ title: '已退出登录', icon: 'success' })
			}
		}
	})
}
</script>

<style lang="scss" scoped>
.user-container {
	padding: 0 30rpx 30rpx 30rpx;

	// 用户卡片
	.user-card {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		display: flex;
		align-items: center;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

		.avatar {
			width: 150rpx;
			height: 150rpx;
			border-radius: 50%;
			overflow: hidden;
			margin-right: 20rpx;

			image {
				width: 100%;
				height: 100%;
			}
		}

		.info {
			flex: 1;

			.nickname {
				font-size: 36rpx;
				font-weight: 500;
				color: #333;
				display: block;
			}

			.tip {
				font-size: 26rpx;
				color: #999;
				margin-top: 8rpx;
				display: block;
			}
		}
	}

	// 卡片区块
	.section {
		width: 100%;
		margin-bottom: 30rpx;
		background-color: #fff;
		border-radius: 20rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

		.list {
			.row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 0 30rpx;
				height: 100rpx;
				border-bottom: 1px solid #f5f5f5;
				background: #fff;

				&:last-child {
					border-bottom: 0;
				}

				.left {
					display: flex;
					align-items: center;

					.text {
						font-size: 30rpx;
						color: #333;
						margin-left: 20rpx;
					}
				}

				.right {
					display: flex;
					align-items: center;

					.text {
						font-size: 28rpx;
						color: #999;
						margin-right: 10rpx;
					}
				}
			}
			
			// 客服按钮样式（覆盖 button 默认样式）
			.contact-row {
				display: flex !important;
				justify-content: space-between !important;
				align-items: center !important;
				padding: 0 30rpx !important;
				height: 100rpx !important;
				width: 100% !important;
				background: #fff !important;
				border: none !important;
				border-radius: 0 !important;
				line-height: 1 !important;
				font-size: inherit !important;
				margin: 0 !important;
				border-bottom: 1px solid #f5f5f5 !important;
				
				// 移除 button 的默认边框和背景
				&::after {
					display: none !important;
				}
				
				.left {
					display: flex;
					align-items: center;
					
					.text {
						font-size: 30rpx;
						color: #333;
						margin-left: 20rpx;
					}
				}
				
				.right {
					display: flex;
					align-items: center;
					
					.text {
						font-size: 28rpx;
						color: #999;
						margin-right: 10rpx;
					}
				}
			}
		}
	}

	// 退出登录按钮
	.logout-btn {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		text-align: center;
		margin-top: 40rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

		text {
			font-size: 30rpx;
			color: #ff4d4f;
			font-weight: 500;
		}
	}
}

.loadingLayout {
	min-height: 100vh;
	background-color: #f5f5f5;
}
</style>