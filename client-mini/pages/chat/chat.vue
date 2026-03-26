<template>
	<view class="chat-container">
		<view v-if="loading" class="loading-mask">
			<image src="/static/loading.gif" class="loading-icon"></image>
		</view>

		<scroll-view scroll-y class="message-list" :scroll-into-view="scrollIntoView" :scroll-top="scrollTop"
			@scrolltoupper="loadMoreMessages" :show-scrollbar="false" :enhanced="true">
			<view v-for="(msg, index) in messageList" :key="msg.ID" :id="'msg-' + index">
				<view v-if="shouldShowTime(msg, index)" class="message-time">
					{{ formatTime(msg.time) }}
				</view>
				<view class="message-item" :class="{ self: msg.flow === 'out' }">
					<image class="avatar" :src="getAvatarUrl(msg)" mode="aspectFill"></image>
					<view class="message-content">
						<text class="message-text">{{ msg.payload?.text }}</text>
					</view>
				</view>
			</view>
			<view style="height: 120rpx;"></view>
		</scroll-view>

		<view class="input-area" :style="{ bottom: keyboardHeight + 'px' }">
			<textarea v-model="inputText" placeholder="请输入消息..." confirm-type="send" @confirm="sendMessage"
				:adjust-position="false" :hold-keyboard="true" :auto-height="true" :show-confirm-bar="false"
				class="message-input" />
			<button class="send-btn" @click="sendMessage">发送</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onUnmounted,
		nextTick,
		onMounted
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		useUserStore
	} from '@/stores/user'
	import {
		getImageUrl
	} from '@/utils/request'
	import { getMessageList, sendTextMessage, onMessageReceived, waitForSDKReady, getTIM } from '@/utils/im'

	const userStore = useUserStore()

	const keyboardHeight = ref(0)
	const targetUserId = ref('')
	const targetUserInfo = ref({})
	const messageList = ref([])
	const inputText = ref('')
	const scrollTop = ref(0)
	const scrollIntoView = ref('')
	const nextReqMessageID = ref('')
	const isLoadingMore = ref(false)
	const isReady = ref(false)
	const loading = ref(true)
	
	// ✅ 添加防抖定时器
	let messageTimer = null
	let keyboardTimer = null

	// 键盘监听
	onMounted(() => {
		// #ifdef MP-WEIXIN
		uni.onKeyboardHeightChange((res) => {
			keyboardHeight.value = res.height
			// ✅ 添加防抖，避免频繁滚动
			if (keyboardTimer) {
				clearTimeout(keyboardTimer)
			}
			if (res.height > 0) {
				keyboardTimer = setTimeout(() => scrollToBottom(), 150)
			}
		})
		// #endif
	})

	// 判断时间
	const shouldShowTime = (msg, index) => {
		if (index === 0) return true
		const prevMsg = messageList.value[index - 1]
		if (!prevMsg) return true
		return (msg.time - prevMsg.time) / 60 > 3
	}

	// 格式化时间
	const formatTime = (timestamp) => {
		const date = new Date(timestamp * 1000)
		const hours = date.getHours().toString().padStart(2, '0')
		const minutes = date.getMinutes().toString().padStart(2, '0')
		return `${hours}:${minutes}`
	}

	onLoad(async (options) => {
	  if (options.userId) {
	    targetUserId.value = options.userId
	    if (options.nickname) targetUserInfo.value.nickname = decodeURIComponent(options.nickname)
	    if (options.avatar) targetUserInfo.value.avatar = options.avatar
	    await fetchTargetUserInfo()
	    uni.setNavigationBarTitle({
	      title: targetUserInfo.value.nickname || '聊天'
	    })
	  } else {
	    targetUserId.value = '15'
	    targetUserInfo.value = {
	      nickname: '小黄',
	      avatar: '/uploads/avatars/avatar-1774266557720-906726993.jpg'
	    }
	    uni.setNavigationBarTitle({
	      title: '小黄'
	    })
	  }
	
	  // 等待 SDK 就绪（App.vue 会自动登录，如果已经登录会立即返回）
	  await waitForSDKReady()
	  
	  isReady.value = true
	  await loadMessages()
	  loading.value = false
	})

	// 获取对方信息
	const fetchTargetUserInfo = async () => {
		try {
			const token = uni.getStorageSync('token')
			const res = await uni.request({
				url: `http://10.64.29.106:3000/api/user/info/${targetUserId.value}`,
				method: 'GET',
				header: {
					'Authorization': `Bearer ${token}`
				}
			})
			if (res.data.code === 200) {
				targetUserInfo.value = {
					nickname: res.data.data.nickname || '用户',
					avatar: res.data.data.avatar || ''
				}
				uni.setNavigationBarTitle({
					title: targetUserInfo.value.nickname
				})
			}
		} catch (err) {
			console.error('获取对方信息失败', err)
			if (!targetUserInfo.value.nickname) {
				targetUserInfo.value.nickname = `用户${targetUserId.value}`
			}
		}
	}

	// 头像
	const getAvatarUrl = (msg) => {
		if (msg.flow === 'out') {
			return getImageUrl(userStore.userInfo?.avatar) || '/static/default-avatar.png'
		} else {
			return getImageUrl(targetUserInfo.value?.avatar) || '/static/default-avatar.png'
		}
	}

	// 加载消息
	const loadMessages = async () => {
	  if (!isReady.value || !targetUserId.value) return
	  try {
	    const messages = await getMessageList(targetUserId.value)
	    messageList.value = messages
	    nextReqMessageID.value = messages.length > 0 ? messages[messages.length - 1].ID : ''
	    
	    // ✅ 标记该会话为已读（红点消失）
	    await markConversationRead()
	    
	    scrollToBottom()
	  } catch (err) {
	    console.error('加载消息失败', err)
	  }
	}
	
	// 标记会话为已读
	const markConversationRead = async () => {
	  try {
	    const tim = getTIM()
	    await tim.setMessageRead({
	      conversationID: `C2C${targetUserId.value}`
	    })
	    console.log('会话已标记为已读')
	  } catch (err) {
	    console.error('标记已读失败', err)
	  }
	}

	// 加载更多
	const loadMoreMessages = async () => {
	  if (isLoadingMore.value || !nextReqMessageID.value) return
	  isLoadingMore.value = true
	  try {
	    const tim = getTIM()
	    const res = await tim.getMessageList({
	      conversationID: `C2C${targetUserId.value}`,
	      count: 15,
	      nextReqMessageID: nextReqMessageID.value
	    })
	    const olderMessages = res.data.messageList.sort((a, b) => a.time - b.time)
	    messageList.value = [...olderMessages, ...messageList.value]
	    nextReqMessageID.value = res.data.nextReqMessageID
	  } catch (err) {
	    console.error('加载更多失败', err)
	  } finally {
	    isLoadingMore.value = false
	  }
	}
	
	// ✅ 新消息监听 - 添加防抖，避免频繁更新
	onMessageReceived((event) => {
	  // 清除之前的定时器
	  if (messageTimer) {
	    clearTimeout(messageTimer)
	  }
	  
	  // 延迟处理，避免短时间内多次更新
	  messageTimer = setTimeout(() => {
	    // 只处理当前会话的消息
	    const newMessages = event.data.filter(msg => msg.conversationID === `C2C${targetUserId.value}`)
	    if (newMessages.length) {
	      console.log(`收到 ${newMessages.length} 条新消息`)
	      // 合并新消息到列表
	      messageList.value = [...messageList.value, ...newMessages]
	      // 标记为已读
	      markConversationRead()
	      // 滚动到底部
	      scrollToBottom()
	    }
	  }, 100)  // 延迟 100ms 执行
	})

	// 发送消息
	const sendMessage = async () => {
	  if (!isReady.value || !inputText.value.trim()) return
	  const text = inputText.value
	  try {
	    const newMsg = await sendTextMessage(targetUserId.value, text)
	    // ✅ 使用 Date.now() + 随机数 生成唯一 ID，避免重复
	    newMsg.ID = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
	    messageList.value.push(newMsg)
	    inputText.value = ''
	    scrollToBottom()
	  } catch (err) {
	    console.error('发送失败', err)
	    uni.showToast({
	      title: '发送失败',
	      icon: 'none'
	    })
	  }
	}

	// 滚动到底部 - 添加防抖
	const scrollToBottom = () => {
		nextTick(() => {
			if (messageList.value.length > 0) {
				scrollIntoView.value = `msg-${messageList.value.length - 1}`
				setTimeout(() => {
					scrollTop.value = 999999
				}, 50)
			}
		})
	}

	// ✅ 组件销毁时清理所有定时器
	onUnmounted(() => {
		// 清理消息定时器
		if (messageTimer) {
			clearTimeout(messageTimer)
			messageTimer = null
		}
		// 清理键盘定时器
		if (keyboardTimer) {
			clearTimeout(keyboardTimer)
			keyboardTimer = null
		}
		// #ifdef MP-WEIXIN
		uni.offKeyboardHeightChange(() => {})
		// #endif
	})
</script>

<style lang="scss" scoped>
	.chat-container {
		height: 100vh;
		background-color: #f5f5f5;
		position: relative;
		overflow: hidden;
	}

	.loading-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.3);
		z-index: 1000;
	}

	.loading-icon {
		width: 100rpx;
		height: 100rpx;
	}

	.message-list {
		height: 100vh;
		padding: 20rpx;
		padding-bottom: 50rpx;
		box-sizing: border-box;
		overflow-y: auto;

		&::-webkit-scrollbar {
			display: none;
		}
	}

	.message-time {
		text-align: center;
		font-size: 22rpx;
		color: #999;
		margin: 16rpx 0;
	}

	.message-item {
		display: flex;
		margin-bottom: 20rpx;

		&.self {
			flex-direction: row-reverse;

			.message-content {
				background: #07c160;
				margin-left: 0;
				margin-right: 20rpx;
				border-radius: 20rpx 20rpx 8rpx 20rpx;
			}

			.message-text {
				color: #fff;
				white-space: pre-wrap;
			}
		}

		.avatar {
			width: 70rpx;
			height: 70rpx;
			border-radius: 50%;
			flex-shrink: 0;
			background-color: #e0e0e0;
		}

		.message-content {
			max-width: 500rpx;
			background-color: #fff;
			padding: 18rpx 24rpx;
			margin-left: 20rpx;
			border-radius: 20rpx 20rpx 20rpx 8rpx;
		}

		.message-text {
			font-size: 28rpx;
			color: #333;
			word-break: break-all;
			line-height: 1.4;
			white-space: pre-wrap;
		}
	}

	.input-area {
		position: fixed;
		left: 0;
		right: 0;
		display: flex;
		padding: 20rpx 24rpx;
		background-color: #fff;
		border-top: 1rpx solid #eee;
		gap: 12rpx;
		transition: bottom 0.2s ease;

		.message-input {
			flex: 1;
			height: 70rpx;
			background-color: #f5f5f5;
			border-radius: 35rpx;
			padding: 18rpx 24rpx;
			font-size: 28rpx;
		}

		.send-btn {
			width: 120rpx;
			height: 70rpx;
			line-height: 70rpx;
			background: linear-gradient(135deg, #f2e89f 0%, #d0f3f9 100%);
			border-radius: 35rpx;
			font-size: 28rpx;
			color: #333;
			padding: 0;
			flex-shrink: 0;

			&::after {
				border: none;
			}
		}
	}
</style>