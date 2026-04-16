<template>
	<view class="container">
		<!-- 加载中 -->
		<view class="loading" v-if="loading">
			<uni-load-more status="loading"></uni-load-more>
		</view>

		<!-- 支付内容 -->
		<view class="content" v-else>
			<!-- 订单金额卡片 -->
			<view class="amount-card">
				<text class="label">订单金额</text>
				<text class="amount">￥{{ amount }}</text>
			</view>

			<!-- 支付方式 -->
			<view class="pay-methods">
				<view class="section-title">支付方式</view>

				<!-- 支付宝支付选项 -->
				<view class="method-item" :class="{ active: payMethod === 'alipay' }" @click="selectMethod('alipay')">
					<view class="method-left">
						<uni-icons type="wallet" size="24" color="#1677ff"></uni-icons>
						<text>支付宝支付</text>
					</view>
					<view class="method-right">
						<text class="recommend" v-if="payMethod === 'alipay'">推荐</text>
						<uni-icons type="checkmarkempty" size="20" color="#1677ff"
							v-if="payMethod === 'alipay'"></uni-icons>
					</view>
				</view>

				<!-- 微信支付选项 -->
				<view class="method-item" :class="{ active: payMethod === 'wechat' }" @click="selectMethod('wechat')">
					<view class="method-left">
						<uni-icons type="weixin" size="24" color="#07c160"></uni-icons>
						<text>微信支付</text>
					</view>
					<view class="method-right">
						<uni-icons type="checkmarkempty" size="20" color="#07c160"
							v-if="payMethod === 'wechat'"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 订单信息 -->
			<view class="order-info">
				<view class="info-row">
					<text class="label">订单号</text>
					<text class="value">{{ orderId }}</text>
				</view>
				<view class="info-row">
					<text class="label">创建时间</text>
					<text class="value">{{ createTime }}</text>
				</view>
			</view>
		</view>

		<!-- 底部按钮 -->
		<view class="bottom-bar">
			<!-- 支付宝支付：显示两个按钮（支付后切换） -->
			<template v-if="payMethod === 'alipay'">
				<button v-if="!hasCopiedLink" class="pay-btn ali-pay" @click="handlePay" :disabled="paying">
					{{ paying ? '获取链接中...' : '确认支付' }}
				</button>
				<template v-else>
					<button class="copy-btn" @click="copyLink" :disabled="copying">
						{{ copying ? '复制中...' : '复制支付链接' }}
					</button>
					<button class="confirm-btn" @click="handleConfirmPay" :disabled="confirming">
						{{ confirming ? '确认中...' : '我已支付完成' }}
					</button>
				</template>
			</template>

			<!-- 微信支付：显示单个按钮 -->
			<template v-else>
				<button class="pay-btn wx-pay" @click="handleWechatPay" :disabled="paying">
					{{ paying ? '支付中...' : '确认支付' }}
				</button>
			</template>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail, payOrder ,queryPayStatus } from '@/api/order.js'
import { checkLogin } from '@/utils/auth'

const orderId = ref('')
const amount = ref(0)
const createTime = ref('')
const loading = ref(true)
const paying = ref(false)
const copying = ref(false)
const confirming = ref(false)
const payMethod = ref('alipay')
const paymentUrl = ref('')
const hasCopiedLink = ref(false)

onLoad((options) => {
	if (!checkLogin()) return

	if (options.orderId) {
		orderId.value = options.orderId
		amount.value = options.amount || 0
		loadOrderDetail()
	} else {
		uni.showToast({
			title: '参数错误',
			icon: 'error'
		})
		setTimeout(() => uni.navigateBack(), 1500)
	}
})

// 加载订单详情
const loadOrderDetail = async () => {
	try {
		const res = await getOrderDetail(orderId.value)
		if (res.createTime) {
			const date = new Date(res.createTime)
			createTime.value = formatTime(date)
		}
		// 如果订单已经支付，直接跳转
		if (res.status === 1) {
			uni.showToast({
				title: '订单已支付',
				icon: 'success'
			})
			setTimeout(() => {
				// ✅ 改成 redirectTo
				uni.redirectTo({
					url: `/pages/order/detail?id=${orderId.value}&fromPay=true`
				})
			}, 1500)
		}
	} catch (err) {
		console.error('加载订单失败', err)
	} finally {
		loading.value = false
	}
}

// 选择支付方式
const selectMethod = (method) => {
	if (payMethod.value === method) return
	payMethod.value = method
	// 切换支付方式时重置状态
	hasCopiedLink.value = false
	paymentUrl.value = ''
}

// 支付宝支付：获取支付链接
const handlePay = async () => {
	paying.value = true
	uni.showLoading({
		title: '正在获取支付链接...'
	})

	try {
		const res = await payOrder(orderId.value)
		uni.hideLoading()

		paymentUrl.value = res.paymentUrl
		hasCopiedLink.value = true
		paying.value = false

		// 自动弹出提示，让用户复制链接
		uni.showModal({
			title: '支付提示',
			content: '请复制链接到浏览器打开完成支付，支付完成后请点击"我已支付完成"按钮。',
			confirmText: '复制链接',
			cancelText: '稍后复制',
			success: (modalRes) => {
				if (modalRes.confirm) {
					copyLink()
				}
			}
		})

	} catch (err) {
		console.error('获取支付链接失败', err)
		uni.hideLoading()
		uni.showToast({
			title: err.message || '获取支付链接失败',
			icon: 'none'
		})
		paying.value = false
	}
}

// 复制支付链接
const copyLink = async () => {
	if (!paymentUrl.value) {
		uni.showToast({
			title: '链接不存在，请重新获取',
			icon: 'none'
		})
		return
	}

	copying.value = true

	try {
		await uni.setClipboardData({
			data: paymentUrl.value
		})
		uni.showToast({
			title: '链接已复制',
			icon: 'success',
			duration: 2000
		})
	} catch (err) {
		console.error('复制失败', err)
		uni.showToast({
			title: '复制失败',
			icon: 'none'
		})
	} finally {
		copying.value = false
	}
}

// 手动确认支付完成
const handleConfirmPay = async () => {
	confirming.value = true
	uni.showLoading({
		title: '正在确认支付状态...'
	})

	try {
		const res = await queryPayStatus(orderId.value)
		uni.hideLoading()

		if (res.paid) {
			uni.showToast({
				title: '支付成功！',
				icon: 'success'
			})
			setTimeout(() => {
				// ✅ 改成 redirectTo，并加上 fromPay 参数
				uni.redirectTo({
					url: `/pages/order/detail?id=${orderId.value}&fromPay=true`
				})
			}, 1500)
		} else {
			uni.showModal({
				title: '提示',
				content: '暂未检测到支付成功，请确认是否已完成支付？\n\n如果已完成支付，请稍等几秒后重试；如果未完成，请先完成支付。',
				confirmText: '重新确认',
				cancelText: '返回',
				success: (modalRes) => {
					if (modalRes.confirm) {
						handleConfirmPay()
					}
				}
			})
		}
	} catch (err) {
		uni.hideLoading()
		console.error('确认支付失败', err)
		uni.showToast({
			title: '确认失败，请稍后重试',
			icon: 'none'
		})
	} finally {
		confirming.value = false
	}
}

// 微信支付（暂未接入）
const handleWechatPay = async () => {
	uni.showToast({
		title: '微信支付暂未接入',
		icon: 'none'
	})
}

// 格式化时间
const formatTime = (date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hour = String(date.getHours()).padStart(2, '0')
	const minute = String(date.getMinutes()).padStart(2, '0')
	return `${year}-${month}-${day} ${hour}:${minute}`
}
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.loading {
	padding: 100rpx 0;
}

.content {
	padding: 20rpx;
}

.amount-card {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 40rpx;
	margin-bottom: 20rpx;
	text-align: center;

	.label {
		font-size: 28rpx;
		color: #666;
		display: block;
		margin-bottom: 20rpx;
	}

	.amount {
		font-size: 80rpx;
		font-weight: 600;
		color: #ff4d4f;
	}
}

.pay-methods {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;

	.section-title {
		font-size: 30rpx;
		font-weight: 500;
		color: #333;
		margin-bottom: 30rpx;
	}

	.method-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx 0;
		transition: all 0.2s;

		&:last-child {
			border-bottom: none;
		}

		&.active {
			background-color: #f8f8f8;
			margin: 0 -20rpx;
			padding: 30rpx 20rpx;
			border-radius: 12rpx;
			border-bottom: none;
		}

		.method-left {
			display: flex;
			align-items: center;
			gap: 20rpx;

			text {
				font-size: 30rpx;
				color: #333;
			}
		}

		.method-right {
			display: flex;
			align-items: center;
			gap: 8rpx;

			.recommend {
				font-size: 24rpx;
				color: #1677ff;
				background-color: #e6f7ff;
				padding: 4rpx 12rpx;
				border-radius: 20rpx;
			}
		}
	}
}

.order-info {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;

	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 20rpx 0;

		.label {
			font-size: 28rpx;
			color: #999;
		}

		.value {
			font-size: 28rpx;
			color: #333;
		}
	}
}

.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 20rpx 30rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	background-color: #fff;
	box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
	display: flex;
	gap: 20rpx;

	.copy-btn {
		flex: 1;
		height: 90rpx;
		line-height: 90rpx;
		border-radius: 45rpx;
		font-size: 30rpx;
		font-weight: 500;
		background-color: #f5f5f5;
		color: #666;
		border: none;

		&::after {
			border: none;
		}

		&[disabled] {
			opacity: 0.5;
		}
	}

	.confirm-btn {
		flex: 2;
		height: 90rpx;
		line-height: 90rpx;
		border-radius: 45rpx;
		font-size: 30rpx;
		font-weight: 500;
		background: linear-gradient(135deg, #07c160, #2ae57b);
		color: #fff;
		border: none;

		&::after {
			border: none;
		}

		&[disabled] {
			opacity: 0.5;
		}
	}

	.pay-btn {
		flex: 1;
		height: 90rpx;
		line-height: 90rpx;
		border-radius: 45rpx;
		font-size: 32rpx;
		font-weight: 500;
		color: #fff;
		border: none;

		&.ali-pay {
			background: linear-gradient(135deg, #1677ff, #4096ff);
		}

		&.wx-pay {
			background: linear-gradient(135deg, #07c160, #2ae57b);
		}

		&[disabled] {
			opacity: 0.5;
		}

		&::after {
			border: none;
		}
	}
}
</style>