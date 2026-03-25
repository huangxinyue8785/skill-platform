import {request} from '@/utils/request.js'

//用户登录
export const login =(username,password)=>{
	return request({
		url:'/user/login',
		method:'POST',
		data:{username,password}
	})
}

// 用户注册
export const register =(data)=>{
	return request({
		url:'/user/register',
		method:'POST',
		data
	})
}

//获取用户信息
export const getUserInfo=()=>{
	return request({
		url:'/user/info',
		method:'GET'
	})
}

//更新用户信息
export const updateUserInfo =(data)=>{
	return request({
		url:'/user/info',
		method:'PUT',
		data
	})
}

// 我的订单
const goToMyOrders = () => {
	if (!checkLogin()) return
	uni.navigateTo({ url: '/pages/my-orders/my-orders' })
}

// 我的收藏
const goToMyFavorites = () => {
	if (!checkLogin()) return
	uni.navigateTo({ url: '/pages/my-favorites/my-favorites' })
}

// 修改密码
export const updatePassword = (data) => {
	return request({
		url: '/user/password',
		method: 'PUT',
		data
	})
}