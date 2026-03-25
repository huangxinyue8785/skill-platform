<template>
	<view class="publish-card" @click="goToDetail">
		<!-- 服务图片 -->
		<image 
					class="service-image" 
					:src="getImageUrl(service.images?.[0])"
					mode="aspectFill"
					lazy-load
				></image>
		
		<!-- 服务信息 -->
		<view class="service-info">
			<!-- 标题行：标题 + 价格 -->
			<view class="title-row">
				<text class="service-title">{{ service.title }}</text>
				<text class="service-price">¥{{ service.price }}</text>
			</view>
			
			<!-- 服务描述 - 最多两行 -->
			<view class="service-desc">{{ service.description }}</view>
			
			<!-- 元信息：浏览、学校、时间 -->
			<view class="service-meta">
				<text>浏览 {{ service.viewCount || 0 }}</text>
				<text>{{ service.school?.name || '本校' }}</text>
				<text>{{ formatTime(service.createTime) }}</text>
			</view>
			
			<!-- 底部栏：状态标签和操作按钮 -->
			<view class="service-footer" @click.stop>  <!-- 添加 @click.stop 阻止事件冒泡 -->
				<!-- 状态标签 -->
				<text class="service-status" :class="'status-' + service.status">{{ service.statusText }}</text>
				
				<!-- 操作按钮组 - 所有卡片都显示编辑和删除，已上架多一个下架 -->
				<view class="action-buttons">
					<!-- 下架按钮（只有已上架显示） -->
					<button 
						v-if="service.status === 1" 
						class="action-btn offline" 
						@click="$emit('offline', service.id)"
					>下架</button>
					
					<!-- 编辑按钮（所有状态都显示） -->
					<button 
						class="action-btn edit" 
						@click="$emit('edit', service.id)"
					>编辑</button>
					
					<!-- 删除按钮（所有状态都显示） -->
					<button 
						class="action-btn delete" 
						@click="$emit('delete', service.id)"
					>删除</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { getImageUrl } from '@/utils/request.js'
	
	const props = defineProps({
		service: {
			type: Object,
			required: true
		}
	})
	
	const emit = defineEmits(['offline', 'edit', 'delete'])
	
	// 格式化时间
	const formatTime = (time) => {
		if (!time) return ''
		const date = new Date(time)
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return `${month}-${day}`
	}
	
	// 跳转到详情页
	const goToDetail = () => {
		uni.navigateTo({
			url: `/pages/service-detail/service-detail?id=${props.service.id}&from=my-publish`
		})
	}
</script>

<style lang="scss" scoped>
.publish-card {
	background-color: #fff;
	border-radius: 16rpx;
	display: flex;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
	
	&:active {
		transform: scale(0.98);
		transition: all 0.2s;
		box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12);
	}
	
	.service-image {
		width: 180rpx;
		height: 180rpx;
		border-radius: 12rpx;
		margin-right: 20rpx;
		background-color: #f0f0f0;
		flex-shrink: 0;
	}
	
	.service-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		
		.title-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8rpx;
			
			.service-title {
				font-size: 30rpx;
				font-weight: 500;
				color: #333;
				flex: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				margin-right: 16rpx;
			}
			
			.service-price {
				font-size: 32rpx;
				font-weight: 600;
				color: #ff4d4f;
				flex-shrink: 0;
			}
		}
		
		.service-desc {
			font-size: 24rpx;
			color: #999;
			margin-bottom: 12rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			line-height: 1.5;
			height: 72rpx;
		}
		
		.service-meta {
			display: flex;
			gap: 20rpx;
			margin-bottom: 16rpx;
			font-size: 22rpx;
			color: #999;
			
			text {
				position: relative;
				
				&:not(:last-child)::after {
					content: '·';
					position: absolute;
					right: -12rpx;
					color: #ddd;
				}
			}
		}
		
		.service-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			.service-status {
				font-size: 22rpx;
				padding: 6rpx 16rpx;
				border-radius: 30rpx;
				
				&.status-0 { 
					color: #b98c3a; 
					background-color: #fff9e6;
				}  // 待审核
				&.status-1 { 
					color: #3a7cb9; 
					background-color: #e6f7ff;
				}  // 已上架
				&.status-2 { 
					color: #999; 
					background-color: #f5f5f5;
				}  // 已下架
				&.status-3 { 
					color: #b93a4a; 
					background-color: #ffebee;
				}  // 不通过
			}
			
			.action-buttons {
				display: flex;
				gap: 12rpx;
				
				.action-btn {
					min-width: 80rpx;
					height: 52rpx;
					line-height: 52rpx;
					font-size: 24rpx;
					border-radius: 26rpx;
					border: none;
					padding: 0 16rpx;
					margin: 0;
					font-weight: normal;
					transition: all 0.2s ease;
					
					&::after {
						border: none;
					}
					
					&:active {
						transform: scale(0.95);
						opacity: 0.8;
					}
					
					&.offline {
						background-color: #fff3e0;
						color: #e6a23c;
					}
					
					&.edit {
						background-color: #e8f0fe;
						color: #3a7cb9;
					}
					
					&.delete {
						background-color: #ffefef;
						color: #f56c6c;
					}
				}
			}
		}
	}
}
</style>