<template>
	<view class="searchLayout">
		<!-- 搜索框 -->
		<view class="search-box">
			<uni-icons type="search" size="18" color="#999"></uni-icons>
			<input 
				class="input"
				v-model="keyword"
				type="text"
				placeholder="搜索技能..."
				@input="onInput"
				focus
			/>
			<text v-if="keyword" class="clear-btn" @click="clearKeyword">✕</text>
		</view>

		<!-- 实时搜索结果列表 -->
		<scroll-view class="result-list" scroll-y v-if="searchResult.length">
			<view 
				class="result-item" 
				v-for="service in searchResult" 
				:key="service.id"
				@click="selectService(service)"
			>
				<image class="service-image" :src="getImageUrl(service.images?.[0])" mode="aspectFill" lazy-load></image>
				<view class="service-info">
					<view class="service-title">{{ service.title }}</view>
					<view class="service-price">￥{{ service.price }}</view>
					<view class="service-meta">
						<text class="service-user">{{ service.user_nickname }}</text>
						<text class="service-school">{{ service.school_name || '本校' }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<!-- 无搜索结果 -->
		<view class="empty" v-else-if="keyword && !searchResult.length">
			<text>没有找到相关技能</text>
		</view>

		<!-- 初始状态：显示搜索建议 -->
		<view v-else class="initial-view">
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
						class="tag" 
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
						class="tag" 
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
import { getParentCategories } from "@/api/category.js"
import { getImageUrl } from '@/utils/request.js'  // 加上这行

const keyword = ref("")
const searchResult = ref([])
const historyList = ref([])
const hotSearches = ref(["英语", "数学", "编程", "考研", "代取快递", "PPT制作"])
const hotCategories = ref([])

// 添加防抖相关变量
let searchTimer = null

// 输入时实时搜索（带防抖）
const onInput = () => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
	
	if (!keyword.value.trim()) {
		searchResult.value = []
		return
	}
	
	searchTimer = setTimeout(async () => {
		try {
			const res = await searchServices({ keyword: keyword.value })
			searchResult.value = res.list || []
		} catch (err) {
			console.error("搜索失败", err)
		}
	}, 300)
}

// 页面卸载时清除定时器
onUnmounted(() => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
})

// 加载热门分类（直接用父分类的前6个）
const loadHotCategories = async () => {
	try {
		const res = await getParentCategories()
		hotCategories.value = res.slice(0, 6).map(item => ({
			id: item.id,
			name: item.name
		}))
	} catch (err) {
		console.error("加载热门分类失败", err)
	}
}

// 加载历史搜索
const loadHistory = () => {
	const history = uni.getStorageSync("serviceSearchHistory")
	historyList.value = history ? JSON.parse(history) : []
}

// 保存历史搜索
const saveHistory = (keyword) => {
	if (!keyword.trim()) return
	
	let history = [keyword, ...historyList.value.filter(k => k !== keyword)]
	history = history.slice(0, 10)
	
	uni.setStorageSync("serviceSearchHistory", JSON.stringify(history))
	historyList.value = history
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
}

// 点击历史词
const clickHistory = (value) => {
	keyword.value = value
	searchByKeyword(value)
}

// 按关键词搜索（同时支持分类名）
const searchByKeyword = async (kw) => {
	keyword.value = kw
	saveHistory(kw)
	
	try {
		// 先尝试按关键词搜索
		const res = await searchServices({ keyword: kw })
		
		// 如果没结果，而且kw正好是某个分类名，则按分类ID搜索
		if (res.list.length === 0) {
			// 检查kw是否是某个分类的名称
			const matchedCategory = hotCategories.value.find(c => c.name === kw)
			if (matchedCategory) {
				// 按分类ID搜索
				const categoryRes = await searchServices({ 
					category_id: matchedCategory.id 
				})
				searchResult.value = categoryRes.list || []
				return
			}
		}
		
		searchResult.value = res.list || []
	} catch (err) {
		console.error("搜索失败", err)
	}
}

// 按分类搜索 - 在当前页显示该分类的所有服务
const searchByCategory = async (category) => {
	// 把分类名填入搜索框（可选）
	keyword.value = category.name
	
	try {
		// 调用搜索接口，传入分类ID
		const res = await searchServices({ 
			category_id: category.id,
			pageSize: 20  // 可以多返回一些结果
		})
		searchResult.value = res.list || []
		
		// 可选：保存到历史
		saveHistory(category.name)
		
	} catch (err) {
		console.error("搜索分类失败", err)
	}
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
			white-space: nowrap;
		}
		
		.service-price {
			font-size: 32rpx;
			color: #ff4d4f;
			font-weight: 600;
			margin-bottom: 8rpx;
		}
		
		.service-meta {
			display: flex;
			font-size: 24rpx;
			color: #999;
			
			.service-user {
				margin-right: 20rpx;
			}
		}
	}
}

/* 初始视图 */
.initial-view {
	padding: 30rpx;
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
	}
}

.history, .hot-searches, .hot-categories {
	margin-bottom: 40rpx;
}

.empty {
	text-align: center;
	padding: 100rpx;
	color: #999;
}
</style>