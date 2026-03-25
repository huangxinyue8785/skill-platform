<template>
	<view class="container">
		<!-- 收藏列表 -->
		<scroll-view 
			scroll-y 
			class="favorites-list" 
			:class="{ 'edit-mode': isEditMode }" 
			@scrolltolower="loadMore"
			refresher-enabled 
			:refresher-triggered="refreshing" 
			@refresherrefresh="onRefresh"
			:lower-threshold="100"
			:scroll-with-animation="true"
		>
			<!-- 内容区域，包含卡片和底部占位 -->
			<view class="list-content">
				<!-- 使用 uni-swipe-action 实现左滑删除 -->
				<uni-swipe-action>
					<uni-swipe-action-item v-for="item in favoritesList || []" :key="item?.favoriteId"
						:right-options="swipeOptions" @click="handleSwipeClick($event, item)" :disabled="isEditMode"
						:throttle="true">
						<view class="favorite-card-wrapper">
							<!-- 编辑模式下的复选框（放在卡片外面） -->
							<view class="card-checkbox" v-if="isEditMode" @click.stop="toggleSelect(item.favoriteId)">
								<view class="checkbox" :class="{ checked: selectedIds.includes(item.favoriteId) }">
									<text v-if="selectedIds.includes(item.favoriteId)" class="checkmark">✓</text>
								</view>
							</view>

							<!-- 收藏卡片 -->
							<view class="favorite-card" :class="{ 
								'disabled': item?.service?.status !== 1,
								'selected': selectedIds.includes(item.favoriteId)
							}" @click="handleCardClick(item)">
								<!-- 服务图片 -->
								 <image class="service-image" :src="getImageUrl(item.service.images?.[0])" mode="aspectFill" lazy-load></image>

								<!-- 服务信息 -->
								<view class="service-info">
									<!-- 标题行：标题 + 价格 -->
									<view class="title-row">
										<text class="service-title">{{ item.service.title }}</text>
										<text class="service-price">￥{{ item.service.price }}</text>
									</view>

									<!-- 服务描述 - 最多一行 -->
									<text class="service-desc">{{ item.service.description || '暂无描述' }}</text>

									<!-- 底部信息：分类、状态、收藏时间 -->
									<view class="service-footer">
										<view class="left-info">
											<text class="service-category">{{ item.service.category?.name || '未分类' }}</text>
											<text class="service-status" :class="'status-' + item.service.status">
												{{ item.service.statusText }}
											</text>
										</view>
										<text class="favorite-time">{{ formatTime(item.favoriteTime) }}</text>
									</view>
								</view>
							</view>
						</view>
					</uni-swipe-action-item>
				</uni-swipe-action>

				<!-- 加载更多 -->
				<uni-load-more v-if="favoritesList.length > 0" :status="loadMoreStatus"></uni-load-more>

				<!-- 空状态 -->
				<view class="empty-state" v-if="favoritesList.length === 0 && !loading">
					<image src="/static/empty.png" mode="aspectFit"></image>
					<text>暂无收藏</text>
					<button class="browse-btn" @click="goToHome">去首页逛逛</button>
				</view>
				
				<!-- 底部占位盒子，防止内容被底部栏遮挡 -->
				<view class="bottom-placeholder" v-if="favoritesList.length > 0"></view>
			</view>
		</scroll-view>

		<!-- 底部操作按钮（普通模式） -->
		<view class="bottom-bar" v-if="!isEditMode && favoritesList.length > 0">
			<button class="edit-btn" @click="isEditMode = true">编辑</button>
		</view>

		<!-- 底部操作按钮（编辑模式） -->
		<view class="bottom-bar edit-mode-bar" v-if="isEditMode">
			<view class="bar-left">
				<button class="cancel-btn" @click="cancelEdit">取消</button>
			</view>
			<view class="bar-right">
				<view class="select-all" @click="toggleSelectAll">
					<view class="checkbox" :class="{ checked: isAllSelected }">
						<text v-if="isAllSelected" class="checkmark">✓</text>
					</view>
					<text>全选</text>
				</view>
				<button class="delete-selected-btn" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
					删除({{ selectedIds.length }})
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import {
	ref,
	computed
} from 'vue'
import {
	onLoad,
	onShow
} from '@dcloudio/uni-app'
import {
	getFavoriteList,
	removeFavorite
} from '@/api/favorite.js'
import { getImageUrl } from '@/utils/request.js'
import {
	checkLogin
} from '@/utils/auth'

// ==================== 左滑选项配置 ====================
const swipeOptions = ref([{
	text: '取消收藏',
	style: {
		backgroundColor: '#ff4d4f',
		color: '#ffffff',
		fontSize: '28rpx'
	}
}])

// ==================== 状态定义 ====================
const favoritesList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadMoreStatus = ref('more')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 编辑模式相关
const isEditMode = ref(false)
const selectedIds = ref([])

// ==================== 加载收藏列表 ====================
const loadFavorites = async (isRefresh = false) => {
	if (loading.value) return

	loading.value = true

	// 只有加载更多时才显示loading状态
	if (favoritesList.value.length > 0 && !isRefresh) {
		loadMoreStatus.value = 'loading'
	}

	try {
		const params = {
			page: isRefresh ? 1 : page.value,
			pageSize: pageSize.value
		}

		console.log('请求参数:', params)

		const res = await getFavoriteList(params)
		console.log('返回数据:', res)

		if (isRefresh) {
			favoritesList.value = res.list || []
			page.value = 2
		} else {
			// 加载更多
			if (res.list && res.list.length > 0) {
				favoritesList.value = [...favoritesList.value, ...res.list]
				page.value++
			}
		}

		total.value = res.total || 0

		// 更新加载更多状态
		if (!favoritesList.value || favoritesList.value.length === 0) {
			loadMoreStatus.value = 'more'
		} else if (favoritesList.value.length >= total.value) {
			loadMoreStatus.value = 'noMore'
		} else {
			loadMoreStatus.value = 'more'
		}

		console.log('加载完成', {
			列表长度: favoritesList.value.length,
			总条数: total.value,
			加载状态: loadMoreStatus.value
		})

	} catch (err) {
		console.error('加载收藏失败', err)
		loadMoreStatus.value = 'more'
		uni.showToast({
			title: '加载失败',
			icon: 'none'
		})
	} finally {
		loading.value = false
		refreshing.value = false
	}
}

// ==================== 刷新列表 ====================
const refreshList = () => {
	console.log('刷新列表')
	page.value = 1
	loadFavorites(true)
}

// ==================== 下拉刷新 ====================
const onRefresh = () => {
	refreshing.value = true
	refreshList()
}

// ==================== 上拉加载更多 ====================
const loadMore = () => {
	console.log('触发loadMore', {
		loadMoreStatus: loadMoreStatus.value,
		loading: loading.value,
		page: page.value,
		listLength: favoritesList.value.length,
		total: total.value
	})

	// 当还有更多数据且不在加载中时，才加载
	if (loadMoreStatus.value === 'more' && !loading.value) {
		loadFavorites()
	}
}

// ==================== 页面加载 ====================
onLoad(() => {
	if (!checkLogin()) return
	refreshList()
})

onShow(() => {
	if (!checkLogin()) return
	refreshList()
	// 退出编辑模式
	isEditMode.value = false
	selectedIds.value = []
})

// ==================== 处理左滑点击 ====================
const handleSwipeClick = (e, item) => {
	if (e.index === 0) {
		handleRemoveFavorite(item.favoriteId)
	}
}

// ==================== 处理卡片点击 ====================
const handleCardClick = (item) => {
	if (isEditMode.value) {
		// 编辑模式下，切换选中状态
		toggleSelect(item.favoriteId)
	} else {
		// 普通模式下，跳转或提示
		if (item.service.status === 1) {
			// 已上架的服务，正常跳转
			goToServiceDetail(item.service.id)
		} else {
			// 已下架或已删除的服务，给出提示
			uni.showToast({
				title: '该服务已下架或不存在',
				icon: 'none'
			})
		}
	}
}

// ==================== 取消收藏（单个） ====================
const handleRemoveFavorite = async (favoriteId) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要取消收藏吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({
						title: '操作中...'
					})
					await removeFavorite(favoriteId)
					uni.hideLoading()
					uni.showToast({
						title: '已取消收藏',
						icon: 'success'
					})
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({
			title: err.message || '操作失败',
			icon: 'none'
		})
	}
}

// ==================== 批量取消收藏 ====================
const handleBatchDelete = async () => {
	if (selectedIds.value.length === 0) return

	try {
		uni.showModal({
			title: '提示',
			content: `确定要取消这 ${selectedIds.value.length} 个收藏吗？`,
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({
						title: '删除中...'
					})

					// 逐个删除
					for (const id of selectedIds.value) {
						await removeFavorite(id)
					}

					uni.hideLoading()
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					})

					// 退出编辑模式并刷新列表
					isEditMode.value = false
					selectedIds.value = []
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({
			title: err.message || '操作失败',
			icon: 'none'
		})
	}
}

// ==================== 切换选中状态 ====================
const toggleSelect = (favoriteId) => {
	const index = selectedIds.value.indexOf(favoriteId)
	if (index === -1) {
		selectedIds.value.push(favoriteId)
	} else {
		selectedIds.value.splice(index, 1)
	}
}

// ==================== 全选/取消全选 ====================
const toggleSelectAll = () => {
	if (!favoritesList.value || favoritesList.value.length === 0) return

	if (isAllSelected.value) {
		selectedIds.value = []
	} else {
		selectedIds.value = favoritesList.value.map(item => item.favoriteId)
	}
}

// ==================== 计算属性：是否全选 ====================
const isAllSelected = computed(() => {
	return favoritesList.value &&
		favoritesList.value.length > 0 &&
		selectedIds.value.length === favoritesList.value.length
})

// ==================== 取消编辑 ====================
const cancelEdit = () => {
	isEditMode.value = false
	selectedIds.value = []
}

// ==================== 跳转到服务详情 ====================
const goToServiceDetail = (serviceId) => {
	uni.navigateTo({
		url: `/pages/service-detail/service-detail?id=${serviceId}`
	})
}

// ==================== 格式化时间 ====================
const formatTime = (time) => {
	if (!time) return ''
	const date = new Date(time)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}.${month}.${day}`
}

// ==================== 去首页 ====================
const goToHome = () => {
	uni.switchTab({
		url: '/pages/index/index'
	})
}
</script>

<style lang="scss" scoped>
/* 全局样式，防止页面滚动 */
page {
	height: 100vh;
	overflow: hidden;
}

.container {
	height: 95vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

/* 收藏列表 - 滚动区域 */
.favorites-list {
	flex: 1;
	height: 0; /* 关键：让scroll-view知道自己的高度 */
}

/* 列表内容区域 */
.list-content {
	padding: 20rpx;
	padding-bottom: 0; /* 底部占位由bottom-placeholder负责 */
	box-sizing: border-box;
}

/* 卡片包装器（用于放置外部复选框） */
.favorite-card-wrapper {
	position: relative;
	margin-bottom: 20rpx;
}

/* 编辑模式时卡片包装器的左边距增大 */
.favorites-list.edit-mode {
	.favorite-card-wrapper {
		margin-left: 70rpx;
	}
}

/* 卡片外部的复选框 */
.card-checkbox {
	position: absolute;
	left: -70rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;

	.checkbox {
		width: 36rpx;
		height: 36rpx;
		border: 2rpx solid #ddd;
		border-radius: 6rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #fff;

		&.checked {
			background-color: #fede65;
			border-color: #fede65;

			.checkmark {
				color: #fff;
				font-size: 24rpx;
				font-weight: bold;
			}
		}
	}
}

/* 收藏卡片 */
.favorite-card {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
	display: flex;
	position: relative;
	width: 100%;
	transition: all 0.3s ease;
	border: 2rpx solid transparent;

	&.selected {
		border-color: #fede65;
		background-color: #fff9e6;
	}

	&.disabled {
		opacity: 0.7;
		background-color: #f9f9f9;
	}

	&:active {
		transform: scale(0.98);
		transition: all 0.2s;
	}

	.service-image {
		width: 140rpx;
		height: 140rpx;
		border-radius: 12rpx;
		margin-right: 16rpx;
		background-color: #f0f0f0;
		flex-shrink: 0;
	}

	.service-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		position: relative;

		.title-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8rpx;

			.service-title {
				font-size: 28rpx;
				color: #333;
				font-weight: 500;
				flex: 1;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				margin-right: 16rpx;
			}

			.service-price {
				font-size: 32rpx;
				color: #ff4d4f;
				font-weight: 600;
				flex-shrink: 0;
			}
		}

		.service-desc {
			font-size: 24rpx;
			color: #999;
			margin-bottom: 12rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.service-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;

			.left-info {
				display: flex;
				align-items: center;
				gap: 12rpx;

				.service-category {
					font-size: 22rpx;
					color: #3a7cb9;
					background-color: #e8f0fe;
					padding: 4rpx 16rpx;
					border-radius: 30rpx;
				}

				.service-status {
					font-size: 22rpx;
					padding: 4rpx 16rpx;
					border-radius: 30rpx;

					&.status-1 {
						color: #07c160;
						background-color: #e8f8e8;
					}

					&.status-0,
					&.status-2,
					&.status-3 {
						color: #999;
						background-color: #f5f5f5;
					}
				}
			}

			.favorite-time {
				font-size: 20rpx;
				color: #999;
			}
		}
	}
}

/* 底部占位盒子 - 防止内容被底部栏遮挡 */
.bottom-placeholder {
	height: 140rpx;
	width: 100%;
}

/* 底部操作栏 */
.bottom-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: auto;
	min-height: 100rpx;
	background-color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 30rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	border-top: 1rpx solid #f0f0f0;
	z-index: 1000;
	box-sizing: content-box;

	.edit-btn {
		width: 100%;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 28rpx;
		border-radius: 35rpx;
		border: none;
		background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
		color: #333;

		&::after {
			border: none;
		}
	}

	/* 编辑模式下的底部栏 */
	&.edit-mode-bar {
		display: flex;
		justify-content: space-between;
		padding: 10rpx 30rpx;
		padding-bottom: calc(constant(safe-area-inset-bottom));
		padding-bottom: calc(env(safe-area-inset-bottom));

		.bar-left {
			.cancel-btn {
				width: 120rpx;
				height: 70rpx;
				line-height: 70rpx;
				font-size: 28rpx;
				border-radius: 35rpx;
				border: none;
				background-color: #f5f5f5;
				color: #666;

				&::after {
					border: none;
				}
			}
		}

		.bar-right {
			display: flex;
			align-items: center;
			gap: 30rpx;

			.select-all {
				display: flex;
				align-items: center;
				gap: 12rpx;

				.checkbox {
					width: 36rpx;
					height: 36rpx;
					border: 2rpx solid #ddd;
					border-radius: 6rpx;
					display: flex;
					align-items: center;
					justify-content: center;

					&.checked {
						background-color: #fede65;
						border-color: #fede65;

						.checkmark {
							color: #fff;
							font-size: 24rpx;
						}
					}
				}

				text {
					font-size: 28rpx;
					color: #333;
				}
			}

			.delete-selected-btn {
				height: 60rpx;
				line-height: 60rpx;
				font-size: 26rpx;
				background-color: #ff4d4f;
				color: #fff;
				border-radius: 30rpx;
				padding: 0 30rpx;
				border: none;

				&[disabled] {
					opacity: 0.5;
				}

				&::after {
					border: none;
				}
			}
		}
	}
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 0;

	image {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 20rpx;
	}

	text {
		font-size: 28rpx;
		color: #999;
		margin-bottom: 40rpx;
	}

	.browse-btn {
		width: 200rpx;
		height: 70rpx;
		line-height: 70rpx;
		background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
		color: #333;
		border-radius: 35rpx;
		font-size: 28rpx;
		margin: 0 auto;
		border: none;

		&::after {
			border: none;
		}
	}
}
</style>