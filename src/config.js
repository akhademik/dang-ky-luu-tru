/**
 * Cấu hình hệ thống tích hợp KBTT
 */
export const CONFIG = {
  BASE_URL: 'https://api-kbtt.ai-vlab.com',
  GOOGLE_SHEET_ID: '16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q',
  GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL || '',
  AUTH: {
    USERNAME: 'demo_tich_hop',
    PASSWORD: 'Demo@#$12345',
    BASIC_AUTH: 'Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ',
    GRANT_TYPE: 'api_cslt',
  },
  ENDPOINTS: {
    // Auth endpoints
    TOKEN: '/authorization-service/oauth/token',
    REFRESH_TOKEN: '/authorization-service/oauth/refresh-token',
    REVOKE: '/authorization-service/oauth/revoke',

    // Public catalog endpoints
    DM_QUOC_TICH: '/cms-backend/public/dm-qt/3th/get-all',
    DM_TINH_TP: '/cms-backend/public/dm-tinh-tp/get-all',
    DM_PHUONG_XA: '/cms-backend/public/dm-phuong-xa',
    DM_LY_DO_CU_TRU: '/cms-backend/public/ly-do-cu-tru/get-all',
    DM_LOAI_GIAY_TO: '/cms-backend/public/loai-giay-to/get-all',
    DM_NOI_CU_TRU: '/cms-backend/public/noi-cu-tru/get-all',

    // Khai báo endpoints
    KBTT_FOREIGN: '/client-service/kbtt/kbtt-3th',     // API 4: Khách nước ngoài
    KBTT_VIETNAM: '/client-service/kbtt-vn/kbtt-3th',  // API 5: Khách Việt Nam
  },
  TOKEN_REFRESH_BUFFER_SECONDS: 60, // Refresh nếu token còn hạn < 60s
};
