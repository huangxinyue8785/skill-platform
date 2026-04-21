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

				<!-- 联系方式（必填）- 不可编辑，样式与发布页一致 -->
				<view class="form-item">
					<text class="label">联系方式 <text class="required">*</text></text>
					<view class="selector" style="background-color: #f5f5f5;">
						<text :class="['placeholder', 'contact-placeholder', {'selected': contactInfo}]">
							{{ contactInfo || '请先在个人中心设置手机号' }}
						</text>
					</view>
				</view>

				<!-- 预约日期 -->
				<view class="form-item">
					<text class="label">预约日期</text>
					<picker mode="date" @change="onDateChange" :value="serviceDate" :start="minDate">
						<view class="selector">
							<text :class="['placeholder', { 'selected': serviceDate }]">
								{{ serviceDate || '请选择预约日期（可选）' }}
							</text>
							<uni-icons type="right"></uni-icons>
						</view>
					</picker>
				</view>

				<!-- 预约时间 -->
				<view class="form-item" v-if="serviceDate">
					<text class="label">具体时间</text>
					<picker mode="time" @change="onTimeChange" :value="serviceTime" :start="minTime">
						<view class="selector">
							<text :class="['placeholder', { 'selected': serviceTime }]">
								{{ serviceTime || '请选择具体时间（可选）' }}
							</text>
							<uni-icons type="right"></uni-icons>
						</view>
					</picker>
				</view>

				<!-- 特殊要求（可选）- 禁止输入表情包 -->
				<view class="form-item">
					<text class="label">特殊要求</text>
					<textarea 
						v-model="requirements" 
						placeholder="有什么特殊要求可以告诉我们（选填）" 
						class="textarea"
						@input="onRequirementsInput"
					/>
					<!-- ✅ 显示表情包错误提示 -->
					<view v-if="emojiError" class="error-tip">{{ emojiError }}</view>
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getServiceDetail } from '@/api/service.js'
import { createOrder } from '@/api/order.js'
import { useUserStore } from '@/stores/user'
import { checkLogin } from '@/utils/auth'
import { getImageUrl } from '@/utils/request.js'

const userStore = useUserStore()

const serviceId = ref('')
const service = ref({})
const loading = ref(true)
const submitting = ref(false)

// 表单数据
const contactInfo = ref('')
const serviceDate = ref('')
const serviceTime = ref('')
const requirements = ref('')

// ✅ 表情包错误提示
const emojiError = ref('')

// 计算最小日期（今天）
const minDate = computed(() => {
	const today = new Date()
	const year = today.getFullYear()
	const month = String(today.getMonth() + 1).padStart(2, '0')
	const day = String(today.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
})

// 计算最小时间
const minTime = computed(() => {
	const today = new Date()
	const todayStr = minDate.value
	
	if (serviceDate.value === todayStr) {
		const hour = String(today.getHours()).padStart(2, '0')
		const minute = String(today.getMinutes()).padStart(2, '0')
		return `${hour}:${minute}`
	}
	return '00:00'
})

// ✅ 检测是否包含表情符号
const hasEmoji = (text) => {
	if (!text) return false
	const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{FE0F}]|[\u{200D}]|[\u{20E3}]/gu
	return emojiRegex.test(text)
}

// 输入特殊要求时的处理
const onRequirementsInput = (e) => {
	const value = e.detail.value
	
	// ✅ 检测是否有表情包
	if (hasEmoji(value)) {
		emojiError.value = '暂不支持输入表情符号，请删除后再提交'
		requirements.value = value  // 保留原值，让用户自己删除
	} else {
		emojiError.value = ''
		requirements.value = value
	}
}

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
	const selectedDate = e.detail.value
	
	if (selectedDate < minDate.value) {
		uni.showToast({ title: '预约日期不能早于今天', icon: 'none' })
		return
	}
	
	serviceDate.value = selectedDate
	serviceTime.value = ''
}

// 选择时间
const onTimeChange = (e) => {
	const selectedTime = e.detail.value
	const todayStr = minDate.value
	
	if (serviceDate.value === todayStr) {
		const now = new Date()
		const currentHour = String(now.getHours()).padStart(2, '0')
		const currentMinute = String(now.getMinutes()).padStart(2, '0')
		const currentTime = `${currentHour}:${currentMinute}`
		
		if (selectedTime < currentTime) {
			uni.showToast({ title: '预约时间不能早于当前时间', icon: 'none' })
			return
		}
	}
	
	serviceTime.value = selectedTime
}

// ✅ 表单验证（阻止提交）
const validateForm = () => {
	if (!contactInfo.value.trim()) {
		uni.showToast({ title: '请输入联系方式', icon: 'none' })
		return false
	}
	
	// ✅ 检查是否包含表情包
	if (hasEmoji(requirements.value)) {
		emojiError.value = '特殊要求中不能包含表情符号'
		uni.showToast({ title: '特殊要求中不能包含表情符号', icon: 'none' })
		return false
	}
	
	emojiError.value = ''
	return true
}

// 获取完整的预约时间
const getFullServiceTime = () => {
	if (!serviceDate.value) return ''
	if (!serviceTime.value) return serviceDate.value
	return `${serviceDate.value} ${serviceTime.value}`
}

// 提交订单
const handleSubmit = async () => {
	if (!validateForm()) return
	if (!checkLogin()) return

	submitting.value = true
	uni.showLoading({ title: '创建订单中...' })

	try {
		const orderData = {
			service_id: serviceId.value,
			contact_info: contactInfo.value.trim(),
			requirements: requirements.value.trim() || undefined,
			service_time: getFullServiceTime() || undefined
		}
		const order = await createOrder(orderData)
		uni.hideLoading()
		
		uni.redirectTo({
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
		
		// ✅ 错误提示样式
		.error-tip {
			font-size: 24rpx;
			color: #ff4d4f;
			margin-top: 10rpx;
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
		padding: 20rpx 20rpx 10rpx 20rpx;
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
			margin-left: auto;
			margin-right: 50rpx;
	
			&::after {
				border: none;
			}
	
			&[disabled] {
				opacity: 0.5;
			}
		}
	}
	
	// ✅ 联系方式文字颜色淡一点
	.contact-placeholder {
		color: #bbb !important;
		
		&.selected {
			color: #bbb !important;
		}
	}
</style>