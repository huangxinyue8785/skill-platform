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
			
			<!-- 本校无服务时的提示（仅登录用户显示） -->
			<view class="expand-tip" v-if="userStore.token && selfServices.length === 0 && otherServices.length > 0">
			    <text class="expand-tip-text">📢 您的学校暂无服务，为您推荐{{ expandCity || expandProvince }}其他学校的服务</text>
			</view>
			
			<!-- 本校服务 -->
			<view class="service-list" v-if="selfServices.length > 0">
			    <service-card 
			        v-for="item in selfServices" 
			        :key="item.id" 
			        :service="item"
			        @click="goToDetail"
			    ></service-card>
			</view>
			
			<!-- 同城服务分割线 -->
			<view class="city-divider" v-if="userStore.token && otherServices.length > 0 && selfServices.length > 0">
			    <view class="divider-line"></view>
			    <text class="divider-text">为您推荐{{ expandCity || expandProvince }}其他学校的服务</text>
			    <view class="divider-line"></view>
			</view>
			
			<!-- 同城其他学校服务 -->
			<view class="service-list" v-if="otherServices.length > 0">
			    <service-card 
			        v-for="item in otherServices" 
			        :key="item.id" 
			        :service="item"
			        @click="goToDetail"
			    ></service-card>
			</view>
			
			<!-- 加载更多 - 只在有数据时显示 -->
			<uni-load-more 
			    v-if="serviceList.length > 0"
			    :status="loadMoreStatus" 
			    :content-text="{
			        contentdown: '上拉加载更多',
			        contentrefresh: '加载中...',
			        contentnomore: '没有更多了'
			    }"
			></uni-load-more>
			
			<!-- ✅ 空状态 -->
			<view class="empty-state" v-if="serviceList.length === 0 && !loading">
			    <image src="/static/empty.png" mode="aspectFit" class="empty-image"></image>
			    
			    <!-- 手动选择的学校无服务 -->
			    <template v-if="isManualSchoolChange">
			        <text class="empty-text">该学校暂无服务</text>
			        <text class="empty-desc">去看看其他学校吧</text>
			    </template>
			    <!-- 本校无服务，同城/同省也无服务 -->
			    <template v-else>
			        <text class="empty-text">暂无服务</text>
			        <text class="empty-desc">{{ expandCity ? expandCity + '暂无服务' : '该地区暂无服务' }}，去看看其他学校吧</text>
			    </template>
			    
			    <!-- 按钮 -->
			    <view class="empty-actions">
			        <button class="action-btn" @click="goToSchoolSearch">搜索其他学校</button>
			        <button class="action-btn secondary" @click="showAllServices">查看全部服务</button>
			    </view>
			</view>
		</view>
		
		<back-top 
		    :visible="scrollTop > 500" 
		    :bottom="140" 
		    @click="scrollToTop"
		></back-top>
	</view>
</template>

<script setup>
import { getUserInfo } from '@/api/user.js'
import {
    ref,
    computed,
    nextTick,
    watch
} from 'vue'
import {
    onLoad,
	onShow, 
    onUnload,
    onPullDownRefresh,
    onReachBottom,
	onPageScroll 
} from '@dcloudio/uni-app'
import {
    getParentCategories
} from '@/api/category.js'
import {
    getServiceList
} from '@/api/service.js'
import ServiceCard from '@/components/service-card/service-card.vue'
import BackTop from '@/components/back-top/back-top.vue'
import { useUserStore } from '@/stores/user'

const currentSchool = ref('全部学校')
const currentSchoolId = ref(null)

const userStore = useUserStore()
const isManualSchoolChange = ref(false) 

const isExpandedRecommend = ref(false)
const expandCity = ref('')
const expandProvince = ref('')
const selfServiceCount = ref(0)
const scrollTop = ref(0)

// ✅ 拆分本校服务和同城服务
const selfServices = computed(() => {
    if (!currentSchoolId.value) return []
    return serviceList.value.filter(item => item.school_id === currentSchoolId.value)
})

const otherServices = computed(() => {
    if (!currentSchoolId.value) return serviceList.value
    return serviceList.value.filter(item => item.school_id !== currentSchoolId.value)
})

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
    console.log('=== loadServices 被调用 ===')
    console.log('isRefresh:', isRefresh)
    console.log('currentSchoolId:', currentSchoolId.value)

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

        console.log('请求参数:', params)

        const res = await getServiceList(params)
        console.log('返回数据:', res.list?.length, '条')
		
		isExpandedRecommend.value = res.isExpanded || false
		expandCity.value = res.expandCity || ''
		expandProvince.value = res.expandProvince || ''
		selfServiceCount.value = res.selfServiceCount || 0 
		
		// 如果是手动选择学校，不显示扩展提示
		if (isManualSchoolChange.value) {
		    isExpandedRecommend.value = false
		}

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

const scrollToTop = () => {
    uni.pageScrollTo({
        scrollTop: 0,
        duration: 300
    })
}

const showAllServices = () => {
    isManualSchoolChange.value = true
    currentSchool.value = '全部学校'
    currentSchoolId.value = null
    page.value = 1
    loadServices(true)
}

const setupHomeSchoolListener = () => {
    uni.$on('homeSchoolSelected', (school) => {
		isManualSchoolChange.value = true
		
        console.log('=== 收到 homeSchoolSelected 事件 ===')
        console.log('school:', school)
        
        if (school === null) {
            currentSchool.value = '全部学校'
            currentSchoolId.value = null
        } else {
            currentSchool.value = school.name
            currentSchoolId.value = school.id
        }
        
        console.log('更新后 currentSchoolId:', currentSchoolId.value)
        console.log('更新后 currentSchool:', currentSchool.value)
        
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
    
    // ✅ 如果有登录用户且有学校，默认筛选本校
    if (userStore.userInfo?.school_id) {
        currentSchoolId.value = userStore.userInfo.school_id
        currentSchool.value = userStore.userInfo.school_name || '本校'
    }
    
    uni.$on('avatarUpdated', () => {
        page.value = 1
        loadServices(true)
    })
    
    // ✅ 添加学校更新监听
    uni.$on('schoolUpdated', (school) => {
        if (school && school.school_id) {
            currentSchoolId.value = school.school_id
            currentSchool.value = school.school_name || '本校'
            page.value = 1
            loadServices(true)
        }
    })
    
    loadCategories()
    loadServices()
})

onShow(async () => {
    // ✅ 如果是手动选择学校，不要覆盖
    if (isManualSchoolChange.value) {
        console.log('手动选择学校，跳过自动重置')
        isManualSchoolChange.value = false  // 重置标志
        return
    }
    
    // 如果已登录，重新获取最新的用户信息
    if (userStore.token) {
        try {
            const res = await getUserInfo()
            console.log('onShow 获取用户信息:', res.school_id, res.school_name)
            console.log('当前学校ID:', currentSchoolId.value)
            
            if (res.school_id) {
                // 直接更新学校信息
                currentSchoolId.value = res.school_id
                currentSchool.value = res.school_name || '本校'
                
                // 强制刷新服务列表
                page.value = 1
                loading.value = false
                await loadServices(true)
                
                console.log('服务刷新完成')
            }
        } catch (err) {
            console.error('获取用户信息失败', err)
        }
    }
})

onUnload(() => {
    removeHomeSchoolListener()
    uni.$off('avatarUpdated')
	uni.$off('schoolUpdated')
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

onPageScroll((e) => {
    scrollTop.value = e.scrollTop
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
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 100rpx 0;
				
				.empty-image {
					width: 200rpx;
					height: 200rpx;
					margin-bottom: 30rpx;
				}
				
				.empty-text {
					font-size: 32rpx;
					color: #333;
					font-weight: 500;
					margin-bottom: 10rpx;
				}
				
				.empty-desc {
					font-size: 26rpx;
					color: #999;
				}
			}
		}
	}
	
	.expand-tip {
	    background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
	    border-radius: 12rpx;
	    padding: 20rpx 30rpx;
	    margin-bottom: 20rpx;
	    
	    .expand-tip-text {
	        font-size: 26rpx;
	        color: #333;
	    }
	}
	
	.city-divider {
	    display: flex;
	    align-items: center;
	    margin: 30rpx 0 20rpx;
	    
	    .divider-line {
	        flex: 1;
	        height: 2rpx;
	        background-color: #e0e0e0;
	    }
	    
	    .divider-text {
	        padding: 0 30rpx;
	        font-size: 26rpx;
	        color: #999;
	    }
	}
	
	.empty-actions {
	    display: flex;
	    gap: 20rpx;
	    margin-top: 40rpx;
	    
	    .action-btn {
	        flex: 1;
	        height: 80rpx;
	        line-height: 80rpx;
	        background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
	        border-radius: 40rpx;
	        font-size: 28rpx;
	        color: #333;
	        border: none;
	        
	        &::after {
	            border: none;
	        }
	        
	        &.secondary {
	            background: #f5f5f5;
	            color: #666;
	        }
	    }
	}
</style>