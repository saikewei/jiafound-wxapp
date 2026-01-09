<template>
  <view class="dispute-container">
    <!-- 顶部标签切换 -->
    <view class="tabs">
      <view 
        v-for="(tab, index) in tabs" 
        :key="index"
        class="tab-item"
        :class="{ active: currentTab === index }"
        @click="switchTab(index)"
      >
        <text>{{ tab.name }}</text>
        <text class="badge" v-if="tab.count > 0">{{ tab.count }}</text>
      </view>
    </view>

    <!-- 纠纷工单列表 -->
    <scroll-view 
      v-if="!selectedTicket" 
      class="list-container" 
      scroll-y
    >
      <uni-list v-if="disputeList.length > 0">
        <uni-list-item 
          v-for="item in disputeList" 
          :key="item.ticketId"
          :title="item.reason || '无理由说明'"
          :note="`工单ID: ${item.ticketId} | 发起人: ${item.initiatorName}`"
          clickable
          @click="selectTicket(item)"
        >
          <template v-slot:header>
            <view class="ticket-status-wrapper">
              <view class="ticket-status" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </view>
              <view v-if="item.isOvertime && item.status === 'Reviewing'" class="overtime-tag">
                超时
              </view>
            </view>
          </template>
          <template v-slot:footer>
            <view class="ticket-info">
              <text class="time">{{ formatTime(item.createTime) }}</text>
            </view>
          </template>
        </uni-list-item>
      </uni-list>
      
      <view v-else class="empty-state">
        <uni-icons type="info" size="60" color="#ccc"></uni-icons>
        <text>暂无纠纷工单</text>
      </view>
    </scroll-view>

    <!-- 纠纷详情页 -->
    <scroll-view v-else class="detail-container" scroll-y>
      <view class="detail-header">
        <view class="back-btn" @click="selectedTicket = null">
          <uni-icons type="back" size="20"></uni-icons>
          <text>返回列表</text>
        </view>
        <view class="ticket-title">
          <text class="item-name">工单详情</text>
          <view class="status-tag" :class="getStatusClass(selectedTicket.status)">
            {{ getStatusText(selectedTicket.status) }}
          </view>
        </view>
      </view>

      <!-- 基本信息 -->
      <uni-section title="基本信息" type="line">
        <view class="info-section">
          <view class="info-row">
            <text class="label">工单编号:</text>
            <text class="value">{{ selectedTicket.ticketId }}</text>
          </view>
          <view class="info-row">
            <text class="label">认领ID:</text>
            <text class="value">{{ selectedTicket.claimId }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起人ID:</text>
            <text class="value">{{ selectedTicket.initiatorId }}</text>
          </view>
          <view class="info-row">
            <text class="label">被申诉人ID:</text>
            <text class="value">{{ selectedTicket.respondentId }}</text>
          </view>
          <view class="info-row">
            <text class="label">发起人身份:</text>
            <text class="value">{{ selectedTicket.initiatorRole === 'OWNER' ? '失主' : '拾取人' }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请时间:</text>
            <text class="value">{{ formatTime(selectedTicket.createTime) }}</text>
          </view>
          <view class="info-row" v-if="selectedTicket.deadline">
            <text class="label">截止时间:</text>
            <text class="value deadline">{{ formatTime(selectedTicket.deadline) }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请原因:</text>
            <text class="value">{{ selectedTicket.reason }}</text>
          </view>
        </view>
      </uni-section>

      <!-- 发起人证据 -->
      <uni-section title="发起人证据" type="line">
        <view class="evidence-section">
          <view class="evidence-images" v-if="selectedTicket.initiatorEvidence?.imageUrls?.length">
            <image 
              v-for="(img, idx) in selectedTicket.initiatorEvidence.imageUrls" 
              :key="idx"
              :src="img" 
              class="evidence-img"
              mode="aspectFill"
              @click="previewImage(selectedTicket.initiatorEvidence.imageUrls, idx)"
            />
          </view>
          <view v-else class="no-evidence">
            <text>暂无证据</text>
          </view>
          <view class="evidence-remark" v-if="selectedTicket.initiatorEvidence?.comments">
            <text class="remark-label">补充说明:</text>
            <text>{{ selectedTicket.initiatorEvidence.comments }}</text>
          </view>
        </view>
      </uni-section>

      <!-- 被申诉人证据 -->
      <uni-section title="被申诉人证据" type="line">
        <view class="evidence-section">
          <view class="evidence-images" v-if="selectedTicket.respondentEvidence?.imageUrls?.length">
            <image 
              v-for="(img, idx) in selectedTicket.respondentEvidence.imageUrls" 
              :key="idx"
              :src="img" 
              class="evidence-img"
              mode="aspectFill"
              @click="previewImage(selectedTicket.respondentEvidence.imageUrls, idx)"
            />
          </view>
          <view v-else class="no-evidence">
            <text>暂无证据</text>
          </view>
          <view class="evidence-remark" v-if="selectedTicket.respondentEvidence?.comments">
            <text class="remark-label">补充说明:</text>
            <text>{{ selectedTicket.respondentEvidence.comments }}</text>
          </view>
        </view>
      </uni-section>

      <!-- 管理员裁决区 -->
      <uni-section v-if="selectedTicket.status === 'Reviewing'" title="管理员裁决" type="line">
        <view class="ruling-section">
          <view class="form-item">
            <text class="form-label">裁决结果:</text>
            <picker 
              :range="rulingOptions" 
              range-key="label"
              @change="onRulingChange"
              :value="rulingForm.result"
            >
              <view class="picker">
                {{ rulingOptions[rulingForm.result].label }}
                <uni-icons type="arrow-down" size="14"></uni-icons>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">扣除信用分:</text>
            <input 
              v-model.number="rulingForm.deductCredit" 
              type="number" 
              class="form-input"
              placeholder="请输入扣除信用分（必填）"
            />
          </view>

          <button class="submit-btn" @click="submitRuling">提交裁决</button>
        </view>
      </uni-section>

      <!-- 裁决结果展示 -->
      <uni-section v-if="selectedTicket.status === 'Closed'" title="裁决结果" type="line">
        <view class="ruling-result">
          <view class="result-row">
            <text class="label">裁决结果:</text>
            <text class="value highlight">{{ getRulingText(selectedTicket.rulingResult || '') }}</text>
          </view>
          <view class="result-row" v-if="selectedTicket.rulingTime">
            <text class="label">裁决时间:</text>
            <text class="value">{{ formatTime(selectedTicket.rulingTime) }}</text>
          </view>
        </view>
      </uni-section>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 标签页
const tabs = ref([
  { name: '待处理', count: 0 },
  { name: '已裁决', count: 0 },
  { name: '全部', count: 0 }
])

const currentTab = ref(0)

// 纠纷工单列表 - 简化版本，仅用于列表展示
interface DisputeListItem {
  ticketId: string
  claimId: string
  initiatorName: string
  reason: string
  status: 'Reviewing' | 'Closed' | 'Revoked'
  createTime: string
  isOvertime: boolean
}

// 纠纷工单详情 - 完整版本
interface DisputeTicket {
  ticketId: string
  claimId: string
  status: 'Reviewing' | 'Closed' | 'Revoked'
  reason: string
  createTime: string
  deadline?: string
  initiatorId: string
  respondentId: string
  initiatorRole: string
  initiatorEvidence: {
    imageUrls: string[]
    comments?: string
  } | null
  respondentEvidence: {
    imageUrls: string[]
    comments?: string
  } | null
  rulingResult?: string
  rulingTime?: string
  deductCredit?: number
}

interface ApiResponse {
  code: number
  msg: string
  data: any
}

const disputeList = ref<DisputeListItem[]>([])
const selectedTicket = ref<DisputeTicket | null>(null)

// 裁决选项
const rulingOptions = ref([
  { label: '发起方胜诉 (InitiatorWin)', value: 'InitiatorWin' },
  { label: '被申诉方胜诉 (RespondentWin)', value: 'RespondentWin' }
])

// 裁决表单
const rulingForm = ref({
  result: 0,
  deductCredit: 0
})

// 切换标签
const switchTab = (index: number) => {
  currentTab.value = index
  loadDisputeList()
}

// 选择工单 - 加载详细信息
const selectTicket = async (item: DisputeListItem) => {
  try {
    uni.showLoading({ title: '加载详情...' })
    
    const response = await uni.request({
      url: `http://localhost:8082/api/v1/disputes/tickets/${item.ticketId}`,
      method: 'GET'
    })

    const resData = response.data as ApiResponse

    if (resData.code === 200) {
      selectedTicket.value = resData.data
    } else {
      uni.showToast({
        title: resData.msg || '加载详情失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('加载详情失败:', error)
    uni.showToast({
      title: '加载详情失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

// 获取状态样式类
const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'Reviewing': 'status-pending',
    'Closed': 'status-closed',
    'Revoked': 'status-revoked'
  }
  return classMap[status] || ''
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'Reviewing': '待裁决',
    'Closed': '已裁决',
    'Revoked': '已撤销'
  }
  return textMap[status] || status
}

// 获取裁决结果文本
const getRulingText = (result: string) => {
  const textMap: Record<string, string> = {
    'InitiatorWin': '发起方胜诉',
    'RespondentWin': '被申诉方胜诉'
  }
  return textMap[result] || result
}

// 裁决结果变更
const onRulingChange = (e: any) => {
  rulingForm.value.result = e.detail.value
}

// 预览图片
const previewImage = (urls: string[], current: number) => {
  uni.previewImage({
    urls: urls,
    current: current
  })
}

// 提交裁决
const submitRuling = async () => {
  if (rulingForm.value.deductCredit < 0) {
    uni.showToast({
      title: '扣除信用分不能为负数',
      icon: 'none'
    })
    return
  }

  uni.showModal({
    title: '确认裁决',
    content: '裁决提交后将无法修改，确定要提交吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '提交中...' })
          
          // 调用裁决接口
          const response = await uni.request({
            url: 'http://localhost:8082/api/v1/disputes/admin/disputes/ruling',
            method: 'POST',
            data: {
              ticketId: selectedTicket.value?.ticketId,
              rulingResult: rulingOptions.value[rulingForm.value.result].value,
              deductCredit: rulingForm.value.deductCredit || 0
            }
          })

          uni.hideLoading()
          const resData = response.data as ApiResponse

          if (resData.code === 200) {
            uni.showToast({
              title: '裁决已提交',
              icon: 'success'
            })
            
            // 重置表单
            rulingForm.value = {
              result: 0,
              deductCredit: 0
            }
            
            // 返回列表并刷新
            selectedTicket.value = null
            loadDisputeList()
          } else {
            uni.showToast({
              title: resData.msg || '提交失败',
              icon: 'none'
            })
          }
        } catch (error) {
          uni.hideLoading()
          uni.showToast({
            title: '网络错误',
            icon: 'none'
          })
          console.error('提交裁决失败:', error)
        }
      }
    }
  })
}

// 加载纠纷列表 - 使用管理员专用接口
const loadDisputeList = async () => {
  try {
    uni.showLoading({ title: '加载中...' })
    
    // 根据当前标签确定 status 参数
    let statusParam: string | undefined = undefined
    if (currentTab.value === 0) {
      statusParam = 'Reviewing'
    } else if (currentTab.value === 1) {
      statusParam = 'Closed'
    }
    // currentTab === 2 时不传 status，获取全部
    
    // 调用管理员专用接口
    const requestData: any = { page: 1 }
    if (statusParam) {
      requestData.status = statusParam
    }
    
    const response = await uni.request({
      url: 'http://localhost:8082/api/v1/disputes/admin/all',
      method: 'GET',
      data: requestData
    })

    const resData = response.data as ApiResponse

    if (resData.code === 200) {
      disputeList.value = resData.data.list || []
      
      // 更新标签计数
      await updateTabCounts()
    } else {
      uni.showToast({
        title: resData.msg || '加载失败',
        icon: 'none'
      })
    }

    uni.hideLoading()
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
    console.error('加载纠纷列表失败:', error)
  }
}

// 更新标签计数
const updateTabCounts = async () => {
  try {
    // 获取待处理数量
    const reviewingRes = await uni.request({
      url: 'http://localhost:8082/api/v1/disputes/admin/all',
      method: 'GET',
      data: { status: 'Reviewing', page: 1 }
    })
    
    // 获取已裁决数量
    const closedRes = await uni.request({
      url: 'http://localhost:8082/api/v1/disputes/admin/all',
      method: 'GET',
      data: { status: 'Closed', page: 1 }
    })
    
    // 获取全部数量
    const allRes = await uni.request({
      url: 'http://localhost:8082/api/v1/disputes/admin/all',
      method: 'GET',
      data: { page: 1 }
    })

    const reviewingData = reviewingRes.data as ApiResponse
    const closedData = closedRes.data as ApiResponse
    const allData = allRes.data as ApiResponse

    if (reviewingData.code === 200) {
      tabs.value[0].count = reviewingData.data.total || 0
    }
    if (closedData.code === 200) {
      tabs.value[1].count = closedData.data.total || 0
    }
    if (allData.code === 200) {
      tabs.value[2].count = allData.data.total || 0
    }
  } catch (error) {
    console.error('更新标签计数失败:', error)
  }
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

onMounted(() => {
  loadDisputeList()
})
</script>

<style lang="scss" scoped>
.dispute-container {
  min-height: 100vh;
  background-color: #f8f8f8;
}

// 标签栏
.tabs {
  display: flex;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
  
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 30rpx 0;
    position: relative;
    color: #666;
    font-size: 28rpx;
    
    &.active {
      color: #007aff;
      font-weight: bold;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60rpx;
        height: 4rpx;
        background-color: #007aff;
        border-radius: 2rpx;
      }
    }
    
    .badge {
      margin-left: 8rpx;
      padding: 0 12rpx;
      background-color: #ff3b30;
      color: #fff;
      border-radius: 20rpx;
      font-size: 20rpx;
      line-height: 32rpx;
    }
  }
}

// 列表容器
.list-container {
  height: calc(100vh - 88rpx);
}

// 工单状态
.ticket-status-wrapper {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.ticket-status {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  
  &.status-pending {
    background-color: #fff3e0;
    color: #ff9800;
  }
  
  &.status-closed {
    background-color: #e8f5e9;
    color: #4caf50;
  }
  
  &.status-revoked {
    background-color: #f5f5f5;
    color: #999;
  }
}

.overtime-tag {
  padding: 4rpx 12rpx;
  background-color: #ffebee;
  color: #f44336;
  border-radius: 6rpx;
  font-size: 20rpx;
}

.ticket-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 24rpx;
  color: #999;
  
  .deadline {
    margin-top: 8rpx;
    color: #ff3b30;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  
  text {
    margin-top: 20rpx;
    color: #999;
    font-size: 28rpx;
  }
}

// 详情容器
.detail-container {
  height: calc(100vh - 88rpx);
  padding-bottom: 40rpx;
}

.detail-header {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1px solid #eee;
  
  .back-btn {
    display: flex;
    align-items: center;
    color: #007aff;
    font-size: 28rpx;
    margin-bottom: 20rpx;
    
    text {
      margin-left: 8rpx;
    }
  }
  
  .ticket-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .item-name {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .status-tag {
    padding: 8rpx 20rpx;
    border-radius: 8rpx;
    font-size: 24rpx;
  }
}

// 信息区域
.info-section {
  padding: 20rpx 30rpx;
  background-color: #fff;
  
  .info-row {
    display: flex;
    margin-bottom: 24rpx;
    font-size: 28rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      width: 180rpx;
      color: #666;
      flex-shrink: 0;
    }
    
    .value {
      flex: 1;
      color: #333;
      
      &.deadline {
        color: #ff3b30;
      }
    }
  }
}

// 证据区域
.evidence-section {
  padding: 20rpx 30rpx;
  background-color: #fff;
  
  .evidence-images {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    margin-bottom: 20rpx;
    
    .evidence-img {
      width: 200rpx;
      height: 200rpx;
      border-radius: 8rpx;
      background-color: #f5f5f5;
    }
  }
  
  .no-evidence {
    padding: 40rpx 0;
    text-align: center;
    color: #999;
    font-size: 28rpx;
  }
  
  .evidence-remark {
    padding: 20rpx;
    background-color: #f8f8f8;
    border-radius: 8rpx;
    font-size: 26rpx;
    line-height: 1.6;
    
    .remark-label {
      color: #666;
      margin-right: 10rpx;
    }
  }
}

// 裁决区域
.ruling-section {
  padding: 20rpx 30rpx;
  background-color: #fff;
  
  .form-item {
    margin-bottom: 40rpx;
    
    .form-label {
      display: block;
      margin-bottom: 20rpx;
      color: #333;
      font-size: 28rpx;
      font-weight: bold;
    }
    
    .picker {
      padding: 20rpx 30rpx;
      background-color: #f8f8f8;
      border-radius: 8rpx;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 28rpx;
    }
    
    .form-input {
      width: 100%;
      padding: 20rpx 30rpx;
      background-color: #f8f8f8;
      border-radius: 8rpx;
      font-size: 28rpx;
    }
    
    .form-textarea {
      width: 100%;
      min-height: 200rpx;
      padding: 20rpx 30rpx;
      background-color: #f8f8f8;
      border-radius: 8rpx;
      font-size: 28rpx;
      line-height: 1.6;
    }
    
    .char-count {
      display: block;
      text-align: right;
      margin-top: 10rpx;
      color: #999;
      font-size: 24rpx;
    }
  }
  
  .submit-btn {
    width: 100%;
    padding: 24rpx 0;
    background-color: #007aff;
    color: #fff;
    border-radius: 8rpx;
    font-size: 32rpx;
    font-weight: bold;
    border: none;
    
    &::after {
      border: none;
    }
  }
}

// 裁决结果展示
.ruling-result {
  padding: 20rpx 30rpx;
  background-color: #fff;
  
  .result-row {
    display: flex;
    margin-bottom: 24rpx;
    font-size: 28rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      width: 180rpx;
      color: #666;
      flex-shrink: 0;
    }
    
    .value {
      flex: 1;
      color: #333;
      
      &.highlight {
        color: #007aff;
        font-weight: bold;
      }
    }
  }
}
</style>
