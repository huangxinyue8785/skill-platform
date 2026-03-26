<template>
	<view class="profile-container">
		<!-- 头像 -->
		<view class="avatar-section" @click="changeAvatar">
			<image :src="getImageUrl(avatarPreview || userInfo.avatar)" mode="aspectFill"></image>
			<view class="change-avatar">
				<uni-icons type="camera" size="20" color="#fff"></uni-icons>
			</view>
		</view>

		<!-- 信息列表 -->
		<view class="info-section">
			<!-- 昵称 -->
			<view class="info-item" @click="editNickname">
				<text class="label">昵称</text>
				<view class="value">
					<text>{{userInfo.nickname}}</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 用户名 -->
			<view class="info-item">
				<text class="label">用户名</text>
				<view class="value">
					<text class="username">{{userInfo.username}}</text>
				</view>
			</view>

			<!-- 手机号 -->
			<view class="info-item" @click="editPhone">
				<text class="label">手机号</text>
				<view class="value">
					<text>{{userInfo.phone || '未设置'}}</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 邮箱 -->
			<view class="info-item" @click="editEmail">
				<text class="label">邮箱</text>
				<view class="value">
					<text>{{userInfo.email || '未设置'}}</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 性别 -->
			<view class="info-item" @click="editGender">
				<text class="label">性别</text>
				<view class="value">
					<text>{{genderText}}</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 生日 - 使用 picker 组件 -->
			<view class="info-item">
				<text class="label">生日</text>
				<picker 
					mode="date" 
					:value="userInfo.birthday" 
					:start="startDate" 
					:end="endDate"
					@change="onBirthdayChange"
				>
					<view class="value">
						<text>{{formattedBirthday || '请选择'}}</text>
						<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
					</view>
				</picker>
			</view>

			<!-- 学校 -->
			<view class="info-item" @click="editSchool">
				<text class="label">学校</text>
				<view class="value">
					<text>{{schoolName || '未设置'}}</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 修改密码 -->
			<view class="menu-section" @click="changePassword">
				<view class="menu-item">
					<text>修改密码</text>
					<uni-icons type="arrowright" size="16" color="#999"></uni-icons>
				</view>
			</view>

			<!-- 保存按钮 -->
			<button class="save-btn" @click="saveProfile">保存修改</button>
		</view>
	</view>
</template>

<script setup>
import {
	ref,
	computed,
	onMounted,
	onUnmounted
} from 'vue'
import {
	useUserStore
} from '@/stores/user'
import {
	getUserInfo,
	updateUserInfo
} from '@/api/user.js'
import { uploadAvatar } from '@/api/upload.js'  // 导入上传头像API
import { getImageUrl } from '@/utils/request.js'  // 加上这行

const userStore = useUserStore()

// 用户信息
const userInfo = ref({
	...userStore.userInfo
})

// 保存原始数据，用于判断是否有修改
const originalUserInfo = ref({})

// 学校名称
const schoolName = ref('')

// 头像预览（临时文件路径）
const avatarPreview = ref('')
// 是否有新头像待上传
const hasNewAvatar = ref(false)
// 旧头像URL（用于删除）
const oldAvatarUrl = ref('')

// 性别显示
const genderText = computed(() => {
	const gender = userInfo.value.gender
	if (gender === 1) return '男'
	if (gender === 2) return '女'
	return '未知'
})

// 生日格式化
const formattedBirthday = computed(() => {
	if (!userInfo.value.birthday) return '未设置'
	return userInfo.value.birthday
})

// ========== 检查数据是否有修改 ==========
const hasChanges = () => {
	if (userInfo.value.nickname !== originalUserInfo.value.nickname) return true
	if (userInfo.value.phone !== originalUserInfo.value.phone) return true
	if (userInfo.value.email !== originalUserInfo.value.email) return true
	if (userInfo.value.gender !== originalUserInfo.value.gender) return true
	if (userInfo.value.birthday !== originalUserInfo.value.birthday) return true
	if (userInfo.value.school_id !== originalUserInfo.value.school_id) return true
	if (hasNewAvatar.value) return true  // 有新头像也算修改
	return false
}

// ========== 个人信息页专用的学校选择监听 ==========
const setupSchoolListener = () => {
	uni.$on('profileSchoolSelected', (school) => {

		// 更新显示的学校名称
		schoolName.value = school.name

		// 更新 userInfo 中的 school_id
		userInfo.value.school_id = school.id

		// 提示用户需要保存
		uni.showToast({
			title: '已选择学校，点击保存生效',
			icon: 'none',
			duration: 2000
		})
	})
}

// 移除监听
const removeSchoolListener = () => {
	uni.$off('profileSchoolSelected')
}

// ========== 加载用户信息 ==========
const loadUserInfo = async () => {
	try {
		const res = await getUserInfo()
		
		// 确保生日是 YYYY-MM-DD 格式
		if (res.birthday) {
			if (res.birthday.includes('T')) {
				res.birthday = res.birthday.split('T')[0]
			}
		}
		
		userInfo.value = res
		userStore.setUserInfo(res, userStore.token)
		
		// 保存原始数据
		originalUserInfo.value = JSON.parse(JSON.stringify(res))
		// 保存旧头像URL
		oldAvatarUrl.value = res.avatar || ''

		schoolName.value = res.school_name || '未设置'
	} catch (err) {
		console.error('获取用户信息失败', err)
	}
}

// ========== 选择头像（先预览，不上传） ==========
const changeAvatar = () => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			// 只保存临时文件路径用于预览
			avatarPreview.value = res.tempFilePaths[0]
			hasNewAvatar.value = true
			
			uni.showToast({
				title: '已选择新头像，点击保存生效',
				icon: 'none',
				duration: 2000
			})
		}
	})
}

// ========== 保存修改（包括头像上传） ==========
const saveProfile = async () => {
	// 检查是否有修改
	if (!hasChanges()) {
		uni.showToast({ title: '没有检测到修改', icon: 'none' })
		return
	}
	
	uni.showLoading({ title: '保存中...' })

	try {
		let newAvatarUrl = userInfo.value.avatar
		
		// 在保存头像的地方
		if (hasNewAvatar.value && avatarPreview.value) {
		  uni.showLoading({ title: '上传头像中...' })
		  
		  const uploadRes = await uploadAvatar(avatarPreview.value)
		  
		  newAvatarUrl = uploadRes.avatarUrl
		}
		
		const currentSchoolName = schoolName.value
		const currentSchoolId = userInfo.value.school_id
		
		let birthday = userInfo.value.birthday
		if (birthday && birthday.includes('T')) {
			birthday = birthday.split('T')[0]
		}

		const updateData = {
			nickname: userInfo.value.nickname,
			phone: userInfo.value.phone,
			email: userInfo.value.email,
			gender: userInfo.value.gender,
			birthday: birthday,
			school_id: currentSchoolId || null,
			avatar: newAvatarUrl  // 上传后的新头像URL
		}


		const res = await updateUserInfo(updateData)

		if (res.birthday && res.birthday.includes('T')) {
			res.birthday = res.birthday.split('T')[0]
		}

		// 更新本地数据
		userInfo.value = res
		userStore.setUserInfo(res, userStore.token)
		originalUserInfo.value = JSON.parse(JSON.stringify(res))
		
		// 清除预览状态
		avatarPreview.value = ''
		hasNewAvatar.value = false
		// 更新旧头像URL
		oldAvatarUrl.value = res.avatar || ''

		if (res.school_name) {
			schoolName.value = res.school_name
		} else if (currentSchoolName && currentSchoolName !== '未设置') {
			schoolName.value = currentSchoolName
		} else {
			schoolName.value = '未设置'
		}
		
		uni.$emit('avatarUpdated') 

		uni.hideLoading()
		uni.showToast({ title: '保存成功', icon: 'success' })
	} catch (err) {
		console.error('保存失败', err)
		uni.hideLoading()
		uni.showToast({ title: err.message || '保存失败', icon: 'none' })
	}
}

const editNickname = () => {
	uni.showModal({
		title: '修改昵称',
		content: userInfo.value.nickname,
		editable: true,
		placeholderText: '请输入新昵称',
		success: (res) => {
			if (res.confirm && res.content) {
				userInfo.value.nickname = res.content
			}
		}
	})
}

const editPhone = () => {
	uni.showModal({
		title: '修改手机号',
		content: userInfo.value.phone || '',
		editable: true,
		placeholderText: '请输入手机号',
		success: (res) => {
			if (res.confirm && res.content) {
				const phoneRegex = /^1[3-9]\d{9}$/
				if (!phoneRegex.test(res.content)) {
					uni.showToast({ title: '手机号格式不正确', icon: 'none' })
					return
				}
				userInfo.value.phone = res.content
			}
		}
	})
}

const editEmail = () => {
	uni.showModal({
		title: '修改邮箱',
		content: userInfo.value.email || '',
		editable: true,
		placeholderText: '请输入邮箱',
		success: (res) => {
			if (res.confirm && res.content) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
				if (!emailRegex.test(res.content)) {
					uni.showToast({ title: '邮箱格式不正确', icon: 'none' })
					return
				}
				userInfo.value.email = res.content
			}
		}
	})
}

const editGender = () => {
	uni.showActionSheet({
		itemList: ['男', '女', '未知'],
		success: (res) => {
			const genderMap = [1, 2, 0]
			userInfo.value.gender = genderMap[res.tapIndex]
		}
	})
}

// 计算日期范围
const startDate = computed(() => {
	const date = new Date()
	date.setFullYear(date.getFullYear() - 100)
	return date.toISOString().split('T')[0]
})

const endDate = computed(() => {
	return new Date().toISOString().split('T')[0]
})

// 生日选择事件
const onBirthdayChange = (e) => {
	const selectedDate = e.detail.value
	userInfo.value.birthday = selectedDate
}

// ========== 修改：跳转到学校搜索页，带上参数 from=profile ==========
const editSchool = () => {
	uni.navigateTo({
		url: `/pages/school-search/school-search?from=profile&currentSchoolId=${userInfo.value.school_id || ''}`
	})
}

const changePassword = () => {
	uni.navigateTo({
		url: '/pages/change-password/change-password'
	})
}

// ========== 生命周期 ==========
onMounted(async () => {
	await loadUserInfo()
	setupSchoolListener()  // 监听个人信息专用事件
})

onUnmounted(() => {
	removeSchoolListener()
})
</script>

<style lang="scss" scoped>
	.profile-container {
		min-height: 100vh;
		padding: 30rpx;

		.avatar-section {
			position: relative;
			width: 160rpx;
			height: 160rpx;
			margin: 0 auto 40rpx;

			image {
				width: 100%;
				height: 100%;
				border-radius: 50%;
			}

			.change-avatar {
				position: absolute;
				right: 0;
				bottom: 0;
				width: 48rpx;
				height: 48rpx;
				background-color: #333;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		/* 信息卡片 */
		.info-section {
			background-color: #fff;
			border-radius: 20rpx;
			margin-bottom: 30rpx;
			overflow: hidden;
			box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.07);

			.info-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 30rpx;
				border-bottom: 1rpx solid #f5f5f5;

				&:last-child {
					border-bottom: none;
				}

				.label {
					font-size: 30rpx;
					color: #333;
				}

				.value {
					display: flex;
					align-items: center;
					gap: 16rpx;

					text {
						font-size: 28rpx;
						color: #666;
					}

					.username {
						margin-right: 20rpx;
						font-size: 28rpx;
						color: #999;
					}
				}
			}
		}

		/* 菜单卡片 */
		.menu-section {
			background-color: #fff;
			margin-bottom: 30rpx;
			overflow: hidden;
			box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.07);

			.menu-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 30rpx;

				text {
					font-size: 30rpx;
					color: #333;
				}
			}
		}

		/* 保存按钮 */
		.save-btn {
			background: linear-gradient(135deg, rgba(254, 222, 101, 100), rgba(203, 244, 253, 100));
			color: #333;
			border-radius: 50rpx;
			height: 88rpx;
			line-height: 88rpx;
			font-size: 32rpx;
			margin-top: 40rpx;
			margin-bottom: 40rpx;
		}
	}
</style>