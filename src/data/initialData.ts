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
    approverUserId: 'usr-head-gen',
    approverName: 'อ.กัญญารัตน์ อักษรศิลป์ (หัวหน้าครูสามัญ)',
    color: '#db2777' // pink-600
  }
];

export const INITIAL_USERS: User[] = [
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

export const INITIAL_REQUESTS: ExitRequest[] = [
  {
    id: 'REQ-20261005-001',
    userId: 'usr-teacher-somchai',
    userName: 'นายสมชาย รักเรียน',
    branchId: 'AT',
    branchName: 'ช่างยนต์',
    position: 'ครู ค.ศ. 1',
    userPhone: '081-234-5678',
    submittedAt: '2026-10-05 08:15',
    exitDate: '2026-10-05',
    exitTime: '10:30',
    returnTime: '12:00',
    destination: 'ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน',
    reason: 'นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20,000 กม.',
    travelMethod: 'รถราชการ',
    vehiclePlate: 'ฮข-4589 กทม.',
    companions: 'นายสุรชัย (นักการภารโรง)',
    notes: 'ติดต่อช่างผู้ดูแลไว้ล่วงหน้าเรียบร้อยแล้ว',
    assignedApproverId: 'usr-head-at',
    assignedApproverName: 'อ.วิชัย ช่างทอง (หัวหน้าสาขาช่างยนต์)',
    status: 'pending',
    hasClasses: true,
    substituteTeacherId: 'usr-teacher-prasert',
    substituteTeacherName: 'นายประเสริฐ สายวงจร',
    substituteSubject: 'วิชาเครื่องยนต์ดีเซล ปวช.2 (คาบ 3-4 ห้องปฏิบัติการ 2)',
    substituteTasks: 'ให้นักศึกษาทำใบงานตรวจเช็กระบบหล่อลื่นบทที่ 4 ในสมุดส่งท้ายคาบ',
    substituteStatus: 'pending',
    qrToken: 'TOKEN-REQ-20261005-001-AT-VALID'
  },
  {
    id: 'REQ-20261004-002',
    userId: 'usr-teacher-suda',
    userName: 'นางสาวสุดา เทคโนสารสนเทศ',
    branchId: 'DB',
    branchName: 'ธุรกิจดิจิทัล',
    position: 'ครูชำนาญการ',
    userPhone: '089-876-5432',
    submittedAt: '2026-10-04 09:00',
    exitDate: '2026-10-04',
    exitTime: '13:00',
    returnTime: '16:30',
    destination: 'ธนาคารกรุงไทย สาขาศาลายา',
    reason: 'นำส่งเอกสารบัญชีเบิกจ่ายทุนการศึกษานักศึกษาฝึกประสบการณ์',
    travelMethod: 'ยานพาหนะส่วนตัว',
    vehiclePlate: '4กง-1234 กทม.',
    companions: '-',
    notes: 'ดำเนินการช่วงที่ไม่มีคาบสอน',
    assignedApproverId: 'usr-head-db',
    assignedApproverName: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์ (หัวหน้าสาขาธุรกิจดิจิทัล)',
    status: 'approved',
    approvedAt: '2026-10-04 09:30',
    approvedBy: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์',
    qrToken: 'TOKEN-REQ-20261004-002-DB-APPROVED',
    actualExitTime: '13:05',
    actualReturnTime: '16:15',
    checkedBySecurity: 'นายบุญส่ง มั่นคง (รปภ.)'
  },
  {
    id: 'REQ-20261004-003',
    userId: 'usr-teacher-prasert',
    userName: 'นายประเสริฐ สายวงจร',
    branchId: 'EL',
    branchName: 'ช่างไฟฟ้า',
    position: 'ครูผู้ช่วย',
    userPhone: '084-332-1100',
    submittedAt: '2026-10-04 10:15',
    exitDate: '2026-10-04',
    exitTime: '11:00',
    returnTime: '13:00',
    destination: 'ร้านค้าฮาร์ดแวร์คลองถม',
    reason: 'จัดซื้ออุปกรณ์เบรกเกอร์และสายไฟเพิ่มเติมสำหรับวิชาปฏิบัติการไฟฟ้า',
    travelMethod: 'ยานพาหนะส่วนตัว',
    assignedApproverId: 'usr-head-el',
    assignedApproverName: 'อ.เกรียงไกร สายฟ้า (หัวหน้าสาขาช่างไฟฟ้า)',
    status: 'approved',
    approvedAt: '2026-10-04 10:40',
    approvedBy: 'อ.เกรียงไกร สายฟ้า',
    qrToken: 'TOKEN-REQ-20261004-003-EL-APPROVED'
  },
  {
    id: 'REQ-20261005-004',
    userId: 'usr-head-at',
    userName: 'อ.วิชัย ช่างทอง',
    branchId: 'AT',
    branchName: 'ช่างยนต์',
    position: 'หัวหน้าสาขาช่างยนต์',
    userPhone: '086-112-9988',
    submittedAt: '2026-10-05 09:10',
    exitDate: '2026-10-05',
    exitTime: '13:30',
    returnTime: '16:30',
    destination: 'สถาบันพัฒนาฝีมือแรงงาน ภาค 1 สมุทรปราการ',
    reason: 'เข้าร่วมประชุมคณะกรรมการจัดสอบมาตรฐานวิชาชีพฝีมือแรงงานแห่งชาติ สาขาช่างซ่อมบำรุงรถยนต์',
    travelMethod: 'รถราชการ',
    vehiclePlate: 'กข-9921 สป.',
    companions: 'นายประเสริฐ สายวงจร (ครูผู้ช่วย)',
    notes: 'หัวหน้าสาขายื่นขออนุญาต โดยคำขอเสนอตรงไปยังรองผู้อำนวยการฝ่ายวิชาการ',
    assignedApproverId: 'usr-admin',
    assignedApproverName: 'ดร.สมเกียรติ บริหารการศึกษา (รอง ผอ.ฝ่ายวิชาการ/Admin)',
    status: 'approved',
    approvedAt: '2026-10-05 09:40',
    approvedBy: 'ดร.สมเกียรติ บริหารการศึกษา (รอง ผอ.ฝ่ายวิชาการ)',
    hasClasses: false,
    substituteStatus: 'not_required',
    qrToken: 'TOKEN-REQ-20261005-004-HEAD-APPROVED'
  }
];

export const INITIAL_APPROVAL_LOGS: ApprovalLog[] = [
  {
    id: 'LOG-004',
    requestId: 'REQ-20261005-004',
    requestSummary: 'อ.วิชัย ช่างทอง (หัวหน้าสาขาช่างยนต์) ขอออกไปสถาบันพัฒนาฝีมือแรงงาน',
    actorId: 'usr-head-at',
    actorName: 'อ.วิชัย ช่างทอง',
    actorRole: 'หัวหน้าสาขา (ผู้ขอ)',
    action: 'submit',
    timestamp: '2026-10-05 09:10',
    comment: 'หัวหน้าสาขายื่นคำขอ ระบบเสนอตรงไปยัง ดร.สมเกียรติ (รอง ผอ.ฝ่ายวิชาการ)'
  },
  {
    id: 'LOG-005',
    requestId: 'REQ-20261005-004',
    requestSummary: 'อนุมัติคำขอออกนอกสถานศึกษาของหัวหน้าสาขาช่างยนต์',
    actorId: 'usr-admin',
    actorName: 'ดร.สมเกียรติ บริหารการศึกษา',
    actorRole: 'รอง ผอ.ฝ่ายวิชาการ/Admin',
    action: 'approve',
    timestamp: '2026-10-05 09:40',
    comment: 'อนุมัติราชการภายนอกของหัวหน้าสาขาวิชาช่างยนต์'
  },
  {
    id: 'LOG-001',
    requestId: 'REQ-20261005-001',
    requestSummary: 'นายสมชาย ขอออกไปศูนย์บริการรถยนต์',
    actorId: 'usr-teacher-somchai',
    actorName: 'นายสมชาย รักเรียน',
    actorRole: 'ครูผู้ขอ',
    action: 'submit',
    timestamp: '2026-10-05 08:15',
    comment: 'ยื่นคำขอใหม่ ระบบส่งแจ้งเตือน LINE ไปยังหัวหน้าสาขาช่างยนต์ (อ.วิชัย ช่างทอง)'
  },
  {
    id: 'LOG-002',
    requestId: 'REQ-20261004-002',
    requestSummary: 'นางสาวสุดา ขอออกไปธนาคารกรุงไทย',
    actorId: 'usr-teacher-suda',
    actorName: 'นางสาวสุดา เทคโนสารสนเทศ',
    actorRole: 'ครูผู้ขอ',
    action: 'submit',
    timestamp: '2026-10-04 09:00',
    comment: 'ยื่นคำขอใหม่ ส่งแจ้งเตือนไปยัง อ.วราภรณ์'
  },
  {
    id: 'LOG-003',
    requestId: 'REQ-20261004-002',
    requestSummary: 'นางสาวสุดา ขอออกไปธนาคารกรุงไทย',
    actorId: 'usr-head-db',
    actorName: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์',
    actorRole: 'หัวหน้าสาขาธุรกิจดิจิทัล',
    action: 'approve',
    timestamp: '2026-10-04 09:30',
    comment: 'อนุมัติผ่านระบบ LINE Flex Message แจ้งกลับครูผู้ขอเรียบร้อย'
  },
  {
    id: 'LOG-004',
    requestId: 'REQ-20261004-002',
    requestSummary: 'นางสาวสุดา ขอออกไปธนาคารกรุงไทย',
    actorId: 'usr-security',
    actorName: 'นายบุญส่ง มั่นคง',
    actorRole: 'เจ้าหน้าที่ รปภ.',
    action: 'gate_exit',
    timestamp: '2026-10-04 13:05',
    comment: 'สแกน QR Code ประตูหน้า บันทึกเวลาออกจริง 13:05 น.'
  },
  {
    id: 'LOG-005',
    requestId: 'REQ-20261004-002',
    requestSummary: 'นางสาวสุดา ขอออกไปธนาคารกรุงไทย',
    actorId: 'usr-security',
    actorName: 'นายบุญส่ง มั่นคง',
    actorRole: 'เจ้าหน้าที่ รปภ.',
    action: 'gate_return',
    timestamp: '2026-10-04 16:15',
    comment: 'สแกน QR Code ตรวจกลับเข้าสถานศึกษา เวลา 16:15 น. (ตรงเวลา)'
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  schoolName: 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์',
  collegeCode: 'DONBOSCO-SURAT-2026',
  logoUrl: '',
  lineChannelAccessToken: 'MOCK_TOKEN_k8e9a2f174c_DEMO_READY',
  lineChannelSecret: 'c827361fae4981bc923a',
  googleAppsScriptUrl: '',
  enableLineNotifications: true,
  autoSyncWithGoogleSheet: true,
  securityContact: 'ห้องควบคุมความปลอดภัย ประตู 1 (โทร 02-999-8888 ต่อ 101)'
};
