// common/config.js

// 切换开关：'local' (本地调试) 或 'dev' (四人联机)
const ENV = 'local'; 

// --- 联机模式下的 IP 配置 (联机时填入队友的真实IP) ---
const DEV_HOSTS = {
  USER_HOST:  'http://192.168.x.x:8081', // 队友A (用户系统)
  ITEM_HOST:  'http://192.168.x.x:8082', // 队友B (物品/发布系统)
  CLAIM_HOST: 'http://192.168.x.x:8083', // 你 (认领系统)
  AUDIT_HOST: 'http://192.168.x.x:8084'  // 队友C (审核系统)
};

// --- 本地调试模式下的 IP 配置 ---
const LOCAL_HOSTS = {
  USER_HOST:  'http://localhost:8081',
  ITEM_HOST:  'http://localhost:8082',
  CLAIM_HOST: 'http://localhost:8083', // 你本地只跑这个，或者都跑
  AUDIT_HOST: 'http://localhost:8084'
};

// 根据开关导出对应的配置
const config = ENV === 'local' ? LOCAL_HOSTS : DEV_HOSTS;

export default config;