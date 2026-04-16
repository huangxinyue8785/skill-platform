<template>
	<view class="container pageBg">
		<custom-nav-bar :schoolName="currentSchool" placeholder="搜索技能..." @schoolClick="goToSchoolSearch"
			@searchClick="goToSkillSearch" />

		<!-- 主要内容 -->
		<view class="main-content">
			<!-- 分类导航 -->
			<view class="section-title">
				<text class="title-text">分类浏览</text>
				<text class="campus-tag" @click="goToCampusHot">
					{{ randomSaying }}
				</text>
			</view>

			<!-- 使用 swiper 实现分类翻页，丝滑不卡顿 -->
			<swiper 
				class="category-swiper" 
				:current="currentPage" 
				@change="onSwiperChange"
				:indicator-dots="false"
				:autoplay="false"
				:circular="false"
				:duration="300"
				:style="{ height: swiperHeight + 'rpx' }"
			>
				<swiper-item v-for="(pageItems, pageIndex) in paginatedCategories" :key="pageIndex">
					<view class="category-grid" :id="'grid-' + pageIndex">
						<view class="category-item" v-for="item in pageItems" :key="item.id"
							@click="goToCategory(item.id,item.name)">
							<view class="category-icon" :style="{ backgroundColor: item.bgColor }">
								<text class="category-icon-text">{{ item.firstChar }}</text>
							</view>
							<text class="category-name">{{ item.name }}</text>
						</view>
					</view>
				</swiper-item>
			</swiper>

			<!-- 页码指示器 - 正圆点 -->
			<view class="pagination" v-if="totalPages > 1">
				<view 
					v-for="page in totalPages" 
					:key="page" 
					class="pagination-dot"
					:class="{ active: currentPage === page-1 }" 
					@click="scrollToPage(page-1)"
				></view>
			</view>

			<view class="divider"></view>

			<view class="recommend-title">
				<text class="recommend-text">推荐服务</text>
				<text class="recommend-count">共{{total}}个服务</text>
			</view>

			<view class="service-list">
				<service-card v-for="item in serviceList" :key="item.id" :service="item"
					@click="goToDetail"></service-card>
			</view>

			<!-- 加载更多 -->
			<uni-load-more :status="loadMoreStatus" :content-text="{
								contentdown: '上拉加载更多',
								contentrefresh: '加载中...',
								contentnomore: '没有更多了'
							}"></uni-load-more>

			<!-- 空状态 -->
			<view class="empty-state" v-if="serviceList.length === 0 && !loading">
				<image src="/static/empty.png" mode="aspectFit"></image>
				<text>暂无服务</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import {
    ref,
    computed,
    nextTick,
    watch
} from 'vue'
import {
    onLoad,
    onUnload,
    onPullDownRefresh,
    onReachBottom
} from '@dcloudio/uni-app'
import {
    getParentCategories
} from '@/api/category.js'
import {
    getServiceList
} from '@/api/service.js'
import ServiceCard from '@/components/service-card/service-card.vue'

const currentSchool = ref('全部学校')
const currentSchoolId = ref(null)
const categoryList = ref([])
const serviceList = ref([])
const loading = ref(false)
const loadMoreStatus = ref('more')
const page = ref(1)
const pageSize = 10
const total = ref(0)

const campusSayings = [
    '今天没课，赚点生活费💰',
    '月底了，接个单回回血',
    '技能换奶茶🍵',
    '搞钱要紧!',
    '同学，接单吗?',
    '赚杯奶茶钱...',
    '今日宜搞钱'
]

const randomSaying = ref('')

const getRandomSaying = () => {
    const randomIndex = Math.floor(Math.random() * campusSayings.length)
    randomSaying.value = campusSayings[randomIndex]
}

// 分类分页相关
const currentPage = ref(0)
const itemsPerPage = 12
const swiperHeight = ref(400) // 默认高度，单位rpx

const bgColors = [
    '#FFE4E1', '#E0F7FA', '#E8F5E9', '#FFF3E0',
    '#F3E5F5', '#FFEBEE', '#E0F2F1', '#E1F5FE',
    '#FFE0B2', '#D7CCC8', '#F8BBD9', '#C8E6C9'
]

const paginatedCategories = computed(() => {
    const pages = []
    for (let i = 0; i < categoryList.value.length; i += itemsPerPage) {
        pages.push(categoryList.value.slice(i, i + itemsPerPage))
    }
    return pages
})

const totalPages = computed(() => Math.ceil(categoryList.value.length / itemsPerPage))

const getFirstChar = (name) => {
    if (!name) return '类'
    if (/[\u4e00-\u9fa5]/.test(name)) {
        return name.charAt(0)
    }
    return name.substring(0, 2).toUpperCase()
}

// 计算 swiper 实际高度
const calculateSwiperHeight = () => {
    nextTick(() => {
        const query = uni.createSelectorQuery()
        // 获取第一个网格的实际高度
        query.select('#grid-0').boundingClientRect()
        query.exec((res) => {
            if (res[0] && res[0].height) {
                // 转换为rpx (750rpx设计稿)
                const systemInfo = uni.getSystemInfoSync()
                const rpxRatio = 750 / systemInfo.windowWidth
                swiperHeight.value = Math.ceil(res[0].height * rpxRatio) + 20 // 加一点内边距
            } else {
                // 如果获取失败，根据行数计算
                const rows = Math.ceil(itemsPerPage / 4)
                swiperHeight.value = rows * 180 + (rows - 1) * 30 + 40
            }
        })
    })
}

const loadCategories = async () => {
    try {
        const res = await getParentCategories()
        categoryList.value = res.map((item, index) => ({
            id: item.id,
            name: item.name,
            firstChar: getFirstChar(item.name),
            bgColor: bgColors[index % bgColors.length]
        }))
        currentPage.value = 0
        
        // 等待DOM渲染完成后计算高度
        nextTick(() => {
            setTimeout(() => {
                calculateSwiperHeight()
            }, 100)
        })
    } catch (err) {
        console.error('加载分类失败', err)
    }
}

// 监听分类数据变化，重新计算高度
watch(categoryList, () => {
    if (categoryList.value.length > 0) {
        setTimeout(() => {
            calculateSwiperHeight()
        }, 100)
    }
}, { deep: true })

// swiper 切换事件
const onSwiperChange = (e) => {
    currentPage.value = e.detail.current
}

const scrollToPage = (pageIndex) => {
    if (pageIndex === currentPage.value) return
    currentPage.value = pageIndex
}

const loadServices = async (isRefresh = false) => {
    if (loading.value) return

    loading.value = true
    loadMoreStatus.value = 'loading'

    try {
        const params = {
            page: isRefresh ? 1 : page.value,
            pageSize,
        }

        if (currentSchoolId.value) {
            params.school_id = currentSchoolId.value
        }

        const res = await getServiceList(params)

        if (isRefresh) {
            serviceList.value = res.list || []
            page.value = 2
        } else {
            serviceList.value = [...serviceList.value, ...(res.list || [])]
            page.value++
        }

        total.value = res.total || 0

        if (serviceList.value.length >= (res.total || 0)) {
            loadMoreStatus.value = 'noMore'
        } else {
            loadMoreStatus.value = 'more'
        }

    } catch (err) {
        console.error('加载服务列表失败', err)
        loadMoreStatus.value = 'more'
    } finally {
        loading.value = false
        uni.stopPullDownRefresh()
    }
}

const goToSchoolSearch = () => {
    uni.navigateTo({
        url: `/pages/school-search/school-search?from=home&currentSchoolId=${currentSchoolId.value || 'null'}&currentSchoolName=${encodeURIComponent(currentSchool.value)}`
    })
}

const goToSkillSearch = () => {
    uni.navigateTo({
        url: '/pages/skill-search/skill-search'
    })
}

const goToDetail = (id) => {
    uni.navigateTo({
        url: `/pages/service-detail/service-detail?id=${id}`
    })
}

const goToCategory = (categoryId, categoryName) => {
    uni.navigateTo({
        url: `/pages/category-list/category-list?id=${categoryId}&name=${encodeURIComponent(categoryName)}`
    })
}

const goToCampusHot = () => {
    uni.showToast({
        title: '开发中',
        icon: 'none'
    })
}

const setupHomeSchoolListener = () => {
    uni.$on('homeSchoolSelected', (school) => {
        if (school === null) {
            currentSchool.value = '全部学校'
            currentSchoolId.value = null
        } else {
            currentSchool.value = school.name
            currentSchoolId.value = school.id
        }
        page.value = 1
        loadServices(true)
        uni.showToast({
            title: school === null ? '已切换为全部学校' : `已切换到：${school.name}`,
            icon: 'none'
        })
    })
}

const removeHomeSchoolListener = () => {
    uni.$off('homeSchoolSelected')
}

onLoad(() => {
    setupHomeSchoolListener()
    getRandomSaying()
    
    uni.$on('avatarUpdated', () => {
        page.value = 1
        loadServices(true)
    })
    
    loadCategories()
    loadServices()
})

onUnload(() => {
    removeHomeSchoolListener()
    uni.$off('avatarUpdated')
})

onPullDownRefresh(() => {
    page.value = 1
    loadServices(true)
})

onReachBottom(() => {
    if (loadMoreStatus.value === 'more') {
        loadServices()
    }
})
</script>

<style lang="scss" scoped>
	.container {
		min-height: 100vh;
		background-color: #f5f5f5;

		.main-content {
			padding: 90rpx 20rpx 0;

			.section-title {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20rpx;
				padding: 0 10rpx;

				.title-text {
					font-size: 32rpx;
					font-weight: 600;
					color: #333;
					position: relative;
					padding-left: 20rpx;

					&::before {
						content: '';
						position: absolute;
						left: 0;
						top: 50%;
						transform: translateY(-50%);
						width: 8rpx;
						height: 40rpx;
						background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
						border-radius: 4rpx;
					}
				}

				.campus-tag {
					font-size: 24rpx;
					color: #888a88;
					padding: 10rpx 20rpx;
					border-radius: 30rpx;
				}
			}

			/* swiper 容器 */
			.category-swiper {
				width: 100%;
				margin-bottom: 20rpx;
			}

			/* 网格布局（每页12个） */
			.category-grid {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 30rpx 20rpx;
				padding: 0 10rpx;

				.category-item {
					display: flex;
					flex-direction: column;
					align-items: center;
					text-align: center;

					.category-icon {
						width: 90rpx;
						height: 90rpx;
						border-radius: 60rpx;
						display: flex;
						align-items: center;
						justify-content: center;
						margin-bottom: 16rpx;
						box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

						.category-icon-text {
							font-size: 40rpx;
							font-weight: 500;
							color: #333;
						}
					}

					.category-name {
						font-size: 26rpx;
						color: #666;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
						width: 100%;
					}
				}
			}

			/* 页码指示器 - 纯圆点 */
			.pagination {
				display: flex;
				justify-content: center;
				align-items: center;
				gap: 16rpx;
				margin: 20rpx 0 30rpx;

				.pagination-dot {
					width: 12rpx;
					height: 12rpx;
					border-radius: 50%;
					background-color: #ddd;
					transition: background-color 0.3s;

					&.active {
						width: 12rpx;
						height: 12rpx;
						background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
					}
				}
			}

			/* 推荐服务标题 */
			.recommend-title {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin: 20rpx 0 30rpx;
				padding: 0 10rpx;

				.recommend-text {
					font-size: 32rpx;
					font-weight: 600;
					color: #333;
					position: relative;
					padding-left: 20rpx;

					&::before {
						content: '';
						position: absolute;
						left: 0;
						top: 50%;
						transform: translateY(-50%);
						width: 8rpx;
						height: 40rpx;
						background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
						border-radius: 4rpx;
					}
				}

				.recommend-count {
					font-size: 24rpx;
					color: #999;
				}
			}

			.service-list {
				display: flex;
				flex-direction: column;
				gap: 20rpx;
			}

			.empty-state {
				text-align: center;
				padding: 100rpx 0;

				image {
					width: 200rpx;
					height: 200rpx;
					margin-bottom: 20rpx;
				}

				text {
					font-size: 28rpx;
					color: #999;
				}
			}
		}
	}
</style>