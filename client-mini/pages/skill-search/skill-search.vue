<template>
	<view class="searchLayout">
		<!-- 搜索框 -->
		<view class="search-box">
			<uni-icons type="search" size="18" color="#999"></uni-icons>
			<input 
				class="input"
				v-model="keyword"
				type="text"
				placeholder="搜索学校、技能、分类..."
				@input="onInput"
				focus
			/>
			<text v-if="keyword" class="clear-btn" @click="clearKeyword">✕</text>
		</view>

		<!-- 搜索中加载动画 -->
		<view class="loading-state" v-if="searching">
			<view class="loading-spinner"></view>
			<text class="loading-text">搜索中...</text>
		</view>

		<!-- 实时搜索结果列表 -->
		<scroll-view class="result-list" scroll-y v-else-if="searchResult.length">
			<view class="result-header">
				<text class="result-count">共找到 {{ searchResult.length }} 个相关服务</text>
			</view>
			<view 
				class="result-item" 
				v-for="service in searchResult" 
				:key="service.id"
				@click="selectService(service)"
			>
				<image class="service-image" :src="getImageUrl(service.images?.[0])" mode="aspectFill" lazy-load></image>
				<view class="service-info">
					<view class="service-title">
						<rich-text :nodes="highlightKeyword(service.title)"></rich-text>
					</view>
					<view class="service-price">￥{{ service.price }}</view>
					<view class="service-meta">
						<text class="service-user">{{ service.user_nickname || '匿名用户' }}</text>
						<text class="service-school">{{ service.school_name || '本校' }}</text>
						<text class="service-category" v-if="service.category_name">{{ service.category_name }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 无搜索结果 -->
		<view class="empty" v-else-if="keyword && !searchResult.length && !searching">
			<image src="/static/empty-search.png" mode="aspectFit" class="empty-img"></image>
			<text class="empty-title">没有找到相关服务</text>
			<text class="empty-desc">试试搜索其他关键词吧</text>
		</view>

		<!-- 初始状态：显示搜索建议 -->
		<view v-else class="initial-view">
			<!-- 搜索建议 -->
			<view class="search-tips">
				<text class="tips-icon">💡</text>
				<text class="tips-text">支持组合搜索，如"北京PPT"、"上海代拿"</text>
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
				<view class="section-title">🔥 热门搜索</view>
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
				<view class="section-title">📂 热门分类</view>
				<view class="tags">
					<view 
						class="tag category-tag" 
						v-for="item in hotCategories" 
						:key="item.id"
						@click="searchByCategory(item)"
					>
						{{ item.name }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onUnmounted } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import { searchServices } from "@/api/service.js"
import { getCategoryList } from "@/api/category.js"
import { getImageUrl } from '@/utils/request.js'

const keyword = ref("")
const searchResult = ref([])
const searching = ref(false)
const historyList = ref([])
const hotSearches = ref(["英语辅导", "Python", "考研数学", "代取快递", "PPT制作", "摄影", "健身", "吉他"])
const hotCategories = ref([])

// 防抖定时器
let searchTimer = null

// 高亮关键词
const highlightKeyword = (text) => {
	if (!text) return text
	if (!keyword.value || !keyword.value.trim()) return text
	
	const kw = keyword.value.trim()
	const words = kw.split(/[\s,，、]+/).filter(w => w.length >= 1)
	
	if (words.length === 0) return text
	
	let result = text
	words.forEach(word => {
		try {
			const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			const regex = new RegExp(`(${escapedWord})`, 'gi')
			result = result.replace(regex, '<span style="color: #ff4d4f; font-weight: 500;">$1</span>')
		} catch (e) {}
	})
	
	return result
}

// 加载热门分类
const loadHotCategories = async () => {
	try {
		const res = await getCategoryList()
		// 取前8个作为热门分类
		hotCategories.value = res.slice(0, 8).map(item => ({
			id: item.id,
			name: item.name
		}))
	} catch (err) {
		console.error("加载分类失败", err)
	}
}

// 统一的搜索方法
const doSearch = async (searchText) => {
	if (!searchText.trim()) {
		searchResult.value = []
		searching.value = false
		return
	}
	
	searching.value = true
	searchResult.value = []
	
	try {
		const res = await searchServices({ 
			keyword: searchText.trim(),
			pageSize: 30
		})
		
		searchResult.value = res.list || []
		
		// 保存搜索历史
		if (searchResult.value.length > 0) {
			saveHistory(searchText.trim())
		}
		
	} catch (err) {
		console.error("搜索失败:", err)
		searchResult.value = []
	} finally {
		searching.value = false
	}
}

// 输入时实时搜索（带防抖）
const onInput = () => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
	
	if (!keyword.value.trim()) {
		searchResult.value = []
		searching.value = false
		return
	}
	
	searching.value = true
	searchResult.value = []
	
	searchTimer = setTimeout(() => {
		doSearch(keyword.value)
	}, 300)
}

// 页面卸载时清除定时器
onUnmounted(() => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
})

// 加载历史搜索
const loadHistory = () => {
	try {
		const history = uni.getStorageSync("serviceSearchHistory")
		historyList.value = history ? JSON.parse(history) : []
	} catch (e) {
		historyList.value = []
	}
}

// 保存历史搜索
const saveHistory = (kw) => {
	if (!kw.trim()) return
	
	try {
		let history = [kw, ...historyList.value.filter(k => k !== kw)]
		history = history.slice(0, 10)
		uni.setStorageSync("serviceSearchHistory", JSON.stringify(history))
		historyList.value = history
	} catch (e) {}
}

// 清空历史
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

// 清空输入框
const clearKeyword = () => {
	keyword.value = ""
	searchResult.value = []
	searching.value = false
}

// 点击历史词
const clickHistory = (value) => {
	keyword.value = value
	doSearch(value)
}

// 按关键词搜索
const searchByKeyword = (kw) => {
	keyword.value = kw
	doSearch(kw)
}

// 按分类搜索
const searchByCategory = (category) => {
	keyword.value = category.name
	doSearch(category.name)
}

// 选择服务
const selectService = (service) => {
	saveHistory(keyword.value)
	
	uni.navigateTo({
		url: `/pages/service-detail/service-detail?id=${service.id}`
	})
}

// 页面加载
onLoad(() => {
	loadHistory()
	loadHotCategories()
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

/* 加载状态 */
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

/* 搜索结果列表 */
.result-list {
	position: absolute;
	top: 100rpx;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #fff;
	z-index: 10;
}

.result-header {
	padding: 20rpx 30rpx;
	background-color: #f9f9f9;
	border-bottom: 1rpx solid #eee;
	
	.result-count {
		font-size: 26rpx;
		color: #999;
	}
}

.result-item {
	display: flex;
	padding: 30rpx;
	border-bottom: 1rpx solid #eee;
	
	&:active {
		background-color: #f5f5f5;
	}
	
	.service-image {
		width: 160rpx;
		height: 160rpx;
		border-radius: 12rpx;
		margin-right: 20rpx;
		flex-shrink: 0;
		background-color: #f0f0f0;
	}
	
	.service-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		
		.service-title {
			font-size: 30rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 8rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		}
		
		.service-price {
			font-size: 32rpx;
			color: #ff4d4f;
			font-weight: 600;
			margin-bottom: 8rpx;
		}
		
		.service-meta {
			display: flex;
			flex-wrap: wrap;
			gap: 16rpx;
			font-size: 24rpx;
			color: #999;
			
			.service-category {
				color: #07c160;
			}
		}
	}
}

/* 初始视图 */
.initial-view {
	padding: 30rpx;
}

.search-tips {
	display: flex;
	align-items: center;
	background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
	border-radius: 16rpx;
	padding: 20rpx 30rpx;
	margin-bottom: 30rpx;
	
	.tips-icon {
		font-size: 36rpx;
		margin-right: 16rpx;
	}
	
	.tips-text {
		font-size: 26rpx;
		color: #333;
		flex: 1;
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