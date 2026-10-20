import { Branch, User, ExitRequest, ApprovalLog, SystemSettings } from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'ME',
    name: 'ช่างกลโรงงาน',
    approverUserId: 'usr-import-64665',
    approverName: 'นายคัมภีร์ ช่วยเพชร (หัวหน้าสาขาช่างกลโรงงาน)',
    color: '#4f46e5' // indigo-600
  },
  {
    id: 'DB',
    name: 'ธุรกิจดิจิทัล',
    approverUserId: 'usr-head-db',
    approverName: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์ (หัวหน้าสาขาธุรกิจดิจิทัล)',
    color: '#0284c7' // sky-600
  },
  {
    id: 'AC',
    name: 'การบัญชี',
    approverUserId: 'usr-head-ac',
    approverName: 'อ.พิมพา ยอดบัญชี (หัวหน้าสาขาการบัญชี)',
    color: '#059669' // emerald-600
  },
  {
    id: 'EL',
    name: 'ช่างไฟฟ้า',
    approverUserId: 'usr-head-el',
    approverName: 'อ.เกรียงไกร สายฟ้า (หัวหน้าสาขาช่างไฟฟ้า)',
    color: '#d97706' // amber-600
  },
  {
    id: 'AT',
    name: 'ช่างยนต์',
    approverUserId: 'usr-head-at',
    approverName: 'อ.วิชัย ช่างทอง (หัวหน้าสาขาช่างยนต์)',
    color: '#ea580c' // orange-600
  },
  {
    id: 'GEN',
    name: 'ครูสามัญ',
    approverUserId: 'usr-915068',
    approverName: 'นางกนกวรรณ ธนาพล (หัวหน้าสาขาครูสามัญ)',
    color: '#db2777' // pink-600
  }
];

export const INITIAL_USERS: User[] = [
  // ครูสามัญ (ผู้ใช้งานจริงที่เพิ่มในระบบ)
  {
    id: 'usr-958043',
    username: 'kanoksak',
    password: 'password123',
    name: 'นายกนกศักดิ์ บุญไทย',
    role: 'teacher',
    branchId: 'GEN',
    branchName: 'ครูสามัญ',
    position: 'ครู',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_KANOKSAK',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-915068',
    username: 'kanokwan',
    password: 'password123',
    name: 'นางกนกวรรณ ธนาพล (หัวหน้าสาขาครูสามัญ)',
    role: 'approver',
    branchId: 'GEN',
    branchName: 'ครูสามัญ',
    position: 'หัวหน้าสาขาครูสามัญ',
    phone: '081-xxx-xxxx',
    lineId: 'U0b1a90a74dacb8fbb2be07d19189932c',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
  },

  // User's Real Teachers (ช่างกลโรงงาน)
  {
    id: 'usr-import-64661',
    username: 'teacher_64661',
    password: 'password123',
    name: 'นายสุมัณฑิต ทิพย์มนตรี',
    role: 'teacher',
    branchId: 'ME',
    branchName: 'ช่างกลโรงงาน',
    position: 'ครูผู้สอน',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_64661',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-import-64662',
    username: 'teacher_64662',
    password: 'password123',
    name: 'นายวรวิทย์ บุญณะ',
    role: 'teacher',
    branchId: 'ME',
    branchName: 'ช่างกลโรงงาน',
    position: 'ครูผู้สอน',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_64662',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-import-64663',
    username: 'teacher_64663',
    password: 'password123',
    name: 'นายปิยะพงษ์ รอดเภทโพธิ์',
    role: 'teacher',
    branchId: 'ME',
    branchName: 'ช่างกลโรงงาน',
    position: 'ครูผู้สอน',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_64663',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-import-64664',
    username: 'teacher_64664',
    password: 'password123',
    name: 'นายสันติ ศรีสันติธรณ์',
    role: 'teacher',
    branchId: 'ME',
    branchName: 'ช่างกลโรงงาน',
    position: 'ครูผู้สอน',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_64664',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-import-64665',
    username: 'teacher_64665',
    password: 'password123',
    name: 'นายคัมภีร์ ช่วยเพชร หัวหน้าสาขา',
    role: 'approver',
    branchId: 'ME',
    branchName: 'ช่างกลโรงงาน',
    position: 'หัวหน้าสาขาช่างกลโรงงาน',
    phone: '081-xxx-xxxx',
    lineId: 'U_LINE_64665',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
  },

  // Central Administrator & Security
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'adminpassword',
    name: 'ดร.สมเกียรติ บริหารการศึกษา (รอง ผอ.ฝ่ายวิชาการ/Admin)',
    role: 'admin',
    branchId: 'GEN',
    branchName: 'ฝ่ายบริหาร',
    position: 'ผู้ดูแลระบบ / รองผู้อำนวยการ',
    phone: '081-999-0000',
    lineId: 'U_ADMIN_CENTRAL',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'
  },
  {
    id: 'usr-security',
    username: 'guard',
    password: 'password123',
    name: 'นายบุญส่ง มั่นคง (เจ้าหน้าที่รักษาความปลอดภัย ประตู 1)',
    role: 'security',
    branchId: 'GEN',
    branchName: 'ฝ่ายอาคารสถานที่',
    position: 'เจ้าหน้าที่ รปภ. / ตรวจสอบประตู',
    phone: '083-111-2233',
    lineId: 'U_SECURITY_GATE',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'
  }
];

export const INITIAL_REQUESTS: ExitRequest[] = [];

export const INITIAL_APPROVAL_LOGS: ApprovalLog[] = [];

export const INITIAL_SETTINGS: SystemSettings = {
  schoolName: 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์',
  collegeCode: 'DONBOSCO-SURAT-2026',
  logoUrl: '',
  appUrl: '',
  lineChannelAccessToken: 'MOCK_TOKEN_k8e9a2f174c_DEMO_READY',
  lineChannelSecret: 'c827361fae4981bc923a',
  googleAppsScriptUrl: '',
  enableLineNotifications: true,
  autoSyncWithGoogleSheet: true,
  securityContact: 'ห้องควบคุมความปลอดภัย ประตู 1 (โทร 02-999-8888 ต่อ 101)'
};
