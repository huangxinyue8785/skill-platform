// api/service.js
import { request } from '@/utils/request.js'

// 获取服务列表
export const getServiceList = (params) => {
	return request({
		url: '/services',
		method: 'GET',
		data: params
	})
}

// 获取服务详情（公开）
export const getServiceDetail = (id) => {
	return request({
		url: `/services/${id}`,
		method: 'GET'
	})
}

// 获取服务详情（供编辑用）- 新增
export const getServiceDetailForEdit = (id) => {
	return request({
		url: `/services/${id}/edit`,
		method: 'GET'
	})
}

// 获取我的服务列表
export const getMyServices = (params) => {
	return request({
		url: '/services/my',
		method: 'GET',
		data: params
	})
}

// 发布服务
export const publishService = (data) => {
	return request({
		url: '/services',
		method: 'POST',
		data
	})
}

// 搜索服务
export const searchServices = (params) => {
	return request({
		url: '/services',
		method: 'GET',
		data: params
	})
}

// 下架服务
export const offlineService = (id) => {
	return request({
		url: `/services/${id}/offline`,
		method: 'PUT'
	})
}

// 删除服务
export const deleteService = (id) => {
	return request({
		url: `/services/${id}`,
		method: 'DELETE'
	})
}

// 更新服务
export const updateService = (id, data) => {
	return request({
		url: `/services/${id}`,
		method: 'PUT',
		data
	})
}