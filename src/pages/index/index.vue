<template>
  <view class="container">
    <view class="search-section">
      <uni-search-bar placeholder="搜索嘉定校区失物..." @confirm="onSearch" border-radius="20" />
    </view>

    <view class="stat-card">
       </view>

    <view class="list-section">
      <uni-section title="嘉园最新动态" type="line">
        <uni-list>
          <uni-list-item
            v-for="it in feedList"  
            :key="it.itemID"
            :title="it.title"
            :note="`地点：${it.foundPlace}`"
            thumb="https://via.placeholder.com/100"
            thumb-size="lg"
            :rightText="formatTime(it.publishTime)"
            clickable
            showArrow
            link="navigateTo"
            :to="detailUrl(it)"
          />
        </uni-list>
      </uni-section>
    </view>

    <button class="fab-btn" @click="goPublish">
      <uni-icons type="plusempty" size="25" color="#fff"></uni-icons>
      <text>发布</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
// [新增] 引入 API
import { getItemHall } from '../../api/mock/claim';

const title = ref('嘉园拾遗')

// 定义真实数据列表
const feedList = ref<any[]>([]);

// 获取数据的函数
const fetchList = async () => {
  try {
    const res = await getItemHall();
    
    // 正确的数据路径是 res.data.list
    if (res.data && res.data.list) {
      feedList.value = res.data.list;
    } else {
      // 兼容性写法：万一后端没包装 data，尝试直接取 (防御性编程)
      feedList.value = res.list || [];
    }
    
    console.log("获取到的列表数据:", feedList.value);
  } catch (e) {
    console.error("加载列表失败", e);
  } finally {
    uni.stopPullDownRefresh();
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000; // 秒
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return timeStr.split('T')[0]; // 返回日期部分
}

const onSearch = (res: any) => { console.log('搜索：', res.value) }
const goPublish = () => { uni.showToast({ title: '去发布页面', icon: 'none' }) }

const detailUrl = (it: any) =>
  `/pages/item/detail?itemID=${encodeURIComponent(it.itemID)}`

//onLoad(() => {
//  fetchList();
//});

onShow(() => {
  console.log("首页显示，刷新列表数据...");
  fetchList();
});

onPullDownRefresh(() => {
  fetchList();
});
</script>

<style lang="scss">
.container {
  padding: 10px;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.search-section {
  margin-bottom: 10px;
}

.stat-card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 15px 0;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .stat-num {
    font-size: 40rpx;
    font-weight: bold;
    color: #007aff; // 同济大学常用的蓝色调
  }
  
  .stat-label {
    font-size: 24rpx;
    color: #666;
    margin-top: 4px;
  }
}

.fab-btn {
  position: fixed;
  bottom: 40px;
  right: 20px;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background-color: #007aff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,122,255,0.4);
  
  text {
    font-size: 20rpx;
    color: #fff;
    margin-top: -4px;
  }
}

// 隐藏原生按钮默认边框
.fab-btn::after {
  border: none;
}
</style>