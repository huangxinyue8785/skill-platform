<template>
	<view class="layout">
		<view class="navbar">
			<view class="statusBar" :style="{height: getStatusBarHeight() + 'px'}"></view>
			<view class="titleBar" :style="{marginLeft: getLeftIconLeft() + 'px',marginTop: '5px'}">
				<!-- 上面：学校选择 -->
				<view class="school" @click="onSchoolClick">
					<uni-icons type="map-pin-ellipse" size="16" color="#666"></uni-icons>
					<text class="school-name">{{ schoolName }}</text>
				</view>
				
				<!-- 下面：搜索框 -->
				<view class="search" @click="onSearchClick">
					<uni-icons class="icon" type="search" color="#888" size="18"></uni-icons>
					<text class="text">{{ placeholder }}</text>
				</view>
			</view>
		</view>
		<view class="fill" :style="{height: getNavBarHeight() + 'px'}"></view>
	</view>
</template>

<script setup>
import {
	getStatusBarHeight,
	getTitleBarHeight,
	getNavBarHeight,
	getLeftIconLeft
} from "@/utils/system.js"

// 定义 props
const props = defineProps({
	schoolName: {
		type: String,
		default: "本校"
	},
	placeholder: {
		type: String,
		default: "搜索技能..."
	}
})

// 定义事件
const emit = defineEmits(['schoolClick', 'searchClick'])

// 学校点击
const onSchoolClick = () => {
	emit('schoolClick')
}

// 搜索点击
const onSearchClick = () => {
	emit('searchClick')
}
</script>

<style lang="scss" scoped>
.layout {
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		z-index: 10;
		background: linear-gradient(to bottom, transparent 0%, #fff 400rpx),
			linear-gradient(to right, #d0f3f9 20%, #f2e89f);

		.titleBar {
			display: flex;
			flex-direction: column;  /* 改成纵向排列 */
						padding: 10rpx 30rpx 20rpx 30rpx;
						align-items: flex-start; /* 左对齐 */
						gap: 16rpx;              /* 上下间距 */

			.school {
				display: flex;
				align-items: center;
				padding: 8rpx 0;
				
				.school-name {
					font-size: 26rpx;
					color: #666;
					margin-right: 4rpx;
					max-width: 200rpx;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
			}

			.search {
				width: 80%;            /* 占满整行 */
				height: 60rpx;
				border-radius: 60rpx;
				background: rgba(255, 255, 255, 0.4);
				border: 1px solid #fff;
				color: #999;
				font-size: 28rpx;
				display: flex;
				align-items: center;
				justify-content: flex-start;
				// margin-left: 20rpx;

				.icon {
					margin-right: 6rpx ;
					padding-left: 6rpx;
					
				}

				.text {
					font-size: 26rpx;
				}
			}
		}
	}
}
</style>