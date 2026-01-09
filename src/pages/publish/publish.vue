<template>
    <view class="container">
      <view class="form-group">
        <view class="form-item">
          <text class="label">上传图片</text>
          <view class="upload-box" @tap="chooseImage">
            <image v-if="formData.image" :src="formData.image" mode="aspectFill" />
            <view v-else class="upload-placeholder">
              <text class="plus">+</text>
              <text>点击上传</text>
            </view>
          </view>
        </view>
  
        <view class="form-item">
          <text class="label">物品名称</text>
          <input class="input" v-model="formData.title" placeholder="请输入物品名称" @input="saveDraft" />
        </view>
  
        <view class="form-item">
          <text class="label">物品位置</text>
          <view class="location-input" @tap="getLocation">
            <text :class="{ 'placeholder': !formData.location }">{{ formData.location || '点击获取当前位置' }}</text>
            <text class="loc-icon">📍</text>
          </view>
        </view>
  
        <view v-if="isLost" class="form-item reward-section">
          <view class="reward-header">
            <text class="label">开启悬赏 (可选)</text>
            <switch :checked="formData.rewardEnabled" @change="toggleReward" color="#007aff" />
          </view>
          <view v-if="formData.rewardEnabled" class="reward-input-box">
            <input type="number" class="input" v-model.number="formData.rewardPoints" placeholder="输入悬赏积分" @input="saveDraft" />
            <text class="balance">当前余额: {{ userBalance }}</text>
          </view>
        </view>
      </view>
  
      <button class="submit-btn" :loading="isSubmitting" @tap="handleSubmit">立即发布</button>

      <view v-if="matchResults && matchResults.length > 0" class="match-list">
        <view class="match-title">✨ AI 为您找到高度疑似物品</view>
        <view v-for="(item, index) in matchResults" :key="index" class="match-card" @tap="goToMatchDetail(matchItem.itemID)">
          <image :src="item.imageUrl || item.image" mode="aspectFill" class="match-img" />
          <view class="match-info">
            <text class="match-name">{{ item.title || item.description }}</text>
            <text class="match-time">上传时间：{{ item.publishTime || '刚刚' }}</text>
          </view>
        </view>
      </view>
    </view>
  </template>
  
  <script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { onLoad } from '@dcloudio/uni-app'
  import { useUserStore } from '@/stores/user'

  const userStore = useUserStore()
  const isLost = ref(true)
  const isSubmitting = ref(false)
  const userBalance = ref(0) // 用户真实余额
  const pageTitle = ref('发布寻物')

  // 接收首页传来的 type 参数
onLoad((options: any) => {
  if (options.type === 'FOUND') {
    isLost.value = false
    pageTitle.value = '发布招领'
  } else {
    isLost.value = true
    pageTitle.value = '发布寻物'
  }
  // 动态修改小程序页面顶部标题
  uni.setNavigationBarTitle({ title: pageTitle.value })

  // 获取用户余额
  fetchUserBalance()
})

  const formData = reactive({
    title: '',
    location: '',
    latitude: 0,
    longitude: 0,
    image: '',
    rewardEnabled: false,
    rewardPoints: 0
  })

  // 开关悬赏的回调
  const toggleReward = (e: any) => {
    formData.rewardEnabled = e.detail.value
    if (!formData.rewardEnabled) {
      formData.rewardPoints = 0
    }
    saveDraft()
  }
  
  // 自动填充缓存（应对网络故障）
  onMounted(() => {
    const draft = uni.getStorageSync('publish_draft')
    if (draft) Object.assign(formData, draft)
  })
  
  const saveDraft = () => uni.setStorageSync('publish_draft', formData)

// pages/publish/publish.vue
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      
      // 立即展示本地预览，提升用户体验
      formData.image = tempFilePath;
      
      uni.showLoading({ title: 'AI 分析并同步云端...', mask: true });
      
      uni.uploadFile({
        url: 'http://localhost:8084/item/upload-and-analyze', // 调用新的复合接口
        filePath: tempFilePath,
        name: 'file',
        success: (uploadRes) => {
          if (!uploadRes.data) {
            uni.showToast({ title: '服务器无响应', icon: 'none' });
            return;
          }
          try {
            const resData = JSON.parse(uploadRes.data);
            if (resData.code === 200) {
              // 核心：替换为云端 URL 并自动填充 AI 描述
              formData.image = resData.data.url;           // 存入云端地址
              formData.title = resData.data.description;   // 填充语义信息
              
              uni.showToast({ title: '智能识别成功', icon: 'success' });
              saveDraft(); // 保存包含云 URL 的草稿
            } else {
              uni.showToast({ title: resData.msg || '处理失败', icon: 'none' });
            }
          } catch (e) {
            console.error('解析异常', e);
            uni.showToast({ title: '服务器返回格式错误', icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '网络请求失败', icon: 'none' });
        },
        complete: () => uni.hideLoading()
      });
    }
  });
};
  //获取地理位置

const getLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      formData.location = res.name || res.address;
      formData.latitude = res.latitude;
      formData.longitude = res.longitude;
      saveDraft(); // 保存到草稿
    },
    fail: (err) => {
      if (err.errMsg.includes('auth deny')) {
        uni.showModal({
          title: '授权提示',
          content: '需要位置权限才能选择地点，请在设置中开启',
          success: (res) => {
            if (res.confirm) uni.openSetting();
          }
        });
      }
    }
  });
}

  // 失物招领与寻物启事
  
  const matchResults = ref([]); // 定义响应式数组

  // 获取用户赏币余额
  const fetchUserBalance = () => {
    // 检查是否已登录
    if (!userStore.token) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    uni.request({
      url: 'http://localhost:8085/user/profile',
      method: 'GET',
      header: {
        'Authorization': `Bearer ${userStore.token}`
      },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          userBalance.value = res.data.data.coinBalance || 0
        }
      },
      fail: (err) => {
        console.error('获取余额失败:', err)
        uni.showToast({ title: '获取余额失败', icon: 'none' })
      }
    })
  }

  const handleSubmit = async () => {
    // 登录校验
    if (!userStore.isLoggedIn || !userStore.userInfo?.userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/user/login/index' })
      }, 1500)
      return
    }

    // 基本校验
    if (!formData.title || !formData.location || !formData.image) {
      uni.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    // 悬赏校验
    if (isLost.value && formData.rewardEnabled) {
      const rewardAmount = Number(formData.rewardPoints)
      if (!rewardAmount || rewardAmount <= 0) {
        uni.showToast({ title: '请输入有效的悬赏额', icon: 'none' })
        return
      }
      if (rewardAmount > userBalance.value) {
        uni.showToast({ title: '悬赏额超过当前余额', icon: 'none' })
        return
      }
    }

    isSubmitting.value = true;
    
    uni.request({
      url: 'http://localhost:8084/item/publish',
      method: 'POST',
      data: {
        userId: userStore.userInfo.userId, // 使用真实的登录用户ID
        itemType: isLost.value ? 'LOST' : 'FOUND',
        title: formData.title,
        description: formData.title,
        locationText: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        imageUrl: formData.image,
        rewardEnabled: isLost.value ? formData.rewardEnabled : false,
        rewardPoints: isLost.value && formData.rewardEnabled ? formData.rewardPoints : 0
      },
      success: async (res) => {
        if (res.data.code === 200) {
          if (res.data.match) {
            // 【核心】保存匹配到的物品数据
            matchItem.value = res.data.data;
            uni.showToast({ title: '为您找到匹配物品！', icon: 'success' });
          } else {
            uni.showToast({ title: '发布成功', icon: 'success' });
            // 如果没匹配到，延迟返回
            setTimeout(() => uni.navigateBack(), 1500);
          }
        } else {
          uni.showToast({ title: res.data.message || '发布失败', icon: 'none' })
        }
      },
      fail: () => {
        uni.showToast({ title: '连接后端失败', icon: 'none' });
      },
      complete: () => {
        isSubmitting.value = false;
      }
    });
  }

  // 3. 点击跳转详情方法
const goToMatchDetail = (id) => {
  uni.navigateTo({
    url: `/pages/item/detail?id=${id}`
  });
};
  </script>
  
  <style lang="scss" scoped>
  .container { padding: 30rpx; background: #fff; min-height: 100vh; }
  .form-group { margin-bottom: 60rpx; }
  .form-item { margin-bottom: 40rpx; }
  .label { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; }
  .upload-box {
    width: 200rpx; height: 200rpx; background: #f4f4f4; border-radius: 12rpx;
    display: flex; align-items: center; justify-content: center;
    image { width: 100%; height: 100%; border-radius: 12rpx; }
    .upload-placeholder { color: #999; font-size: 22rpx; text-align: center; .plus { font-size: 50rpx; display: block; } }
  }
  .input, .location-input {
    background: #f8f8f8; padding: 24rpx; border-radius: 12rpx; font-size: 28rpx;
  }
  .location-input { display: flex; justify-content: space-between; align-items: center; .placeholder { color: #ccc; } }
  .reward-header { display: flex; justify-content: space-between; align-items: center; }
  .balance { font-size: 22rpx; color: #ff9800; margin-top: 10rpx; display: block; }
  .submit-btn {
    background: #007aff; color: #fff; border-radius: 50rpx; font-size: 32rpx; height: 90rpx; line-height: 90rpx;
  }
  </style>