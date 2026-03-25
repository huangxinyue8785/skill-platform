// api/category.js
import { request } from "@/utils/request";

//获取分类列表（树形结构）
export const getCategoryList =()=>{
	return request({
		url:'/categories',
		method:'GET'
	})
}

//获取一级分类
export const getParentCategories =()=>{
	return request({
		url:'/categories/parent',
		method:'GET'
	})
}

//获取子分类
export const getChildCategories =(parentId)=>{
	return request({
		url:`/categories/${parentId}/children`,
		method:'GET'
	})
}