<template>
	<view class="school-picker" v-if="visible" @click="close">
		<view class="picker-content" @click.stop>
			<view class="picker-header">
				<text class="picker-title">选择学校</text>
				<uni-icons type="closeempty" size="20" @click="close"></uni-icons>
			</view>
			
			<!-- 搜索框 -->
			<view class="search-box">
				<uni-icons type="search" size="16" color="#999"></uni-icons>
				<input 
					class="search-input"
					v-model="keyword"
					type="text"
					placeholder="输入学校名称搜索..."
					@input="onSearch"
				/>
				<text v-if="keyword" class="clear-btn" @click="clearKeyword">✕</text>
			</view>
			
			<!-- 搜索结果列表 -->
			<scroll-view scroll-y class="school-list" v-if="schoolList.length > 0">
				<view 
					class="school-item"
					v-for="school in schoolList"
					:key="school.id"
					@click="selectSchool(school)"
				>
					<view class="school-info">
						<text class="school-name">{{ school.name }}</text>
						<text class="school-city">{{ school.city || '' }}</text>
					</view>
				</view>
			</scroll-view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-else-if="keyword && !loading">
				<text>没有找到相关学校</text>
			</view>
			
			<!-- 加载中 -->
			<view class="loading-state" v-if="loading">
				<text>搜索中...</text>
			</view>
			
			<!-- 热门城市快捷选择 -->
			<view class="hot-cities" v-if="!keyword && schoolList.length === 0">
				<view class="section-title">热门城市</view>
				<view class="city-tags">
					<text 
						class="city-tag"
						v-for="city in hotCities"
						:key="city"
						@click="searchByCity(city)"
					>{{ city }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { searchSchools } from '@/api/school.js'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	},
	value: {
		type: Object,
		default: () => ({ id: '', name: '' })
	}
})

const emit = defineEmits(['update:visible', 'confirm'])

const keyword = ref('')
const schoolList = ref([])
const loading = ref(false)
const tempSelectedId = ref('')
const tempSelectedName = ref('')

const hotCities = ref(['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '天津'])

let searchTimer = null

// 监听 visible 变化，重置状态
watch(() => props.visible, (newVal) => {
	if (newVal) {
		// 打开时，如果有已选值，设置为临时选中
		if (props.value?.id) {
			tempSelectedId.value = props.value.id
			tempSelectedName.value = props.value.name
		} else {
			tempSelectedId.value = ''
			tempSelectedName.value = ''
		}
		keyword.value = ''
		schoolList.value = []
	}
})

// 搜索学校
const onSearch = () => {
	if (searchTimer) {
		clearTimeout(searchTimer)
	}
	
	if (!keyword.value.trim()) {
		schoolList.value = []
		return
	}
	
	searchTimer = setTimeout(async () => {
		loading.value = true
		try {
			const res = await searchSchools(keyword.value)
			schoolList.value = res || []
		} catch (err) {
			console.error('搜索学校失败', err)
			schoolList.value = []
		} finally {
			loading.value = false
		}
	}, 300)
}

// 按城市搜索
const searchByCity = (city) => {
	keyword.value = city
	onSearch()
}

// 清空关键词
const clearKeyword = () => {
	keyword.value = ''
	schoolList.value = []
}

// ✅ 选择学校 - 直接确认并关闭
const selectSchool = (school) => {
	emit('confirm', {
		id: school.id,
		name: school.name
	})
	close()
}

// 关闭弹窗
const close = () => {
	emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.school-picker {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 1000;
	display: flex;
	align-items: flex-end;
	
	.picker-content {
		width: 100%;
		height: 70vh;
		max-height: 70vh;
		background-color: #fff;
		border-radius: 30rpx 30rpx 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx;
		border-bottom: 1rpx solid #eee;
		flex-shrink: 0;
		
		.picker-title {
			font-size: 32rpx;
			font-weight: 500;
			color: #333;
		}
	}
	
	.search-box {
		display: flex;
		align-items: center;
		padding: 15rpx 30rpx;
		background-color: #f5f5f5;
		margin: 20rpx 30rpx;
		border-radius: 40rpx;
		flex-shrink: 0;
		
		.search-input {
			flex: 1;
			margin-left: 10rpx;
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
	
	.school-list {
		flex: 1;
		padding: 0 30rpx;
		min-height: 0;
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
		
		.school-item {
			display: flex;
			align-items: center;
			padding: 25rpx 0;
			border-bottom: 1rpx solid #f0f0f0;
			
			&:active {
				background-color: #f5f5f5;
			}
			
			.school-info {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: space-between;
				min-width: 0;
				width: 100%;
				padding-right: 10rpx;
				
				.school-name {
					font-size: 30rpx;
					color: #333;
					flex: 1;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					min-width: 0;
					margin-right: 20rpx;
				}
				
				.school-city {
					font-size: 24rpx;
					color: #999;
					flex-shrink: 0;
					margin-right: 80rpx;
					max-width: 140rpx;
				}
			}
		}
	}
	
	.empty-state, .loading-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 28rpx;
	}
	
	.hot-cities {
		flex: 1;
		padding: 30rpx;
		
		.section-title {
			font-size: 28rpx;
			color: #666;
			margin-bottom: 20rpx;
		}
		
		.city-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 20rpx;
			
			.city-tag {
				background-color: #f5f5f5;
				padding: 15rpx 50rpx;
				border-radius: 40rpx;
				font-size: 26rpx;
				color: #666;
				
				&:active {
					background-color: #e0e0e0;
				}
			}
		}
	}
}
</style>