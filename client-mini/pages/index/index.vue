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

			<!-- 横向滚动的分类，每页12个，可左右滑动翻页 -->
			<scroll-view class="category-scroll" scroll-x show-scrollbar="false" @scroll="onScroll"
				:scroll-into-view="'page' + currentPage" scroll-with-animation :enhanced="true" :bounces="false">
				<view class="category-page" v-for="(pageItems, pageIndex) in paginatedCategories" :key="pageIndex"
					:id="'page' + pageIndex">
					<view class="category-grid">
						<view class="category-item" v-for="item in pageItems" :key="item.id"
							@click="goToCategory(item.id,item.name)">
							<view class="category-icon" :style="{ backgroundColor: item.bgColor }">
								<text class="category-icon-text">{{ item.firstChar }}</text>
							</view>
							<text class="category-name">{{ item.name }}</text>
						</view>
					</view>
				</view>
			</scroll-view>

			<!-- 页码指示器 -->
			<view class="pagination" v-if="totalPages > 1">
				<view v-for="page in totalPages" :key="page" class="pagination-dot"
					:class="{ active: currentPage === page-1 }" @click="scrollToPage(page-1)"></view>
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
    onMounted,
    computed,
    nextTick
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
const isScrolling = ref(false)
const pageWidth = ref(750)

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
        nextTick(() => {
            getScrollViewWidth()
        })
    } catch (err) {
        console.error('加载分类失败', err)
    }
}

const getScrollViewWidth = () => {
    const query = uni.createSelectorQuery()
    query.select('.category-scroll').boundingClientRect()
    query.exec((res) => {
        if (res[0]) {
            pageWidth.value = res[0].width
        }
    })
}

const scrollToPage = (pageIndex) => {
    if (pageIndex === currentPage.value) return
    currentPage.value = pageIndex
}

let scrollTimer = null
const onScroll = (e) => {
    if (scrollTimer) return
    scrollTimer = setTimeout(() => {
        const scrollLeft = e.detail.scrollLeft
        const pageIndex = Math.round(scrollLeft / pageWidth.value)
        if (pageIndex !== currentPage.value && pageIndex >= 0 && pageIndex < totalPages.value) {
            currentPage.value = pageIndex
        }
        scrollTimer = null
    }, 50)
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

// 生命周期 - 只保留一个 onLoad
onLoad(() => {
    setupHomeSchoolListener()
    getRandomSaying()
    
    uni.$on('avatarUpdated', () => {
        page.value = 1
        loadServices(true)
    })
    
    // 页面加载时调用
    loadCategories()
    loadServices()
})

onUnload(() => {
    removeHomeSchoolListener()
    uni.$off('avatarUpdated')
})

onMounted(() => {
    // 已经在 onLoad 中调用了，这里不需要重复
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

			/* 横向滚动容器 - 隐藏滚动条 */
			.category-scroll {
				width: 100%;
				white-space: nowrap;
				margin-bottom: 20rpx;

				/* 隐藏滚动条 */
				::-webkit-scrollbar {
					display: none;
					width: 0;
					height: 0;
				}

				.category-page {
					display: inline-block;
					width: 100%;
					vertical-align: top;
				}
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

			/* 页码指示器 */
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
					transition: all 0.3s;

					&.active {
						width: 24rpx;
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
					/* 加上相对定位 */
					padding-left: 20rpx;
					/* 留出竖线的空间 */

					/* 添加同款竖线 */
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