<template>
	<view class="publish-form">
		<form @submit="handleSubmit" class="publish-form-content">
			<!-- 所有表单项放在这里 -->
			<view class="form-fields">
				<!-- 服务标题 -->
				<view class="form-item">
					<text class="label">服务标题 <text class="required">*</text></text>
					<input type="text" placeholder="请输入服务标题（2-50字）" class="input" v-model="title" />
				</view>

				<!-- 服务分类 -->
				<view class="form-item">
					<text class="label">服务分类 <text class="required">*</text></text>
					<picker mode="multiSelector" :range="categoryColumns" :value="categoryPickerIndex"
						@columnchange="onCategoryColumnChange" @change="onCategoryPickerChange">
						<view class="selector">
							<text :class="['placeholder',{'selected':categoryName}]">
								{{categoryName || '请选择分类'}}
							</text>
							<uni-icons type="right"></uni-icons>
						</view>
					</picker>
				</view>

				<!-- 服务描述 -->
				<view class="form-item">
					<text class="label">服务描述 <text class="required">*</text></text>
					<textarea placeholder="请详细描述你的服务（至少10字）" class="textarea" v-model="description" />
				</view>

				<!-- 服务价格 -->
				<view class="form-item">
					<text class="label">服务价格 <text class="required">*</text></text>
					<input type="number" placeholder="请输入价格（元）" class="input" v-model="price" />
				</view>

				<!-- 联系方式 -->
				<view class="form-item">
					<text class="label">联系方式 <text class="required">*</text></text>
					<input type="text" placeholder="请输入手机号/微信/QQ" class="input" v-model="contact" />
				</view>

				<!-- 所在学校（可选） -->
				<view class="form-item">
					<text class="label">所在学校</text>
					<view class="selector" @click="chooseSchool">
						<text :class="['placeholder', {'selected': schoolName}]">
							{{ schoolName || '请选择学校（可选）' }}
						</text>
						<uni-icons type="right"></uni-icons>
					</view>
				</view>

				<!-- 图片上传 -->
				<view class="form-item">
					<text class="label">服务图片</text>
					<view class="upload-area">
						<view class="image-list">
							<view v-for="(img, index) in localImages" :key="index" class="image-item">
								<image :src="getImageUrl(img)" mode="aspectFill"></image>
								<view class="image-remove" @click="removeImage(index)">
									<uni-icons type="close" size="16" color="#fff"></uni-icons>
								</view>
							</view>

							<view v-if="localImages.length < 9" class="upload-btn" @click="chooseImage">
								<text>+</text>
								<text>选择图片</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 提交按钮 - 固定在底部 -->
			<view class="button-wrapper">
				<button form-type="submit" class="submit-btn" :class="{ 'edit-btn': isEdit }">
					{{ isEdit ? '更新服务' : '发布服务' }}
				</button>
			</view>
		</form>
	</view>
</template>

<script setup>
import {
	ref,
	onMounted,
	onUnmounted,
	watch,
	computed
} from 'vue'
import {
	getCategoryList
} from '@/api/category.js'
import {
	uploadServiceImages
} from '@/api/upload.js'
import {
	publishService,
	getServiceDetailForEdit,
	updateService
} from '@/api/service.js'
import {
	checkLogin
} from '@/utils/auth'
import {
	getImageUrl
} from '@/utils/request.js'

// ==================== 属性定义 ====================
const props = defineProps({
	isEdit: {
		type: Boolean,
		default: false
	},
	serviceId: {
		type: [String, Number],
		default: ''
	}
})
const emit = defineEmits(['submit-success'])

// ==================== 表单数据 ====================
const title = ref('')
const description = ref('')
const price = ref('')
const contact = ref('')
const schoolId = ref('')
const schoolName = ref('')
const localImages = ref([])

// ==================== 提交中状态（防止重复提交） ====================
const submitting = ref(false)

// ==================== 分类数据 ====================
const categoryList = ref([])
const categoryColumns = ref([[], []])
const categoryPickerIndex = ref([0, 0])
const categoryName = ref('')
const categoryId = ref('')

// ==================== 原始数据（用于编辑模式检测变化） ====================
const originalData = ref({
	title: '',
	description: '',
	price: '',
	contact: '',
	schoolId: '',
	categoryId: '',
	images: []
})

// ==================== 计算属性：是否有修改 ====================
const hasChanges = computed(() => {
	if (!props.isEdit) return true
	
	// 1. 比较标题
	if (title.value !== originalData.value.title) {
		return true
	}
	
	// 2. 比较描述
	if (description.value !== originalData.value.description) {
		return true
	}
	
	// 3. 比较价格
	const currentPrice = parseFloat(price.value) || 0
	const originalPrice = parseFloat(originalData.value.price) || 0
	if (currentPrice !== originalPrice) {
		return true
	}
	
	// 4. 比较联系方式
	if (contact.value !== originalData.value.contact) {
		return true
	}
	
	// 5. 比较学校ID
	if (schoolId.value !== originalData.value.schoolId) {
		return true
	}
	
	// 6. 比较分类ID
	if (categoryId.value !== originalData.value.categoryId) {
		return true
	}

	// 7. 比较图片
	const oldImages = originalData.value.images || []
	const newImages = localImages.value || []
	
	const getFileName = (url) => {
		if (!url) return ''
		if (typeof url === 'string' && url.includes('/')) {
			return url.split('/').pop()
		}
		return String(url)
	}
	
	if (newImages.length !== oldImages.length) {
		return true
	}
	
	for (let i = 0; i < newImages.length; i++) {
		const oldName = getFileName(oldImages[i])
		const newName = getFileName(newImages[i])
		if (oldName !== newName) {
			return true
		}
	}
	
	return false
})

// ==================== 加载分类数据 ====================
const loadCategories = async () => {
	try {
		const res = await getCategoryList()
		const parentsWithChildren = res.filter(item => item.children && item.children.length > 0)
		categoryList.value = parentsWithChildren

		const parentNames = parentsWithChildren.map(item => item.name)
		const firstParent = parentsWithChildren[0] || {}
		const childNames = firstParent.children?.map(child => child.name) || []

		categoryColumns.value = [parentNames, childNames]

		if (firstParent.children?.length > 0) {
			categoryId.value = firstParent.children[0].id
			categoryName.value = firstParent.children[0].name
		}
	} catch (err) {
		console.error('加载分类失败', err)
	}
}

// ==================== 分类选择器事件 ====================
const onCategoryColumnChange = (e) => {
	const column = e.detail.column
	const index = e.detail.value

	if (column === 0) {
		const parentCategory = categoryList.value[index]
		if (!parentCategory?.children) return

		const childNames = parentCategory.children.map(child => child.name)
		categoryColumns.value = [categoryColumns.value[0], childNames]
		categoryPickerIndex.value = [index, 0]

		if (parentCategory.children.length > 0) {
			categoryId.value = parentCategory.children[0].id
			categoryName.value = parentCategory.children[0].name
		}
	} else if (column === 1) {
		const parentIndex = categoryPickerIndex.value[0]
		const parentCategory = categoryList.value[parentIndex]
		const childCategory = parentCategory?.children?.[index]

		if (childCategory) {
			categoryId.value = childCategory.id
			categoryName.value = childCategory.name
			categoryPickerIndex.value = [parentIndex, index]
		}
	}
}

const onCategoryPickerChange = (e) => {
	const value = e.detail.value
	categoryPickerIndex.value = value

	const parentIndex = value[0]
	const childIndex = value[1]
	const parentCategory = categoryList.value[parentIndex]
	const childCategory = parentCategory?.children?.[childIndex]

	if (childCategory) {
		categoryId.value = childCategory.id
		categoryName.value = childCategory.name
	}
}

// ==================== 学校选择 ====================
const chooseSchool = () => {
	uni.navigateTo({
		url: '/pages/school-search/school-search?from=publish'
	})
}

const setupSchoolListener = () => {
	uni.$on('publishSchoolSelected', (school) => {
		if (school === null) {
			schoolId.value = ''
			schoolName.value = ''
		} else {
			schoolId.value = school.id
			schoolName.value = school.name
		}
	})
}

const removeSchoolListener = () => {
	uni.$off('publishSchoolSelected')
}

// ==================== 图片上传 ====================
const chooseImage = () => {
	const maxCount = 9 - localImages.value.length
	if (maxCount <= 0) {
		uni.showToast({
			title: '最多选择9张图片',
			icon: 'none'
		})
		return
	}

	uni.chooseImage({
		count: maxCount,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			localImages.value = [...localImages.value, ...res.tempFilePaths]
		}
	})
}

const removeImage = (index) => {
	localImages.value.splice(index, 1)
}

// ==================== 设置分类索引 ====================
const setCategoryIndex = (targetCategoryId) => {
	const parentIndex = categoryList.value.findIndex(p =>
		p.children.some(c => c.id === targetCategoryId)
	)

	if (parentIndex !== -1) {
		const childIndex = categoryList.value[parentIndex].children.findIndex(
			c => c.id === targetCategoryId
		)
		categoryPickerIndex.value = [parentIndex, childIndex]

		const childNames = categoryList.value[parentIndex].children.map(c => c.name)
		categoryColumns.value = [categoryColumns.value[0], childNames]
	}
}

// ==================== 加载服务详情（编辑模式） ====================
const loadServiceDetail = async () => {
	if (!props.serviceId) return

	try {
		uni.showLoading({ title: '加载中...' })
		const res = await getServiceDetailForEdit(props.serviceId)
		

		title.value = res.title
		description.value = res.description
		price.value = String(res.price)
		contact.value = res.contact

		if (res.school) {
			schoolId.value = res.school.id
			schoolName.value = res.school.name
		} else {
			schoolId.value = ''
			schoolName.value = ''
		}

		if (res.images?.length > 0) {
			localImages.value = res.images
		}

		originalData.value = {
			title: res.title,
			description: res.description,
			price: String(res.price),
			contact: res.contact,
			schoolId: res.school?.id || '',
			categoryId: res.category?.id || '',
			images: [...(res.images || [])]  // ✅ 使用展开运算符，确保是独立副本
		}

		if (res.category) {
			categoryId.value = res.category.id
			categoryName.value = res.category.name

			if (categoryList.value.length > 0) {
				setCategoryIndex(res.category.id)
			} else {
				setTimeout(() => setCategoryIndex(res.category.id), 500)
			}
		}

		uni.hideLoading()
	} catch (err) {
		console.error('加载服务详情失败', err)
		uni.hideLoading()
		uni.showToast({ title: '加载失败', icon: 'none' })
	}
}

// ==================== 表单验证 ====================
const validateForm = () => {
	if (!categoryId.value) {
		uni.showToast({ title: '请选择服务分类', icon: 'none' })
		return false
	}
	if (!title.value?.trim()) {
		uni.showToast({ title: '请输入服务标题', icon: 'none' })
		return false
	}
	if (title.value.length < 2 || title.value.length > 50) {
		uni.showToast({ title: '服务标题长度必须在2-50字之间', icon: 'none' })
		return false
	}
	if (!description.value?.trim()) {
		uni.showToast({ title: '请输入服务描述', icon: 'none' })
		return false
	}
	if (description.value.length < 10) {
		uni.showToast({ title: '服务描述至少10个字', icon: 'none' })
		return false
	}
	if (!price.value) {
		uni.showToast({ title: '请输入价格', icon: 'none' })
		return false
	}
	if (isNaN(price.value) || Number(price.value) <= 0) {
		uni.showToast({ title: '价格必须是大于0的数字', icon: 'none' })
		return false
	}
	if (!contact.value?.trim()) {
		uni.showToast({ title: '请输入联系方式', icon: 'none' })
		return false
	}
	return true
}

// ==================== 重置表单 ====================
const resetForm = () => {
	title.value = ''
	description.value = ''
	price.value = ''
	contact.value = ''
	schoolId.value = ''
	schoolName.value = ''
	localImages.value = []

	if (categoryList.value.length > 0) {
		const firstParent = categoryList.value[0]
		if (firstParent.children?.length > 0) {
			categoryId.value = firstParent.children[0].id
			categoryName.value = firstParent.children[0].name
		}
	}
	categoryPickerIndex.value = [0, 0]
}

// ==================== 提交表单 ====================
const handleSubmit = async () => {
	// 防止重复提交
	if (submitting.value) {
		return
	}
	
	if (!validateForm()) return

	// 编辑模式下检查是否有修改
	if (props.isEdit && !hasChanges.value) {
		uni.showToast({ title: '没有检测到任何修改', icon: 'none' })
		return
	}

	if (!checkLogin({ action: 'publish' })) return

	submitting.value = true
	uni.showLoading({ title: props.isEdit ? '更新中...' : '发布中...', mask: true })

	try {
		let imagesString = ''
		let needDeleteOldImages = false

		const hasNewImages = localImages.value.some(img =>
			img && (img.startsWith('http://tmp') || img.startsWith('/tmp') || img.includes('tmp'))
		)


		if (localImages.value.length > 0 && hasNewImages) {
			// 上传图片时不显示 loading，避免冲突
			const newImages = localImages.value.filter(img =>
				img && (img.startsWith('http://tmp') || img.startsWith('/tmp') || img.includes('tmp'))
			)
			
			const urls = await uploadServiceImages(newImages)
			
			const oldImages = localImages.value.filter(img =>
				img && !(img.startsWith('http://tmp') || img.startsWith('/tmp') || img.includes('tmp'))
			)
			imagesString = [...oldImages, ...urls].join(',')
			needDeleteOldImages = true
		} else if (localImages.value.length > 0) {
			imagesString = localImages.value.join(',')
		}


		const submitData = {
			category_id: categoryId.value,
			title: title.value.trim(),
			description: description.value.trim(),
			price: Number(price.value),
			contact: contact.value.trim(),
			school_id: schoolId.value || null,
			images: imagesString || null,
			delete_old_images: needDeleteOldImages
		}

		// 先关闭 loading
		uni.hideLoading()

		if (props.isEdit) {
			await updateService(props.serviceId, submitData)
			uni.showToast({ title: '更新成功待审核', icon: 'success', duration: 2000 })
			
			// 延迟 2 秒后返回我的发布页
			setTimeout(() => {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
				} else {
					uni.reLaunch({ url: '/pages/my-publish/my-publish' })
				}
			}, 2000)
		} else {
			await publishService(submitData)
			uni.showToast({ title: '发布成功待审核', icon: 'success', duration: 2000 })
			
			// 延迟 2 秒后清空表单
			setTimeout(() => {
				resetForm()
			}, 2000)
		}

	} catch (err) {
		console.error(props.isEdit ? '更新失败' : '发布失败', err)
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	} finally {
		submitting.value = false
	}
}

// ==================== 生命周期 ====================
onMounted(async () => {
	await loadCategories()
	setupSchoolListener()

	if (props.isEdit && props.serviceId) {
		loadServiceDetail()
	}
})

watch(() => props.serviceId, (newId) => {
	if (newId && props.isEdit) {
		loadServiceDetail()
	}
})

onUnmounted(() => {
	removeSchoolListener()
})

// ==================== 暴露方法给父组件 ====================
defineExpose({
	resetForm
})
</script>

<style lang="scss" scoped>
.publish-form {
	height: 100%;

	.publish-form-content {
		height: 100%;
		display: flex;
		flex-direction: column;

		.form-fields {
			flex: 1;
			padding: 20rpx;
		}

		.button-wrapper {
			padding: 20rpx 20rpx 30rpx 20rpx;
			background-color: transparent;

			.submit-btn {
				height: 90rpx;
				line-height: 90rpx;
				background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
				color: #333;
				border-radius: 45rpx;
				font-size: 32rpx;
				font-weight: 500;
				margin: 0;

				&::after {
					border: none;
				}
			}
		}
	}
}

.form-item {
	background-color: #fff;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 10rpx;

	.label {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
		display: block;
		margin-bottom: 20rpx;

		.required {
			color: #ff4d4f;
		}
	}

	.input {
		height: 80rpx;
		background-color: #f5f5f5;
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}

	.textarea {
		width: 100%;
		height: 200rpx;
		background-color: #f5f5f5;
		border-radius: 12rpx;
		padding: 20rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.selector {
		height: 80rpx;
		background-color: #f5f5f5;
		border-radius: 12rpx;
		padding: 0 20rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;

		.placeholder {
			font-size: 28rpx;
			color: #999;

			&.selected {
				color: #333;
			}
		}
	}

	.upload-area {
		.image-list {
			display: flex;
			flex-wrap: wrap;
			gap: 20rpx;
			margin-bottom: 20rpx;

			.image-item {
				position: relative;
				width: 200rpx;
				height: 200rpx;
				border-radius: 12rpx;
				overflow: hidden;

				image {
					width: 100%;
					height: 100%;
				}

				.image-remove {
					position: absolute;
					top: 4rpx;
					right: 4rpx;
					width: 36rpx;
					height: 36rpx;
					background-color: rgba(0, 0, 0, 0.5);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}
		}

		.upload-btn {
			width: 200rpx;
			height: 200rpx;
			background-color: #f5f5f5;
			border: 2rpx dashed #ccc;
			border-radius: 12rpx;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;

			text:first-child {
				font-size: 60rpx;
				color: #999;
				line-height: 1;
			}

			text:last-child {
				font-size: 24rpx;
				color: #999;
				margin-top: 10rpx;
			}
		}
	}
}
</style>