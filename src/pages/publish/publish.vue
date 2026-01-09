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
            <input type="number" class="input" v-model="formData.rewardPoints" placeholder="输入悬赏积分" />
            <text class="balance">当前余额: {{ userBalance }}</text>
          </view>
        </view>
      </view>
  
      <button class="submit-btn" :loading="isSubmitting" @tap="handleSubmit">立即发布</button>

      <view v-if="matchResults && matchResults.length > 0" class="match-list">
        <view class="match-title">匹配的类似物品：</view>
        <view v-for="(item, index) in matchResults" :key="index" class="match-card">
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
  
  const isLost = ref(true)
  const isSubmitting = ref(false)
  const userBalance = ref(100) // 模拟余额
  
  const formData = reactive({
    title: '',
    location: '',
    latitude: 0,
    longitude: 0,
    image: '',
    rewardEnabled: false,
    rewardPoints: 0
  })
  
  // 自动填充缓存（应对网络故障）
  onMounted(() => {
    const draft = uni.getStorageSync('publish_draft')
    if (draft) Object.assign(formData, draft)
  })
  
  const saveDraft = () => uni.setStorageSync('publish_draft', formData)

  const chooseImage = () => {
    uni.chooseImage({
      count: 1,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        formData.image = tempFilePath;
        saveDraft();

        // --- 新增 AI 识图逻辑 ---
        uni.showLoading({ title: 'AI 正在分析图片...' });
        
        uni.uploadFile({
          url: 'http://localhost:8084/item/analyze-image', // 后端识图接口
          filePath: tempFilePath,
          name: 'file',
          success: (uploadRes) => {
            const data = JSON.parse(uploadRes.data);
            if (data.code === 200 && data.description) {
              // 自动填充到物品名称（用户可微调）
              formData.title = data.description;
              uni.showToast({ title: 'AI 已生成描述', icon: 'none' });
              saveDraft();
            }
          },
          fail: () => {
            uni.showToast({ title: 'AI 识图服务不可用', icon: 'none' });
          },
          complete: () => {
            uni.hideLoading();
          }
        });
        // -----------------------
      }
    });
  }

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

  const handleSubmit = async () => {
    // ... 校验代码 ...
    isSubmitting.value = true;
    
    uni.request({
      url: 'http://localhost:8084/item/publish', // 确保端口是 8084
      method: 'POST',
      data: {
        userId: 'u_publisher_001',
        itemType: isLost.value ? 'LOST' : 'FOUND',
        title: formData.title,
        description: formData.title, // 描述传给后端用于 AI 匹配
        locationText: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        imageUrl: formData.image,
        rewardPoints: formData.rewardPoints
      },
      success: (res) => {
        if (res.data.code === 200) {
          uni.showToast({ title: '发布成功', icon: 'success' });
          // 将匹配结果显示在页面上，而不是跳转
          if (res.data.match && res.data.data) {
            // 如果后端返回的是单个对象，转为数组
            matchResults.value = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
          }
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