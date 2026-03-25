<template>
	<view class="service-card" :class="{ 'publish-mode': mode === 'publish' }" @click="handleClick">
		<!-- 服务图片 -->
		<image 
			class="service-image" 
			:src="getImageUrl(service.images?.[0])" 
			mode="aspectFill"
			lazy-load
		></image>
		
		<!-- 服务信息 -->
		<view class="service-info">
			<!-- 标题 + 学校标签 -->
			<view class="title-row">
				<view class="service-title">{{ service.title }}</view>
				<text class="school-badge" v-if="service.school_name">{{ service.school_name }}</text>
			</view>
			
			<!-- 首页模式：显示描述 -->
			<view v-if="mode === 'home'" class="service-desc">{{ service.description }}</view>
			
			<!-- 发布模式：显示浏览量和学校 -->
			<view v-if="mode === 'publish'" class="service-meta">
				<text>浏览 {{ service.viewCount || 0 }}</text>
				<text>发布于 {{ service.school_name || '本校' }}</text>
			</view>
			
			<!-- 底部栏：价格和用户信息 -->
			<view class="service-footer">
				<text class="service-price">￥{{ service.price }}</text>
				
				<!-- 首页模式：显示头像和昵称（学校标签已经移到了上面） -->
				<view v-if="mode === 'home'" class="service-user">
					<image class="user-avatar" :src="getImageUrl(service.user_avatar)" mode="aspectFill"></image>
					<text class="user-name">{{ service.user_nickname }}</text>
				</view>
				
				<!-- 发布模式：显示状态和操作按钮 -->
				<view v-if="mode === 'publish'" class="service-actions" @click.stop>
					<text class="service-status" :class="'status-' + service.status">{{ service.statusText }}</text>
					<button 
						v-if="service.status === 1" 
						class="action-btn offline" 
						@click="$emit('offline', service.id)"
					>下架</button>
					<button 
						class="action-btn edit" 
						@click="$emit('edit', service.id)"
					>编辑</button>
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
	import { getImageUrl } from '@/utils/request.js'  // 加上这行
	const props = defineProps({
		service: {
			type: Object,
			required: true
		},
		mode: {
			type: String,
			default: 'home' // 'home' 或 'publish'
		}
	})
	
	const emit = defineEmits(['click', 'offline', 'edit', 'delete'])
	
	const handleClick = () => {
		if (props.mode === 'home') {
			emit('click', props.service.id)
		}
		// 发布模式下点击不跳转
	}
</script>

<style lang="scss" scoped>
	.service-card {
		background-color: #fff;
		border-radius: 16rpx;
		overflow: hidden;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
		display: flex;
		padding: 20rpx;
		
		&:active {
				transform: scale(0.98);
				transition: all 0.2s;
				box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12);
			}
		
		.service-image {
			width: 200rpx;
			height: 200rpx;
			border-radius: 12rpx;
			margin-right: 20rpx;
			background-color: #f0f0f0;
			flex-shrink: 0;
		}
		
		.service-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			min-width: 0;
			
			/* 标题行：标题 + 学校标签 */
			.title-row {
				display: flex;
				align-items: center;
				margin-bottom: 8rpx;
				width: 100%;
				
				.service-title {
					font-size: 30rpx;
					font-weight: 500;
					color: #333;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					flex: 1;
					margin-right: 12rpx;
				}
				
				.school-badge {
					font-size: 22rpx;
					color: #666;
					background-color: #f0f0f0;
					padding: 4rpx 12rpx;
					border-radius: 24rpx;
					max-width: 160rpx;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					flex-shrink: 0;
					line-height: 1.4;
				}
			}
			
			.service-desc {
				font-size: 24rpx;
				color: #999;
				margin-bottom: 16rpx;
				overflow: hidden;
				text-overflow: ellipsis;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
			}
			
			.service-meta {
				font-size: 24rpx;
				color: #999;
				margin-bottom: 16rpx;
				display: flex;
				gap: 30rpx;
			}
			
			.service-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				
				.service-price {
					font-size: 32rpx;
					font-weight: 600;
					color: #ff4d4f;
					flex-shrink: 0;
				}
				
				/* 首页模式：用户头像和昵称 */
				.service-user {
					display: flex;
					align-items: center;
					min-width: 0;
					margin-left: 16rpx;
					
					.user-avatar {
						width: 36rpx;
						height: 36rpx;
						border-radius: 50%;
						margin-right: 6rpx;
						flex-shrink: 0;
					}
					
					.user-name {
						font-size: 24rpx;
						color: #666;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
						max-width: 120rpx;
					}
				}
				
				/* 发布模式：状态和操作按钮 */
				.service-actions {
					display: flex;
					align-items: center;
					gap: 16rpx;
					margin-left: 20rpx;
					
					.service-status {
						font-size: 24rpx;
						margin-right: 8rpx;
						
						&.status-0 { color: #faad14; }  // 待审核
						&.status-1 { color: #52c41a; }  // 已上架
						&.status-2 { color: #999; }     // 已下架
						&.status-3 { color: #f5222d; }  // 不通过
					}
					
					.action-btn {
						width: 80rpx;
						height: 48rpx;
						line-height: 48rpx;
						font-size: 22rpx;
						border-radius: 24rpx;
						background-color: #f5f5f5;
						color: #666;
						border: none;
						padding: 0;
						
						&.offline {
							background-color: #faad14;
							color: #fff;
						}
						
						&.edit {
							background-color: #1890ff;
							color: #fff;
						}
						
						&.delete {
							background-color: #f5222d;
							color: #fff;
						}
						
						&::after {
							border: none;
						}
					}
				}
			}
		}
		
		&:active {
			transform: scale(0.98);
			transition: all 0.2s;
		}
	}
</style>