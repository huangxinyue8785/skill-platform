<template>
  <view class="conversation-container pageBg">
    <view class="custom-header" :style="{ paddingTop: getStatusBarHeight() + 30 + 'px' }">
      <view class="header-content">
        <text class="header-title">消息</text>
      </view>
    </view>

    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="login-prompt">
      <image src="/static/empty-chat.png" mode="aspectFit"></image>
      <text class="login-title">暂无聊天记录</text>
      <text class="login-tip">请先登录后再查看消息</text>
      <button class="login-btn" @click="goToLogin">去登录</button>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="loading">
      <uni-load-more status="loading"></uni-load-more>
    </view>

    <!-- 会话列表 -->
    <view v-else class="conversation-list">
      <view 
        v-for="item in conversationList" 
        :key="item.conversationID"
        class="conversation-item"
        @click="goToChat(item)"
      >
        <image class="avatar" :src="getAvatar(item)" mode="aspectFill"></image>
        <view class="info">
          <view class="top">
            <text class="name">{{ getDisplayName(item) }}</text>
            <text class="time">{{ formatTime(item.lastMessage?.lastTime) }}</text>
          </view>
          <view class="bottom">
            <text class="last-message">{{ getLastMessage(item) }}</text>
            <view v-if="item.unreadCount > 0" class="badge">
              {{ item.unreadCount > 99 ? '99+' : item.unreadCount }}
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="conversationList.length === 0" class="empty">
        <image src="/static/empty-chat.png" mode="aspectFit"></image>
        <text>暂无聊天记录</text>
        <text class="empty-tip">去服务详情页联系卖家开始聊天吧</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getConversationList, onConversationUpdate, waitForSDKReady, getTIM } from '@/utils/im'
import { getImageUrl } from '@/utils/request'
import { getStatusBarHeight } from "@/utils/system.js"
import config from '@/utils/config.js' 

const conversationList = ref([])
const loading = ref(true)
const isReady = ref(false)
const isLoggedIn = ref(false)  // 新增：登录状态
const userInfoCache = ref({})
let updateTimer = null
let isLoading = false

// 从后端获取用户信息
const fetchUserInfo = async (userID) => {
  if (userInfoCache.value[userID]) return userInfoCache.value[userID]
  
  try {
    const token = uni.getStorageSync('token')
    const res = await uni.request({
      url: `${config.serverUrl}/api/user/info/${userID}`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` }
    })
    
    if (res.data.code === 200) {
      userInfoCache.value[userID] = res.data.data
      return res.data.data
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
  }
  return null
}

// 加载会话列表
const loadConversations = async () => {
  if (isLoading) {
    console.log('正在加载中，跳过')
    return
  }
  
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  
  updateTimer = setTimeout(async () => {
    if (isLoading) return
    
    isLoading = true
    try {
      const list = await getConversationList()
      console.log('会话列表详情:', list.map(item => ({
        id: item.conversationID,
        unreadCount: item.unreadCount,
        lastMessage: item.lastMessage?.payload?.text
      })))
      
      const needUpdate = conversationList.value.length !== list.length ||
        (conversationList.value[0]?.conversationID !== list[0]?.conversationID)
      
      if (needUpdate) {
        conversationList.value = list
        
        const userIds = list.map(item => {
          if (item.type === 'C2C' && item.conversationID?.startsWith('C2C')) {
            return item.conversationID.substring(3)
          }
          return null
        }).filter(id => id && !userInfoCache.value[id])
        
        if (userIds.length > 0) {
          await Promise.all(userIds.map(id => fetchUserInfo(id)))
        }
        
        console.log('会话列表加载成功，共', conversationList.value.length, '条')
      }
      
      if (loading.value) {
        loading.value = false
      }
    } catch (err) {
      console.error('加载会话失败', err)
      loading.value = false
    } finally {
      isLoading = false
    }
  }, 100)
}

// 监听会话更新
onConversationUpdate(() => {
  if (isReady.value && isLoggedIn.value) {  // 只有登录状态才监听
    console.log('收到会话更新事件，重新加载')
    loadConversations()
  }
})

// 获取对方昵称
const getDisplayName = (item) => {
  if (item.type === 'C2C') {
    let userID = ''
    if (item.conversationID && item.conversationID.startsWith('C2C')) {
      userID = item.conversationID.substring(3)
    } else {
      userID = item.userProfile?.userID
    }
    
    if (userID && userInfoCache.value[userID]) {
      return userInfoCache.value[userID].nickname
    }
    return `用户${userID}`
  }
  return item.groupProfile?.name || '群聊'
}

// 获取对方头像
const getAvatar = (item) => {
  if (item.type === 'C2C') {
    let userID = ''
    if (item.conversationID && item.conversationID.startsWith('C2C')) {
      userID = item.conversationID.substring(3)
    } else {
      userID = item.userProfile?.userID
    }
    
    if (userID && userInfoCache.value[userID] && userInfoCache.value[userID].avatar) {
      const avatar = userInfoCache.value[userID].avatar
      if (avatar.startsWith('http')) return avatar
      return getImageUrl(avatar)
    }
  }
  return '/static/default-avatar.png'
}

// 获取最后一条消息
const getLastMessage = (item) => {
  const msg = item.lastMessage
  if (!msg) return '暂无消息'
  if (msg.type === 'TIMTextElem') return msg.payload?.text || ''
  if (msg.type === 'TIMImageElem') return '[图片]'
  if (msg.type === 'TIMSoundElem') return '[语音]'
  if (msg.type === 'TIMFileElem') return '[文件]'
  if (msg.type === 'TIMFaceElem') return '[表情]'
  return '[新消息]'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  if (msgDate.getTime() === today.getTime()) return `${hours}:${minutes}`
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (msgDate.getTime() === yesterday.getTime()) return '昨天'
  
  const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 跳转到聊天页
const goToChat = async (item) => {
  if (item.type === 'C2C') {
    let userID = ''
    if (item.conversationID && item.conversationID.startsWith('C2C')) {
      userID = item.conversationID.substring(3)
    } else {
      userID = item.userProfile?.userID
    }
    
    if (!userID) {
      console.error('无法获取用户ID', item)
      return
    }
    
    // 标记该会话为已读
    try {
      const tim = getTIM()
      await tim.setMessageRead({
        conversationID: `C2C${userID}`
      })
      console.log(`会话 ${userID} 已标记为已读，红点已消除`)
      
      // 立即更新本地会话列表的未读数
      const updatedList = conversationList.value.map(conv => {
        if (conv.conversationID === `C2C${userID}`) {
          return { ...conv, unreadCount: 0 }
        }
        return conv
      })
      conversationList.value = updatedList
      
    } catch (err) {
      console.error('标记已读失败', err)
    }
    
    const userInfo = userInfoCache.value[userID]
    const userName = userInfo?.nickname || `用户${userID}`
    const userAvatar = userInfo?.avatar || ''
    
    console.log('跳转到聊天，用户ID:', userID, '用户名:', userName)
    
    uni.navigateTo({
      url: `/pages/chat/chat?userId=${userID}&nickname=${encodeURIComponent(userName)}&avatar=${encodeURIComponent(userAvatar)}`
    })
  }
}

// 去登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  })
}

// 页面显示时刷新
onShow(() => {
  // 每次显示页面时重新检查登录状态
  const token = uni.getStorageSync('token')
  const newLoginState = !!token
  
  // 如果登录状态发生变化
  if (isLoggedIn.value !== newLoginState) {
    isLoggedIn.value = newLoginState
    if (newLoginState) {
      // 登录了，加载数据
      loadConversations()
    } else {
      // 未登录，清空数据
      conversationList.value = []
      loading.value = false
    }
  } else if (isLoggedIn.value && isReady.value && !isLoading) {
    console.log('页面显示，刷新会话列表')
    loadConversations()
  }
})

// 初始化
onMounted(async () => {
  console.log('conversation onMounted')
  
  // 检查登录状态
  const token = uni.getStorageSync('token')
  isLoggedIn.value = !!token
  
  if (isLoggedIn.value) {
    // 已登录，初始化IM并加载数据
    await waitForSDKReady()
    isReady.value = true
    await loadConversations()
  } else {
    // 未登录，直接结束loading状态
    loading.value = false
  }
})

// 组件销毁时清理定时器
onUnmounted(() => {
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  console.log('conversation onUnmounted')
})
</script>

<style lang="scss" scoped>
.conversation-container {
  min-height: 100vh;
}
.custom-header {
  padding: 30rpx 30rpx 10rpx 30rpx;
  .header-content .header-title {
    font-size: 40rpx;
    font-weight: 600;
    color: #333;
    display: block;
  }
}
.loading {
  display: flex;
  justify-content: center;
  padding-top: 100rpx;
}
.conversation-list {
  padding: 0 20rpx;
}
.conversation-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background-color: #fff;
  border-radius: 16rpx;
  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-right: 20rpx;
    background-color: #e0e0e0;
    flex-shrink: 0;
  }
  .info {
    flex: 1;
    overflow: hidden;
    .top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12rpx;
      .name {
        font-size: 32rpx;
        font-weight: 500;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 400rpx;
      }
      .time {
        font-size: 22rpx;
        color: #999;
      }
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .last-message {
        font-size: 26rpx;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .badge {
        min-width: 32rpx;
        height: 32rpx;
        line-height: 32rpx;
        background-color: #ff4d4f;
        border-radius: 16rpx;
        font-size: 20rpx;
        color: #fff;
        text-align: center;
        padding: 0 8rpx;
        margin-left: 12rpx;
      }
    }
  }
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  image {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 30rpx;
  }
  text {
    font-size: 28rpx;
    color: #999;
  }
  .empty-tip {
    font-size: 24rpx;
    color: #ccc;
    margin-top: 16rpx;
  }
}

/* 修改：未登录提示样式 - 让按钮贴合服务详情页风格 */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  image {
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 30rpx;
  }
  .login-title {
    font-size: 32rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 16rpx;
  }
  .login-tip {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 48rpx;
  }
  .login-btn {
    width: 300rpx;
    height: 90rpx;
    line-height: 90rpx;
    background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
    color: #333;
    border-radius: 45rpx;
    font-size: 30rpx;
    font-weight: 500;
    text-align: center;
    border: none;
    outline: none;
    
    &::after {
      border: none;
    }
    
    &:active {
      transform: scale(0.96);
      opacity: 0.9;
    }
  }
}
</style>