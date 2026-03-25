import {
	defineStore
} from 'pinia'

export const useUserStore = defineStore('user', {
	state: () => ({
		token: uni.getStorageSync('token') || '',
		userInfo: uni.getStorageSync('userInfo') || null
	}),

	actions: {
		setUserInfo(userInfo, token) {
			this.userInfo = userInfo
			this.token = token

			uni.setStorageSync('userInfo', userInfo)
			uni.setStorageSync('token', token)

			console.log('用户已登录', userInfo.nickname);
		},

		logout() {
			this.userInfo = null
			this.token = ''

			uni.removeStorageSync('userInfo')
			uni.removeStorageSync('token')

			console.log('用户已退出');
		}
	}
})