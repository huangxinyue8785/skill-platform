<template>
	<view class="container">
		<!-- 加载中 -->
		<view class="loading" v-if="loading">
			<uni-load-more status="loading"></uni-load-more>
		</view>

		<!-- 订单详情 -->
		<scroll-view scroll-y class="content" v-else>
			<!-- 订单状态 -->
			<view class="status-card" :class="'status-' + order.status">
				<view class="status-icon">
					<uni-icons :type="statusIcon" size="40" :color="statusColor"></uni-icons>
				</view>
				<view class="status-info">
					<text class="status-text">{{ order.statusText }}</text>
					<text class="status-desc">{{ statusDesc }}</text>
				</view>
			</view>

			<!-- 订单信息 -->
			<view class="info-card">
				<view class="card-title">订单信息</view>
				<view class="info-row">
					<text class="label">订单号：</text>
					<text class="value">{{ order.id }}</text>
				</view>
				<view class="info-row">
					<text class="label">创建时间：</text>
					<text class="value">{{ formatDateTime(order.createTime) }}</text>
				</view>
				<view class="info-row" v-if="order.payTime">
					<text class="label">支付时间：</text>
					<text class="value">{{ formatDateTime(order.payTime) }}</text>
				</view>
				<view class="info-row" v-if="order.serviceTime">
					<text class="label">预约时间：</text>
					<text class="value">{{ formatDateTime(order.serviceTime) }}</text>
				</view>
			</view>

			<!-- 服务信息 -->
			<view class="service-card" @click="goToServiceDetail">
				<view class="card-title">服务信息</view>
				<view class="service-info">
					<image class="service-image" :src="getImageUrl(order.service?.images?.[0])" mode="aspectFill">
					</image>
					<view class="service-detail">
						<text class="service-title">{{ order.service?.title }}</text>
						<text class="service-price">￥{{ order.service?.price }}</text>
						<text class="service-category">{{ order.service?.category?.name }}</text>
					</view>
				</view>
			</view>

			<!-- 交易方信息（根据角色显示不同联系方式） -->
			<view class="contact-card">
				<view class="card-title">联系信息</view>
				<view class="info-row">
					<text class="label">{{ order.currentRole === 'buyer' ? '卖家' : '买家' }}：</text>
					<text
						class="value">{{ order.currentRole === 'buyer' ? order.seller?.nickname : order.buyer?.nickname }}</text>
				</view>
				<view class="info-row">
					<text class="label">联系方式：</text>
					<text class="value phone">{{ order.contact || '暂无' }}</text>
				</view>
				<view class="info-row" v-if="order.contactInfo">
					<text class="label">订单备注：</text>
					<text class="value">{{ order.contactInfo }}</text>
				</view>
				<view class="info-row" v-if="order.requirements">
					<text class="label">特殊要求：</text>
					<text class="value">{{ order.requirements }}</text>
				</view>
			</view>

			<!-- 底部占位 -->
			<view class="bottom-placeholder"></view>
		</scroll-view>

		<!-- 底部操作按钮 -->
		<view class="bottom-bar" v-if="!loading && order">
			<button v-if="order.status === 0 && order.currentRole === 'buyer'" class="action-btn pay-btn"
				@click="handlePay">
				去支付
			</button>
			<button v-if="order.status === 0 && order.currentRole === 'buyer'" class="action-btn cancel-btn"
				@click="handleCancel">
				取消订单
			</button>
			<!-- ✅ 新增：联系卖家按钮（买家支付后可以联系卖家） -->
			<button v-if="order.status === 1 && order.currentRole === 'buyer'" class="action-btn contact-btn"
				@click="handleContactSeller">
				联系卖家
			</button>
			<button v-if="order.status === 1 && order.currentRole === 'seller'" class="action-btn complete-btn"
				@click="handleComplete">
				标记完成
			</button>
			<button v-if="[2,3].includes(order.status)" class="action-btn delete-btn" @click="handleDelete">
				删除订单
			</button>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { getOrderDetail, cancelOrder, completeOrder, deleteOrder } from '@/api/order.js'
import { getImageUrl } from '@/utils/request.js'
import { checkLogin } from '@/utils/auth'

const orderId = ref('')
const order = ref({})
const loading = ref(true)
const fromPay = ref(false)
const autoCheckTimer = ref(null)

// 状态相关计算
const statusIcon = computed(() => {
	const status = order.value.status
	if (status === 0) return 'info'
	if (status === 1) return 'checkmarkempty'
	if (status === 2) return 'checkmarkempty'
	if (status === 3) return 'closeempty'
	return 'info'
})

const statusColor = computed(() => {
	const status = order.value.status
	if (status === 0) return '#e6a23c'
	if (status === 1) return '#3a7cb9'
	if (status === 2) return '#07c160'
	if (status === 3) return '#999'
	return '#999'
})

const statusDesc = computed(() => {
	const status = order.value.status
	if (status === 0) return '请尽快完成支付'
	if (status === 1) return '等待卖家确认完成'
	if (status === 2) return '交易完成，感谢使用'
	if (status === 3) return '订单已取消'
	return ''
})

onLoad((options) => {
	if (options.id) {
		orderId.value = options.id
		fromPay.value = options.fromPay === 'true'
		loadOrderDetail()
	} else {
		uni.showToast({
			title: '参数错误',
			icon: 'error'
		})
		setTimeout(() => uni.navigateBack(), 1500)
	}
})

// ✅ 页面卸载时只清理定时器，不强制跳转
onUnload(() => {
	// 清理定时器
	if (autoCheckTimer.value) {
		clearTimeout(autoCheckTimer.value)
		autoCheckTimer.value = null
	}
})

// 加载订单详情
const loadOrderDetail = async () => {
	try {
		loading.value = true
		const res = await getOrderDetail(orderId.value)
		order.value = res

		// 自动检测：如果订单是待支付状态，启动自动检测
		if (res.status === 0) {
			startAutoCheck()
		}
	} catch (err) {
		console.error('加载订单详情失败', err)
		uni.showToast({
			title: '加载失败',
			icon: 'none'
		})
	} finally {
		loading.value = false
	}
}

// 启动自动检测支付状态
const startAutoCheck = () => {
	if (autoCheckTimer.value) {
		clearTimeout(autoCheckTimer.value)
	}

	autoCheckTimer.value = setTimeout(async () => {
		try {
			const freshRes = await getOrderDetail(orderId.value)
			if (freshRes.status === 1) {
				order.value = freshRes
				uni.showToast({
					title: '支付成功！',
					icon: 'success'
				})
			}
		} catch (err) {
			console.error('自动检测失败', err)
		} finally {
			autoCheckTimer.value = null
		}
	}, 3000)
}

// 格式化时间
const formatDateTime = (time) => {
	if (!time) return '-'
	const date = new Date(time)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hour = String(date.getHours()).padStart(2, '0')
	const minute = String(date.getMinutes()).padStart(2, '0')
	return `${year}-${month}-${day} ${hour}:${minute}`
}

// 跳转服务详情
const goToServiceDetail = () => {
	if (order.value.service?.id) {
		uni.navigateTo({
			url: `/pages/service-detail/service-detail?id=${order.value.service.id}`
		})
	}
}

// 去支付
const handlePay = () => {
	uni.navigateTo({
		url: `/pages/pay/pay?orderId=${order.value.id}&amount=${order.value.amount}`
	})
}

// 取消订单
const handleCancel = async () => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要取消该订单吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({
						title: '操作中...'
					})
					await cancelOrder(order.value.id)
					uni.hideLoading()
					uni.showToast({
						title: '取消成功',
						icon: 'success'
					})
					loadOrderDetail()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({
			title: err.message || '操作失败',
			icon: 'none'
		})
	}
}

// 标记完成
const handleComplete = async () => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要标记该订单为已完成吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({
						title: '操作中...'
					})
					await completeOrder(order.value.id)
					uni.hideLoading()
					uni.showToast({
						title: '操作成功',
						icon: 'success'
					})
					loadOrderDetail()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({
			title: err.message || '操作失败',
			icon: 'none'
		})
	}
}

// 删除订单
const handleDelete = async () => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要删除该订单吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({
						title: '删除中...'
					})
					await deleteOrder(order.value.id)
					uni.hideLoading()
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					})
					// ✅ 删除后直接返回上一页，不强制跳转首页
					setTimeout(() => {
						uni.navigateBack()
					}, 1500)
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({
			title: err.message || '操作失败',
			icon: 'none'
		})
	}
}

// ✅ 新增：联系卖家
const handleContactSeller = () => {
	if (!order.value.seller?.id) {
		uni.showToast({ title: '无法获取卖家信息', icon: 'none' })
		return
	}
	
	const targetUserId = order.value.seller.id
	const targetNickname = order.value.seller.nickname || '卖家'
	const targetAvatar = order.value.seller.avatar || ''
	
	uni.navigateTo({
		url: `/pages/chat/chat?userId=${targetUserId}&nickname=${encodeURIComponent(targetNickname)}&avatar=${encodeURIComponent(targetAvatar)}`
	})
}
</script>

<style lang="scss" scoped>
	.container {
		min-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	.loading {
		padding: 100rpx 0;
		text-align: center;
	}

	.content {
		flex: 1;
		padding: 20rpx;
	}

	/* 状态卡片 */
	.status-card {
		background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		display: flex;
		align-items: center;
		gap: 20rpx;

		&.status-0 .status-text {
			color: #e6a23c;
		}

		&.status-1 .status-text {
			color: #3a7cb9;
		}

		&.status-2 .status-text {
			color: #07c160;
		}

		&.status-3 .status-text {
			color: #999;
		}

		.status-icon {
			width: 80rpx;
			height: 80rpx;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.status-info {
			flex: 1;

			.status-text {
				font-size: 32rpx;
				font-weight: 600;
				display: block;
				margin-bottom: 8rpx;
			}

			.status-desc {
				font-size: 24rpx;
				color: #999;
			}
		}
	}

	/* 通用卡片 */
	.info-card,
	.service-card,
	.contact-card {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
	}

	.card-title {
		font-size: 30rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 20rpx;
		padding-left: 16rpx;
		position: relative;

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

	.info-row {
		display: flex;
		padding: 12rpx 0;
		font-size: 28rpx;

		.label {
			width: 140rpx;
			color: #999;
			flex-shrink: 0;
		}

		.value {
			flex: 1;
			color: #333;

			&.phone {
				color: #3a7cb9;
				font-weight: 500;
			}
		}
	}

	/* 服务信息 */
	.service-info {
		display: flex;
		gap: 20rpx;

		.service-image {
			width: 160rpx;
			height: 160rpx;
			border-radius: 12rpx;
			background-color: #f0f0f0;
			flex-shrink: 0;
		}

		.service-detail {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.service-title {
				font-size: 28rpx;
				font-weight: 500;
				color: #333;
			}

			.service-price {
				font-size: 32rpx;
				color: #ff4d4f;
				font-weight: 600;
			}

			.service-category {
				font-size: 24rpx;
				color: #999;
			}
		}
	}

	.bottom-placeholder {
		height: 120rpx;
	}

	/* 底部按钮 */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: #fff;
		display: flex;
		justify-content: flex-end;
		gap: 20rpx;
		padding: 20rpx 30rpx;
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);

		.action-btn {
			min-width: 160rpx;
			height: 80rpx;
			line-height: 80rpx;
			font-size: 28rpx;
			border-radius: 40rpx;
			border: none;
			margin: 0;
			padding: 0 30rpx;

			&::after {
				border: none;
			}

			&.pay-btn {
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				color: #333;
			}

			&.cancel-btn,
			&.delete-btn {
				background-color: #ffefef;
				color: #f56c6c;
			}

			&.complete-btn {
				background-color: #e8f8e8;
				color: #07c160;
			}
			
			&.contact-btn {
				background-color: #e8f0fe;
				color: #3a7cb9;
			}
		}
	}
</style>