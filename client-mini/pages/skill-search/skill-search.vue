<template>
	<view class="searchLayout">
		<!-- 搜索框 -->
				<view class="search-box">
					<uni-icons type="search" size="18" color="#999"></uni-icons>
					<input 
						class="input"
						v-model="keyword"
						type="text"
						placeholder="搜索技能、标题、描述..."
						@input="onInput"
					/>
					<text v-if="keyword" class="clear-btn" @click="clearKeyword">✕</text>
				</view>
		
				<!-- 筛选条件 -->
				<view class="filter-bar">
					<view class="filter-item" @click="goToSchoolSearch">
						<view class="filter-content">
							<!-- ✅ 把 🏫 换成 location 图标 -->
							<uni-icons type="location" size="16" color="#666"></uni-icons>
							<text class="filter-text" :class="{ 'active': schoolId }">{{ schoolText }}</text>
							<uni-icons type="arrowright" size="14" color="#999"></uni-icons>
						</view>
					</view>
					
					<view class="filter-item" @click="showCategoryPicker = true">
						<view class="filter-content">
							<!-- ✅ 把 📂 换成 bars 或 list 图标 -->
							<uni-icons type="bars" size="16" color="#666"></uni-icons>
							<text class="filter-text" :class="{ 'active': categoryId }">{{ categoryText }}</text>
							<uni-icons type="arrowdown" size="14" color="#999"></uni-icons>
						</view>
					</view>
				</view>

		<!-- 公用分类选择组件 -->
		<category-picker 
			v-model:visible="showCategoryPicker"
			:value="categoryId"
			@confirm="onCategoryConfirm"
		/>

		<!-- 搜索中加载动画 -->
		<view class="loading-state" v-if="searching">
			<view class="loading-spinner"></view>
			<text class="loading-text">搜索中...</text>
		</view>

		<!-- 搜索结果列表 -->
		<scroll-view class="result-list" scroll-y v-else-if="searchResult.length" @scrolltolower="loadMore">
			<view class="result-header">
				<text class="result-count">共找到 {{ total }} 个相关服务</text>
				<text class="clear-filter" v-if="hasFilter" @click="clearFilters">清除筛选</text>
			</view>
			
			<view class="card-list">
				<service-card 
					v-for="service in searchResult" 
					:key="service.id"
					:service="service"
					mode="home"
					@click="selectService"
				/>
			</view>
			
			<!-- ✅ 添加这个 -->
			<uni-load-more 
				v-if="searchResult.length > 0"
				:status="loadMoreStatus"
				:content-text="{
					contentdown: '上拉加载更多',
					contentrefresh: '加载中...',
					contentnomore: '没有更多了'
				}"
			></uni-load-more>
		</scroll-view>
		
		<!-- 无搜索结果 -->
		<view class="empty" v-else-if="(keyword || hasFilter) && !searchResult.length && !searching">
			<image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
			<text class="empty-title">没有找到相关服务</text>
			<text class="empty-desc">试试调整筛选条件吧</text>
		</view>

		<!-- 初始状态 -->
		<view v-else class="initial-view">
			<!-- 搜索建议 -->
			<view class="search-tips">
				<uni-icons type="info" size="16" color="#999"></uni-icons>
				<text class="tips-text">输入关键词，或使用筛选条件查找服务</text>
			</view>
			
			<!-- 历史搜索 -->
			<view class="history" v-if="historyList.length">
				<view class="section-title">
					<text>最近搜索</text>
					<uni-icons type="trash" size="20" color="#999" @click="clearHistory"></uni-icons>
				</view>
				<view class="tags">
					<view 
						class="tag" 
						v-for="item in historyList" 
						:key="item"
						@click="clickHistory(item)"
					>
						{{ item }}
					</view>
				</view>
			</view>

			<!-- 热门搜索 -->
			<view class="hot-searches">
				<view class="section-title">热门搜索</view>
				<view class="tags">
					<view 
						class="tag hot-tag" 
						v-for="item in hotSearches" 
						:key="item"
						@click="searchByKeyword(item)"
					>
						{{ item }}
					</view>
				</view>
			</view>

			<!-- 热门分类 -->
			<view class="hot-categories">
				<view class="section-title">热门分类</view>
				<view class="tags">
					<view 
						class="tag category-tag" 
						v-for="item in hotCategories" 
						:key="item.id"
						@click="selectHotCategory(item)"
					>
						{{ item.name }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"
import { searchServices } from "@/api/service.js"
import { getCategoryList } from "@/api/category.js"
import CategoryPicker from '@/components/category-picker/category-picker.vue'
import ServiceCard from '@/components/service-card/service-card.vue'

const keyword = ref("")
const searchResult = ref([])
const searching = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loadMoreStatus = ref('more')  // more, loading, noMore
const loadingMore = ref(false)

// 筛选条件
const schoolId = ref("")
const schoolName = ref("")
const categoryId = ref("")
const categoryName = ref("")

// 分类弹窗
const showCategoryPicker = ref(false)

// 热门分类
const hotCategories = ref([])

// 历史搜索
const historyList = ref([])
const hotSearches = ref(["英语辅导", "Python", "考研数学", "代取快递", "PPT制作", "摄影", "健身", "吉他"])

// 显示文本
const schoolText = computed(() => schoolName.value || "全部学校")
const categoryText = computed(() => categoryName.value || "全部分类")
const hasFilter = computed(() => schoolId.value || categoryId.value)

// 防抖定时器
let searchTimer = null

// 跳转到学校搜索页
const goToSchoolSearch = () => {
	uni.navigateTo({
		url: '/pages/school-search/school-search?from=skill-search'
	})
}

// 监听学校选择事件
const handleSchoolSelected = (school) => {
	if (school) {
		schoolId.value = school.id
		schoolName.value = school.name
	} else {
		schoolId.value = ""
		schoolName.value = ""
	}
	doSearch()
}

// 分类确认回调
const onCategoryConfirm = (category) => {
	if (category) {
		categoryId.value = category.id
		categoryName.value = category.name
	} else {
		categoryId.value = ''
		categoryName.value = ''
	}
	doSearch()
}

// 选择热门分类
const selectHotCategory = (category) => {
	categoryId.value = category.id
	categoryName.value = category.name
	doSearch()
}

// 清除筛选
const clearFilters = () => {
	schoolId.value = ""
	schoolName.value = ""
	categoryId.value = ""
	categoryName.value = ""
	doSearch()
}

// 加载热门分类
const loadHotCategories = async () => {
	try {
		const res = await getCategoryList()
		const data = res.data || res || []
		const parentCategories = data.filter(item => item.parent_id === 0)
		hotCategories.value = parentCategories.slice(0, 8).map(item => ({
			id: item.id,
			name: item.name
		}))
	} catch (err) {
		console.error("加载分类失败", err)
	}
}

// 输入时实时搜索
const onInput = () => {
	if (searchTimer) clearTimeout(searchTimer)
	
	if (!keyword.value.trim()) {
		searchResult.value = []
		total.value = 0
		searching.value = false
		return
	}
	
	searching.value = true
	searchResult.value = []
	
	searchTimer = setTimeout(() => doSearch(), 300)
}

const doSearch = async (isLoadMore = false) => {
	if (!keyword.value.trim() && !schoolId.value && !categoryId.value) {
		searchResult.value = []
		total.value = 0
		searching.value = false
		return
	}
	
	if (isLoadMore) {
		if (loadingMore.value || loadMoreStatus.value === 'noMore') return
		loadingMore.value = true
		loadMoreStatus.value = 'loading'
	} else {
		searching.value = true
		page.value = 1
	}
	
	try {
		const params = { 
			page: isLoadMore ? page.value : 1, 
			pageSize 
		}
		
		if (keyword.value.trim()) params.keyword = keyword.value.trim()
		if (schoolId.value) params.school_id = schoolId.value
		if (categoryId.value) params.category_id = categoryId.value
		
		const res = await searchServices(params)
		const list = res.list || res.data?.list || []
		const totalCount = res.total || res.data?.total || 0
		
		if (isLoadMore) {
			searchResult.value = [...searchResult.value, ...list]
			page.value++
		} else {
			searchResult.value = list
			page.value = 2
		}
		
		total.value = totalCount
		
		if (searchResult.value.length >= totalCount) {
			loadMoreStatus.value = 'noMore'
		} else {
			loadMoreStatus.value = 'more'
		}
		
		if (!isLoadMore && keyword.value.trim() && searchResult.value.length > 0) {
			saveHistory(keyword.value.trim())
		}
		
	} catch (err) {
		console.error("搜索失败:", err)
		if (!isLoadMore) {
			searchResult.value = []
		}
		loadMoreStatus.value = 'more'
	} finally {
		if (isLoadMore) {
			loadingMore.value = false
		} else {
			searching.value = false
		}
	}
}

// 在 doSearch 函数后面添加：
const loadMore = () => {
	if (loadMoreStatus.value === 'more' && !loadingMore.value) {
		doSearch(true)
	}
}

// 加载历史
const loadHistory = () => {
	try {
		const history = uni.getStorageSync("serviceSearchHistory")
		historyList.value = history ? JSON.parse(history) : []
	} catch (e) {
		historyList.value = []
	}
}

const saveHistory = (kw) => {
	if (!kw.trim()) return
	try {
		let history = [kw, ...historyList.value.filter(k => k !== kw)]
		history = history.slice(0, 10)
		uni.setStorageSync("serviceSearchHistory", JSON.stringify(history))
		historyList.value = history
	} catch (e) {}
}

const clearHistory = () => {
	uni.showModal({
		title: "提示",
		content: "是否清空历史搜索？",
		success: (res) => {
			if (res.confirm) {
				uni.removeStorageSync("serviceSearchHistory")
				historyList.value = []
			}
		}
	})
}

const clearKeyword = () => {
	keyword.value = ""
	searchResult.value = []
	total.value = 0
	searching.value = false
}

const clickHistory = (value) => {
	keyword.value = value
	doSearch()
}

const searchByKeyword = (kw) => {
	keyword.value = kw
	doSearch()
}

const selectService = (serviceId) => {
	if (keyword.value.trim()) saveHistory(keyword.value.trim())
	uni.navigateTo({ url: `/pages/service-detail/service-detail?id=${serviceId}` })
}

// 页面加载
onLoad(() => {
	loadHistory()
	loadHotCategories()
})

// 页面显示时
onShow(() => {
	const selectedSchool = uni.getStorageSync('selectedSchool')
	if (selectedSchool) {
		if (selectedSchool.id) {
			schoolId.value = selectedSchool.id
			schoolName.value = selectedSchool.name
		} else {
			schoolId.value = ""
			schoolName.value = ""
		}
		uni.removeStorageSync('selectedSchool')
		doSearch()
	}
})

onMounted(() => {
	uni.$on('homeSchoolSelected', handleSchoolSelected)
})

onUnmounted(() => {
	if (searchTimer) clearTimeout(searchTimer)
	uni.$off('homeSchoolSelected', handleSchoolSelected)
})
</script>

<style lang="scss" scoped>
.searchLayout {
	min-height: 100vh;
	background-color: #fff;
}

.search-box {
	display: flex;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: #fff;
	border-bottom: 1rpx solid #eee;
	
	.input {
		flex: 1;
		margin-left: 16rpx;
		font-size: 28rpx;
	}
	
	.clear-btn {
		width: 40rpx;
		height: 40rpx;
		line-height: 40rpx;
		text-align: center;
		background-color: #ddd;
		color: #fff;
		border-radius: 50%;
		font-size: 24rpx;
	}
}

.filter-bar {
	display: flex;
	background-color: #fff;
	padding: 16rpx 30rpx;
	border-bottom: 1rpx solid #eee;
	
	.filter-item {
		flex: 1;
		
		.filter-content {
			display: flex;
			align-items: center;
			justify-content: center;
			
			.filter-text {
				font-size: 26rpx;
				color: #666;
				margin-right: 6rpx;
				
				&.active {
					color: #07c160;
					font-weight: 500;
				}
			}
		}
	}
}

.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx;
	
	.loading-spinner {
		width: 60rpx;
		height: 60rpx;
		border: 4rpx solid #f0f0f0;
		border-top-color: #07c160;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 20rpx;
	}
	
	.loading-text {
		font-size: 28rpx;
		color: #999;
	}
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.result-list {
	position: absolute;
	top: 160rpx;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #fff;
	z-index: 10;
	overflow-y: auto; 
}

.result-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: #f9f9f9;
	border-bottom: 1rpx solid #eee;
	
	.result-count {
		font-size: 26rpx;
		color: #999;
	}
	
	.clear-filter {
		font-size: 26rpx;
		color: #07c160;
	}
}

.card-list {
	padding: 20rpx;
	background-color: #fff;
}

.initial-view {
	padding: 30rpx;
}

.search-tips {
	display: flex;
	align-items: center;
	padding: 10rpx 0;
	margin-bottom: 30rpx;
	
	.tips-text {
		font-size: 24rpx;
		color: #999;
		margin-left: 8rpx;
	}
}

.section-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
	margin-bottom: 20rpx;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	
	.tag {
		background: #f5f5f5;
		font-size: 26rpx;
		color: #666;
		padding: 12rpx 28rpx;
		border-radius: 40rpx;
		margin-right: 20rpx;
		margin-bottom: 20rpx;
		
		&:active {
			background: #e0e0e0;
			transform: scale(0.95);
		}
		
		&.hot-tag {
			background: #fff3e0;
			color: #ff6b00;
		}
		
		&.category-tag {
			background: #e8f5e9;
			color: #2e7d32;
		}
	}
}

.history, .hot-searches, .hot-categories {
	margin-bottom: 40rpx;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx;
	
	.empty-img {
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 30rpx;
	}
	
	.empty-title {
		font-size: 32rpx;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.empty-desc {
		font-size: 26rpx;
		color: #999;
	}
}
</style>