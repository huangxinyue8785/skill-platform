<template>
	<view class="container">
		<!-- 加载中 -->
		<view class="loading" v-if="loading">
			<uni-load-more status="loading"></uni-load-more>
		</view>

		<!-- 订单内容 -->
		<scroll-view scroll-y class="content" v-else>
			<!-- 服务信息卡片 -->
			<view class="service-card">
				<image :src="getImageUrl(service.images?.[0])" class="service-image" mode="aspectFill"></image>
				<view class="service-info">
					<view class="service-title">{{ service.title }}</view>
					<view class="service-price">￥{{ service.price }}</view>
					<view class="service-meta">
						<text>发布人：{{ service.user?.nickname }}</text>
					</view>
				</view>
			</view>

			<!-- 订单信息 -->
			<view class="order-card">
				<view class="card-title">订单信息</view>

				<!-- 联系方式（必填） -->
				<view class="form-item">
					<text class="label">联系方式 <text class="required">*</text></text>
					<input type="text" v-model="contactInfo" placeholder="请输入手机号/微信/QQ" class="input" />
				</view>

				<!-- 预约时间（可选） -->
				<view class="form-item">
					<text class="label">预约时间</text>
					<picker mode="date" @change="onDateChange" :value="serviceTime">
						<view class="selector">
							<text :class="['placeholder', { 'selected': serviceTime }]">
								{{ serviceTime || '请选择预约时间（可选）' }}
							</text>
							<uni-icons type="right"></uni-icons>
						</view>
					</picker>
				</view>

				<!-- 特殊要求（可选） -->
				<view class="form-item">
					<text class="label">特殊要求</text>
					<textarea v-model="requirements" placeholder="有什么特殊要求可以告诉我们（选填）" class="textarea" />
				</view>
			</view>

			<!-- 价格明细 -->
			<view class="price-card">
				<view class="price-row">
					<text>服务价格</text>
					<text>￥{{ service.price }}</text>
				</view>
				<view class="price-row total">
					<text>实付金额</text>
					<text class="total-price">￥{{ service.price }}</text>
				</view>
			</view>

			<!-- 底部占位 -->
			<view class="bottom-placeholder"></view>
		</scroll-view>

		<!-- 底部提交栏 -->
		<view class="bottom-bar">
			<view class="total-info">
				<text class="total-label">实付：</text>
				<text class="total-amount">￥{{ service.price }}</text>
			</view>
			<button class="submit-btn" @click="handleSubmit" :disabled="submitting">
				{{ submitting ? '提交中...' : '提交订单' }}
			</button>
		</view>
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
	getServiceDetail
} from '@/api/service.js'
import {
	createOrder
} from '@/api/order.js'
import {
	useUserStore
} from '@/stores/user'
import { checkLogin } from '@/utils/auth'  // 导入 auth.js 的 checkLogin
import { getImageUrl } from '@/utils/request.js'  // 加上这行

const userStore = useUserStore()

const serviceId = ref('')
const service = ref({})
const loading = ref(true)
const submitting = ref(false)

// 表单数据
const contactInfo = ref('')
const serviceTime = ref('')
const requirements = ref('')

// 加载服务详情
onLoad((options) => {
	if (options.serviceId) {
		serviceId.value = options.serviceId
		loadServiceDetail()
		if (userStore.userInfo?.phone) {
			contactInfo.value = userStore.userInfo.phone
		}
	} else {
		uni.showToast({ title: '参数错误', icon: 'error' })
		setTimeout(() => uni.navigateBack(), 1500)
	}
})

const loadServiceDetail = async () => {
	try {
		const res = await getServiceDetail(serviceId.value)
		service.value = res
	} catch (err) {
		console.error('加载服务失败', err)
		uni.showToast({ title: '加载失败', icon: 'none' })
	} finally {
		loading.value = false
	}
}

// 选择日期
const onDateChange = (e) => {
	serviceTime.value = e.detail.value
}

// 表单验证
const validateForm = () => {
	if (!contactInfo.value.trim()) {
		uni.showToast({ title: '请输入联系方式', icon: 'none' })
		return false
	}
	return true
}

// 提交订单
const handleSubmit = async () => {
	if (!validateForm()) return

	// 检查登录
	if (!checkLogin()) return  // 使用 auth.js 的 checkLogin

	submitting.value = true
	uni.showLoading({ title: '创建订单中...' })

	try {
		const orderData = {
			service_id: serviceId.value,
			contact_info: contactInfo.value.trim(),
			requirements: requirements.value.trim() || undefined,
			service_time: serviceTime.value || undefined
		}
		console.log('创建订单参数：', orderData)
		const order = await createOrder(orderData)
		uni.hideLoading()
		uni.navigateTo({
			url: `/pages/pay/pay?orderId=${order.id}&amount=${order.amount}`
		})
	} catch (err) {
		console.error('创建订单失败', err)
		uni.hideLoading()
		uni.showToast({ title: err.message || '创建订单失败', icon: 'none' })
	} finally {
		submitting.value = false
	}
}
</script>

<style lang="scss" scoped>
	.container {
		width: 100vw;
		min-height: 100vh;
		background-color: #f5f5f5;
		overflow-x: hidden;
	}

	.loading {
		padding: 100rpx 0;
	}

	.content {
		padding: 20rpx;
		width: 100%;
		box-sizing: border-box;
	}

	.service-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		display: flex;

		.service-image {
			width: 160rpx;
			height: 160rpx;
			border-radius: 12rpx;
			margin-right: 20rpx;
			flex-shrink: 0;
		}

		.service-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: space-between;

			.service-title {
				font-size: 32rpx;
				font-weight: 500;
				color: #333;
				margin-bottom: 10rpx;
			}

			.service-price {
				font-size: 36rpx;
				color: #ff4d4f;
				font-weight: 600;
				margin-bottom: 10rpx;
			}

			.service-meta {
				font-size: 24rpx;
				color: #999;
			}
		}
	}

	.order-card,
	.price-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;

		.card-title {
			font-size: 30rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 30rpx;
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
	}

	.form-item {
		margin-bottom: 30rpx;

		.label {
			font-size: 28rpx;
			color: #333;
			display: block;
			margin-bottom: 16rpx;

			.required {
				color: #ff4d4f;
			}
		}

		.input {
			height: 80rpx;
			background-color: #f5f5f5;
			border-radius: 12rpx;
			padding: 0 20rpx;
			font-size: 28rpx;
		}

		.textarea {
			width: 100%;
			height: 160rpx;
			background-color: #f5f5f5;
			border-radius: 12rpx;
			padding: 20rpx;
			font-size: 28rpx;
			box-sizing: border-box;
		}

		.selector {
			height: 80rpx;
			background-color: #f5f5f5;
			border-radius: 12rpx;
			padding: 0 20rpx;
			display: flex;
			align-items: center;
			justify-content: space-between;

			.placeholder {
				font-size: 28rpx;
				color: #999;

				&.selected {
					color: #333;
				}
			}
		}
	}

	.price-row {
		display: flex;
		justify-content: space-between;
		padding: 20rpx 0;
		font-size: 28rpx;
		color: #666;

		&.total {
			margin-top: 20rpx;
			padding-top: 30rpx;
			border-top: 2rpx solid #f0f0f0;
			font-size: 32rpx;
			font-weight: 500;

			.total-price {
				color: #ff4d4f;
				font-size: 36rpx;
			}
		}
	}

	.bottom-placeholder {
		height: 120rpx;
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
		// justify-content: space-between;
		padding: 20rpx 20rpx 10rpx 20rpx;  /* 改成左右都有内边距 */
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
		box-sizing: content-box;
		z-index: 100;
	
		.total-info {
			.total-label {
				font-size: 28rpx;
				color: #666;
			}
	
			.total-amount {
				font-size: 40rpx;
				font-weight: 600;
				color: #ff4d4f;
				margin-left: 8rpx;
			}
		}
	
		.submit-btn {
			width: 300rpx;
			height: 90rpx;
			line-height: 80rpx;
			background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
			color: #333;
			border-radius: 50rpx;
			font-size: 30rpx;
			font-weight: 500;
			border: none;
			margin-left: auto;  /* 自动靠右 */
			margin-right: 50rpx;
	
			&::after {
				border: none;
			}
	
			&[disabled] {
				opacity: 0.5;
			}
		}
	}
</style>