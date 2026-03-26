// App.vue
<script>
import { getTIM, setupSDKReady, loginIM, updateMyProfile, waitForSDKReady, logoutIM } from '@/utils/im'
import { useUserStore } from '@/stores/user'

export default {
  onLaunch: async function() {
    console.log('App Launch')
    
    // 1. 初始化 IM 实例
    getTIM()
    setupSDKReady()
    
    // 2. 尝试自动登录
    await this.autoLogin()
  },
  methods: {
    // App.vue 的 autoLogin 方法
    async autoLogin() {
      const token = uni.getStorageSync('token')
      const userInfo = uni.getStorageSync('userInfo')
      
      if (!token || !userInfo) {
        console.log('未找到登录信息，跳过自动登录')
        return
      }
      
      const userStore = useUserStore()
      userStore.setUserInfo(userInfo, token)
      
      console.log('找到登录信息，尝试自动登录 IM，用户:', userInfo.nickname)
      
      try {
        // ✅ 获取当前 IM 登录的用户
        const tim = getTIM()
        let currentIMUser = null
        
        try {
          // ✅ 使用 tim._userID 获取（修正后的方式）
          currentIMUser = tim._userID || null
          console.log('当前 IM 登录用户:', currentIMUser)
        } catch (err) {
          console.log('获取当前 IM 用户失败，可能未登录', err)
        }
        
        // ✅ 如果 IM 已经登录且是不同用户，先退出
        if (currentIMUser && String(currentIMUser) !== String(userInfo.id)) {
          console.log(`IM 当前登录用户 ${currentIMUser} 与本地用户 ${userInfo.id} 不一致，先退出 IM`)
          await logoutIM()
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        // 获取 UserSig
        const imRes = await uni.request({
          url: 'http://10.64.29.106:3000/api/user/im/usersig',
          method: 'GET',
          header: { 'Authorization': `Bearer ${token}` }
        })
        
        if (imRes.data.code === 200) {
          // 检查是否需要登录
          const needLogin = !currentIMUser || String(currentIMUser) !== String(userInfo.id)
          
          if (needLogin) {
            await loginIM(String(userInfo.id), imRes.data.data.userSig)
            console.log('自动登录 IM 成功')
          } else {
            console.log(`用户 ${userInfo.id} 已登录，无需重复登录`)
          }
          
          await waitForSDKReady()
          
          // 同步用户资料
          const avatarUrl = userInfo.avatar 
            ? `http://10.64.29.106:3000${userInfo.avatar}`
            : ''
          
          await updateMyProfile(
            userInfo.nickname || '用户',
            avatarUrl
          )
          console.log('用户资料同步成功')
        } else {
          console.error('获取 UserSig 失败', imRes.data)
          await userStore.logout()
        }
      } catch (err) {
        console.error('自动登录 IM 失败', err)
        await userStore.logout()
      }
    }
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style lang="scss">
@import "common/style/common-style.scss"
</style>