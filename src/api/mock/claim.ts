import { ref } from 'vue';
import config from '../../common/config.js';

// 后端接口根地址 (注意端口是 8083)
const BASE_URL = config.CLAIM_HOST;

export type ItemStatus = 'PUBLISHED' | 'PUBLISHING' | 'CLAIMING' | 'HANDOVER' | 'FINISHED' | 'REJECTED';

// 通用请求封装
const request = async (url: string, method: 'GET' | 'POST' | 'PUT', data?: any) => {
  return new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method: method,
      data: data,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 这里直接返回 res.data，对应后端的 { code, msg, data }
          resolve(res.data);
        } else {
          uni.showToast({ title: '请求失败', icon: 'none' });
          reject(res);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' });
        reject(err);
      }
    });
  });
};

// 1. 发起认领
export const postItemClaim = (data: any) => {
  return request('/item/claim', 'POST', data);
};

// 2. 发起归还 (后端逻辑复用或独立接口)
export const postItemReturn = (data: any) => {
  // 如果后端写了 /item/return 就用这个，没写就复用 /item/claim
  return request('/item/return', 'POST', data);
};

// 3. 同意申请
export const putItemApprove = (data: any) => {
  return request('/item/approve', 'PUT', data);
};

// 4. 拒绝申请
export const putItemReject = (data: any) => {
  return request('/item/reject', 'PUT', data);
};

// 5. 确认交接
export const putItemConfirm = (data: any) => {
  return request('/item/confirm', 'PUT', data);
};

// 6. 获取详情
export const getItemDetail = (params: any) => {
  return request('/item/detail', 'GET', params);
};

export const getItemStatus = (itemID: string, userID: string) => {
  return request(`/item/status?itemID=${itemID}&userID=${userID}`, 'GET');
};

export const postDisputeTicket = (data: {
  itemID: string;
  claimID?: string; // 可选，如果能获取到 claimId 最好
  reason: string;
  userID?: string; // 可选：发起工单的用户
  evidence?: string[]; // 图片等证据
}) => {
  return request('/item/dispute', 'POST', data);
};

export const postItemCancel = (data: {
  itemID: string;
  userID: string;
}) => {
  // 注意：后端 Controller 定义的是 @PutMapping("/cancel")，所以这里用 PUT
  return request('/item/cancel', 'PUT', data);
};

export const getItemHall = () => {
  return request('/item/hall', 'GET');
};
