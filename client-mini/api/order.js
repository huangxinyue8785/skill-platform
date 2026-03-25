// api/order.js
import { request } from "@/utils/request.js";

//创建订单
export const createOrder =(data)=>{
	return request({
		url:'/orders',
		method:'POST',
		data
	})
}

// 获取订单列表
export const getOrderList = (params) => {
	return request({
		url: '/orders',
		method: 'GET',
		data: params
	})
}

// 获取订单详情
export const getOrderDetail = (id) => {
	return request({
		url: `/orders/${id}`,
		method: 'GET'
	})
}

// 支付订单（获取支付链接）
export const payOrder = (id) => {
	return request({
		url: `/orders/${id}/pay`,
		method: 'POST'
	})
}

// 取消订单
export const cancelOrder = (id) => {
	return request({
		url: `/orders/${id}/cancel`,
		method: 'PUT'
	})
}

// 完成订单（卖家标记完成）
export const completeOrder = (id) => {
	return request({
		url: `/orders/${id}/complete`,
		method: 'PUT'
	})
}

// 删除订单
export const deleteOrder = (id) => {
	return request({
		url: `/orders/${id}`,
		method: 'DELETE'
	})
}