<template>
  <view class="apply-dispute-container">
    <scroll-view scroll-y class="content">
      <!-- 维权理由 -->
      <uni-section title="维权理由" type="line" :padding="true">
        <view class="form-item">
          <textarea 
            v-model="formData.reason" 
            class="reason-textarea"
            placeholder="请详细描述您的维权理由..."
            :maxlength="500"
          />
          <text class="char-count">{{ formData.reason.length }}/500</text>
        </view>
      </uni-section>

      <!-- 上传证据 -->
      <uni-section title="上传证据" type="line" :padding="true">
        <view class="upload-section">
          <view class="image-list">
            <view 
              v-for="(img, index) in imageList" 
              :key="index"
              class="image-item"
            >
              <image :src="img" mode="aspectFill" class="preview-img" />
              <view class="delete-btn" @click="removeImage(index)">
                <uni-icons type="close" size="16" color="#fff"></uni-icons>
              </view>
            </view>
            
            <view 
              v-if="imageList.length < 9" 
              class="upload-btn"
              @click="chooseImage"
            >
              <uni-icons type="camera" size="40" color="#999"></uni-icons>
              <text>{{ imageList.length }}/9</text>
            </view>
          </view>
          
          <view class="upload-tip">
            <uni-icons type="info" size="14" color="#999"></uni-icons>
            <text>最多上传9张图片,支持JPG、PNG格式</text>
          </view>
        </view>
      </uni-section>

      <!-- 补充说明 -->
      <uni-section title="补充说明" type="line" :padding="true">
        <view class="form-item">
          <textarea 
            v-model="formData.comments" 
            class="comments-textarea"
            placeholder="补充说明(选填)..."
            :maxlength="300"
          />
          <text class="char-count">{{ formData.comments.length }}/300</text>
        </view>
      </uni-section>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="footer">
      <button class="submit-btn" @click="submitDispute" :loading="submitting">
        提交维权申请
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { http } from '@/utils/http'
import { useUserStore } from '@/stores/user'

interface FormData {
  claimId: string
  reason: string
  comments: string
}

const formData = ref<FormData>({
  claimId: '',
  reason: '',
  comments: ''
})

const imageList = ref<string[]>([])
const imageUrls = ref<string[]>([])
const submitting = ref(false)

// 页面加载时接收参数
onLoad((options: any) => {
  if (options && options.claimId) {
    formData.value.claimId = options.claimId
  }

  // 测试代码
   // formData.value.claimId = '0ead8694eb0511f0850f7ced8dfee038'
})

// 选择图片
const chooseImage = () => {
  const maxCount = 9 - imageList.value.length
  
  uni.chooseImage({
    count: maxCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 添加到预览列表
      imageList.value.push(...res.tempFilePaths)
    }
  })
}

// 删除图片
const removeImage = (index: number) => {
  imageList.value.splice(index, 1)
  imageUrls.value.splice(index, 1)
}

// 上传图片到服务器
const uploadImages = async (): Promise<string[]> => {
  if (imageList.value.length === 0) {
    return []
  }

  try {
    uni.showLoading({ title: '上传图片中...' })
    
    const uploadedUrls: string[] = []
    
    // 逐个上传图片
    for (let i = 0; i < imageList.value.length; i++) {
      const filePath = imageList.value[i]
      const userStore = useUserStore()
      const token = `Bearer ${userStore.token}` || ''
      
      const uploadResult = await uni.uploadFile({
        url: 'http://127.0.0.1:8082/api/v1/disputes/upload-images',
        header: {
          'Authorization': token
        },
        filePath: filePath,
        name: 'files',
        formData: {}
      })

      console.log('uploadResult:', uploadResult)
      const response = JSON.parse(uploadResult.data as string)
      console.log('upload response:', response.code === 200)
      console.log('upload response data:', response.data)
      
      if (response.code === 200 && response.data) {
        // 假设后端返回的是 List<String>,取第一个
        console.log('uploaded image url:', response.data[0])
        uploadedUrls.push(response.data[0])
      } else {
        throw new Error(response.msg || '上传失败')
      }
    }
    
    uni.hideLoading()
    return uploadedUrls
    
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '图片上传失败',
      icon: 'none'
    })
    throw error
  }
}

// 提交维权申请
const submitDispute = async () => {
  // 表单验证
  if (!formData.value.reason.trim()) {
    uni.showToast({
      title: '请填写维权理由',
      icon: 'none'
    })
    return
  }

  if (!formData.value.claimId) {
    uni.showToast({
      title: '缺少认领ID',
      icon: 'none'
    })
    return
  }

  try {
    submitting.value = true
    
    // 1. 先上传图片获取URL
    const uploadedUrls = await uploadImages()
    
    // 2. 调用申请接口
    uni.showLoading({ title: '提交中...' })
    
    const response = await http.request({
      url: 'http://127.0.0.1:8082/api/v1/disputes/apply',
      method: 'PUT',
      data: {
        claimId: formData.value.claimId,
        reason: formData.value.reason,
        evidenceData: {
          imageUrls: uploadedUrls,
          comments: formData.value.comments
        }
      }
    })

    uni.hideLoading()
    
    console.log('submit dispute response:', response)
    const resData = response as any

    if (resData.code === 200) {
      uni.showModal({
        title: '提交成功',
        content: `工单号: ${resData.data.ticket_id}\n请在${resData.data.deadline}前关注处理结果`,
        showCancel: false,
        success: () => {
          // 返回上一页或跳转到工单列表
          uni.navigateBack()
        }
      })
    } else {
      uni.showToast({
        title: resData.msg || '提交失败',
        icon: 'none'
      })
    }
    
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '提交失败,请重试',
      icon: 'none'
    })
    console.error('提交维权申请失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.apply-dispute-container {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding-bottom: 120rpx;
}

.form-item {
  position: relative;
  
  .reason-textarea,
  .comments-textarea {
    width: 100%;
    min-height: 200rpx;
    padding: 20rpx;
    background-color: #f8f8f8;
    border-radius: 8rpx;
    font-size: 28rpx;
    line-height: 1.6;
  }
  
  .comments-textarea {
    min-height: 150rpx;
  }
  
  .char-count {
    display: block;
    text-align: right;
    margin-top: 10rpx;
    color: #999;
    font-size: 24rpx;
  }
}

.upload-section {
  .image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    
    .image-item {
      position: relative;
      width: 200rpx;
      height: 200rpx;
      
      .preview-img {
        width: 100%;
        height: 100%;
        border-radius: 8rpx;
        background-color: #f5f5f5;
      }
      
      .delete-btn {
        position: absolute;
        top: -10rpx;
        right: -10rpx;
        width: 40rpx;
        height: 40rpx;
        background-color: #ff3b30;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    .upload-btn {
      width: 200rpx;
      height: 200rpx;
      border: 2rpx dashed #ddd;
      border-radius: 8rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #fafafa;
      
      text {
        margin-top: 10rpx;
        color: #999;
        font-size: 24rpx;
      }
    }
  }
  
  .upload-tip {
    display: flex;
    align-items: center;
    margin-top: 20rpx;
    padding: 20rpx;
    background-color: #fff9e6;
    border-radius: 8rpx;
    
    text {
      margin-left: 10rpx;
      color: #999;
      font-size: 24rpx;
      line-height: 1.5;
    }
  }
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
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
</style>
