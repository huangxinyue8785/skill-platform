<template>
	<view class="publish-form">
		<!-- ✅ 移除 @submit，改用普通表单 -->
		<form class="publish-form-content">
			<!-- 所有表单项放在这里 -->
			<view class="form-fields">
				<!-- 服务标题 -->
				<view class="form-item">
					<text class="label">服务标题 <text class="required">*</text></text>
					<input 
						type="text" 
						placeholder="请输入有意义的服务标题（2-50字）" 
						class="input" 
						v-model="title" 
						:disabled="submitting"
						@blur="validateTitle"
					/>
					<view v-if="titleError" class="error-tip">{{ titleError }}</view>
				</view>

				<!-- 服务分类 -->
				<view class="form-item">
					<text class="label">服务分类 <text class="required">*</text></text>
					<picker mode="multiSelector" :range="categoryColumns" :value="categoryPickerIndex"
						@columnchange="onCategoryColumnChange" @change="onCategoryPickerChange" :disabled="submitting">
						<view class="selector" :class="{ 'disabled': submitting }">
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
					<textarea 
						placeholder="请详细描述你的服务内容（至少10个有效字符）" 
						class="textarea" 
						v-model="description" 
						:disabled="submitting"
						@blur="validateDescription"
					/>
					<view class="char-count">{{ validDescriptionLength }}/10</view>
					<view v-if="descriptionError" class="error-tip">{{ descriptionError }}</view>
				</view>

				<!-- 服务价格 -->
				<view class="form-item">
					<text class="label">服务价格 <text class="required">*</text></text>
					<input 
						type="digit" 
						placeholder="请输入合理价格（0.01-99999元）" 
						class="input" 
						v-model="price" 
						:disabled="submitting"
						@blur="validatePrice"
					/>
					<view v-if="priceError" class="error-tip">{{ priceError }}</view>
				</view>

				<!-- 联系方式 -->
				<view class="form-item">
					<text class="label">联系方式 <text class="required">*</text></text>
					<input 
						type="text" 
						placeholder="请输入有效联系方式" 
						class="input" 
						v-model="contact" 
						:disabled="submitting"
						@blur="validateContact"
					/>
					<view v-if="contactError" class="error-tip">{{ contactError }}</view>
				</view>

				<!-- 所在学校（可选） -->
				<view class="form-item">
					<text class="label">所在学校</text>
					<view class="selector" @click="!submitting && chooseSchool()" :class="{ 'disabled': submitting }">
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
								<image :src="isTempFile(img) ? img : getImageUrl(img)" mode="aspectFill"></image>
								<view class="image-remove" @click="!submitting && removeImage(index)" :class="{ 'disabled': submitting }">
									<uni-icons type="close" size="16" color="#fff"></uni-icons>
								</view>
							</view>

							<view v-if="localImages.length < 9 && !submitting" class="upload-btn" @click="chooseImage">
								<text>+</text>
								<text>选择图片</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 提交按钮 - 固定在底部 -->
			<view class="button-wrapper">
				<!-- ✅ 移除 form-type="submit"，改用 @click -->
				<button 
					class="submit-btn" 
					:class="{ 'edit-btn': isEdit, 'disabled': submitting }"
					:disabled="submitting"
					@click="handleSubmitClick"
				>
					{{ submitting ? (isEdit ? '更新中...' : '发布中...') : (isEdit ? '更新服务' : '发布服务') }}
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

// ==================== 错误信息 ====================
const titleError = ref('')
const descriptionError = ref('')
const priceError = ref('')
const contactError = ref('')

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
	schoolName: '',
	categoryId: '',
	images: []
})

// ==================== 辅助函数：判断是否为临时文件 ====================
const isTempFile = (img) => {
	if (!img) return false
	
	// 1. App 环境：file:// 开头的本地路径
	if (img.startsWith('file://')) return true
	
	// 2. 小程序临时文件：wxfile:// 或 http://tmp
	if (img.startsWith('wxfile://')) return true
	if (img.startsWith('http://tmp')) return true
	
	// 3. H5 临时文件：blob:http://
	if (img.startsWith('blob:')) return true
	
	// 4. 其他临时路径
	if (img.startsWith('/tmp') || img.includes('tmp')) return true
	
	return false
}

// ==================== 计算有效描述长度（排除无意义字符） ====================
const validDescriptionLength = computed(() => {
	return getValidTextLength(description.value)
})

// ==================== 获取有效文本长度（排除标点、空格、特殊符号） ====================
const getValidTextLength = (text) => {
	if (!text) return 0
	
	// 移除空格、标点符号、特殊字符，只保留中英文、数字
	const validChars = text.replace(/[\s\p{P}\p{S}]/gu, '')
	return validChars.length
}

// ==================== 检查是否包含有意义的中文或英文 ====================
const hasMeaningfulContent = (text) => {
	if (!text) return false
	
	// 检查是否包含至少2个中文字符或3个英文字母
	const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
	const englishCount = (text.match(/[a-zA-Z]/g) || []).length
	
	return chineseCount >= 2 || englishCount >= 3
}

// ==================== 检查是否全是重复字符 ====================
const isAllRepeatedChars = (text) => {
	if (!text) return false
	
	// 移除空格后检查
	const trimmed = text.replace(/\s/g, '')
	if (trimmed.length < 2) return false
	
	// 检查是否所有字符都相同
	const firstChar = trimmed[0]
	return trimmed.split('').every(char => char === firstChar)
}

// ==================== 检查是否是无意义的标点组合 ====================
const isMeaninglessPunctuation = (text) => {
	if (!text) return false
	
	// 移除空格后，检查是否只包含标点符号
	const trimmed = text.replace(/\s/g, '')
	const withoutPunctuation = trimmed.replace(/[\p{P}\p{S}]/gu, '')
	
	// 如果没有字母数字中文，说明全是标点
	return withoutPunctuation.length === 0
}

// ==================== 验证标题 ====================
const validateTitle = () => {
	const trimmedTitle = title.value?.trim() || ''
	
	// 1. 空值检查
	if (!trimmedTitle) {
		titleError.value = '请输入服务标题'
		return false
	}
	
	// 2. 长度检查
	if (trimmedTitle.length < 2) {
		titleError.value = '标题至少需要2个字符'
		return false
	}
	
	if (trimmedTitle.length > 50) {
		titleError.value = '标题不能超过50个字符'
		return false
	}
	
	// 3. 检查是否全是数字
	if (/^\d+$/.test(trimmedTitle)) {
		titleError.value = '标题不能全是数字，请添加文字描述'
		return false
	}
	
	// 4. 检查是否全是重复字符
	if (isAllRepeatedChars(trimmedTitle)) {
		titleError.value = '标题不能全是重复字符'
		return false
	}
	
	// 5. 检查是否是无意义标点
	if (isMeaninglessPunctuation(trimmedTitle)) {
		titleError.value = '标题不能只包含标点符号'
		return false
	}
	
	// 6. 检查是否有意义内容
	if (!hasMeaningfulContent(trimmedTitle)) {
		titleError.value = '请输入有意义的标题（至少2个中文或3个英文字母）'
		return false
	}
	
	titleError.value = ''
	return true
}

// ==================== 验证描述 ====================
const validateDescription = () => {
	const trimmedDesc = description.value?.trim() || ''
	
	// 1. 空值检查
	if (!trimmedDesc) {
		descriptionError.value = '请输入服务描述'
		return false
	}
	
	// 2. 有效字符长度检查
	const validLength = getValidTextLength(trimmedDesc)
	if (validLength < 10) {
		descriptionError.value = `描述至少需要10个有效字符（当前${validLength}个）`
		return false
	}
	
	// 3. 检查是否全是数字
	if (/^\d+$/.test(trimmedDesc)) {
		descriptionError.value = '描述不能全是数字'
		return false
	}
	
	// 4. 检查是否全是重复字符
	if (isAllRepeatedChars(trimmedDesc)) {
		descriptionError.value = '描述不能全是重复字符'
		return false
	}
	
	// 5. 检查是否是无意义标点
	if (isMeaninglessPunctuation(trimmedDesc)) {
		descriptionError.value = '描述不能只包含标点符号'
		return false
	}
	
	// 6. 检查是否有意义内容
	if (!hasMeaningfulContent(trimmedDesc)) {
		descriptionError.value = '请详细描述服务内容，至少包含2个中文或3个英文字母'
		return false
	}
	
	descriptionError.value = ''
	return true
}

// ==================== 验证价格 ====================
const validatePrice = () => {
	const priceValue = price.value?.trim() || ''
	
	// 1. 空值检查
	if (!priceValue) {
		priceError.value = '请输入价格'
		return false
	}
	
	// 2. 数字格式检查
	const numPrice = parseFloat(priceValue)
	if (isNaN(numPrice)) {
		priceError.value = '价格必须是有效数字'
		return false
	}
	
	// 3. 范围检查
	if (numPrice <= 0) {
		priceError.value = '价格必须大于0'
		return false
	}
	
	if (numPrice < 0.01) {
		priceError.value = '价格不能低于0.01元'
		return false
	}
	
	if (numPrice > 99999) {
		priceError.value = '价格不能超过99999元'
		return false
	}
	
	// 4. 小数位检查
	const decimalPart = priceValue.split('.')[1]
	if (decimalPart && decimalPart.length > 2) {
		priceError.value = '价格最多保留两位小数'
		return false
	}
	
	priceError.value = ''
	return true
}

// ==================== 验证联系方式 ====================
const validateContact = () => {
	const trimmedContact = contact.value?.trim() || ''
	
	// 1. 空值检查
	if (!trimmedContact) {
		contactError.value = '请输入联系方式'
		return false
	}
	
	// 2. 长度检查
	if (trimmedContact.length < 5) {
		contactError.value = '请输入有效的联系方式'
		return false
	}
	
	// 3. 检查是否全是重复字符
	if (isAllRepeatedChars(trimmedContact)) {
		contactError.value = '联系方式不能全是重复字符'
		return false
	}
	
	// 4. 检查是否包含联系方式特征（手机号/微信/QQ）
	const hasPhone = /^1[3-9]\d{9}$/.test(trimmedContact)
	const hasWechat = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(trimmedContact)
	const hasQQ = /^[1-9]\d{4,10}$/.test(trimmedContact)
	
	if (!hasPhone && !hasWechat && !hasQQ) {
		// 不强制完全匹配，但给出提示
		contactError.value = ''
		// 可以添加警告，但不阻止提交
		// contactError.value = '请输入有效的手机号/微信号/QQ号'
		// return false
	}
	
	contactError.value = ''
	return true
}

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
	if (submitting.value) return
	
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
	if (submitting.value) return
	
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
	if (submitting.value) return
	
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
	if (submitting.value) return
	
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
	if (submitting.value) return
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
			schoolName: res.school?.name || '',
			categoryId: res.category?.id || '',
			images: [...(res.images || [])]
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
	// 清除所有错误
	titleError.value = ''
	descriptionError.value = ''
	priceError.value = ''
	contactError.value = ''
	
	// 1. 验证分类
	if (!categoryId.value) {
		uni.showToast({ title: '请选择服务分类', icon: 'none' })
		return false
	}
	
	// 2. 验证标题
	if (!validateTitle()) {
		uni.showToast({ title: titleError.value, icon: 'none' })
		return false
	}
	
	// 3. 验证描述
	if (!validateDescription()) {
		uni.showToast({ title: descriptionError.value, icon: 'none' })
		return false
	}
	
	// 4. 验证价格
	if (!validatePrice()) {
		uni.showToast({ title: priceError.value, icon: 'none' })
		return false
	}
	
	// 5. 验证联系方式
	if (!validateContact()) {
		uni.showToast({ title: contactError.value, icon: 'none' })
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
	
	// 清除错误
	titleError.value = ''
	descriptionError.value = ''
	priceError.value = ''
	contactError.value = ''

	// 重置分类为第一个
	if (categoryList.value.length > 0) {
		const firstParent = categoryList.value[0]
		if (firstParent.children?.length > 0) {
			categoryId.value = firstParent.children[0].id
			categoryName.value = firstParent.children[0].name
			categoryPickerIndex.value = [0, 0]
			
			// 重置二级分类列
			const childNames = firstParent.children.map(c => c.name)
			categoryColumns.value = [categoryColumns.value[0], childNames]
		}
	}
}

// ==================== 按钮点击处理 ====================
const handleSubmitClick = () => {
	// 如果正在提交，直接拦截
	if (submitting.value) {
		console.log('重复提交被拦截')
		return
	}
	
	// ✅ 立即设置为 true，防止后续点击
	submitting.value = true
	
	// 调用提交逻辑
	handleSubmit()
}

// ==================== 提交表单 ====================
const handleSubmit = async () => {
    if (!validateForm()) {
        // ✅ 验证失败，重置 submitting
        submitting.value = false
        return
    }

    // 编辑模式下检查是否有修改
    if (props.isEdit && !hasChanges.value) {
        uni.showToast({ title: '没有检测到任何修改', icon: 'none' })
        // ✅ 没有修改，重置 submitting
        submitting.value = false
        return
    }

    if (!checkLogin({ action: 'publish' })) {
        // ✅ 未登录，重置 submitting
        submitting.value = false
        return
    }

    uni.showLoading({ title: props.isEdit ? '更新中...' : '发布中...', mask: true })

    try {
        let imagesString = ''
        let needDeleteOldImages = false

        // 使用统一的 isTempFile 函数
        const hasNewImages = localImages.value.some(isTempFile)

        if (localImages.value.length > 0 && hasNewImages) {
            // 筛选出需要上传的临时文件
            const newImages = localImages.value.filter(isTempFile)
            
            // 上传新图片到COS
            const urls = await uploadServiceImages(newImages)
            
            // 保留已上传的图片（COS URL）
            const oldImages = localImages.value.filter(img => {
                if (!img) return false
                return img.startsWith('http') && !isTempFile(img)
            })
            
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

        if (props.isEdit) {
            await updateService(props.serviceId, submitData)
            uni.hideLoading()
            uni.showToast({ title: '更新成功待审核', icon: 'success', duration: 2000 })
            
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
            
            // 先清空表单，再关闭 loading 和显示成功提示
            resetForm()
            
            uni.hideLoading()
            uni.showToast({ title: '发布成功待审核', icon: 'success', duration: 2000 })
        }

    } catch (err) {
        console.error(props.isEdit ? '更新失败' : '发布失败', err)
        uni.hideLoading()
        uni.showToast({ title: err.message || '操作失败', icon: 'none' })
    } finally {
        // 延迟重置 submitting，确保 Toast 显示期间按钮保持禁用
        setTimeout(() => {
            submitting.value = false
        }, 500)
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

	.char-count {
		text-align: right;
		font-size: 24rpx;
		color: #999;
		margin-top: 10rpx;
	}

	.error-tip {
		font-size: 24rpx;
		color: #ff4d4f;
		margin-top: 10rpx;
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