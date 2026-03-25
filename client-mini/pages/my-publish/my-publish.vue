<template>
	<view class="container">
		<!-- 服务列表 - 滚动区域，包含头部和卡片 -->
		<scroll-view 
			scroll-y 
			class="service-list"
			refresher-enabled
			:refresher-triggered="refreshing" 
			@refresherrefresh="onRefresh"
			@scrolltolower="loadMore"
		>
			<!-- 内容区域 -->
			<view class="list-content">
				<!-- 头部区域 - 放在 scroll-view 内部，会随页面滚动 -->
				<view class="header">
					<!-- 状态筛选 tabs -->
					<view class="tabs">
						<view 
							v-for="tab in tabList" 
							:key="tab.value" 
							class="tab-item" 
							:class="{ active: currentTab === tab.value }"
							@click="switchTab(tab.value)"
						>
							{{ tab.name }}
						</view>
					</view>
				</view>

				<!-- 服务卡片 -->
				<publish-card 
					v-for="item in serviceList" 
					:key="item.id"
					:service="item"
					@offline="handleOffline"
					@edit="handleEdit"
					@delete="handleDelete"
				></publish-card>

				<!-- 加载更多 -->
				<uni-load-more 
					v-if="serviceList.length > 0" 
					:status="loadMoreStatus"
				></uni-load-more>

				<!-- 空状态 -->
				<view class="empty-state" v-if="serviceList.length === 0 && !loading">
					<image src="/static/empty.png" mode="aspectFit"></image>
					<text>暂无发布的服务</text>
					<button class="publish-btn" @click="goToPublish">去发布</button>
				</view>
				
				<!-- 底部安全区占位 -->
				<view class="safe-bottom"></view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getMyServices, offlineService, deleteService } from '@/api/service.js'
import PublishCard from '@/components/publish-card/publish-card.vue'

const tabList = ref([
	{ name: '全部', value: '' },
	{ name: '待审核', value: 0 },
	{ name: '已上架', value: 1 },
	{ name: '已下架', value: 2 },
	{ name: '不通过', value: 3 }
])
const currentTab = ref('')
const serviceList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadMoreStatus = ref('more')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 页面显示时刷新数据
onShow(() => {
	refreshList()
})

// 加载列表数据
const loadServicesList = async (isRefresh = false) => {
	if (loading.value) return

	loading.value = true
	if (serviceList.value.length > 0) {
		loadMoreStatus.value = 'loading'
	}

	try {
		const params = {
			page: isRefresh ? 1 : page.value,
			pageSize: pageSize.value
		}

		if (currentTab.value !== '') {
			params.status = currentTab.value
		}

		const res = await getMyServices(params)

		if (isRefresh) {
			serviceList.value = res.list
			page.value = 2
		} else {
			serviceList.value = [...serviceList.value, ...res.list]
			page.value++
		}

		total.value = res.total

		// 更新加载更多状态
		if (serviceList.value.length === 0) {
			loadMoreStatus.value = 'more'
		} else if (serviceList.value.length >= res.total) {
			loadMoreStatus.value = 'noMore'
		} else {
			loadMoreStatus.value = 'more'
		}
	} catch (err) {
		console.error('加载服务列表失败', err)
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

// 刷新列表
const refreshList = () => {
	page.value = 1
	loadServicesList(true)
}

// 切换tab
const switchTab = (value) => {
	if (currentTab.value === value) return
	currentTab.value = value
	refreshList()
}

// 下拉刷新
const onRefresh = () => {
	refreshing.value = true
	refreshList()
}

// 上拉加载更多
const loadMore = () => {
	if (loadMoreStatus.value === 'more' && !loading.value) {
		loadServicesList()
	}
}

// 页面加载
onLoad(() => {
	refreshList()
})

// 处理下架
const handleOffline = async (id) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要下架该服务吗？',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '操作中...' })
					await offlineService(id)
					uni.hideLoading()
					uni.showToast({ title: '下架成功', icon: 'success' })
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	}
}

// 处理编辑
const handleEdit = (id) => {
  uni.navigateTo({
    url: `/pages/edit-publish/edit-publish?id=${id}`
  })
}

// 处理删除
const handleDelete = (id) => {
	try {
		uni.showModal({
			title: '提示',
			content: '确定要删除该服务吗？删除后不可恢复',
			confirmColor: '#b93a4a',
			success: async (res) => {
				if (res.confirm) {
					uni.showLoading({ title: '删除中...' })
					await deleteService(id)
					uni.hideLoading()
					uni.showToast({ title: '删除成功', icon: 'success' })
					refreshList()
				}
			}
		})
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	}
}

const goToPublish = () => {
	uni.navigateTo({
		url: '/pages/publish/publish'
	})
}
</script>

<style lang="scss" scoped>
/* 全局样式，防止页面滚动 */

.container {
	height: 95vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* 服务列表 - 滚动区域 */
.service-list {
	flex: 1;
	height: 0;
}

/* 列表内容区域 */
.list-content {
	padding: 0 0 0 0;
	box-sizing: border-box;
}

/* 头部区域 */
.header {
	background-color: #fff;
	margin-bottom: 0;
}

.tabs {
	display: flex;
	background-color: #fff;
	padding: 20rpx 30rpx;
	border-bottom: 2rpx solid #f0f0f0;
	
	.tab-item {
		flex: 1;
		text-align: center;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 28rpx;
		color: #666;
		position: relative;

		&.active {
			color: #333;
			font-weight: 500;

			&::after {
				content: '';
				position: absolute;
				bottom: -10rpx;
				left: 50%;
				transform: translateX(-50%);
				width: 50rpx;
				height: 5rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				border-radius: 2rpx;
			}
		}
	}
}

/* 发布卡片的外边距 */
:deep(.publish-card) {
	margin: 20rpx;
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

	.publish-btn {
		width: 200rpx;
		height: 70rpx;
		line-height: 70rpx;
		background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
		color: #333;
		border-radius: 35rpx;
		font-size: 28rpx;
		margin: 0 auto;

		&::after {
			border: none;
		}
	}
}

/* 底部安全区占位 */
.safe-bottom {
	height: env(safe-area-inset-bottom);
	width: 100%;
}
</style>