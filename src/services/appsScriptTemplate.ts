export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * Google Apps Script: ระบบขออนุญาตออกนอกสถานศึกษาสำหรับครู
 * อนุมัติอัตโนมัติตามสาขา + บันทึกลง 5 ชีต + แจ้งเตือน LINE Flex Message
 * =========================================================================
 * 
 * ชีตทั้ง 5 ประกอบด้วย:
 * 1. Users       : UserID | Username | Password | ชื่อ | สาขา | Role | LINE_ID
 * 2. Branches    : BranchID | สาขา | ApproverUserID
 * 3. Requests    : RequestID | วันที่ส่ง | ผู้ขอ | สาขา | วันที่ออก | เวลาออก | เวลากลับ | สถานที่ | เหตุผล | ผู้อนุมัติ | สถานะ | วันที่อนุมัติ | หมายเหตุ | วิธีเดินทาง | QR_Token
 * 4. ApprovalLog : LogID | RequestID | ApproverName | Action | Timestamp | Note
 * 5. Settings    : ConfigKey | ConfigValue | Description
 */

// ฟังก์ชันเริ่มต้นสร้างชีตและหัวตารางอัตโนมัติ (กดรันฟังก์ชันนี้ครั้งเดียวเพื่อตั้งค่า)
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetConfigs = [
    {
      name: "Users",
      headers: ["UserID", "Username", "Password", "ชื่อ", "สาขา", "Role", "LINE_ID"]
    },
    {
      name: "Branches",
      headers: ["BranchID", "สาขา", "ApproverUserID"]
    },
    {
      name: "Requests",
      headers: ["RequestID", "วันที่ส่ง", "ผู้ขอ", "สาขา", "วันที่ออก", "เวลาออก", "เวลากลับ", "สถานที่", "เหตุผล", "ผู้อนุมัติ", "สถานะ", "วันที่อนุมัติ", "หมายเหตุ", "วิธีเดินทาง", "QR_Token", "มีคาบสอน", "ครูผู้สอนแทน", "วิชาที่สอนแทน", "สถานะสอนแทน"]
    },
    {
      name: "ApprovalLog",
      headers: ["LogID", "RequestID", "ApproverName", "Action", "Timestamp", "Note"]
    },
    {
      name: "Settings",
      headers: ["ConfigKey", "ConfigValue", "Description"]
    }
  ];

  sheetConfigs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      sheet.appendRow(cfg.headers);
      sheet.getRange(1, 1, 1, cfg.headers.length)
        .setFontWeight("bold")
        .setBackground("#e2e8f0");
    }
  });

  // ใส่ค่าเริ่มต้นใน Branches
  const branchSheet = ss.getSheetByName("Branches");
  if (branchSheet.getLastRow() === 1) {
    branchSheet.appendRow(["DB", "ธุรกิจดิจิทัล", "usr-head-db"]);
    branchSheet.appendRow(["AC", "การบัญชี", "usr-head-ac"]);
    branchSheet.appendRow(["EL", "ช่างไฟฟ้า", "usr-head-el"]);
    branchSheet.appendRow(["AT", "ช่างยนต์", "usr-head-at"]);
    branchSheet.appendRow(["ME", "ช่างกลโรงงาน", "usr-head-me"]);
    branchSheet.appendRow(["GEN", "ครูสามัญ", "usr-head-gen"]);
  }

  // ใส่ค่าเริ่มต้น Settings
  const settingsSheet = ss.getSheetByName("Settings");
  if (settingsSheet.getLastRow() === 1) {
    settingsSheet.appendRow(["LINE_CHANNEL_ACCESS_TOKEN", "ใส่_TOKEN_ของท่านที่นี่", "Channel Access Token จาก LINE Developers"]);
    settingsSheet.appendRow(["SCHOOL_NAME", "วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์", "ชื่อสถานศึกษา"]);
    settingsSheet.appendRow(["WEB_APP_URL", "", "URL ของ Web App นี้หลัง Deploy"]);
  }

  SpreadsheetApp.flush();
  Logger.log("ตั้งค่า 5 ชีตสำเร็จเรียบร้อยแล้ว");
}

// รับ Webhook เมื่อมีคำขอใหม่ หรือส่งการอนุมัติมาจาก Web App หรือ LINE Bot
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);

    // กรณีที่ 1: มาจาก LINE Webhook (กดปุ่มอนุมัติ/ไม่อนุมัติใน LINE Flex Message)
    if (postData.events && postData.events.length > 0) {
      return handleLineEvents(postData.events);
    }

    // กรณีที่ 2: มาจาก Web App (สร้างคำขอ หรืออัปเดตสถานะ)
    const action = postData.action;
    const payload = postData.payload;

    if (action === "create_request") {
      return handleCreateRequest(payload);
    } else if (action === "update_status") {
      return handleUpdateStatus(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Processed" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ตรวจสอบข้อมูลคำขอ หรือตรวจสอบ QR ผ่าน GET request
function doGet(e) {
  const reqId = e.parameter.reqId;
  const qrToken = e.parameter.qrToken;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const data = reqSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if ((reqId && row[0] === reqId) || (qrToken && row[14] === qrToken)) {
      const result = {
        id: row[0],
        submittedAt: row[1],
        userName: row[2],
        branchName: row[3],
        exitDate: row[4],
        exitTime: row[5],
        returnTime: row[6],
        destination: row[7],
        reason: row[8],
        approver: row[9],
        status: row[10],
        approvedAt: row[11],
        notes: row[12],
        travelMethod: row[13]
      };
      return ContentService.createTextOutput(JSON.stringify({ found: true, data: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ found: false, message: "Request not found" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 1. จัดการสร้างคำขอใหม่
function handleCreateRequest(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const logSheet = ss.getSheetByName("ApprovalLog");

  // บันทึกลง Requests Sheet
  reqSheet.appendRow([
    req.id,
    req.submittedAt,
    req.userName,
    req.branchName,
    req.exitDate,
    req.exitTime,
    req.returnTime,
    req.destination,
    req.reason,
    req.assignedApproverName,
    req.status || "pending",
    req.approvedAt || "",
    req.notes || "",
    req.travelMethod || "",
    req.qrToken || ""
  ]);

  // บันทึก Log
  logSheet.appendRow([
    "LOG-" + new Date().getTime(),
    req.id,
    req.userName,
    "submit",
    new Date(),
    "ยื่นคำขอใหม่ ระบบส่งต่อไปยัง " + req.assignedApproverName
  ]);

  // ส่งแจ้งเตือน LINE ไปยังหัวหน้าสาขา
  sendLineFlexMessageToApprover(req);

  return ContentService.createTextOutput(JSON.stringify({ status: "success", requestId: req.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. จัดการอัปเดตสถานะ (อนุมัติ/ไม่อนุมัติ)
function handleUpdateStatus(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const logSheet = ss.getSheetByName("ApprovalLog");
  const data = reqSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === req.id) {
      reqSheet.getRange(i + 1, 11).setValue(req.status);
      reqSheet.getRange(i + 1, 12).setValue(req.approvedAt || new Date());
      break;
    }
  }

  logSheet.appendRow([
    "LOG-" + new Date().getTime(),
    req.id,
    req.approvedBy || "ผู้อนุมัติ",
    req.status === "approved" ? "approve" : "reject",
    new Date(),
    req.status === "approved" ? "อนุมัติคำขอแล้ว" : ("ไม่อนุมัติ: " + (req.rejectionReason || ""))
  ]);

  // แจ้งเตือนกลับไปยังครูผู้ขอใน LINE
  sendLineNotificationToTeacher(req);

  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 3. ส่ง LINE Flex Message ข้อความที่ 1/2 ให้หัวหน้าสาขา
// (นโยบายประหยัดโควต้า 300 ข้อความ/เดือน: ครูสอนแทนกดรับทราบในเว็บ 100% ไม่ส่ง LINE หาครูสอนแทน)
function sendLineFlexMessageToApprover(req) {
  const token = getSettingValue("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token || token.includes("ใส่_TOKEN")) return;

  const approverLineId = getApproverLineId(req.branchId);
  if (!approverLineId) return;

  const flexPayload = {
    to: approverLineId,
    messages: [{
      type: "flex",
      altText: "🔔 [ข้อความ 1/2] มีคำขออนุญาตออกนอกสถานศึกษาจาก " + req.userName,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#059669",
          contents: [
            { type: "text", text: "🔔 มีคำขออนุญาตออกนอกสถานศึกษา", weight: "bold", color: "#ffffff", size: "md" },
            { type: "text", text: "ข้อความที่ 1/2 (ส่งพิจารณา)", size: "xxs", color: "#d1fae5" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "👨‍🏫 ผู้ขอ: " + req.userName, size: "sm", weight: "bold" },
            { type: "text", text: "🏫 สาขา: " + req.branchName, size: "sm" },
            { type: "text", text: "📅 วันที่: " + req.exitDate, size: "sm" },
            { type: "text", text: "🕐 เวลา: " + req.exitTime + "–" + req.returnTime + " น.", size: "sm" },
            { type: "text", text: "📍 สถานที่: " + req.destination, size: "sm", wrap: true },
            { type: "text", text: "📝 เหตุผล: " + req.reason, size: "sm", wrap: true },
            req.hasClasses ? { type: "text", text: "📚 คาบสอน: " + (req.substituteSubject || "") + " (ครูสอนแทน " + (req.substituteTeacherName || "") + " รับทราบในระบบเว็บแล้ว)", size: "xs", color: "#b45309", wrap: true } : { type: "text", text: "✓ ไม่มีคาบสอนในช่วงเวลาดังกล่าว", size: "xs", color: "#059669" }
          ]
        },
        footer: {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#16a34a",
              action: {
                type: "postback",
                label: "✅ อนุมัติ",
                data: "action=approve&reqId=" + req.id
              }
            },
            {
              type: "button",
              style: "secondary",
              color: "#ef4444",
              action: {
                type: "postback",
                label: "❌ ไม่อนุมัติ",
                data: "action=reject&reqId=" + req.id
              }
            }
          ]
        }
      }
    }]
  };

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    payload: JSON.stringify(flexPayload),
    muteHttpExceptions: true
  });
}

// 4. ส่งข้อความแจ้งเตือนผลกลับไปยังครูผู้ขอ
function sendLineNotificationToTeacher(req) {
  const token = getSettingValue("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token || token.includes("ใส่_TOKEN")) return;

  const teacherLineId = getUserLineId(req.userId);
  if (!teacherLineId) return;

  const isApproved = req.status === "approved";
  const msgText = isApproved 
    ? "✅ คำขอออกนอกสถานศึกษาได้รับการอนุมัติแล้ว\\nโดย " + (req.approvedBy || req.assignedApproverName) + "\\n📅 วันที่: " + req.exitDate + " (" + req.exitTime + "-" + req.returnTime + " น.)\\nท่านสามารถเปิดบัตรผ่าน QR Code แสดงที่ป้อมยามได้ทันที"
    : "❌ คำขอออกนอกสถานศึกษาไม่ได้รับการอนุมัติ\\nโดย " + (req.approvedBy || req.assignedApproverName) + "\\nเหตุผล: " + (req.rejectionReason || "ไม่ระบุ");

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    payload: JSON.stringify({
      to: teacherLineId,
      messages: [{ type: "text", text: msgText }]
    }),
    muteHttpExceptions: true
  });
}

// Helper: ดึงค่า Settings
function getSettingValue(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sSheet = ss.getSheetByName("Settings");
  if (!sSheet) return "";
  const data = sSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return "";
}

// Helper: ดึง LINE ID ของหัวหน้าสาขา
function getApproverLineId(branchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bSheet = ss.getSheetByName("Branches");
  const uSheet = ss.getSheetByName("Users");
  if (!bSheet || !uSheet) return "";

  const bData = bSheet.getDataRange().getValues();
  let approverUserId = "";
  for (let i = 1; i < bData.length; i++) {
    if (bData[i][0] === branchId || bData[i][1] === branchId) {
      approverUserId = bData[i][2];
      break;
    }
  }

  if (!approverUserId) return "";

  const uData = uSheet.getDataRange().getValues();
  for (let j = 1; j < uData.length; j++) {
    if (uData[j][0] === approverUserId) {
      return uData[j][6]; // LINE_ID
    }
  }
  return "";
}

// Helper: ดึง LINE ID ของผู้ใช้
function getUserLineId(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName("Users");
  if (!uSheet) return "";
  const uData = uSheet.getDataRange().getValues();
  for (let i = 1; i < uData.length; i++) {
    if (uData[i][0] === userId) return uData[i][6];
  }
  return "";
}
`;

export const CSV_TEMPLATES = {
  Users: `UserID,Username,Password,ชื่อ,สาขา,Role,LINE_ID
usr-teacher-somchai,somchai,password123,นายสมชาย รักเรียน,ช่างยนต์,teacher,U_SOMCHAI_AT
usr-teacher-suda,suda,password123,นางสาวสุดา เทคโนสารสนเทศ,ธุรกิจดิจิทัล,teacher,U_SUDA_DB
usr-teacher-prasert,prasert,password123,นายประเสริฐ สายวงจร,ช่างไฟฟ้า,teacher,U_PRASERT_EL
usr-head-at,head_at,password123,อ.วิชัย ช่างทอง,ช่างยนต์,approver,U_VICHAI_HEAD_AT
usr-head-db,head_db,password123,อ.วราภรณ์ ดิจิทัลวิศิษฏ์,ธุรกิจดิจิทัล,approver,U_WARAPORN_HEAD_DB
usr-head-ac,head_ac,password123,อ.พิมพา ยอดบัญชี,การบัญชี,approver,U_PIMPA_HEAD_AC
usr-head-el,head_el,password123,อ.เกรียงไกร สายฟ้า,ช่างไฟฟ้า,approver,U_KRIANGKRAI_HEAD_EL
usr-head-me,head_me,password123,อ.สุรศักดิ์ โลหะกิจ,ช่างกลโรงงาน,approver,U_SURASAK_HEAD_ME
usr-head-gen,head_gen,password123,อ.กัญญารัตน์ อักษรศิลป์,ครูสามัญ,approver,U_KANYARAT_HEAD_GEN
usr-admin,admin,adminpassword,ดร.สมเกียรติ บริหารการศึกษา,ฝ่ายบริหาร,admin,U_ADMIN_CENTRAL`,

  Branches: `BranchID,สาขา,ApproverUserID
DB,ธุรกิจดิจิทัล,usr-head-db
AC,การบัญชี,usr-head-ac
EL,ช่างไฟฟ้า,usr-head-el
AT,ช่างยนต์,usr-head-at
ME,ช่างกลโรงงาน,usr-head-me
GEN,ครูสามัญ,usr-head-gen`,

  Requests: `RequestID,วันที่ส่ง,ผู้ขอ,สาขา,วันที่ออก,เวลาออก,เวลากลับ,สถานที่,เหตุผล,ผู้อนุมัติ,สถานะ,วันที่อนุมัติ,หมายเหตุ,วิธีเดินทาง,QR_Token
REQ-20261005-001,2569-10-05 08:15,นายสมชาย รักเรียน,ช่างยนต์,2026-10-05,10:30,12:00,ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน,นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20000 กม.,อ.วิชัย ช่างทอง (หัวหน้าสาขาช่างยนต์),pending,,ติดต่อช่างไว้แล้ว,รถราชการ,TOKEN-REQ-20261005-001-AT-VALID
REQ-20261004-002,2569-10-04 09:00,นางสาวสุดา เทคโนสารสนเทศ,ธุรกิจดิจิทัล,2026-10-04,13:00,16:30,ธนาคารกรุงไทย สาขาศาลายา,นำส่งเอกสารบัญชีเบิกจ่ายทุนการศึกษานักศึกษา,อ.วราภรณ์ ดิจิทัลวิศิษฏ์ (หัวหน้าสาขาธุรกิจดิจิทัล),approved,2569-10-04 09:30,ช่วงไม่มีคาบสอน,ยานพาหนะส่วนตัว,TOKEN-REQ-20261004-002-DB-APPROVED`,

  ApprovalLog: `LogID,RequestID,ApproverName,Action,Timestamp,Note
LOG-001,REQ-20261005-001,นายสมชาย รักเรียน,submit,2569-10-05 08:15,ยื่นคำขอใหม่ ระบบส่งแจ้งเตือน LINE ไปยังหัวหน้าสาขาช่างยนต์ (อ.วิชัย ช่างทอง)
LOG-002,REQ-20261004-002,อ.วราภรณ์ ดิจิทัลวิศิษฏ์,approve,2569-10-04 09:30,อนุมัติผ่านระบบ LINE Flex Message แจ้งกลับครูผู้ขอเรียบร้อย`,

  Settings: `ConfigKey,ConfigValue,Description
LINE_CHANNEL_ACCESS_TOKEN,YOUR_LINE_CHANNEL_ACCESS_TOKEN,Channel Access Token จาก LINE Developers Messaging API
SCHOOL_NAME,วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์,ชื่อสถานศึกษา
WEB_APP_URL,,URL ของ Apps Script Web App หลังกด Deploy`
};
