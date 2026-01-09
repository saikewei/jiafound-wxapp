import { reactive } from 'vue';

export const userState = reactive({
  // 默认为申请人身份
  isPublisher: false,
  // 对应的 Mock ID
  currentUserId: 'u_applicant_001',
  
  // 切换身份的方法
  toggleIdentity() {
    this.isPublisher = !this.isPublisher;
    // 切换 ID，方便后端识别
    this.currentUserId = this.isPublisher ? 'u_publisher_001' : 'u_applicant_001';
    
    uni.showToast({
      title: this.isPublisher ? '已切换为：发布者' : '已切换为：申请人',
      icon: 'none'
    });
  }
});