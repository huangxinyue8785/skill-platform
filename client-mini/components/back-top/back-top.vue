<template>
	<view 
		class="back-top" 
		:class="{ show: visible }" 
		@click="handleClick"
		:style="{ bottom: bottom + 'rpx' }"
	>
		<uni-icons type="arrowup" size="28" color="#666"></uni-icons>
	</view>
</template>

<script setup>
const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	},
	bottom: {
		type: Number,
		default: 140
	}
})

const emit = defineEmits(['click'])

const handleClick = () => {
	emit('click')
}
</script>

<style lang="scss" scoped>
.back-top {
	position: fixed;
	right: 30rpx;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	// ✅ 改为更浅的透明度，去掉毛玻璃效果
	background: rgba(255, 255, 255, 0.85);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transform: scale(0);
	// ✅ 使用 transform 而不是 all，性能更好
	transition: opacity 0.3s ease, transform 0.3s ease;
	z-index: 100;
	// ✅ 移除耗性能的毛玻璃效果
	// backdrop-filter: blur(10rpx);
	border: 1rpx solid rgba(0, 0, 0, 0.05);
	// ✅ 开启硬件加速
	will-change: transform, opacity;
	
	&.show {
		opacity: 1;
		transform: scale(1);
	}
	
	&:active {
		transform: scale(0.9);
		// ✅ 点击时稍微深一点
		background: rgba(255, 255, 255, 0.95);
	}
}
</style>