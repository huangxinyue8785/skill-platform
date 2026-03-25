<template>
	<view class="container">
		<!-- 子分类滚动条 - 放在最上面 -->
		<scroll-view class="subcategory-scroll" scroll-x show-scrollbar="false" v-if="subCategoryList.length > 0">
			<view class="subcategory-list">
				<view class="subcategory-item" :class="{ active: currentSubCategoryId === null }"
					@click="selectSubCategory(null)">
					全部
				</view>
				<view class="subcategory-item" v-for="item in subCategoryList" :key="item.id"
					:class="{ active: currentSubCategoryId === item.id }" @click="selectSubCategory(item.id)">
					{{ item.name }}
				</view>
			</view>
		</scroll-view>

		<!-- 筛选栏 - 固定不动 -->
		<view class="filter-bar">
			<view v-for="item in filterList" :key="item.value" class="filter-item"
				:class="{ active: sortType === item.value }" @click="changeSort(item.value)">
				{{ item.name }}
				<view class="active-line" v-if="sortType === item.value"></view>
			</view>
		</view>

		<!-- 服务列表 - 滚动区域 -->
		<scroll-view scroll-y class="service-list" @scrolltolower="loadMore" refresher-enabled
			:refresher-triggered="refreshing" @refresherrefresh="onRefresh">

			<service-card v-for="item in serviceList" :key="item.id" :service="item" @click="goToDetail"></service-card>

			<!-- 只在有数据且需要加载更多时显示加载状态 -->
			<uni-load-more v-if="serviceList.length > 0" :status="loadMoreStatus"></uni-load-more>

			<!-- 空状态：没有数据且不在加载中 -->
			<view class="empty-state" v-if="serviceList.length === 0 && !loading">
				<image src="/static/empty.png" mode="aspectFit"></image>
				<text>该分类下暂无服务</text>
				<button class="browse-btn" @click="goToHome">去首页逛逛</button> 
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		getServiceList
	} from '@/api/service.js'
	import {
		getChildCategories
	} from '@/api/category.js'
	import ServiceCard from '@/components/service-card/service-card.vue'

	const categoryId = ref('')
	const categoryName = ref('')
	const subCategoryList = ref([])
	const currentSubCategoryId = ref(null)
	const serviceList = ref([])
	const loading = ref(false)
	const refreshing = ref(false)
	const loadMoreStatus = ref('more')
	const page = ref(1)
	const pageSize = 10
	const total = ref(0)
	const sortType = ref('time')

	// 筛选选项
	const filterList = ref([{
			name: '最新',
			value: 'time'
		},
		{
			name: '价格最低',
			value: 'price_asc'
		},
		{
			name: '价格最高',
			value: 'price_desc'
		}
	])

	onLoad((options) => {
		if (options.id) {
			categoryId.value = options.id
			categoryName.value = decodeURIComponent(options.name || '分类列表')

			uni.setNavigationBarTitle({
				title: categoryName.value
			})

			loadSubCategories()
			loadServices(true)
		}
	})

	const loadSubCategories = async () => {
		try {
			const res = await getChildCategories(categoryId.value)
			subCategoryList.value = res
		} catch (err) {
			console.error('加载子分类失败', err)
		}
	}

	const selectSubCategory = (subCategoryId) => {
		if (currentSubCategoryId.value === subCategoryId) return
		currentSubCategoryId.value = subCategoryId
		page.value = 1
		loadServices(true)
	}

	const loadServices = async (isRefresh = false) => {
		if (loading.value) return

		loading.value = true
		// 只有在有数据时才显示 loading 状态
		if (serviceList.value.length > 0) {
			loadMoreStatus.value = 'loading'
		}

		try {
			const params = {
				page: isRefresh ? 1 : page.value,
				pageSize,
				sort: sortType.value
			}

			if (currentSubCategoryId.value) {
				params.category_id = currentSubCategoryId.value
			} else {
				params.category_id = categoryId.value
			}

			console.log('分类列表请求参数：', params)

			const res = await getServiceList(params)

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
				// 没有数据时，不显示加载更多
				loadMoreStatus.value = 'more'
			} else if (serviceList.value.length >= res.total) {
				loadMoreStatus.value = 'noMore'
			} else {
				loadMoreStatus.value = 'more'
			}

		} catch (err) {
			console.error('加载服务列表失败', err)
			loadMoreStatus.value = 'more'
		} finally {
			loading.value = false
			refreshing.value = false
		}
	}

	const changeSort = (type) => {
		if (sortType.value === type) return
		sortType.value = type
		page.value = 1
		loadServices(true)
	}

	const onRefresh = () => {
		refreshing.value = true
		page.value = 1
		loadServices(true)
	}

	const loadMore = () => {
		if (loadMoreStatus.value === 'more') {
			loadServices()
		}
	}

	const goToDetail = (id) => {
		uni.navigateTo({
			url: `/pages/service-detail/service-detail?id=${id}`
		})
	}
	
	const goToHome = () => {
	    uni.switchTab({
	        url: '/pages/index/index'
	    })
	}
</script>

<style lang="scss" scoped>
	.container {
		min-height: 80vh;
		// background-color: #f5f5f5;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* 子分类滚动条 */
	.subcategory-scroll {
		background-color: #fff;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		white-space: nowrap;
		flex-shrink: 0;

		::-webkit-scrollbar {
			display: none;
			width: 0;
			height: 0;
		}

		.subcategory-list {
			display: inline-flex;
			padding: 0 30rpx;
			gap: 30rpx;
		}

		.subcategory-item {
			display: inline-block;
			padding: 8rpx 24rpx;
			font-size: 26rpx;
			color: #666;
			background-color: #f5f5f5;
			border-radius: 30rpx;

			&.active {
				color: #333;
				font-weight: 500;
				background-color: #e8f0fe;
			}
		}
	}

	/* 筛选栏 - 固定 */
	.filter-bar {
		background-color: #fff;
		display: flex;
		padding: 0 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
		flex-shrink: 0;

		.filter-item {
			flex: 1;
			text-align: center;
			height: 80rpx;
			line-height: 80rpx;
			font-size: 28rpx;
			color: #666;
			position: relative;

			&.active {
				color: #333;
				font-weight: 500;

				.active-line {
					position: absolute;
					bottom: 10rpx;
					left: 50%;
					transform: translateX(-50%);
					width: 50rpx;
					height: 4rpx;
					background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
					border-radius: 2rpx;
				}
			}
		}
	}

	/* 服务列表 - 滚动区域 */
	.service-list {
		flex: 1;
		padding: 20rpx 20rpx 0 20rpx;  // 增加底部内边距
		box-sizing: border-box;
		height: 0;
		// background-color: #f5f5f5;  // 确保背景色一致
	}

	/* 卡片间距 */
	.service-list :deep(.service-card) {
		margin-bottom: 20rpx;
	}

	.service-list :deep(.service-card:last-child) {
		margin-bottom: 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column; // 改为上下排列
		align-items: center;
		justify-content: center;
		padding: 100rpx 0;

		image {
			width: 200rpx;
			height: 200rpx;
			margin-bottom: 20rpx; // 图片和文字之间的间距
		}

		text {
			font-size: 28rpx;
			color: #999;
			margin-bottom: 40rpx;
		}
		
		.browse-btn {
				width: 240rpx;
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
				
				&:active {
					opacity: 0.8;
					transform: scale(0.98);
				}
			}
	}
</style>