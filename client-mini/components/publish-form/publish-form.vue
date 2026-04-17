<template>
	<view class="publish-form">
		<form class="publish-form-content">
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
						@input="onTitleInput"
					/>
					<view v-if="titleError" class="error-tip">{{ titleError }}</view>
				</view>

				<!-- 服务分类 -->
				<view class="form-item">
					<text class="label">服务分类 <text class="required">*</text></text>
					<view class="selector" @click="!submitting && (showCategoryPicker = true)" :class="{ 'disabled': submitting }">
						<text :class="['placeholder', {'selected': categoryName}]">
							{{ categoryName || '请选择分类' }}
						</text>
						<uni-icons type="right"></uni-icons>
					</view>
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
						@input="onDescriptionInput"
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
						@input="onPriceInput"
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
						@input="onContactInput"
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

			<!-- 提交按钮 -->
			<view class="button-wrapper">
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

		<!-- 公用分类选择组件 -->
		<category-picker 
			v-model:visible="showCategoryPicker"
			:value="categoryId"
			title="选择服务分类"
			@confirm="onCategoryConfirm"
		/>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { uploadServiceImages } from '@/api/upload.js'
import { publishService, getServiceDetailForEdit, updateService } from '@/api/service.js'
import { checkLogin } from '@/utils/auth'
import { getImageUrl } from '@/utils/request.js'
import CategoryPicker from '@/components/category-picker/category-picker.vue'

// ==================== 属性定义 ====================
const props = defineProps({
	isEdit: { type: Boolean, default: false },
	serviceId: { type: [String, Number], default: '' }
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

// ==================== 提交中状态 ====================
const submitting = ref(false)

// ==================== 分类数据 ====================
const showCategoryPicker = ref(false)
const categoryName = ref('')
const categoryId = ref('')

// ==================== 原始数据（编辑模式） ====================
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

// ==================== 分类确认回调 ====================
const onCategoryConfirm = (category) => {
	if (category) {
		categoryId.value = category.id
		categoryName.value = category.name
	} else {
		categoryId.value = ''
		categoryName.value = ''
	}
}

// ==================== 辅助函数 ====================
const isTempFile = (img) => {
	if (!img) return false
	if (img.startsWith('file://')) return true
	if (img.startsWith('wxfile://')) return true
	if (img.startsWith('http://tmp')) return true
	if (img.startsWith('blob:')) return true
	if (img.startsWith('/tmp') || img.includes('tmp')) return true
	return false
}

const validDescriptionLength = computed(() => getValidTextLength(description.value))

// ✅ 修复：只保留中文、英文、数字
const getValidTextLength = (text) => {
	if (!text) return 0
	const chinese = text.match(/[\u4e00-\u9fa5]/g) || []
	const english = text.match(/[a-zA-Z]/g) || []
	const numbers = text.match(/[0-9]/g) || []
	return chinese.length + english.length + numbers.length
}

const hasMeaningfulContent = (text) => {
	if (!text) return false
	const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
	const englishCount = (text.match(/[a-zA-Z]/g) || []).length
	return chineseCount >= 2 || englishCount >= 3
}

const isAllRepeatedChars = (text) => {
	if (!text) return false
	const trimmed = text.replace(/\s/g, '')
	if (trimmed.length < 2) return false
	const firstChar = trimmed[0]
	return trimmed.split('').every(char => char === firstChar)
}

// ✅ 修复：不使用 Unicode 属性转义
const isMeaninglessPunctuation = (text) => {
	if (!text) return false
	const trimmed = text.replace(/\s/g, '')
	const hasLetter = /[a-zA-Z]/.test(trimmed)
	const hasNumber = /[0-9]/.test(trimmed)
	const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed)
	return !hasLetter && !hasNumber && !hasChinese
}

// ==================== 验证函数 ====================
const validateTitle = () => {
	const trimmedTitle = title.value?.trim() || ''
	if (!trimmedTitle) { titleError.value = '请输入服务标题'; return false }
	if (trimmedTitle.length < 2) { titleError.value = '标题至少需要2个字符'; return false }
	if (trimmedTitle.length > 50) { titleError.value = '标题不能超过50个字符'; return false }
	if (/^\d+$/.test(trimmedTitle)) { titleError.value = '标题不能全是数字，请添加文字描述'; return false }
	if (isAllRepeatedChars(trimmedTitle)) { titleError.value = '标题不能全是重复字符'; return false }
	if (isMeaninglessPunctuation(trimmedTitle)) { titleError.value = '标题不能只包含标点符号'; return false }
	if (!hasMeaningfulContent(trimmedTitle)) { titleError.value = '请输入有意义的标题（至少2个中文或3个英文字母）'; return false }
	titleError.value = ''
	return true
}

const validateDescription = () => {
	const trimmedDesc = description.value?.trim() || ''
	if (!trimmedDesc) { descriptionError.value = '请输入服务描述'; return false }
	const validLength = getValidTextLength(trimmedDesc)
	if (validLength < 10) { descriptionError.value = `描述至少需要10个有效字符（当前${validLength}个）`; return false }
	if (/^\d+$/.test(trimmedDesc)) { descriptionError.value = '描述不能全是数字'; return false }
	if (isAllRepeatedChars(trimmedDesc)) { descriptionError.value = '描述不能全是重复字符'; return false }
	if (isMeaninglessPunctuation(trimmedDesc)) { descriptionError.value = '描述不能只包含标点符号'; return false }
	if (!hasMeaningfulContent(trimmedDesc)) { descriptionError.value = '请详细描述服务内容，至少包含2个中文或3个英文字母'; return false }
	descriptionError.value = ''
	return true
}

const validatePrice = () => {
	const priceValue = price.value?.trim() || ''
	if (!priceValue) { priceError.value = '请输入价格'; return false }
	const numPrice = parseFloat(priceValue)
	if (isNaN(numPrice)) { priceError.value = '价格必须是有效数字'; return false }
	if (numPrice <= 0) { priceError.value = '价格必须大于0'; return false }
	if (numPrice < 0.01) { priceError.value = '价格不能低于0.01元'; return false }
	if (numPrice > 99999) { priceError.value = '价格不能超过99999元'; return false }
	const decimalPart = priceValue.split('.')[1]
	if (decimalPart && decimalPart.length > 2) { priceError.value = '价格最多保留两位小数'; return false }
	priceError.value = ''
	return true
}

const validateContact = () => {
	const trimmedContact = contact.value?.trim() || ''
	if (!trimmedContact) { contactError.value = '请输入联系方式'; return false }
	if (trimmedContact.length < 5) { contactError.value = '请输入有效的联系方式'; return false }
	if (isAllRepeatedChars(trimmedContact)) { contactError.value = '联系方式不能全是重复字符'; return false }
	contactError.value = ''
	return true
}

// ==================== 输入时清除错误 ====================
const onTitleInput = () => {
	if (titleError.value) titleError.value = ''
}

const onDescriptionInput = () => {
	if (descriptionError.value) descriptionError.value = ''
}

const onPriceInput = () => {
	if (priceError.value) priceError.value = ''
}

const onContactInput = () => {
	if (contactError.value) contactError.value = ''
}

// ==================== 是否有修改 ====================
const hasChanges = computed(() => {
	if (!props.isEdit) return true
	if (title.value !== originalData.value.title) return true
	if (description.value !== originalData.value.description) return true
	if (parseFloat(price.value) || 0 !== parseFloat(originalData.value.price) || 0) return true
	if (contact.value !== originalData.value.contact) return true
	if (schoolId.value !== originalData.value.schoolId) return true
	if (categoryId.value !== originalData.value.categoryId) return true
	
	const oldImages = originalData.value.images || []
	const newImages = localImages.value || []
	const getFileName = (url) => {
		if (!url) return ''
		if (typeof url === 'string' && url.includes('/')) return url.split('/').pop()
		return String(url)
	}
	if (newImages.length !== oldImages.length) return true
	for (let i = 0; i < newImages.length; i++) {
		if (getFileName(oldImages[i]) !== getFileName(newImages[i])) return true
	}
	return false
})

// ==================== 学校选择 ====================
const chooseSchool = () => {
	if (submitting.value) return
	uni.navigateTo({ url: '/pages/school-search/school-search?from=publish' })
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
		uni.showToast({ title: '最多选择9张图片', icon: 'none' })
		return
	}
	uni.chooseImage({
		count: maxCount,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => { localImages.value = [...localImages.value, ...res.tempFilePaths] }
	})
}

const removeImage = (index) => {
	if (submitting.value) return
	localImages.value.splice(index, 1)
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
	titleError.value = ''
	descriptionError.value = ''
	priceError.value = ''
	contactError.value = ''
	
	if (!categoryId.value) { uni.showToast({ title: '请选择服务分类', icon: 'none' }); return false }
	if (!validateTitle()) { uni.showToast({ title: titleError.value, icon: 'none' }); return false }
	if (!validateDescription()) { uni.showToast({ title: descriptionError.value, icon: 'none' }); return false }
	if (!validatePrice()) { uni.showToast({ title: priceError.value, icon: 'none' }); return false }
	if (!validateContact()) { uni.showToast({ title: contactError.value, icon: 'none' }); return false }
	
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
	categoryId.value = ''
	categoryName.value = ''
	titleError.value = ''
	descriptionError.value = ''
	priceError.value = ''
	contactError.value = ''
}

// ==================== 提交 ====================
const handleSubmitClick = () => {
	if (submitting.value) return
	submitting.value = true
	handleSubmit()
}

const handleSubmit = async () => {
	if (!validateForm()) { submitting.value = false; return }

	if (props.isEdit && !hasChanges.value) {
		uni.showToast({ title: '没有检测到任何修改', icon: 'none' })
		submitting.value = false
		return
	}

	if (!checkLogin({ action: 'publish' })) { submitting.value = false; return }

	uni.showLoading({ title: props.isEdit ? '更新中...' : '发布中...', mask: true })

	try {
		let imagesString = ''
		let needDeleteOldImages = false

		if (localImages.value.length > 0) {
			const hasNewImages = localImages.value.some(isTempFile)
			if (hasNewImages) {
				const newImages = localImages.value.filter(isTempFile)
				const urls = await uploadServiceImages(newImages)
				const oldImages = localImages.value.filter(img => img && img.startsWith('http') && !isTempFile(img))
				imagesString = [...oldImages, ...urls].join(',')
				needDeleteOldImages = true
			} else {
				imagesString = localImages.value.join(',')
			}
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
				pages.length > 1 ? uni.navigateBack() : uni.reLaunch({ url: '/pages/my-publish/my-publish' })
			}, 2000)
		} else {
			await publishService(submitData)
			resetForm()
			uni.hideLoading()
			uni.showToast({ title: '发布成功待审核', icon: 'success', duration: 2000 })
		}
	} catch (err) {
		console.error(props.isEdit ? '更新失败' : '发布失败', err)
		uni.hideLoading()
		uni.showToast({ title: err.message || '操作失败', icon: 'none' })
	} finally {
		setTimeout(() => { submitting.value = false }, 500)
	}
}

// ==================== 生命周期 ====================
onMounted(() => {
	setupSchoolListener()
	if (props.isEdit && props.serviceId) {
		loadServiceDetail()
	}
})

watch(() => props.serviceId, (newId) => {
	if (newId && props.isEdit) loadServiceDetail()
})

onUnmounted(() => {
	removeSchoolListener()
})

defineExpose({ resetForm })
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

				&::after { border: none; }
				&.disabled { opacity: 0.6; }
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

		.required { color: #ff4d4f; }
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
			&.selected { color: #333; }
		}

		&.disabled { opacity: 0.6; }
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

				image { width: 100%; height: 100%; }

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
					&.disabled { opacity: 0.5; }
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