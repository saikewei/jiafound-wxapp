<template>
  <view v-if="initializing" class="loading-container">
    <uni-load-more
      status="loading"
      :content-text="{ contentdown: '加载中...', contentrefresh: '加载中...', contentnomore: '没有更多' }"
    />
  </view>

  <view v-else class="page">
    <uni-card :title="item.title" :sub-title="item.category" :extra="statusText">
      <view class="row"><text class="label">物品编号</text><text>{{ item.itemID }}</text></view>
      <view class="row"><text class="label">{{ labelText.place }}</text><text>{{ item.foundPlace }}</text></view>
      <view class="row"><text class="label">{{ labelText.time }}</text><text>{{ item.foundTime }}</text></view>
      <view class="row"><text class="label">物品描述</text><text>{{ item.desc }}</text></view>
      <view v-if="item.rewardPoints > 0" class="row">
        <text class="label">赏币</text>
        <text style="color: #ff9900; font-weight: bold;">{{ item.rewardPoints }} 币</text>
      </view>
    </uni-card>

    <uni-card v-if="currentStatus === 'Applying' && isPublisher" title="申请人信息">
      <view class="row"><text class="label">申请人</text><text>{{ applicant.name }}</text></view>
      <view class="row"><text class="label">申请理由</text><text>{{ applicant.applyMessage }}</text></view>
      <view class="row"><text class="label">申请时间</text><text>{{ applicant.applyTime }}</text></view>
    </uni-card>

    <uni-card v-if="lastRejectReason" title="拒绝原因" extra="已拒绝" class="reject-card">
      <text style="color: #dd524d;">{{ lastRejectReason }}</text>
    </uni-card>

    <uni-card v-if="currentStatus === 'Accepted' || currentStatus === 'Success'" title="交接信息">
      <view class="row">
        <text class="label">对方联系方式</text>
        <text style="font-weight: bold; color: #007aff;">{{ otherContactInfo }}</text>
      </view>
      
      <view class="row">
        <text class="label">发布者确认</text>
        <text :class="publisherConfirmed ? 'status-ok' : 'status-wait'">
          {{ publisherConfirmed ? '已确认' : '未确认' }}
        </text>
      </view>
      
      <view class="row">
        <text class="label">申请人确认</text>
        <text :class="applicantConfirmed ? 'status-ok' : 'status-wait'">
          {{ applicantConfirmed ? '已确认' : '未确认' }}
        </text>
      </view>
    </uni-card>

    <view class="image-section">
      <view class="section-title">物品实拍</view>
      <swiper v-if="item.images && item.images.length > 0" 
              class="image-swiper" 
              indicator-dots 
              autoplay 
              circular
              indicator-active-color="#007aff">
        <swiper-item v-for="(img, index) in item.images" :key="index">
          <image 
            :src="img" 
            mode="aspectFill" 
            class="slide-image" 
            @tap="previewImage(index)"
          ></image>
        </swiper-item>
      </swiper>
      <view v-else class="placeholder-box">
        <uni-icons type="image" size="60" color="#ccc"></uni-icons>
        <text class="placeholder-text">暂无图片</text>
      </view>
    </view>

    <view style="height: 40rpx;"></view>

    <uni-popup ref="applyPopup" type="dialog">
      <view class="popup apply-popup">
        <view class="popup-title">{{ applyActionText }}</view>
        <uni-easyinput v-model="applyMessage" type="textarea" :placeholder="applyPlaceholder" :maxlength="200" autoHeight />
        <view class="popup-actions">
          <button class="btn" :disabled="loading" @tap="closeApplyPopup">取消</button>
          <button class="btn primary" :disabled="loading || !applyMessage.trim()" @tap="submitApply">{{ loading ? '提交中...' : '提交' }}</button>
        </view>
      </view>
    </uni-popup>

    <uni-popup ref="rejectPopup" type="dialog">
      <view class="popup">
        <view class="popup-title">拒绝申请</view>
        <uni-easyinput v-model="rejectReply" type="textarea" placeholder="请输入拒绝原因" :maxlength="200" autoHeight />
        <view class="popup-actions">
          <button class="btn" :disabled="loading" @tap="closeRejectPopup">取消</button>
          <button class="btn primary" :disabled="loading || !rejectReply.trim()" @tap="submitReject">{{ loading ? '提交中...' : '提交' }}</button>
        </view>
      </view>
    </uni-popup>

    <view class="bottom-spacer" />

    <view class="bottom-bar">
      <template v-if="isPublishedStatus">
        <button v-if="!isPublisher" class="action apply-action" :disabled="loading" @tap="openApplyPopup">{{ applyActionText }}</button>
        <view v-else class="hint">{{ publisherWaitingText }}</view>
      </template>

      <template v-else-if="currentStatus === 'Applying'">
        <template v-if="isPublisher">
          <view class="btn-row">
            <button class="action primary" :disabled="loading" @tap="approveApply">{{ loading ? '处理中...' : '同意' }}</button>
            <button class="action" :disabled="loading" @tap="openRejectPopup">拒绝</button>
          </view>
        </template>
        <template v-else>
          <view class="btn-row">
             <button class="action pending" disabled>申请审核中</button>
             <button class="action warning" :disabled="loading" @tap="handleCancel">撤销申请</button>
          </view>
        </template>
      </template>

      <template v-else-if="currentStatus === 'Accepted'">
        <view class="btn-row">
          <button class="action primary" :disabled="loading || alreadyConfirmed" @tap="confirmHandover">
            {{ alreadyConfirmed ? '已确认交接' : '确认交接' }}
          </button>
          <button class="action warning" :disabled="loading" @tap="goToDisputePage">
            遇到问题
          </button>
        </view>
      </template>

      <template v-else-if="currentStatus === 'Success'">
        <view class="hint finished-hint">流程已结束 (交易完成)</view>
      </template>

      <template v-else-if="currentStatus === 'Rejected'">
        <template v-if="isPublisher">
          <view class="hint">已拒绝，等待对方重新申请</view>
        </template>
        <template v-else>
          <button class="action apply-action" :disabled="loading" @tap="() => openApplyPopup(true)">重新申请</button>
        </template>
      </template>

      <template v-else-if="currentStatus === 'Disputed'">
        <template v-if="currentUserID === disputeInitiator">
           <view class="btn-row">
               <view class="hint status-wait" style="flex: 1; font-size: 24rpx; display: flex; align-items: center; justify-content: center;">等待客服介入...</view>
               <button class="action primary" :disabled="loading" @tap="handleCancel">撤销维权</button>
           </view>
        </template>
        <template v-else>
           <view class="hint status-wait" style="text-align: center; width: 100%;">
             <uni-icons type="info" size="18" color="#f0ad4e"></uni-icons>
             对方已申请介入，正在处理中...
           </view>
        </template>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { userState } from "../../store/userState";
import {
  postItemClaim,
  putItemApprove,
  putItemReject,
  putItemConfirm,
  getItemDetail,
  getItemStatus,
  postItemCancel, // 引入撤销接口
} from "../../api/mock/claim";

const currentUserID = computed(() => userState.currentUserId);

// 纠纷发起人ID
const disputeInitiator = ref<string>(""); 

const isPublisher = computed(() => {
  if (!currentUserID.value) return false;
  if (!item.value.publisherID) return false;
  return currentUserID.value === item.value.publisherID;
});

const loading = ref(false);
const detailLoading = ref(false);
const initializing = ref(true); 
const currentStatus = ref<string>(""); 

const item = ref({
  itemID: "",
  title: "",
  category: "",
  itemType: "Lost",
  rewardPoints: 0,
  foundPlace: "",
  foundTime: "",
  desc: "",
  publisherID: "",
  images: [] as string[],
});

const isLost = computed(() => {
  const type = item.value.itemType?.toLowerCase() || "";
  return type === 'lost' || type.includes('寻物');
});

const labelText = computed(() => ({
  place: isLost.value ? '丢失地点' : '拾到地点',
  time: isLost.value ? '丢失时间' : '拾到时间',
  desc: '物品描述'
}));

const applyActionText = computed(() => isLost.value ? '申请归还' : '申请认领');
const applyPlaceholder = computed(() => isLost.value ? '请描述您捡到的物品特征，以便失主确认...' : '请描述您的物品特征，以证明是您的...');
const publisherWaitingText = computed(() => isLost.value ? '等待归还申请' : '等待认领申请');

const contactInfo = ref("");
const finderConfirmed = ref(false);
const ownerConfirmed = ref(false);
const hasApplied = ref(false);
const lastRejectReason = ref("");

const statusText = computed(() => {
  const map: Record<string, string> = {
    Published: "已发布",
    Applying: "申请处理中",
    Accepted: "交接中",  
    Success: "已完成",
    Rejected: "已拒绝",
    Disputed: "纠纷处理中",
    "": "加载中..."
  };
  return map[currentStatus.value] || currentStatus.value;
});

const isPublishedStatus = computed(() => currentStatus.value === "Published");
const otherContactInfo = computed(() => contactInfo.value);

const applicant = ref({
  name: "张同学",
  applyMessage: "",
  applyTime: "",
});

const publisherConfirmed = computed(() => {
  if (isLost.value) {
    // 寻物启事：发布者是失主(Owner)
    return ownerConfirmed.value;
  } else {
    // 失物招领：发布者是拾主(Finder)
    return finderConfirmed.value;
  }
});

// [新增] 计算属性：申请人是否已确认
const applicantConfirmed = computed(() => {
  if (isLost.value) {
    // 寻物启事：申请人是拾主(Finder)
    return finderConfirmed.value;
  } else {
    // 失物招领：申请人是失主(Owner)
    return ownerConfirmed.value;
  }
});

// [修改] 判断“我”是否已经确认 (用于禁用按钮)
const alreadyConfirmed = computed(() => {
  if (isPublisher.value) {
    return publisherConfirmed.value;
  } else {
    return applicantConfirmed.value;
  }
});

watch([isPublisher, currentUserID], () => {
  initializing.value = true;
  fetchDetail();
});

// 弹窗相关 ref
const applyPopup = ref();
const applyMessage = ref("");
const rejectPopup = ref();
const rejectReply = ref("");

function openApplyPopup(reapply?: boolean) {
  if (reapply === true && applicant.value.applyMessage) {
    applyMessage.value = applicant.value.applyMessage;
  }
  applyPopup.value?.open?.();
}
function closeApplyPopup() { applyPopup.value?.close?.(); }
function openRejectPopup() { rejectPopup.value?.open?.(); }
function closeRejectPopup() { rejectPopup.value?.close?.(); }

// [新增] 跳转到纠纷申请页面 (队友负责的页面)
function goToDisputePage() {
  // 构造跳转参数，把当前的 itemID 和 userID 传过去
  // 路径需要和队友确认，假设是 /pages/audit/dispute_apply
  const url = `/pages/audit/dispute_apply?itemID=${item.value.itemID}&applicantID=${currentUserID.value}`;
  
  uni.navigateTo({
    url: url,
    fail: (err) => {
      console.error("跳转失败:", err);
      uni.showToast({ title: "跳转失败，请重试", icon: "none" });
    }
  });
}

// 撤销逻辑 (申请撤销 + 纠纷撤销)
async function handleCancel() {
  const isDispute = currentStatus.value === 'Disputed';
  const content = isDispute
    ? '误会解除了？撤销后将回到交接状态，需重新确认。' 
    : '确定要撤销当前的申请吗？';

  uni.showModal({
    title: '确认撤销',
    content: content,
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        try {
          await postItemCancel({
            itemID: item.value.itemID,
            userID: currentUserID.value
          });
          
          uni.showToast({ title: "操作成功", icon: "success" });
          
          if (isDispute) {
             currentStatus.value = 'Accepted';
             // 撤销后重置确认状态 (后端逻辑)
             finderConfirmed.value = false;
             ownerConfirmed.value = false;
          } else {
             currentStatus.value = 'Published';
             hasApplied.value = false;
          }
          
          // 刷新数据确保准确
          fetchDetail();
        } catch (e) {
           // 错误处理已在 request 中做过提示
        } finally {
          loading.value = false;
        }
      }
    }
  });
}

async function submitApply() {
  loading.value = true;
  try {
    await postItemClaim({
      itemID: item.value.itemID,
      applicantID: currentUserID.value,
      applyMessage: applyMessage.value,
      itemType: item.value.itemType,
    });
    uni.showToast({ title: "申请成功", icon: "success" });
    applicant.value.applyMessage = applyMessage.value;
    currentStatus.value = "Applying";
    hasApplied.value = true;
    closeApplyPopup();
    fetchDetail();
  } catch (e) {
  } finally {
    loading.value = false;
  }
}

async function approveApply() {
  loading.value = true;
  try {
    const res = await putItemApprove({
      itemID: item.value.itemID,
      publisherID: currentUserID.value,
    });
    uni.showToast({ title: "已同意", icon: "success" });
    currentStatus.value = "Accepted";
    contactInfo.value = res.data.contactInfo; 
  } finally {
    loading.value = false;
  }
}

async function submitReject() {
  loading.value = true;
  try {
    await putItemReject({
      itemID: item.value.itemID,
      publisherID: currentUserID.value,
      rejectReply: rejectReply.value,
    });
    uni.showToast({ title: "已拒绝", icon: "none" });
    lastRejectReason.value = rejectReply.value;
    currentStatus.value = "Rejected";
    closeRejectPopup();
  } finally {
    loading.value = false;
  }
}

async function confirmHandover() {
  loading.value = true;
  try {
    const res = await putItemConfirm({
      itemID: item.value.itemID,
      userID: currentUserID.value,
    });
    const data = res.data;
    if (data.status === "Success" || data.status === "FINISHED") {
      let successMsg = "交接完成！";
      // 只有收到钱的人才提示金额
      const isMyReward = (isLost.value && !isPublisher.value) || (!isLost.value && isPublisher.value);
      
      if (item.value.rewardPoints > 0 && isMyReward) {
         successMsg += `\n已收到赏金 ${item.value.rewardPoints} 币`;
      }
      
      uni.showModal({
        title: '恭喜',
        content: successMsg,
        showCancel: false,
        success: () => {
          currentStatus.value = "Success";
          finderConfirmed.value = true;
          ownerConfirmed.value = true;
        }
      });
    } else {
      uni.showToast({ title: "已确认，等待对方", icon: "none" });
      currentStatus.value = "Accepted";
      finderConfirmed.value = data.finderConfirmed;
      ownerConfirmed.value = data.ownerConfirmed;
    }
  } finally {
    loading.value = false;
  }
}

function previewImage(current: number) {
  if (item.value.images.length > 0) {
    uni.previewImage({
      urls: item.value.images,
      current: current
    });
  }
}

async function fetchDetail() {
  detailLoading.value = true;
  
  if (!currentUserID.value) {
    initializing.value = false;
    return;
  }

  try {
    const [detailRes, statusRes] = await Promise.allSettled([
      getItemDetail({ itemID: item.value.itemID }),
      getItemStatus(item.value.itemID, currentUserID.value)
    ]);

    // 1. 处理物品详情
    if (detailRes.status === 'fulfilled') {
      const data = (detailRes.value as any).data || detailRes.value;
      const detailItem = data.item || data;
      
      item.value = {
        itemID: detailItem.itemID || item.value.itemID,
        title: detailItem.title || detailItem.description || item.value.title,
        category: detailItem.category || detailItem.itemType || item.value.category,
        itemType: detailItem.itemType || item.value.itemType,
        rewardPoints: detailItem.rewardPoints ?? item.value.rewardPoints,
        foundPlace: detailItem.location || detailItem.location_text || detailItem.foundPlace || item.value.foundPlace,
        foundTime: detailItem.publishTime || detailItem.publish_time || detailItem.foundTime || item.value.foundTime,
        desc: detailItem.description || detailItem.desc || item.value.desc,
        publisherID: detailItem.user_id || detailItem.publisherID || item.value.publisherID,
        images: detailItem.images || [],
      };
      
      if (data.applicant) {
        applicant.value.name = data.applicant.name || applicant.value.name;
        applicant.value.applyMessage = data.applicant.applyMessage || applicant.value.applyMessage;
      }
    }

    // 2. 处理状态
    if (statusRes.status === 'fulfilled') {
      const statusData = (statusRes.value as any).data || statusRes.value;
      currentStatus.value = statusData.status || "Published";
      hasApplied.value = statusData.hasApplied;
      contactInfo.value = statusData.contactInfo || ""; 
      finderConfirmed.value = !!statusData.finderConfirmed;
      ownerConfirmed.value = !!statusData.ownerConfirmed;
      lastRejectReason.value = statusData.rejectReply || "";
      if (statusData.applyMessage) {
        applicant.value.applyMessage = statusData.applyMessage;
      }
      
      // 获取纠纷发起人，用于判断是否显示撤销按钮
      disputeInitiator.value = statusData.disputeInitiator || "";

    } else {
      currentStatus.value = "Published";
    }

  } catch (err) {
    console.error(err);
  } finally {
    detailLoading.value = false;
    initializing.value = false;
  }
}

// 页面每次显示时都刷新（因为从纠纷页回来状态可能变了）
onShow(() => {
  if (item.value.itemID) {
    fetchDetail();
  }
});

onLoad((options) => {
  // 这里的 options.id 必须与跳转时的 ?id= 保持一致
  if (options.id) {
    console.log("正在请求物品详情，ID:", options.id);
    loadItemDetail(options.id);
  } else {
    uni.showToast({ title: '参数错误', icon: 'none' });
  }
});

// src/pages/item/detail.vue

const loadItemDetail = (id) => {
  uni.showLoading({ title: '加载中...', mask: true });
  
  uni.request({
    // 【修改点】将端口改为 8083，路径改为你在 ClaimController 定义的接口
    url: `http://localhost:8083/claim/item-detail/${id}`, 
    method: 'GET',
    success: (res) => {
      console.log("Claim服务器返回数据:", res.data);
      if (res.data.code === 200) {
        // 注意：确保后端返回的结构能对应上 itemDetail 的字段
        itemDetail.value = res.data.data;
      } else {
        uni.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
      }
    },
    fail: (err) => {
      console.error("请求8083失败:", err);
      uni.showToast({ title: '无法连接认领服务器', icon: 'none' });
    },
    complete: () => {
      uni.hideLoading();
    }
  });
};

</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 160rpx; }
.loading-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #fff; }
.row { display: flex; justify-content: space-between; padding: 10rpx 0; }
.label { color: #666; width: 160rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
.hint { text-align: center; width: 100%; color: #999; font-size: 28rpx; padding: 20rpx 0; }
.btn-row { display: flex; gap: 20rpx; width: 100%; }
.action { width: 100%; display:flex; align-items: center; justify-content: center; background:#f5f5f5; border-radius:12rpx; padding:18rpx 0; color:#333; flex: 1; }
.action.primary { background: #007aff; color: #fff; }
.action.apply-action { background: #007aff; color: #fff; }
.action.pending { background: #e0e0e0; color: #666; }
.action.warning { background: #fff; color: #dd524d; border: 2rpx solid #dd524d; }
.action[disabled] { opacity: 0.6; }
.status-ok { color: #07c160; font-weight: bold; }
.status-wait { color: #f0ad4e; }
.finished-hint { text-align: center; color: #07c160; font-weight: bold; font-size: 32rpx; padding: 20rpx; }
.reject-card { margin-top: 16rpx; }
.popup { width: 640rpx; padding: 24rpx; border-radius: 16rpx; background: #fff; }
.apply-popup { background: #f0f0f0; }
.popup-title { font-size: 32rpx; font-weight: 600; margin-bottom: 16rpx; }
.popup-actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 18rpx; }
.btn { padding: 12rpx 22rpx; font-size: 26rpx; border-radius: 10rpx; background: #f5f5f5; color: #333; line-height: 1.2; }
.btn.primary { background: #007aff; color: #fff; }
.btn[disabled] { opacity: 0.6; }
button::after { border: none; }
.image-section {
  margin-top: 24rpx;
  background-color: #fff;
  border-radius: 12px;
  padding: 24rpx;
  box-shadow: 0 1px 5px rgba(0,0,0,0.05); 
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 10rpx;
  border-left: 6rpx solid #007aff; 
}
.image-swiper {
  width: 100%;
  height: 400rpx; 
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f9f9f9;
}
.slide-image { width: 100%; height: 100%; }
.placeholder-box {
  width: 100%;
  height: 300rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2rpx dashed #e0e0e0;
}
.placeholder-text { font-size: 26rpx; color: #999; margin-top: 10rpx; }
</style>