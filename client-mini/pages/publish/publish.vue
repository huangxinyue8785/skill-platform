<template>
	<view class="container pageBg">
		<!-- 自定义头部 -->
		<view class="custom-header" :style="{ paddingTop: getStatusBarHeight()+ 30 + 'px' }">
			<view class="header-content">
				<text class="header-title">发布新服务</text>
			</view>
		</view>
		
		<!-- 发布模式：正常间距 -->
		<publish-form 
			ref="publishFormRef" 
			:is-edit="false" 
			@submit-success="handleSubmitSuccess"
			:class="'publish-mode'"
		></publish-form>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'  // ✅ 从 uni-app 导入
import PublishForm from '@/components/publish-form/publish-form.vue'
import { getStatusBarHeight } from "@/utils/system.js"

const publishFormRef = ref()

const handleSubmitSuccess = () => {}

// ✅ 每次显示页面时发送刷新事件
onShow(() => {
	uni.$emit('refreshPublishForm')
})
</script>

<style lang="scss" scoped>
.container {
	min-height:80vh;
	background-color: #f5f5f5;
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
}

.custom-header {
	padding: 30rpx 30rpx 10rpx 30rpx;
	
	.header-content {
		.header-title {
			font-size: 40rpx;
			font-weight: 600;
			color: #333;
			display: block;
		}
	}
}

// 发布模式下的表单样式
:deep(.publish-mode) {
	.publish-form {
		padding-top: 30rpx;
		padding-margin:10rpx;
	}
}
</style>