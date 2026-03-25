import {request} from '@/utils/request.js'

//获取学校列表
export const getSchoolList = (params) =>{
	return request({
		url:'/schools',
		method:'GET',
		data:params
	})
}

//搜索学校
export const searchSchools =(keyword)=>{
	return request({
		url:'/schools/search',
		method:'GET',
		data:{keyword}
	})
}