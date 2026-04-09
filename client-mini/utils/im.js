// utils/im.js
import TIM from 'tim-wx-sdk'
import TIMUploadPlugin from 'tim-upload-plugin'
import config from './config.js'

let tim = null
let isSDKReady = false
let readyCallbacks = []
let currentLoginUser = null

// 创建 IM 实例
export const getTIM = () => {
  if (!tim) {
    tim = TIM.create({ SDKAppID: 1600133706 })
    tim.setLogLevel(0)
    tim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin })
    
    // 监听 SDK 就绪
    tim.on(TIM.EVENT.SDK_READY, () => {
      console.log('✅ SDK 已就绪')
      isSDKReady = true
      try {
        currentLoginUser = tim._userID || null
        console.log('当前登录用户:', currentLoginUser)
      } catch (err) {
        console.error('获取登录用户失败', err)
      }
      readyCallbacks.forEach(cb => cb())
      readyCallbacks = []
    })
    
    // 监听 SDK 未就绪
    tim.on(TIM.EVENT.SDK_NOT_READY, () => {
      console.log('⚠️ SDK 未就绪')
      isSDKReady = false
      currentLoginUser = null
    })
    
    // 监听被踢下线
    tim.on(TIM.EVENT.KICKED_OUT, (event) => {
      console.log('被踢下线', event)
      isSDKReady = false
      currentLoginUser = null
      uni.showToast({
        title: '账号已在其他设备登录',
        icon: 'none'
      })
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/login/login'
        })
      }, 1500)
    })
  }
  return tim
}

// 等待 SDK 就绪
export const waitForSDKReady = () => {
  return new Promise((resolve) => {
    if (isSDKReady) {
      console.log('SDK 已就绪，直接返回')
      resolve()
      return
    }
    console.log('等待 SDK 就绪...')
    readyCallbacks.push(resolve)
  })
}

// 设置 SDK 就绪监听
export const setupSDKReady = () => {
  console.log('setupSDKReady 调用，SDK 监听已就绪')
}

// 获取当前登录用户
export const getCurrentLoginUser = () => {
  try {
    const tim = getTIM()
    if (tim._userID) {
      return tim._userID
    }
    return currentLoginUser
  } catch (err) {
    console.error('获取当前登录用户失败', err)
    return null
  }
}

// 检查是否已登录
export const isIMLoggedIn = () => {
  try {
    const tim = getTIM()
    return !!tim._userID
  } catch (err) {
    console.error('获取登录状态失败:', err)
    return false
  }
}

// 登录 IM
export const loginIM = async (userID, userSig) => {
  const tim = getTIM()
  
  try {
    const currentUser = tim._userID
    if (currentUser) {
      if (String(currentUser) !== String(userID)) {
        console.log(`当前登录用户 ${currentUser}，切换到 ${userID}，先退出`)
        await tim.logout()
        isSDKReady = false
        currentLoginUser = null
        await new Promise(resolve => setTimeout(resolve, 200))
      } else {
        console.log(`用户 ${userID} 已登录，无需重复登录`)
        return { success: true, message: 'already logged in', userID }
      }
    }
  } catch (err) {
    console.log('获取登录状态失败，继续登录流程:', err)
  }
  
  try {
    console.log('开始登录 IM, userID:', userID)
    const result = await tim.login({ userID, userSig })
    console.log('IM 登录成功', result)
    currentLoginUser = userID
    return result
  } catch (err) {
    console.error('IM 登录失败', err)
    throw err
  }
}

// 更新用户资料
export const updateMyProfile = async (nick, avatar) => {
  const tim = getTIM()
  
  let fullAvatar = ''
  if (avatar) {
    if (avatar.startsWith('http')) {
      fullAvatar = avatar
    } else if (avatar.startsWith('/uploads')) {
      fullAvatar = `${config.serverUrl}${avatar}`
    } else {
      fullAvatar = avatar
    }
  }
  
  console.log('更新用户资料:', { nick, avatar: fullAvatar })
  
  try {
    const result = await tim.updateMyProfile({ 
      nick: nick || '用户', 
      avatar: fullAvatar 
    })
    console.log('用户资料更新成功', result)
    return result
  } catch (err) {
    console.error('更新用户资料失败', err)
    setTimeout(async () => {
      try {
        await tim.updateMyProfile({ 
          nick: nick || '用户', 
          avatar: fullAvatar 
        })
        console.log('重试成功')
      } catch (retryErr) {
        console.error('重试也失败', retryErr)
      }
    }, 1000)
    throw err
  }
}

// 获取会话列表 - 添加强制刷新参数
export const getConversationList = async (forceRefresh = false) => {
  const tim = getTIM()
  try {
    // forceRefresh 为 true 时，传入空字符串强制从服务器拉取
    const options = forceRefresh ? { nextReqMessageID: '' } : undefined
    const res = await tim.getConversationList(options)
    const list = res.data.conversationList || []
    
    console.log(`getConversationList 返回 ${list.length} 个会话:`, 
      list.map(c => ({ id: c.conversationID, unread: c.unreadCount })))
    
    return list
  } catch (err) {
    console.error('获取会话列表失败', err)
    return []
  }
}

// 获取单个会话信息
export const getConversation = async (conversationID) => {
  const tim = getTIM()
  try {
    const res = await tim.getConversationProfile(conversationID)
    return res.data.conversation
  } catch (err) {
    console.error('获取会话失败', err)
    return null
  }
}

// 获取消息列表
export const getMessageList = async (userID, count = 15) => {
  const tim = getTIM()
  try {
    const res = await tim.getMessageList({
      conversationID: `C2C${userID}`,
      count
    })
    const messages = res.data.messageList || []
    return messages.sort((a, b) => a.time - b.time)
  } catch (err) {
    console.error('获取消息列表失败', err)
    return []
  }
}

// 发送文本消息
export const sendTextMessage = async (toUserID, text) => {
  const tim = getTIM()
  const message = tim.createTextMessage({
    to: toUserID,
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { text }
  })
  const res = await tim.sendMessage(message)
  return {
    ID: res.data.message.ID,
    flow: 'out',
    type: 'TIMTextElem',
    payload: { text },
    time: Math.floor(Date.now() / 1000),
    conversationID: `C2C${toUserID}`
  }
}

// 监听新消息
export const onMessageReceived = (callback) => {
  const tim = getTIM()
  tim.on(TIM.EVENT.MESSAGE_RECEIVED, callback)
}

// 监听会话更新
export const onConversationUpdate = (callback) => {
  const tim = getTIM()
  tim.on(TIM.EVENT.CONVERSATION_LIST_UPDATED, callback)
}

// 监听未读总数变化
export const onTotalUnreadCountUpdate = (callback) => {
  const tim = getTIM()
  tim.on(TIM.EVENT.TOTAL_UNREAD_MESSAGE_COUNT_UPDATED, callback)
}

// 退出登录
export const logoutIM = async () => {
  if (tim) {
    try {
      console.log('准备退出 IM 登录...')
      await tim.logout()
      console.log('IM 退出成功')
      isSDKReady = false
      currentLoginUser = null
    } catch (err) {
      console.error('退出 IM 失败', err)
    }
  } else {
    console.log('tim 实例不存在，无需退出')
  }
  readyCallbacks = []
}

// 导出 TIM 常量供外部使用
export const TIM_TYPE = TIM.TYPES