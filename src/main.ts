import { createSSRApp } from "vue";
import App from "./App.vue";
import { BASE_URL } from './config'

uni.setStorageSync('token', 'eyJhbGciOiJIUzUxMiJ9.eyJ1c2VyX2lkIjoiM2JjY2IxMDllYjA0MTFmMDg1MGY3Y2VkOGRmZWUwMzgiLCJyb2xlIjoiQURNSU4iLCJzdWIiOiIzYmNjYjEwOWViMDQxMWYwODUwZjdjZWQ4ZGZlZTAzOCIsImlhdCI6MTc2Nzg3NTgzOCwiZXhwIjoxNzY3OTYyMjM4fQ.yspQlW9UTeTpWcAH8BTNxq2kRDMnz3LabKg37JofevThi-LlCVncX_DWEKA5IRwvH9expqpd4CLK9h3JHz09-w')

uni.addInterceptor('request', {
  invoke(args) {
    // 如果 url 不是以 http 开头，则拼接全局域名
    if (!args.url.startsWith('http')) {
      args.url = BASE_URL + args.url
    }
    
    args.header = {
      ...args.header,
      'Authorization': 'Bearer ' + (uni.getStorageSync('token') || '')
    }
  }
})

// 添加 uploadFile 拦截器
uni.addInterceptor('uploadFile', {
  invoke(args) {
    // 如果 url 不是以 http 开头,则拼接全局域名
    if (!args.url.startsWith('http')) {
      args.url = BASE_URL + args.url
    }
    
    args.header = {
      ...args.header,
      'Authorization': 'Bearer ' + (uni.getStorageSync('token') || '')
    }
  }
})

export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}
