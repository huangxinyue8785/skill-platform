<template>
	<view class="container">
		<!-- 订单列表 - 滚动区域，包含头部和卡片 -->
		<scroll-view 
			scroll-y 
			class="order-list"
			refresher-enabled
			:refresher-triggered="refreshing" 
			@refresherrefresh="onRefresh"
			@scrolltolower="loadMore"
		>
			<!-- 头部区域 - 放在 scroll-view 内部，会随页面滚动 -->
			<view class="header">
				<!-- 角色切换 tabs -->
				<view class="role-tabs">
					<view class="role-tab" :class="{ active: currentRole === 'buyer' }" @click="switchRole('buyer')">
						我是买家
					</view>
					<view class="role-tab" :class="{ active: currentRole === 'seller' }" @click="switchRole('seller')">
						我是卖家
					</view>
				</view>

				<!-- 状态筛选 tabs -->
				<view class="status-tabs">
					<view v-for="tab in statusList" :key="tab.value" class="tab-item"
						:class="{ active: currentStatus === tab.value }" @click="switchStatus(tab.value)">
						{{ tab.name }}
					</view>
				</view>
			</view>

			<!-- 内容区域 -->
			<view class="list-content">
				<!-- 订单卡片 -->
				<view v-for="order in orderList" :key="order.id" class="order-card" @click="goToOrderDetail(order.id)">
					<!-- 订单头部：订单号 + 状态 -->
					<view class="order-header">
						<text class="order-no">订单号：{{ order.id }}</text>
						<text class="order-status" :class="'status-' + order.status">{{ order.statusText }}</text>
					</view>

					<!-- 服务信息 -->
					<view class="service-info">
						 <image class="service-image" :src="getImageUrl(order.service?.images?.[0])" mode="aspectFill" lazy-load></image>
						<view class="service-content">
							<text class="service-title">{{ order.service?.title }}</text>
							<!-- 描述单独一行，超出省略 -->
							<text class="service-desc">{{ order.service?.description || '暂无描述' }}</text>
							<!-- 价格和交易方信息放在同一行 -->
							<view class="price-trader-row">
								<text class="service-price">￥{{ order.amount }}</text>
								<view class="trader-info">
									<image class="trader-avatar" :src="getImageUrl(currentRole === 'buyer' ? order.seller?.avatar : order.buyer?.avatar)" mode="aspectFill"></image>
									<text class="trader-name">
										{{ currentRole === 'buyer' ? order.seller?.nickname : order.buyer?.nickname }}
									</text>
								</view>
							</view>
						</view>
					</view>

					<!-- 底部操作按钮 -->
					<view class="order-footer" @click.stop>
						<!-- 买家操作 -->
						<template v-if="currentRole === 'buyer'">
							<button v-if="order.status === 0" class="action-btn pay-btn" @click="handlePay(order)">去支付</button>
							<button v-if="order.status === 0" class="action-btn cancel-btn" @click="handleCancel(order)">取消订单</button>
							<button v-if="order.status === 1" class="action-btn contact-btn" open-type="contact">联系卖家</button>
							<button v-if="order.status === 2" class="action-btn comment-btn" @click="handleComment(order)">去评价</button>
						</template>

						<!-- 卖家操作 -->
						<template v-else>
							<button v-if="order.status === 1" class="action-btn complete-btn" @click="handleComplete(order)">标记完成</button>
							<button v-if="order.status === 1" class="action-btn contact-btn" open-type="contact">联系买家</button>
						</template>

						<!-- 通用操作：删除订单 -->
						<button v-if="[2,3].includes(order.status)" class="action-btn delete-btn" @click="handleDelete(order)">删除订单</button>
					</view>
				</view>

				<!-- 加载更多 -->
				<uni-load-more v-if="orderList.length > 0" :status="loadMoreStatus"></uni-load-more>

				<!-- 空状态 -->
				<view class="empty-state" v-if="orderList.length === 0 && !loading">
					<image src="/static/empty.png" mode="aspectFit"></image>
					<text>暂无订单</text>
					<button class="browse-btn" @click="goToHome">去首页逛逛</button>
				</view>
				
				<!-- 底部安全区占位 -->
				<view class="safe-bottom"></view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getImageUrl } from '@/utils/request.js'
import { getOrderList, cancelOrder, completeOrder, deleteOrder } from '@/api/order.js'
import { checkLogin } from '@/utils/auth'

// ==================== 状态定义 ====================
const currentRole = ref('buyer')
const currentStatus = ref('')

const statusList = ref([
	{ name: '全部', value: '' },
	{ name: '待支付', value: 0 },
	{ name: '已支付', value: 1 },
	{ name: '已完成', value: 2 },
	{ name: '已取消', value: 3 }
])

const orderList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadMoreStatus = ref('more')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// ==================== 刷新列表 ====================
const refreshList = () => {
	page.value = 1
	orderList.value = []
	loadMoreStatus.value = 'more'
	loadOrders(true)
}

// ==================== 切换角色 ====================
const switchRole = (role) => {
	if (currentRole.value === role) return
	currentRole.value = role
	currentStatus.value = ''
	refreshList()
}

// ==================== 切换状态 ====================
const switchStatus = (status) => {
	if (currentStatus.value === status) return
	currentStatus.value = status
	refreshList()
}

// ==================== 加载更多 ====================
const loadMore = () => {
	if (loadMoreStatus.value === 'more' && !loading.value) {
		loadOrders()
	}
}

// ==================== 加载订单列表 ====================
const loadOrders = async (isRefresh = false) => {
	if (loading.value) return

	loading.value = true
	if (orderList.value.length > 0 && !isRefresh) {
		loadMoreStatus.value = 'loading'
	}

	try {
		const params = {
			page: isRefresh ? 1 : page.value,
			pageSize: pageSize.value,
			role: currentRole.value
		}

		if (currentStatus.value !== '') {
			params.status = currentStatus.value
		}

		const res = await getOrderList(params)

		if (isRefresh) {
			orderList.value = res.list
			page.value = res.list.length > 0 ? 2 : 1
		} else {
			orderList.value = [...orderList.value, ...res.list]
			if (res.list.length === pageSize.value) {
				page.value++
			}
		}

		total.value = res.total

		// 更新加载更多状态
		if (orderList.value.length >= res.total) {
			loadMoreStatus.value = 'noMore'
		} else {
			loadMoreStatus.value = 'more'
		}

	} catch (err) {
		console.error('加载订单失败', err)
		loadMoreStatus.value = 'more'
		uni.showToast({ title: '加载失败', icon: 'none' })
	} finally {
		loading.value = false
		refreshing.value = false
	}
}

// ==================== 下拉刷新 ====================
const onRefresh = () => {
	refreshing.value = true
	refreshList()
}

// ==================== 页面加载 ====================
onLoad(() => {
	if (!checkLogin()) return
	refreshList()
})

onShow(() => {
	if (!checkLogin()) return
	refreshList()
})

// ==================== 跳转到订单详情 ====================
const goToOrderDetail = (id) => {
	uni.navigateTo({ url: `/pages/order/detail?id=${id}` })
}

// ==================== 去支付 ====================
const handlePay = (order) => {
	uni.navigateTo({ url: `/pages/pay/pay?orderId=${order.id}&amount=${order.amount}` })
}

// ==================== 取消订单 ====================
const handleCancel = async (order) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要取消该订单吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '操作中...' })
					await cancelOrder(order.id)
					uni.hideLoading()
					uni.showToast({ title: '取消成功', icon: 'success' })
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	}
}

// ==================== 标记完成 ====================
const handleComplete = async (order) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要标记该订单为已完成吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '操作中...' })
					await completeOrder(order.id)
					uni.hideLoading()
					uni.showToast({ title: '操作成功', icon: 'success' })
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	}
}

// ==================== 删除订单 ====================
const handleDelete = async (order) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要删除该订单吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '删除中...' })
					await deleteOrder(order.id)
					uni.hideLoading()
					uni.showToast({ title: '删除成功', icon: 'success' })
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	}
}

// ==================== 去评价 ====================
const handleComment = (order) => {
	uni.showToast({ title: '开发中', icon: 'none' })
}

// ==================== 去首页 ====================
const goToHome = () => {
	uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>

.container {
	height: 95vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* 订单列表 - 滚动区域 */
.order-list {
	flex: 1;
	height: 0;
}

/* 列表内容区域 */
.list-content {
	padding: 20rpx;
	padding-bottom: 0;
	box-sizing: border-box;
}

/* 头部区域 */
.header {
	background-color: #fff;
	margin-bottom: 20rpx;
}

.role-tabs {
	display: flex;
	padding: 20rpx 30rpx;
	border-bottom: 2rpx solid #f0f0f0;

	.role-tab {
		flex: 1;
		text-align: center;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 30rpx;
		color: #666;
		position: relative;

		&.active {
			color: #333;
			font-weight: 500;

			&::after {
				content: '';
				position: absolute;
				bottom: -10rpx;
				left: 50%;
				transform: translateX(-50%);
				width: 80rpx;
				height: 5rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				border-radius: 2rpx;
			}
		}
	}
}

.status-tabs {
	display: flex;
	padding: 20rpx 30rpx;
	border-bottom: 2rpx solid #f0f0f0;

	.tab-item {
		flex: 1;
		text-align: center;
		height: 60rpx;
		line-height: 60rpx;
		font-size: 26rpx;
		color: #666;
		position: relative;

		&.active {
			color: #333;
			font-weight: 500;

			&::after {
				content: '';
				position: absolute;
				bottom: -10rpx;
				left: 50%;
				transform: translateX(-50%);
				width: 50rpx;
				height: 5rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				border-radius: 2rpx;
			}
		}
	}
}

.order-card {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

	.order-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;

		.order-no {
			font-size: 24rpx;
			color: #999;
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			margin-right: 16rpx;
		}

		.order-status {
			font-size: 22rpx;
			padding: 4rpx 16rpx;
			border-radius: 30rpx;
			flex-shrink: 0;

			&.status-0 { color: #e6a23c; background-color: #fff3e0; }
			&.status-1 { color: #3a7cb9; background-color: #e8f0fe; }
			&.status-2 { color: #07c160; background-color: #e8f8e8; }
			&.status-3 { color: #999; background-color: #f5f5f5; }
		}
	}

	.service-info {
		display: flex;
		margin-bottom: 16rpx;

		.service-image {
			width: 140rpx;
			height: 140rpx;
			border-radius: 12rpx;
			margin-right: 16rpx;
			background-color: #f0f0f0;
			flex-shrink: 0;
		}

		.service-content {
			flex: 1;
			display: flex;
			flex-direction: column;
			min-width: 0;

			.service-title {
				font-size: 28rpx;
				color: #333;
				font-weight: 500;
				margin-bottom: 6rpx;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.service-desc {
				font-size: 24rpx;
				color: #999;
				margin-bottom: 8rpx;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.price-trader-row {
				display: flex;
				justify-content: space-between;
				align-items: center;

				.service-price {
					font-size: 32rpx;
					color: #ff4d4f;
					font-weight: 600;
				}

				.trader-info {
					display: flex;
					align-items: center;
					gap: 6rpx;
					flex-shrink: 0;

					.trader-avatar {
						width: 32rpx;
						height: 32rpx;
						border-radius: 50%;
						flex-shrink: 0;
					}

					.trader-name {
						font-size: 24rpx;
						color: #666;
						max-width: 120rpx;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
				}
			}
		}
	}

	.order-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12rpx;

		.action-btn {
			min-width: 100rpx;
			height: 52rpx;
			line-height: 52rpx;
			font-size: 22rpx;
			border-radius: 26rpx;
			border: none;
			margin: 0;
			padding: 0 16rpx;

			&::after { border: none; }
			&.pay-btn { background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%); color: #333; }
			&.cancel-btn, &.delete-btn { background-color: #ffefef; color: #f56c6c; }
			&.contact-btn { background-color: #e8f0fe; color: #3a7cb9; }
			&.complete-btn { background-color: #e8f8e8; color: #07c160; }
			&.comment-btn { background-color: #fff3e0; color: #e6a23c; }
		}
	}
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 0;

	image {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 20rpx;
	}

	text {
		font-size: 28rpx;
		color: #999;
		margin-bottom: 40rpx;
	}

	.browse-btn {
		width: 200rpx;
		height: 70rpx;
		line-height: 70rpx;
		background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
		color: #333;
		border-radius: 35rpx;
		font-size: 28rpx;
		margin: 0 auto;

		&::after { border: none; }
	}
}

/* 底部安全区占位 */
.safe-bottom {
	height: env(safe-area-inset-bottom);
	width: 100%;
}
</style>