<template>
    <view class="container">
      <view class="tab-header">
        <view 
          v-for="tab in ['全部', '寻物', '招领']" 
          :key="tab" 
          class="tab-item"
          :class="{ active: currentTab === tab }"
          @tap="handleTabChange(tab)"
        >
          {{ tab }}
        </view>
      </view>
  
      <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
        <view class="item-card" v-for="item in displayList" :key="item.itemID" @tap="goDetail(item.itemID)"> 
          <image :src="item.images && item.images.length > 0 ? item.images[0] : '/static/no-img.png'" 
          mode="aspectFill" 
          class="item-cover" />
          <view class="item-content">
            <view class="item-title">{{ item.title }}</view>
            <view class="item-info">
              <text class="tag" :class="item.type">{{ item.type === 'LOST' ? '寻物' : '招领' }}</text>
              <text class="loc">{{ item.location }}</text>
            </view>
            <view class="item-footer">
              <text class="time">{{ item.publishTime }}</text>
              <text v-if="item.rewardPoints > 0" class="reward">💰 {{ item.rewardPoints }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  
  const currentTab = ref('全部')
  const allItems = ref<any[]>([]) // 初始化为空数组
  
  // 1. 页面挂载时调用加载
  onMounted(() => {
    loadData()
  })
  
  // 2. 监听标签切换，自动重新加载真实数据
  const handleTabChange = (tab: string) => {
    currentTab.value = tab
    loadData()
  }

const goDetail = (itemID: string) => {
  console.log('正在跳转，物品ID为:', itemID);
  uni.navigateTo({
    url: `/pages/item/detail?itemID=${itemID}`,
    fail: (err) => { console.error('跳转失败原因:', err) }
  });
}

const loadMore = () => {
  // 预留：下拉触底分页加载
}
  
  const loadData = async () => {
    uni.showLoading({ title: '加载中...' })
    // 计算发送给后端的类型参数
  let typeParam = 'ALL'
  if (currentTab.value === '寻物') typeParam = 'LOST'
  if (currentTab.value === '招领') typeParam = 'FOUND'
    uni.request({
      url: 'http://localhost:8084/item/hall',
      method: 'GET',
      // 将前端 Tab 翻译为后端需要的 LOST/FOUND 参数
      data: { 
        type: currentTab.value === '全部' ? 'ALL' : (currentTab.value === '寻物' ? 'LOST' : 'FOUND'),
        page: 1,
        pageSize: 50
      },
      success: (res: any) => {
        if (res.data.code === 200) {
          // 后端接口返回的是 Result<List<ItemListItemDTO>>
          allItems.value = res.data.data;
        }
      },
      complete: () => uni.hideLoading()
    });
  }
  
  const displayList = computed(() => allItems.value) // 后端已根据 type 过滤，此处直接返回
  </script>
  
  <style lang="scss" scoped>
  .container { background: #f8f8f8; height: 100vh; display: flex; flex-direction: column; }
  .tab-header {
    display: flex; background: #fff; padding: 20rpx 0;
    .tab-item {
      flex: 1; text-align: center; font-size: 28rpx; color: #666;
      &.active { color: #007aff; font-weight: bold; position: relative; }
      &.active::after {
        content: ''; position: absolute; bottom: -10rpx; left: 40%; width: 20%; height: 4rpx; background: #007aff;
      }
    }
  }
  .list-scroll { flex: 1; padding: 20rpx; box-sizing: border-box; }
  .item-card {
    background: #fff; border-radius: 16rpx; display: flex; padding: 20rpx; margin-bottom: 20rpx;
    .item-cover { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
    .item-content {
      flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between;
      .item-title { font-size: 30rpx; font-weight: bold; }
      .item-info {
        display: flex; align-items: center; margin: 10rpx 0;
        .tag {
          font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 4rpx; margin-right: 15rpx;
          &.LOST { background: #fff1f0; color: #ff4d4f; }
          &.FOUND { background: #e6f7ff; color: #1890ff; }
        }
        .loc { font-size: 24rpx; color: #888; }
      }
      .item-footer {
        display: flex; justify-content: space-between;
        .time { font-size: 22rpx; color: #bbb; }
        .reward { font-size: 24rpx; color: #ff9800; font-weight: bold; }
      }
    }
  }
  </style>