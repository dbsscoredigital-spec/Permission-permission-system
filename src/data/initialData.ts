import { User, Branch, ExitRequest, ApprovalLog, SystemSettings } from "../types";

export const INITIAL_USERS: User[] = [
  {
    "id": "usr-915068",
    "username": "kanokwan",
    "password": "1234",
    "name": "นางกนกวรรณ ธนาพล",
    "role": "approver",
    "branchId": "GEN",
    "branchName": "ครูสามัญ",
    "position": "ครู",
    "lineId": "U0b1a90a74dacb8fbb2be07d19189932c"
  },
  {
    "id": "usr-import-64661",
    "username": "pope",
    "password": "1234",
    "name": "นายสุมัณฑิต ทิพย์มนตรี",
    "role": "teacher",
    "branchId": "ME",
    "branchName": "ช่างกลโรงงาน",
    "position": "ครูผู้สอน",
    "lineId": "U9474d32fb566bbfafc743b4511d46f9d"
  },
  {
    "id": "usr-import-64662",
    "username": "worawit",
    "password": "1234",
    "name": "นายวรวิทย์ บุญณะ",
    "role": "teacher",
    "branchId": "ME",
    "branchName": "ช่างกลโรงงาน",
    "position": "ครูผู้สอน",
    "lineId": "Ucd11f927fb0627c5608f49d0e202ceaa"
  },
  {
    "id": "usr-import-64663",
    "username": "patumwan5817@gmail.com",
    "password": "1234",
    "name": "นายปิยะพงษ์ รอดเภทโพธิ์",
    "role": "teacher",
    "branchId": "ME",
    "branchName": "ช่างกลโรงงาน",
    "position": "ครูผู้สอน",
    "lineId": "U9db6d7c3b5ba1c5edc4fdb395950bb01"
  },
  {
    "id": "usr-import-64664",
    "username": "jiggo.noname.tong@gmail.com",
    "password": "1234",
    "name": "นายสันติ ศรีสันติธรณ์",
    "role": "teacher",
    "branchId": "ME",
    "branchName": "ช่างกลโรงงาน",
    "position": "ครูผู้สอน",
    "lineId": "U_LINE_64664"
  },
  {
    "id": "usr-import-64665",
    "username": "kumpee",
    "password": "1234",
    "name": "นายคัมภีร์ ช่วยเพชร หัวหน้าสาขา",
    "role": "approver",
    "branchId": "ME",
    "branchName": "ช่างกลโรงงาน",
    "position": "หัวหน้าสาขาช่างกลโรงงาน",
    "lineId": "U759b2ec7a4eee7f1c4565b9a7a8194e2"
  },
  {
    "id": "usr-admin",
    "username": "admin",
    "password": "1122",
    "name": "นายศรายุทธ สมสุข",
    "role": "admin",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ผู้ดูแลระบบ / รองผู้อำนวยการ",
    "lineId": "U_ADMIN_CENTRAL"
  },
  {
    "id": "usr-security",
    "username": "guard",
    "password": "password123",
    "name": "นายบุญส่ง มั่นคง (เจ้าหน้าที่รักษาความปลอดภัย ประตู 1)",
    "role": "security",
    "branchId": "GEN",
    "branchName": "ฝ่ายอาคารสถานที่",
    "position": "เจ้าหน้าที่ รปภ. / ตรวจสอบประตู",
    "lineId": "U_SECURITY_GATE"
  },
  {
    "id": "usr-import-68031",
    "username": "samipak793@gmail.com",
    "password": "1234",
    "name": "นายทิวากร       สามิภักดิ์",
    "role": "teacher",
    "branchId": "EL",
    "branchName": "ช่างไฟฟ้า",
    "position": "ครูผู้สอน",
    "lineId": "U6e2636be42c9019262e42e4312a687f9"
  },
  {
    "id": "usr-import-68032",
    "username": "satja",
    "password": "1234",
    "name": "นายสัจจะ        วิชัยดิษฐ",
    "role": "teacher",
    "branchId": "EL",
    "branchName": "ช่างไฟฟ้า",
    "position": "ครูผู้สอน",
    "lineId": "Uf042efd3a0406969f203957b4bd82221"
  },
  {
    "id": "usr-import-68033",
    "username": "kitchana.5364@gmail.com",
    "password": "1234",
    "name": "นายชนะ         กฤตานุพงศ์",
    "role": "admin",
    "branchId": "EL",
    "branchName": "ช่างไฟฟ้า",
    "position": "ผู้อำนวยการ",
    "lineId": "U0b18dbb4273993baeaf37b5d8f73e825"
  },
  {
    "id": "usr-import-68034",
    "username": "monden6@gmail.com",
    "password": "1234",
    "name": "นางนฤมล         เรืองพุฒ",
    "role": "approver",
    "branchId": "EL",
    "branchName": "ช่างไฟฟ้า",
    "position": "ครูผู้สอน",
    "lineId": "U013dfdf06ab0c66db7d898540077d80e"
  },
  {
    "id": "usr-import-71241",
    "username": "chatchai",
    "password": "1234",
    "name": "นายฉัตรชัย         ดิษฐาน",
    "role": "approver",
    "branchId": "AT",
    "branchName": "ช่างยนต์",
    "position": "ครูผู้สอน",
    "lineId": "U00d0bcb58a525b4a9e29999ddd8c8246"
  },
  {
    "id": "usr-import-71242",
    "username": "bow",
    "password": "1234",
    "name": "นายนคร             คมขำ",
    "role": "teacher",
    "branchId": "AT",
    "branchName": "ช่างยนต์",
    "position": "ครูผู้สอน",
    "lineId": "U5352fa5b7afe5b8dab92939e56540bb9"
  },
  {
    "id": "usr-import-71243",
    "username": "poomres",
    "password": "2512",
    "name": "นายภูมเรศ        จันทร์แจ่มศรี",
    "role": "teacher",
    "branchId": "AT",
    "branchName": "ช่างยนต์",
    "position": "ครูผู้สอน",
    "lineId": "U600d38ae7a9d217129d1221da32f061d"
  },
  {
    "id": "usr-import-71244",
    "username": "0937803327",
    "password": "0307",
    "name": "นายศักดิ์สิริ         นิลเอก",
    "role": "teacher",
    "branchId": "AT",
    "branchName": "ช่างยนต์",
    "position": "ครูผู้สอน",
    "lineId": "U2529aae8c76082a8840d01549220f589"
  },
  {
    "id": "usr-import-95821",
    "username": "puttachat8184@gmail.com",
    "password": "1234",
    "name": "นางสาวพุทธชาติ   จันทลิลา",
    "role": "teacher",
    "branchId": "AC",
    "branchName": "การบัญชี",
    "position": "ครูผู้สอน",
    "lineId": "Ue74d275282ab6b5d5c5264188503631d"
  },
  {
    "id": "usr-import-95822",
    "username": "17",
    "password": "1111",
    "name": "นางสาวอรอนงค์    ขุนทองแก้ว",
    "role": "approver",
    "branchId": "AC",
    "branchName": "การบัญชี",
    "position": "ครูผู้สอน",
    "lineId": "U84c5267a9feee6f8968d324a3c79c4af"
  },
  {
    "id": "usr-import-95823",
    "username": "Sriprai",
    "password": "1234",
    "name": "นางสาวศรีไพร  ดวงภักดี",
    "role": "teacher",
    "branchId": "AC",
    "branchName": "การบัญชี",
    "position": "ครูผู้สอน",
    "lineId": "U2723eb7c83ee781baf5c3c3e5bac47c1"
  },
  {
    "id": "usr-import-85621",
    "username": "sarunya11ao2011@gmail.com",
    "password": "1234",
    "name": "นางสาวศรัญญา พร้อมประเสริฐ",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U38934e344a242b1a8a7741c7ff043895"
  },
  {
    "id": "usr-import-85622",
    "username": "masterball.dbs@gmail.com",
    "password": "sarayut.2543",
    "name": "นายศรายุทธ       สมสุข",
    "role": "approver",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U81778d734346f14e047e07cb37d1ccd1"
  },
  {
    "id": "usr-import-85623",
    "username": "bee99",
    "password": "1234",
    "name": "นางสาววิลาวัณย์   หนูแก้ว",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U606b5325d901952b8d055d1ce9f9c921"
  },
  {
    "id": "usr-import-85624",
    "username": "walailak.thongsarn@gmail.com",
    "password": "1234",
    "name": "นางสาววลัยลักษณ์  ทองสาร",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U7504116d33dd060660c97ffd0ab614e7"
  },
  {
    "id": "usr-import-85625",
    "username": "7777",
    "password": "7777",
    "name": "นายเอกราช    อาจณรงค์",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U81778d734346f14e047e07cb37d1ccd1"
  },
  {
    "id": "usr-import-85626",
    "username": "duangchanok",
    "password": "080445",
    "name": "นางสาวดวงชนก  สดภิบาล",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U31c5482900420051ca5ef62a94694cc0"
  },
  {
    "id": "usr-import-90111",
    "username": "garfill6@gmail.com",
    "password": "1234",
    "name": "นายวิบูลย์ศักดิ์  วงษ์แหวน",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U1815d934070b4927ddb7088c5e176aff"
  },
  {
    "id": "usr-import-90112",
    "username": "saowanee19781@gmail.com",
    "password": "1234",
    "name": "นางเสาวณี       ชุมศรี",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U35fa00096ca7f74fce5d0ce9feccacb1"
  },
  {
    "id": "usr-import-90113",
    "username": "teacher_90113",
    "password": "password123",
    "name": "นางกนกวรรณ   ธนาพล",
    "role": "admin",
    "branchId": "GEN",
    "branchName": "ครูสามัญ",
    "position": "ครูผู้สอน",
    "lineId": "U_LINE_90113"
  },
  {
    "id": "usr-import-90114",
    "username": "konlakranning@gmail.com",
    "password": "1234",
    "name": "นางศรัญญา      กลการ",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "Ube1f1d0c57321a5d20f5ee53149c9f76"
  },
  {
    "id": "usr-import-90115",
    "username": "Antika",
    "password": "1234",
    "name": "นางอันธิกา       ชายแก้ว",
    "role": "teacher",
    "branchId": "DB",
    "branchName": "ธุรกิจดิจิทัล",
    "position": "ครูผู้สอน",
    "lineId": "U560ee7aecc0b9f8b3a22566956f39eac"
  },
  {
    "id": "usr-958043",
    "username": "earth",
    "password": "4064",
    "name": "นายกนกศักดิ์ บุญไทย",
    "role": "teacher",
    "branchId": "GEN",
    "branchName": "ครูสามัญ",
    "position": "ครู",
    "lineId": "U6ff07b616d038bc78b1a6602cb0a4120"
  }
];

export const INITIAL_BRANCHES: Branch[] = [
  {
    "id": "ME",
    "name": "ช่างกลโรงงาน",
    "approverUserId": "usr-import-64665",
    "approverName": "นายคัมภีร์ ช่วยเพชร หัวหน้าสาขา (หัวหน้าสาขาช่างกลโรงงาน)",
    "color": "#4f46e5"
  },
  {
    "id": "DB",
    "name": "ธุรกิจดิจิทัล",
    "approverUserId": "usr-import-85622",
    "approverName": "นายศรายุทธ       สมสุข (ครูผู้สอน)",
    "color": "#0284c7"
  },
  {
    "id": "AC",
    "name": "การบัญชี",
    "approverUserId": "usr-import-95822",
    "approverName": "นางสาวอรอนงค์    ขุนทองแก้ว (ครูผู้สอน)",
    "color": "#059669"
  },
  {
    "id": "EL",
    "name": "ช่างไฟฟ้า",
    "approverUserId": "usr-import-68034",
    "approverName": "นางนฤมล         เรืองพุฒ (ครูผู้สอน)",
    "color": "#d97706"
  },
  {
    "id": "AT",
    "name": "ช่างยนต์",
    "approverUserId": "usr-import-71241",
    "approverName": "นายฉัตรชัย         ดิษฐาน (ครูผู้สอน)",
    "color": "#ea580c"
  },
  {
    "id": "GEN",
    "name": "ครูสามัญ",
    "approverUserId": "usr-915068",
    "approverName": "นางกนกวรรณ ธนาพล (ครู)",
    "color": "#db2777"
  }
];

export const INITIAL_REQUESTS: ExitRequest[] = [];

export const INITIAL_APPROVAL_LOGS: ApprovalLog[] = [];

export const INITIAL_SETTINGS: SystemSettings = {
  schoolName: "วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์",
  collegeCode: "DONBOSCO-SURAT-2026",
  logoUrl: "/logo.png",
  appUrl: "",
  lineChannelAccessToken: "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=",
  lineChannelSecret: "c827361fae4981bc923a",
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbzxJTWNOzZhMzCmLvDlRzFvFGUv36l9Perv2hfWJ9svhrkuCBJDuwWfiUw7Nn6iroNmUg/exec",
  enableLineNotifications: true,
  autoSyncWithGoogleSheet: true,
  securityContact: "ห้องควบคุมความปลอดภัย ประตู 1 (โทร 02-999-8888 ต่อ 101)"
};
