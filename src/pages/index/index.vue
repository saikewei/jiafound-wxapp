<template>
  <view class="container">
    <view class="header">
      <text class="title">嘉园拾遗</text>
      <text class="subtitle">AI 智能匹配，让温暖不再迷路</text>
    </view>

    <view class="main-buttons">
      <view class="btn-box lost" @tap="goPublish('LOST')">
        <view class="icon-circle">🔍</view>
        <text class="btn-text">寻找失物</text>
        <text class="btn-desc">发布寻物启事</text>
      </view>
      <view class="btn-box found" @tap="goPublish('FOUND')">
        <view class="icon-circle">🎁</view>
        <text class="btn-text">拾到物品</text>
        <text class="btn-desc">发布招领信息</text>
      </view>
    </view>

    <view class="map-entry" @tap="goMap">
      <view class="map-card">
        <view class="map-info">
          <text class="map-title">📍 地图模式</text>
          <text class="map-desc">查看周边待领或寻找中的物品</text>
        </view>
        <view>🗺</view>
      </view>
    </view>

    <view class="list-section">
      <view class="tab-header">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'latest', latest: true }" 
          @tap="switchTab('latest')"
        >
          <text class="module-title">最新动态</text>
          <text class="module-desc">最新丢失与招领</text>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'urgent', urgent: true }" 
          @tap="switchTab('urgent')"
        >
          <text class="module-title">30天未领</text>
          <text class="module-desc">紧急寻找失主</text>
        </view>
      </view>

      <view class="list-content">
        <uni-list v-if="feedList.length > 0">
          <uni-list-item
            v-for="it in feedList"  
            :key="it.itemID"
            :title="it.title"
            :note="`地点：${it.location}`"
            :thumb="it.images && it.images[0] ? it.images[0] : 'https://via.placeholder.com/100'"
            thumb-size="lg"
            :rightText="formatTime(it.publishTime)"
            clickable
            showArrow
            @click="goDetail(it.itemID)"
          />
        </uni-list>
        <view v-else class="empty-tip">暂无相关动态</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";

const currentTab = ref('latest'); 
const feedList = ref<any[]>([]);

const switchTab = (tab: string) => {
  currentTab.value = tab;
  fetchList();
};

const fetchList = async () => {
  uni.showLoading({ title: '加载中...' });
  try {
    const res: any = await uni.request({
      url: 'http://localhost:8084/item/hall',
      data: {
        type: 'ALL',
        filter: currentTab.value === 'urgent' ? 'OVER_30_DAYS' : 'LATEST'
      }
    });
    if (res.data && res.data.code === 200) {
      feedList.value = res.data.data;
    }
  } catch (e) {
    console.error("加载失败", e);
  } finally {
    uni.hideLoading();
    uni.stopPullDownRefresh();
  }
};

const goPublish = (type: string) => {
  uni.navigateTo({ url: `/pages/publish/publish?type=${type}` });
};

const goMap = () => {
  uni.navigateTo({ url: '/pages/map/map' });
};

/**
 * [核心功能] 跳转详情页
 * @param {string} id 物品的唯一标识
 */
 const goDetail = (id: string) => {
  uni.navigateTo({
    // 统一参数名为 id
    url: `/pages/item/detail?id=${id}`
  });
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr.replace(/-/g, '/'));
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600) return '刚刚';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return timeStr.split(' ')[0];
};

onShow(() => { fetchList(); });
onPullDownRefresh(() => { fetchList(); });
</script>

<style lang="scss" scoped>
.container {
  padding: 40rpx;
  background-color: #f8f9fa;
  min-height: 100vh;
  
  /* 修复警告：改用 .header 类名选择器 */
  .header {
    margin-bottom: 60rpx;
    .title { font-size: 48rpx; font-weight: bold; color: #333; display: block; }
    .subtitle { font-size: 26rpx; color: #999; margin-top: 10rpx; display: block; }
  }
  
  .main-buttons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40rpx;
    .btn-box {
      width: 46%; height: 320rpx; border-radius: 30rpx;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.05);
      &.lost { background: #fff1f0; border: 1px solid #ffccc7; }
      &.found { background: #e6f7ff; border: 1px solid #91d5ff; }
    }
    .icon-circle {
      width: 100rpx; height: 100rpx; border-radius: 50%; background: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 50rpx; margin-bottom: 20rpx;
    }
    .btn-text { font-size: 34rpx; font-weight: bold; color: #333; }
    .btn-desc { font-size: 22rpx; color: #888; margin-top: 8rpx; }
  }

  .map-card {
    background: #fff; padding: 40rpx; border-radius: 24rpx;
    display: flex; justify-content: space-between; align-items: center;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
    .map-title { font-size: 30rpx; font-weight: bold; color: #444; }
    .map-desc { font-size: 24rpx; color: #999; margin-top: 6rpx; }
  }
}

/* 列表切换区域样式 */
.list-section {
  margin-top: 40rpx;
  .tab-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30rpx;
    .tab-item {
      width: 44%; padding: 30rpx 20rpx; border-radius: 20rpx;
      background: #ffffff; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
      transition: all 0.3s;
      &.latest { border-left: 8rpx solid #52c41a; }
      &.urgent { border-left: 8rpx solid #faad14; }
      &.active { transform: scale(1.02); box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1); border-top: 2rpx solid #eee; }
      .module-title { font-size: 28rpx; font-weight: bold; color: #333; display: block; }
      .module-desc { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }
    }
  }
}
.empty-tip { padding: 60rpx; text-align: center; color: #999; font-size: 26rpx; }
</style>