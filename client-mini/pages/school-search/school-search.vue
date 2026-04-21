<template>
	<view class="searchLayout">
		<!-- 搜索框 -->
		<view class="search-box">
			<uni-icons type="search" size="20" color="#999"></uni-icons>
			<input 
				class="input"
				v-model="keyword"
				type="text"
				:placeholder="placeholderText"
				@input="onInput"
				focus
			/>
			<text v-if="keyword" class="clear-btn" @click="clearKeyword">✕</text>
		</view>

		<!-- 实时搜索结果下拉列表 -->
		<scroll-view class="result-list" scroll-y v-if="searchResult.length">
			<!-- ✅ 你的学校选项（快速切回本校） -->
			<view 
				v-if="fromPage === 'home' && userStore.userInfo?.school_id"
				class="result-item user-school"
				@click="selectUserSchool"
			>
				<view class="school-info">
					<text class="school-name">🏫 你的学校：{{ userStore.userInfo.school_name }}</text>
					<text class="school-city">快速切回</text>
				</view>
			</view>
			
			<!-- 全部学校选项（只有首页和发布页才显示在搜索结果顶部） -->
			<view 
				v-if="fromPage !== 'profile'"
				class="result-item all-school" 
				:class="{ 'current-school': currentSchoolId === null }"
				@click="selectAllSchool"
			>
				<view class="school-info">
					<text class="school-name">🌐 全部学校</text>
					<text class="school-city">显示所有服务</text>
				</view>
				<text v-if="currentSchoolId === null" class="current-tag">当前</text>
			</view>
			
			<view 
				class="result-item" 
				v-for="school in searchResult" 
				:key="school.id"
				:class="{ 'current-school': (fromPage === 'profile' && school.id === currentSchoolId) || (fromPage !== 'profile' && school.id === currentSchoolId) }"
				@click="selectSchool(school)"
			>
				<view class="school-info">
					<text class="school-name">{{ school.name }}</text>
					<text class="school-city">{{ school.city || '' }}</text>
				</view>
				<!-- 显示当前/已选标记 -->
				<text v-if="school.id === currentSchoolId" class="current-tag">
					{{ fromPage === 'profile' ? '当前学校' : '已选' }}
				</text>
			</view>
		</scroll-view>

		<!-- 无搜索结果 -->
		<view class="empty" v-else-if="keyword && !searchResult.length">
			<text>没有找到相关学校</text>
		</view>

		<!-- 初始状态：显示历史搜索和热门城市 -->
		<view v-else class="initial-view">
			<!-- 历史搜索 -->
			<view class="history" v-if="fromPage !== 'profile' || historyList.length">
				<view class="section-title">
					<text>最近搜索</text>
					<uni-icons type="trash" size="20" color="#999" @click="clearHistory"></uni-icons>
				</view>
				<view class="tags">
					<!-- 首页和发布页：第一个永远固定为"全部学校" -->
					<template v-if="fromPage !== 'profile'">
						<view 
							class="tag all-school-tag"
							:class="{ 'active-tag': currentSchoolId === null }"
							@click="selectAllSchool"
						>
							🌐 全部学校
						</view>
					</template>
					
					<!-- ✅ 你的学校标签 -->
					<template v-if="fromPage === 'home' && userStore.userInfo?.school_id">
						<view 
							class="tag user-school-tag"
							@click="selectUserSchool"
						>
							🏫 你的学校：{{ userStore.userInfo.school_name }}
						</view>
					</template>
					
					<!-- 显示历史搜索项 -->
					<view 
						class="tag" 
						v-for="item in historyList" 
						:key="item"
						:class="{ 'active-tag': item === currentSchoolName && fromPage !== 'profile' }"
						@click="clickHistory(item)"
					>
						{{ item }}
					</view>
				</view>
			</view>

			<!-- 热门城市 -->
			<view class="hot-cities">
				<view class="section-title">热门城市</view>
				<view class="tags">
					<view 
						class="tag" 
						v-for="city in hotCities" 
						:key="city"
						@click="searchByCity(city)"
					>
						{{ city }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onUnmounted } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import { searchSchools } from "@/api/school.js"
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const keyword = ref("")
const searchResult = ref([])
const historyList = ref([])
const fromPage = ref('')  // 记录从哪个页面来的
const currentSchoolId = ref(null)
const currentSchoolName = ref('')

const hotCities = ref(["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安"])

//防抖变量
let searchTimer = null

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
			const res = await searchSchools(keyword.value)
			searchResult.value = res || []
		} catch (err) {
			console.error('搜索失败', err)
		}
	}, 300)
}

// 页面卸载时清除定时器
onUnmounted(() => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
})

// 根据来源显示不同的占位符
const placeholderText = computed(() => {
	return fromPage.value === 'profile' ? '搜索学校以设置个人资料' : '搜索学校以筛选服务'
})

// 接收页面参数
onLoad((options) => {
	loadHistory()
	fromPage.value = options.from || 'home'
	
	// 接收当前学校ID和名称
	if (options.currentSchoolId && options.currentSchoolId !== 'null' && options.currentSchoolId !== 'undefined') {
		currentSchoolId.value = Number(options.currentSchoolId)
	} else {
		currentSchoolId.value = null
	}
	
	if (options.currentSchoolName) {
		currentSchoolName.value = decodeURIComponent(options.currentSchoolName)
	}
})

// 加载历史搜索
const loadHistory = () => {
	const history = uni.getStorageSync("schoolSearchHistory")
	historyList.value = history ? JSON.parse(history) : []
}

// 保存历史搜索
const saveHistory = (keyword) => {
	if (!keyword.trim() || keyword === '全部学校') return // 不保存"全部学校"
	
	let history = [keyword, ...historyList.value.filter(k => k !== keyword)]
	history = history.slice(0, 10)
	
	uni.setStorageSync("schoolSearchHistory", JSON.stringify(history))
	historyList.value = history
}

// 清空历史
const clearHistory = () => {
	uni.showModal({
		title: "提示",
		content: "是否清空历史搜索？",
		success: (res) => {
			if (res.confirm) {
				uni.removeStorageSync("schoolSearchHistory")
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
	searchByCity(value)
}

// 按城市搜索
const searchByCity = async (city) => {
	keyword.value = city
	saveHistory(city)
	
	try {
		const res = await searchSchools(city)
		searchResult.value = res || []
	} catch (err) {
		console.error("搜索失败", err)
	}
}

// ✅ 选择本校
const selectUserSchool = () => {
	uni.$emit('homeSchoolSelected', {
		name: userStore.userInfo.school_name,
		id: userStore.userInfo.school_id
	})
	uni.navigateBack()
}

// 选择全部学校
const selectAllSchool = () => {
	if (fromPage.value === 'profile') {
		uni.showToast({
			title: '请选择具体学校',
			icon: 'none'
		})
		return
	}
	
	if (fromPage.value === 'publish') {
		uni.$emit('publishSchoolSelected', null)
	} else {
		uni.$emit('homeSchoolSelected', null)
	}
	
	uni.navigateBack()
}

// 选择学校
const selectSchool = (school) => {
	saveHistory(school.name)
	
	if (fromPage.value === 'profile') {
		uni.$emit('profileSchoolSelected', {
			name: school.name,
			id: school.id,
			city: school.city
		})
	} else if (fromPage.value === 'publish') {
		uni.$emit('publishSchoolSelected', {
			name: school.name,
			id: school.id,
			city: school.city
		})
	} else {
		uni.$emit('homeSchoolSelected', {
			name: school.name,
			id: school.id,
			city: school.city
		})
	}
	
	uni.navigateBack()
}
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

/* 搜索结果下拉列表 */
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
	justify-content: space-between;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1rpx solid #eee;
	
	&.current-school {
		background-color: #f0f9f0;
	}
	
	&.all-school {
		background-color: #f9f9f9;
		border-bottom: 2rpx dashed #ddd;
		
		.school-name {
			font-weight: 500;
			color: #ff4d4f;
		}
	}
	
	// ✅ 你的学校样式
	&.user-school {
		background-color: #f0f9ff;
		border-bottom: 2rpx dashed #ddd;
		
		.school-name {
			color: #007aff;
			font-weight: 500;
		}
	}
	
	.current-tag {
		font-size: 24rpx;
		color: #07c160;
		background-color: #e8f8e8;
		padding: 4rpx 12rpx;
		border-radius: 20rpx;
	}
}

.school-info {
	flex: 1;
	display: flex;
	justify-content: space-between;
	align-items: center;
	
	.school-name {
		font-size: 30rpx;
		color: #333;
	}
	
	.school-city {
		font-size: 26rpx;
		color: #999;
		margin-right: 20rpx;
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
		
		&.all-school-tag {
			background: #fff7e6;
			color: #ff4d4f;
			font-weight: 500;
		}
		
		// ✅ 你的学校标签样式
		&.user-school-tag {
			background: #e6f2ff;
			color: #007aff;
			font-weight: 500;
		}
		
		&.active-tag {
			background: #e8f8e8;
			color: #07c160;
			font-weight: 500;
		}
	}
}

.history, .hot-cities {
	margin-bottom: 40rpx;
}

.empty {
	text-align: center;
	padding: 100rpx;
	color: #999;
}
</style>