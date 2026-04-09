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
            <!-- 红点显示 - 确保能正确显示 -->
            <view v-if="item.unreadCount && item.unreadCount > 0" class="badge">
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
const isLoggedIn = ref(false)
const userInfoCache = ref({})
let updateTimer = null
let isLoading = false
let pollTimer = null

// 防抖相关变量
let updateDebounceTimer = null
const UPDATE_DEBOUNCE_DELAY = 300

// 更新 TabBar 未读角标
const updateTabBarUnreadBadge = () => {
  try {
    const totalUnread = conversationList.value.reduce((sum, item) => sum + (item.unreadCount || 0), 0)
    console.log('更新 TabBar 角标，总未读数:', totalUnread)
    
    if (totalUnread > 0) {
      uni.setTabBarBadge({
        index: 2,
        text: totalUnread > 99 ? '99+' : String(totalUnread)
      }).catch(() => {})
    } else {
      uni.removeTabBarBadge({
        index: 2
      }).catch(() => {})
    }
  } catch (err) {}
}

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
const loadConversations = async (forceRefresh = false) => {
  if (isLoading) {
    console.log('正在加载中，跳过')
    return
  }
  
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  
  const doLoad = async () => {
    isLoading = true
    try {
      const list = await getConversationList(forceRefresh)
      
      console.log('========== 会话列表详情 ==========')
      console.log('会话数量:', list.length)
      
      list.forEach((item, index) => {
        console.log(`${index + 1}. 会话ID: ${item.conversationID}`)
        console.log(`   unreadCount: ${item.unreadCount}`)
        console.log(`   类型: ${item.type}`)
      })
      
      const totalUnread = list.reduce((sum, item) => sum + (item.unreadCount || 0), 0)
      console.log(`总未读消息数: ${totalUnread}`)
      
      conversationList.value = [...list]
      
      const userIds = list
        .filter(item => item.type === 'C2C' && item.conversationID?.startsWith('C2C'))
        .map(item => item.conversationID.substring(3))
        .filter(id => id && !userInfoCache.value[id])
      
      if (userIds.length > 0) {
        await Promise.all(userIds.map(id => fetchUserInfo(id)))
      }
      
      if (loading.value) {
        loading.value = false
      }
      
      console.log('会话列表加载成功，共', conversationList.value.length, '条')
      
      updateTabBarUnreadBadge()
      
    } catch (err) {
      console.error('加载会话失败', err)
      loading.value = false
    } finally {
      isLoading = false
      updateTimer = null
    }
  }
  
  if (forceRefresh) {
    await doLoad()
  } else {
    updateTimer = setTimeout(doLoad, 100)
  }
}

// 监听会话更新 - 立即更新未读数
const handleConversationUpdate = async (event) => {
  console.log('收到会话更新事件', event?.data?.map(c => ({ 
    id: c.conversationID, 
    unread: c.unreadCount 
  })))
  
  if (!isReady.value || !isLoggedIn.value) {
    console.log('SDK未就绪或未登录，跳过更新')
    return
  }
  
  // 立即更新本地会话列表中的未读数
  if (event?.data && event.data.length > 0) {
    const newList = [...conversationList.value]
    let hasChange = false
    
    for (const updatedConv of event.data) {
      const index = newList.findIndex(item => item.conversationID === updatedConv.conversationID)
      
      if (index !== -1) {
        if (newList[index].unreadCount !== updatedConv.unreadCount) {
          console.log(`✅ 立即更新会话 ${updatedConv.conversationID} 未读数: ${newList[index].unreadCount} -> ${updatedConv.unreadCount}`)
          newList[index] = { 
            ...newList[index], 
            unreadCount: updatedConv.unreadCount,
            lastMessage: updatedConv.lastMessage || newList[index].lastMessage
          }
          hasChange = true
        }
      } else if (updatedConv.conversationID) {
        console.log(`✅ 新增会话: ${updatedConv.conversationID}, 未读数: ${updatedConv.unreadCount}`)
        newList.unshift(updatedConv)
        hasChange = true
      }
    }
    
    if (hasChange) {
      conversationList.value = newList
      updateTabBarUnreadBadge()
    }
  }
  
  // 清除之前的防抖定时器
  if (updateDebounceTimer) {
    clearTimeout(updateDebounceTimer)
  }
  
  // 延迟后完整刷新，确保数据一致性
  updateDebounceTimer = setTimeout(async () => {
    console.log('执行完整会话列表刷新')
    await loadConversations(true)
    updateDebounceTimer = null
  }, UPDATE_DEBOUNCE_DELAY)
}

// 监听总未读数变化（使用 SDK 事件）
const setupTotalUnreadListener = () => {
  try {
    const tim = getTIM()
    if (tim && tim.on) {
      // 直接使用字符串事件名，避免引用 TIM 常量
      tim.on('TOTAL_UNREAD_MESSAGE_COUNT_UPDATED', (event) => {
        console.log('📢 收到总未读数变化事件:', event.data)
        if (isReady.value && isLoggedIn.value) {
          console.log('总未读数变化，立即刷新会话列表')
          loadConversations(true)
        }
      })
    }
  } catch (err) {
    console.log('设置总未读数监听失败:', err)
  }
}

// 轮询检查未读数（兜底方案）
const startPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  
  pollTimer = setInterval(async () => {
    if (!isReady.value || !isLoggedIn.value) return
    
    // 获取当前页面栈，如果在聊天页面不轮询
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage?.route === 'pages/chat/chat') return
    
    try {
      const list = await getConversationList(true)
      let hasChange = false
      
      // 比较未读数是否有变化
      for (const newConv of list) {
        const oldConv = conversationList.value.find(c => c.conversationID === newConv.conversationID)
        if (oldConv && oldConv.unreadCount !== newConv.unreadCount) {
          console.log(`轮询检测到变化: ${newConv.conversationID} ${oldConv.unreadCount} -> ${newConv.unreadCount}`)
          hasChange = true
          break
        }
      }
      
      if (hasChange || list.length !== conversationList.value.length) {
        console.log('轮询检测到变化，刷新会话列表')
        conversationList.value = [...list]
        updateTabBarUnreadBadge()
      }
    } catch (err) {
      console.log('轮询检查失败', err)
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 注册事件监听
onConversationUpdate(handleConversationUpdate)

// 设置总未读数监听
setupTotalUnreadListener()

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
    return `用户${userID || '未知'}`
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
    
    // 立即清除本地该会话的未读数（优化体验）
    const currentUnread = item.unreadCount || 0
    if (currentUnread > 0) {
      const newList = conversationList.value.map(conv => {
        if (conv.conversationID === item.conversationID) {
          return { ...conv, unreadCount: 0 }
        }
        return conv
      })
      conversationList.value = newList
      updateTabBarUnreadBadge()
    }
    
    const userInfo = userInfoCache.value[userID]
    const userName = userInfo?.nickname || `用户${userID}`
    const userAvatar = userInfo?.avatar || ''
    
    console.log('跳转到聊天，用户ID:', userID, '用户名:', userName, '清除未读数:', currentUnread)
    
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
onShow(async () => {
  console.log('页面显示 onShow')
  const token = uni.getStorageSync('token')
  const newLoginState = !!token
  
  if (isLoggedIn.value !== newLoginState) {
    isLoggedIn.value = newLoginState
    if (newLoginState) {
      await waitForSDKReady()
      isReady.value = true
      await loadConversations(true)
    } else {
      conversationList.value = []
      loading.value = false
      try {
        uni.removeTabBarBadge({ index: 2 })
      } catch (e) {}
    }
  } else if (isLoggedIn.value && isReady.value && !isLoading) {
    console.log('页面显示，刷新会话列表')
    await loadConversations(true)
  }
})

// 初始化
onMounted(async () => {
  console.log('conversation onMounted')
  
  // 监听 chat 页面发送的已读事件
  uni.$on('conversationRead', ({ conversationID }) => {
    console.log('收到已读事件:', conversationID)
    // 更新本地会话列表的未读数
    const newList = conversationList.value.map(conv => {
      if (conv.conversationID === conversationID) {
        return { ...conv, unreadCount: 0 }
      }
      return conv
    })
    conversationList.value = newList
    updateTabBarUnreadBadge()
    
    // 可选：重新拉取一次确保数据同步
    setTimeout(() => {
      loadConversations(true)
    }, 500)
  })
  
  const token = uni.getStorageSync('token')
  isLoggedIn.value = !!token
  
  if (isLoggedIn.value) {
    await waitForSDKReady()
    isReady.value = true
    await loadConversations(true)
    startPolling()
  } else {
    loading.value = false
  }
})

// 组件销毁时清理定时器
onUnmounted(() => {
  // 移除事件监听
  uni.$off('conversationRead')
  
  if (updateTimer) {
    clearTimeout(updateTimer)
  }
  if (updateDebounceTimer) {
    clearTimeout(updateDebounceTimer)
  }
  stopPolling()
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