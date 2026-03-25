<template>
	<view class="container">
		<!-- 加载中状态 -->
		<view class="loading" v-if="loading">
			<uni-load-more status="loading"></uni-load-more>
		</view>

		<!-- 主要内容 -->
		<scroll-view scroll-y class="main-content" v-else>
			<!-- 图片轮播 -->
			<swiper class="service-swiper" circular indicator-dots autoplay>
				<swiper-item v-for="(img, index) in service.images" :key="index">
<image :src="getImageUrl(img)" mode="aspectFill" class="swiper-image"></image>
				</swiper-item>
				<!-- 如果没有图片，显示默认图 -->
				<swiper-item v-if="!service.images || service.images.length === 0">
					<image src="/static/default-avatar.png" mode="aspectFill" class="swiper-image"></image>
				</swiper-item>
			</swiper>

			<!-- 价格和标题 -->
			<view class="info-card">
				<view class="price-tag">
					<text class="price">￥{{ service.price }}</text>
					<text class="view-count">浏览 {{ service.viewCount }}</text>
				</view>
				<view class="title">{{ service.title }}</view>
			</view>

			<!-- 服务描述 -->
			<view class="desc-card">
				<view class="card-title">服务描述</view>
				<view class="desc-content">{{ service.description }}</view>
			</view>

			<!-- 服务分类 - 显示 父分类 - 子分类 -->
			<view class="info-row">
				<text class="row-label">服务分类：</text>
				<text class="row-value">{{ service.category?.parentName || '未知' }} -
					{{ service.category?.name || '未知' }}</text>
			</view>

			<!-- 所选学校 - 修改文字 -->
			<view class="info-row" v-if="service.school">
				<text class="row-label">所选学校：</text>
				<text class="row-value">{{ service.school.name }}</text>
			</view>

			<!-- 发布人信息 -->
			<view class="user-card">
				<view class="card-title">发布人</view>
				<view class="user-info">
					<image :src="getImageUrl(service.user?.avatar)" class="user-avatar"></image>
					<view class="user-detail">
						<text class="user-name">{{ service.user?.nickname }}</text>
						<text class="user-stats">发布了{{ service.user?.serviceCount || 0 }}个服务</text>
					</view>
				</view>
			</view>

			<!-- 底部占位，防止内容被按钮挡住 -->
			<view class="bottom-placeholder"></view>
		</scroll-view>

		<!-- 底部操作栏 -->
		<view class="bottom-bar">
			<!-- 左边按钮组：联系卖家 + 收藏（左右排列） -->
			<view class="action-btns">
				<!-- 联系卖家按钮 -->
				<button class="action-btn contact-btn" open-type="contact"
					v-if="service.user?.id !== userStore.userInfo?.id">
					<image src="/static/contact.png" mode="aspectFit" class="btn-icon"></image>
					<text class="btn-text">联系卖家</text>
				</button>

				<!-- 收藏按钮 -->
				<button class="action-btn favorite-btn" @click="toggleFavorite">
					<image :src="isFavorited ? '/static/collection-finish.png' : '/static/collection.png'"
						mode="aspectFit" class="btn-icon"></image>
					<text class="btn-text">{{ isFavorited ? '已收藏' : '收藏' }}</text>
				</button>
			</view>

			<!-- 购买按钮 - 放在最右边 -->
			<button class="buy-btn" @click="goToBuy" v-if="service.user?.id !== userStore.userInfo?.id">
				立即购买
			</button>
			<button class="disabled-btn" v-else disabled>
				自己的服务
			</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		onUnmounted
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		getServiceDetail,
		getServiceDetailForEdit, // 导入编辑专用接口
	} from '@/api/service.js'
	import {
		checkFavorite,
		addFavorite,
		removeFavorite
	} from '@/api/favorite.js'
	import {
		useUserStore
	} from '@/stores/user.js'
	import {
		checkLogin
	} from '@/utils/auth'
	import { getImageUrl } from '@/utils/request.js' 
	import UniLoadMore from '@dcloudio/uni-ui/lib/uni-load-more/uni-load-more.vue'

	const userStore = useUserStore()

	const serviceId = ref('')
	const service = ref({})
	const loading = ref(true)
	const isFavorited = ref(false)
	const favoriteId = ref('')
	const fromWhere = ref('') // 记录从哪里来

	// 监听登录成功事件
	const setupLoginListener = () => {
		uni.$on('loginSuccess', () => {
			console.log('登录成功，刷新数据')
			checkFavoriteStatus()
			loadServiceDetail()
		})
	}

	// 移除监听
	const removeLoginListener = () => {
		uni.$off('loginSuccess')
	}

	// 在 onLoad 中设置监听
	onLoad((options) => {
		if (options.id) {
			serviceId.value = options.id
			fromWhere.value = options.from || '' // 记录来源
			loadServiceDetail()
			checkFavoriteStatus()
			setupLoginListener()
		} else {
			uni.showToast({
				title: '参数错误',
				icon: 'error'
			})
			setTimeout(() => uni.navigateBack(), 1500)
		}
	})

	// 页面卸载时移除监听
	onUnmounted(() => {
		removeLoginListener()
	})

	// 加载服务详情
	const loadServiceDetail = async () => {
		try {
			loading.value = true
	
			let res
			// 从我的发布进来的，用编辑专用接口（可以看到所有状态）
			if (fromWhere.value === 'my-publish') {
				res = await getServiceDetailForEdit(serviceId.value)
			} else {
				// 从首页等公开入口进来，用公开接口（只能看已上架）
				res = await getServiceDetail(serviceId.value)
			}
	
			console.log('服务详情完整数据：', JSON.stringify(res, null, 2))
			console.log('用户信息：', res.user)
			console.log('serviceCount：', res.user?.serviceCount)
			console.log('service_count：', res.user?.service_count)
			
			service.value = res
		} catch (err) {
			console.error('加载服务详情失败', err)
			uni.showToast({
				title: '加载失败',
				icon: 'none'
			})
		} finally {
			loading.value = false
		}
	}

	// 检查是否已收藏
	const checkFavoriteStatus = async () => {
		if (!userStore.token) return
		try {
			const res = await checkFavorite(serviceId.value)
			isFavorited.value = res.isFavorited
			if (res.favoriteId) {
				favoriteId.value = res.favoriteId
			}
		} catch (err) {
			console.error('检查收藏状态失败', err)
		}
	}

	// toggleFavorite 函数
	const toggleFavorite = async () => {
		if (!checkLogin({
				action: 'favorite',
				serviceId: serviceId.value
			})) return

		try {
			if (isFavorited.value) {
				if (!favoriteId.value) {
					const checkRes = await checkFavorite(serviceId.value)
					if (!checkRes.favoriteId) {
						uni.showToast({
							title: '收藏信息不存在',
							icon: 'none'
						})
						return
					}
					favoriteId.value = checkRes.favoriteId
				}

				await removeFavorite(favoriteId.value)
				isFavorited.value = false
				favoriteId.value = ''
				uni.showToast({
					title: '已取消收藏',
					icon: 'success'
				})
			} else {
				const res = await addFavorite(serviceId.value)
				isFavorited.value = true
				favoriteId.value = res.favoriteId
				uni.showToast({
					title: '收藏成功',
					icon: 'success'
				})
			}
		} catch (err) {
			console.error('操作失败', err)
			uni.showToast({
				title: err.message || '操作失败',
				icon: 'none'
			})
		}
	}

	// goToBuy 函数
	const goToBuy = () => {
		if (!checkLogin({
				action: 'buy',
				serviceId: serviceId.value
			})) return
		uni.navigateTo({
			url: `/pages/create-order/create-order?serviceId=${serviceId.value}`
		})
	}
</script>

<style lang="scss" scoped>
	.container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: #f5f5f5;
		position: relative;
	}

	.loading {
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.main-content {
		flex: 1;
		padding-bottom: 120rpx;
		box-sizing: content-box;
	}

	.service-swiper {
		width: 100%;
		height: 750rpx;

		.swiper-image {
			width: 100%;
			height: 100%;
		}
	}

	.info-card {
		background-color: #fff;
		padding: 30rpx;
		margin-bottom: 20rpx;

		.price-tag {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;

			.price {
				font-size: 48rpx;
				font-weight: 600;
				color: #ff4d4f;
			}

			.view-count {
				font-size: 24rpx;
				color: #999;
			}
		}

		.title {
			font-size: 36rpx;
			font-weight: 500;
			color: #333;
			line-height: 1.5;
		}
	}

	.desc-card {
		background-color: #fff;
		padding: 30rpx;
		margin-bottom: 20rpx;

		.card-title {
			font-size: 32rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 20rpx;
			position: relative;
			padding-left: 20rpx;

			&::before {
				content: '';
				position: absolute;
				left: 0;
				top: 50%;
				transform: translateY(-50%);
				width: 6rpx;
				height: 30rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				border-radius: 3rpx;
			}
		}

		.desc-content {
			font-size: 28rpx;
			color: #666;
			line-height: 1.6;
		}
	}

	.info-row {
		background-color: #fff;
		padding: 20rpx 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
		display: flex;

		.row-label {
			font-size: 28rpx;
			color: #999;
			width: 160rpx;
		}

		.row-value {
			font-size: 28rpx;
			color: #333;
			flex: 1;
		}
	}

	.user-card {
		background-color: #fff;
		padding: 30rpx;
		margin-top: 20rpx;

		.card-title {
			font-size: 32rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 20rpx;
			position: relative;
			padding-left: 20rpx;

			&::before {
				content: '';
				position: absolute;
				left: 0;
				top: 50%;
				transform: translateY(-50%);
				width: 6rpx;
				height: 30rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				border-radius: 3rpx;
			}
		}

		.user-info {
			display: flex;
			align-items: center;

			.user-avatar {
				width: 80rpx;
				height: 80rpx;
				border-radius: 50%;
				margin-right: 20rpx;
			}

			.user-detail {
				display: flex;
				flex-direction: column;

				.user-name {
					font-size: 30rpx;
					font-weight: 500;
					color: #333;
					margin-bottom: 8rpx;
				}

				.user-stats {
					font-size: 24rpx;
					color: #999;
				}
			}
		}
	}

	.bottom-placeholder {
		height: 60rpx;
	}

	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		width: 100%;
		background-color: #fff;
		display: flex;
		align-items: center;
		padding: 0rpx 20rpx 10rpx 20rpx;
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		// box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
		box-sizing: content-box;
		z-index: 100;

		.action-btns {
			display: flex;
			flex-direction: row;
			gap: 10rpx;


			.action-btn {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				width: 100rpx;
				height: 100rpx;
				background-color: transparent;
				border: none;
				outline: none;
				padding: 0;

				&::after {
					border: none;
				}

				.btn-icon {
					width: 48rpx;
					height: 48rpx;
					margin-bottom: 6rpx;
				}

				.btn-text {
					font-size: 20rpx;
					color: #666;
					line-height: 1.2;
				}

				&.contact-btn,
				&.favorite-btn {
					background-color: transparent;
				}
			}
		}

		.buy-btn {
			width: 300rpx;
			height: 90rpx;
			line-height: 90rpx;
			background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
			color: #333;
			border-radius: 45rpx;
			font-size: 30rpx;
			font-weight: 500;
			margin-left: auto;
			/* 关键：自动占据左边剩余空间，推向右 */
			margin-right: 50rpx;
			border: none;
			/* 去掉边框 */
			outline: none;

			/* 去掉外轮廓 */
			&::after {
				border: none;
				/* 去掉uni-button默认的after边框 */
			}

		}

		.disabled-btn {
			width: 300rpx;
			height: 90rpx;
			line-height: 90rpx;
			background-color: #f5f5f5;
			color: #999;
			border-radius: 45rpx;
			font-size: 30rpx;
			margin-left: auto;
			/* 同样适用 */
			margin-right: 50rpx;
			border: none;
			/* 去掉边框 */
			outline: none;

			/* 去掉外轮廓 */
			&::after {
				border: none;
				/* 去掉uni-button默认的after边框 */
			}
		}
	}
</style>