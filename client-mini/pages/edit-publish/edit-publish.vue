<template>
	<view class="container">
		
		<!-- 编辑模式：无背景，距离顶部更近 -->
		<publish-form 
			ref="publishFormRef" 
			:is-edit="true" 
			:service-id="serviceId"
			:class="'edit-mode'"
		></publish-form>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PublishForm from '@/components/publish-form/publish-form.vue'

const serviceId = ref('')
const publishFormRef = ref()

onLoad((options) => {
	if (options.id) {
		serviceId.value = options.id
	}
})

// 不需要任何操作，子组件自己处理跳转
</script>

<style lang="scss" scoped>
.container {
	min-height: 100vh;
	background-color: #fff;
}

.custom-nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 88rpx;
	background-color: #fff;
	display: flex;
	align-items: center;
	padding: 0 20rpx;
	z-index: 100;
	border-bottom: 1rpx solid #f0f0f0;
	
	.nav-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
		
		.nav-title {
			font-size: 32rpx;
			font-weight: 500;
			color: #333;
		}
	}
}

// 编辑模式下的表单样式
:deep(.edit-mode) {
	.publish-form {
		padding-top: 0;
		
		.form-item {
			box-shadow: none;
			border-bottom: 1rpx solid #f0f0f0;
			border-radius: 0;
			margin-bottom: 0;
			padding: 25rpx 30rpx;
			
			&:last-child {
				border-bottom: none;
			}
		}
		
	}
}
</style>