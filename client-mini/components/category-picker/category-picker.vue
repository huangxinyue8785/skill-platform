<template>
	<view class="category-picker">
		<!-- 弹窗 -->
		<view class="category-modal" v-if="visible" @click="close">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">{{ title }}</text>
					<text class="modal-close" @click="close">✕</text>
				</view>
				<view class="modal-body">
					<!-- 两列布局：左边一级分类，右边二级分类 -->
					<view class="category-container">
						<!-- 左侧：一级分类 -->
						<scroll-view class="parent-list" scroll-y>
							<view 
								v-for="(parent, index) in parentCategories" 
								:key="parent.id"
								class="parent-item"
								:class="{ 'active': selectedParentIndex === index }"
								@click="selectParent(index)"
							>
								<text>{{ parent.name }}</text>
							</view>
						</scroll-view>
						
						<!-- 右侧：二级分类 -->
						<scroll-view class="child-list" scroll-y>
							<view 
								class="child-item all-child"
								:class="{ 'active': tempSelectedChildId === '' }"
								@click="selectAllChild"
							>
								<text>全部{{ currentParentName }}</text>
								<uni-icons v-if="tempSelectedChildId === ''" type="checkmarkempty" size="18" color="#07c160"></uni-icons>
							</view>
							<view 
								v-for="child in currentChildren" 
								:key="child.id"
								class="child-item"
								:class="{ 'active': tempSelectedChildId === child.id }"
								@click="selectChild(child)"
							>
								<text>{{ child.name }}</text>
								<uni-icons v-if="tempSelectedChildId === child.id" type="checkmarkempty" size="18" color="#07c160"></uni-icons>
							</view>
						</scroll-view>
					</view>
				</view>
				<view class="modal-footer">
					<button class="confirm-btn" @click="confirm">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCategoryList } from '@/api/category.js'

const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	},
	title: {
		type: String,
		default: '选择分类'
	},
	// 当前选中的分类ID（用于回显）
	value: {
		type: [String, Number],
		default: ''
	}
})

const emit = defineEmits(['update:visible', 'confirm'])

// 分类数据
const parentCategories = ref([])
const selectedParentIndex = ref(0)
const tempSelectedChildId = ref('')  // ✅ 这里声明了！

// 当前选中的一级分类
const currentParent = computed(() => parentCategories.value[selectedParentIndex.value] || {})

// 当前一级分类的名称
const currentParentName = computed(() => currentParent.value.name || '')

// 当前一级分类下的子分类
const currentChildren = computed(() => currentParent.value.children || [])

// 关闭弹窗
const close = () => {
	emit('update:visible', false)
}

// 加载分类数据
const loadCategories = async () => {
	try {
		const res = await getCategoryList()
		const data = res.data || res || []
		// 只保留有子分类的一级分类
		parentCategories.value = data.filter(item => item.children && item.children.length > 0)
		
		// 如果有传入的value，找到对应的分类位置
		if (props.value) {
			findCategoryPosition(props.value)
		} else {
			// 默认选中第一个
			if (parentCategories.value.length > 0) {
				selectedParentIndex.value = 0
				const firstChild = parentCategories.value[0].children?.[0]
				tempSelectedChildId.value = firstChild?.id || ''
			}
		}
	} catch (err) {
		console.error('加载分类失败', err)
	}
}

// 根据分类ID找到位置
const findCategoryPosition = (categoryId) => {
	for (let i = 0; i < parentCategories.value.length; i++) {
		const parent = parentCategories.value[i]
		const child = parent.children.find(c => c.id == categoryId)
		if (child) {
			selectedParentIndex.value = i
			tempSelectedChildId.value = child.id
			return
		}
	}
	// 检查是否是父分类ID
	for (let i = 0; i < parentCategories.value.length; i++) {
		if (parentCategories.value[i].id == categoryId) {
			selectedParentIndex.value = i
			tempSelectedChildId.value = ''  // 选中父分类本身
			return
		}
	}
	// 没找到，默认选中第一个
	if (parentCategories.value.length > 0) {
		selectedParentIndex.value = 0
		const firstChild = parentCategories.value[0].children?.[0]
		tempSelectedChildId.value = firstChild?.id || ''
	}
}

// 选择一级分类
const selectParent = (index) => {
	selectedParentIndex.value = index
	// 默认选中第一个子分类
	const firstChild = currentChildren.value[0]
	tempSelectedChildId.value = firstChild?.id || ''
}

// 选择全部当前分类（即选中父分类本身）
const selectAllChild = () => {
	tempSelectedChildId.value = ''
}

// 选择子分类
const selectChild = (child) => {
	tempSelectedChildId.value = child.id
}

// 确认选择
const confirm = () => {
	let selectedCategory = null
	
	if (tempSelectedChildId.value) {
		// 选了具体子分类
		const child = currentChildren.value.find(c => c.id === tempSelectedChildId.value)
		if (child) {
			selectedCategory = {
				id: child.id,
				name: child.name,
				parentId: currentParent.value.id,
				parentName: currentParent.value.name
			}
		}
	} else {
		// 选了"全部xxx"（即父分类）
		selectedCategory = {
			id: currentParent.value.id,
			name: currentParent.value.name,
			parentId: null,
			parentName: null
		}
	}
	
	emit('confirm', selectedCategory)
	close()
}

// 监听visible变化，打开时加载数据
watch(() => props.visible, (newVal) => {
	if (newVal) {
		if (parentCategories.value.length === 0) {
			loadCategories()
		} else if (props.value) {
			findCategoryPosition(props.value)
		}
	}
})

// 监听value变化
watch(() => props.value, (newVal) => {
	if (newVal && parentCategories.value.length > 0) {
		findCategoryPosition(newVal)
	}
})
</script>

<style lang="scss" scoped>
.category-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 1000;
	display: flex;
	align-items: flex-end;
	
	.modal-content {
		width: 100%;
		background-color: #fff;
		border-radius: 30rpx 30rpx 0 0;
		height: 70vh;
		display: flex;
		flex-direction: column;
		
		.modal-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 30rpx;
			border-bottom: 1rpx solid #eee;
			flex-shrink: 0;
			
			.modal-title {
				font-size: 32rpx;
				font-weight: 500;
				color: #333;
			}
			
			.modal-close {
				font-size: 36rpx;
				color: #999;
				padding: 10rpx;
			}
		}
		
		.modal-body {
			flex: 1;
			overflow: hidden;
			
			.category-container {
				display: flex;
				height: 100%;
				
				.parent-list {
					width: 240rpx;
					height: 100%;
					background-color: #f5f5f5;
					
					.parent-item {
						padding: 30rpx 20rpx;
						font-size: 28rpx;
						color: #666;
						text-align: center;
						position: relative;
						
						&.active {
							background-color: #fff;
							color: #07c160;
							font-weight: 500;
							
							&::before {
								content: '';
								position: absolute;
								left: 0;
								top: 50%;
								transform: translateY(-50%);
								width: 6rpx;
								height: 40rpx;
								background-color: #07c160;
								border-radius: 0 6rpx 6rpx 0;
							}
						}
					}
				}
				
				.child-list {
					flex: 1;
					height: 100%;
					background-color: #fff;
					
					.child-item {
						display: flex;
						justify-content: space-between;
						align-items: center;
						padding: 30rpx 30rpx;
						font-size: 28rpx;
						color: #333;
						
						&.all-child {
							border-bottom: 1rpx solid #f0f0f0;
						}
						
						&.active {
							color: #07c160;
							background-color: #f0fff4;
						}
					}
				}
			}
		}
		
		.modal-footer {
			padding: 20rpx 30rpx 40rpx;
			flex-shrink: 0;
			
			.confirm-btn {
				width: 100%;
				height: 88rpx;
				line-height: 88rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				color: #333;
				border-radius: 44rpx;
				font-size: 32rpx;
				font-weight: 500;
				border: none;
				
				&::after {
					border: none;
				}
			}
		}
	}
}
</style>