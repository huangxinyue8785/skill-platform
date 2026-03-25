// api/favorite.js
import { request } from '@/utils/request.js'

// 检查是否收藏
export const checkFavorite = (serviceId) => {
  return request({
    url: `/favorites/check/${serviceId}`,
    method: 'GET'
  })
}

// 添加收藏
export const addFavorite = (serviceId) => {
  return request({
    url: '/favorites',
    method: 'POST',
    data: { service_id: serviceId }
  })
}

// 取消收藏 - 注意参数是 favoriteId
export const removeFavorite = (favoriteId) => {
  return request({
    url: `/favorites/${favoriteId}`,
    method: 'DELETE'
  })
}

// 获取收藏列表
export const getFavoriteList = (params) => {
  return request({
    url: '/favorites',
    method: 'GET',
    data: params
  })
}