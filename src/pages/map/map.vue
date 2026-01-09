<template>
  <view class="map-container">
    <map 
      id="itemMap"
      class="full-map"
      :latitude="centerLatitude" 
      :longitude="centerLongitude" 
      :markers="markers" 
      :scale="16"
      @markertap="onMarkerTap"
      @tap="activeItem = null"
      show-location
    >
      <cover-view v-if="activeItem" class="item-pop-card">
        <cover-view class="pop-header">
          <cover-image :src="activeItem.image" class="pop-img" />
          <cover-view class="pop-main">
            <cover-view class="pop-title">{{ activeItem.title }}</cover-view>
            <cover-view class="pop-tag-row">
              <cover-view class="pop-tag" :class="activeItem.type">
                {{ activeItem.type === 'LOST' ? '寻找中' : '待认领' }}
              </cover-view>
              <cover-view v-if="activeItem.reward > 0" class="pop-reward">💰 {{ activeItem.reward }}</cover-view>
            </cover-view>
          </cover-view>
        </cover-view>
        <cover-view class="pop-detail">
          <cover-view class="detail-line">📍 {{ activeItem.location }}</cover-view>
          <cover-view class="detail-line">🕐 {{ activeItem.time }}</cover-view>
        </cover-view>
        <button class="pop-btn" @tap="viewDetail(activeItem.id)">查看详情</button>
      </cover-view>
    </map>
    
    <view class="top-tip">
      <text>嘉园失物分布地图 (嘉定校区)</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 【修改点】精确同济大学嘉定校区济事楼坐标 (GCJ-02)
const centerLatitude = ref(31.286054)
const centerLongitude = ref(121.215252)

const markers = ref<any[]>([])
const activeItem = ref<any>(null)

// 静态 Mock 数据：散落在校园各处
const mockData = [
  {
    id: 101, title: '丢失黑色小米耳机', type: 'LOST', reward: 50,
    location: '图书馆二楼 203 自习室', time: '10:30', 
    image: 'https://via.placeholder.com/150/ff4d4f/ffffff?text=Earphone',
    lat: 31.286104, lng: 121.215452
  },
  {
    id: 102, title: '捡到蓝色天堂伞', type: 'FOUND', reward: 0,
    location: '教学楼 A 楼大厅', time: '15:20',
    image: 'https://via.placeholder.com/150/1890ff/ffffff?text=Umbrella',
    lat: 31.285014, lng: 121.212152
  },
  {
    id: 103, title: '寻找校园卡-王同学', type: 'LOST', reward: 20,
    location: '第一食堂充值窗口', time: '1小时前',
    image: 'https://via.placeholder.com/150/ff4d4f/ffffff?text=Card',
    lat: 31.284099, lng: 121.219252
  },
  {
    id: 104, title: '捡到一串寝室钥匙', type: 'FOUND', reward: 0,
    location: '济事楼 302 阶梯教室', time: '08:45',
    image: 'https://via.placeholder.com/150/1890ff/ffffff?text=Keys',
    lat: 31.288254, lng: 121.215252 // 济事楼中心点
  },
  {
    id: 105, title: '丢失米白色围巾', type: 'LOST', reward: 0,
    location: '通达馆门口长椅', time: '12:00',
    image: 'https://via.placeholder.com/150/ff4d4f/ffffff?text=Scarf',
    lat: 31.287154, lng: 121.215552
  },
  {
    id: 106, title: '捡到黑色 Apple Pencil', type: 'FOUND', reward: 0,
    location: '教学楼 C 楼 102', time: '14:00',
    image: 'https://via.placeholder.com/150/1890ff/ffffff?text=Pencil',
    lat: 31.285074, lng: 121.215552
  }
]

onMounted(() => {
  // 初始化标记点
  markers.value = mockData.map(item => ({
    id: item.id,
    latitude: item.lat,
    longitude: item.lng,
    title: item.title,
    // 气泡展示
    callout: {
      content: item.title,
      color: '#ffffff',
      fontSize: 12,
      borderRadius: 6,
      padding: 6,
      bgColor: item.type === 'LOST' ? '#ff4d4f' : '#1890ff',
      display: 'ALWAYS' // 始终显示名称
    },
    // 如果 static 文件夹下没有自定义图片，系统会退回到默认大头针
    iconPath: item.type === 'LOST' ? '/static/marker_red.png' : '/static/marker_blue.png',
    width: 32,
    height: 32
  }))
})

const onMarkerTap = (e: any) => {
  const item = mockData.find(m => m.id === e.detail.markerId)
  if (item) {
    activeItem.value = item
  }
}

const viewDetail = (id: number) => {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
.map-container { 
  width: 100vw; 
  height: 100vh; 
  position: relative;
}

.full-map { 
  width: 100%; 
  height: 100%; 
}

/* 顶部浮动提示栏 */
.top-tip {
  position: absolute;
  top: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 12rpx 36rpx;
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
  z-index: 10;
  text { font-size: 26rpx; color: #333; font-weight: bold; }
}

/* 底部弹出卡片样式 */
.item-pop-card {
  position: absolute; 
  bottom: 80rpx; 
  left: 30rpx; 
  right: 30rpx;
  background: #ffffff; 
  border-radius: 28rpx; 
  padding: 30rpx;
  box-shadow: 0 12rpx 48rpx rgba(0,0,0,0.18);
}

.pop-header { 
  display: flex; 
  align-items: center;
  .pop-img { 
    width: 130rpx; 
    height: 130rpx; 
    border-radius: 20rpx; 
    margin-right: 24rpx;
    background: #f0f0f0;
  } 
}

.pop-main { flex: 1; }

.pop-title { 
  font-size: 34rpx; 
  font-weight: bold; 
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.pop-tag-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pop-tag { 
  font-size: 22rpx; 
  padding: 4rpx 16rpx; 
  border-radius: 8rpx;
  &.LOST { background: #fff1f0; color: #ff4d4f; }
  &.FOUND { background: #e6f7ff; color: #1890ff; }
}

.pop-reward {
  font-size: 24rpx;
  color: #fa8c16;
  font-weight: bold;
}

.pop-detail { 
  margin: 24rpx 0;
  .detail-line {
    font-size: 26rpx; 
    color: #666; 
    margin-bottom: 10rpx;
  }
}

.pop-btn { 
  background: linear-gradient(135deg, #007aff, #0056b3);
  color: #ffffff; 
  font-size: 28rpx; 
  height: 84rpx; 
  line-height: 84rpx; 
  border-radius: 42rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.3);
}
</style>