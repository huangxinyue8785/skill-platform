<template>
	<view class="container">
		<web-view :src="url" @message="handleMessage"></web-view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const url = ref('')

onLoad((options) => {
	if (options.url) {
		url.value = decodeURIComponent(options.url)
	}
})

// 处理从 web-view 返回的消息（可选）
const handleMessage = (event) => {
	console.log('收到web-view消息', event.detail)
	// 可以在这里处理支付成功后的逻辑
}
</script>

<style lang="scss" scoped>
.container {
	height: 100vh;
}
</style>