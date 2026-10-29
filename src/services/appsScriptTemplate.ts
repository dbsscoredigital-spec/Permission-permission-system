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
    settingsSheet.appendRow(["LINE_CHANNEL_ACCESS_TOKEN", "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=", "Channel Access Token จาก LINE Developers"]);
    settingsSheet.appendRow(["SCHOOL_NAME", "วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์", "ชื่อสถานศึกษา"]);
    settingsSheet.appendRow(["WEB_APP_URL", "", "URL ของ Web App นี้หลัง Deploy"]);
  }

  SpreadsheetApp.flush();
  Logger.log("ตั้งค่า 5 ชีตสำเร็จเรียบร้อยแล้ว");
}

// รับ Webhook เมื่อมีคำขอใหม่ หรือส่งการอนุมัติมาจาก Web App หรือ LINE Bot
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const postData = JSON.parse(e.postData.contents);

    // กรณีที่ 1: มาจาก LINE Webhook (กดปุ่มอนุมัติ/ไม่อนุมัติใน LINE Flex Message)
    if (postData.events && postData.events.length > 0) {
      return handleLineEvents(postData.events);
    }

    // กรณีที่ 2: มาจาก Web App (สร้างคำขอ หรืออัปเดตสถานะ หรือส่ง LINE)
    const action = postData.action;
    const payload = postData.payload;

    if (action === "create_request") {
      return handleCreateRequest(payload);
    } else if (action === "update_status") {
      return handleUpdateStatus(payload);
    } else if (action === "substitute_ack") {
      return handleSubstituteAck(payload);
    } else if (action === "delete_request") {
      return handleDeleteRequest(payload);
    } else if (action === "push_line") {
      var pushPayload = payload || {};
      var pushToken = String(pushPayload.token || "").trim() || getSettingValue("LINE_CHANNEL_ACCESS_TOKEN") || "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=";
      var pushTo = String(pushPayload.to || "").trim();
      var pushMsgs = pushPayload.messages || [];

      // ป้องกันการส่ง Flex ซ้ำซ้อน (ตรวจจับจาก reqId หรือ altText)
      var pReqId = String(pushPayload.reqId || "").trim();
      if (!pReqId && pushMsgs.length > 0) {
        var mMatch = String(pushMsgs[0].altText || "").match(/REQ-\d+-\d+/i);
        if (mMatch) pReqId = mMatch[0];
      }
      if (pReqId) {
        var scriptCache = CacheService.getScriptCache();
        var cachePushKey = "lock_push_post_" + pReqId + "_" + pushTo;
        if (scriptCache && scriptCache.get(cachePushKey)) {
          return ContentService.createTextOutput(JSON.stringify({ status: "success", skippedDuplicate: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
        if (scriptCache) scriptCache.put(cachePushKey, "sent", 900);
      }

      if (pushTo && pushMsgs.length > 0) {
        var resp = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + pushToken
          },
          payload: JSON.stringify({ to: pushTo, messages: pushMsgs }),
          muteHttpExceptions: true
        });
        return ContentService.createTextOutput(resp.getContentText())
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Missing to or messages" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "save_settings") {
      let setSheet = ss.getSheetByName("Settings");
      if (!setSheet) {
        setSheet = ss.insertSheet("Settings");
        setSheet.appendRow(["ConfigKey", "ConfigValue", "Description"]);
      }
      const sData = setSheet.getDataRange().getValues();
      const payloadObj = payload || {};
      for (const key of Object.keys(payloadObj)) {
        let foundRow = -1;
        for (let s = 1; s < sData.length; s++) {
          if (String(sData[s][0] || "").trim() === key) {
            foundRow = s + 1;
            break;
          }
        }
        if (foundRow > 0) {
          setSheet.getRange(foundRow, 2).setValue(String(payloadObj[key] || ""));
        } else {
          setSheet.appendRow([key, String(payloadObj[key] || ""), "Auto-saved from Web App"]);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Settings saved" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "save_users") {
      let uSheet = ss.getSheetByName("Users");
      if (!uSheet) {
        uSheet = ss.insertSheet("Users");
        uSheet.appendRow(["UserID", "Username", "Password", "ชื่อ", "สาขา", "Role", "LINE_ID", "Position"]);
      }
      const userList = (payload && payload.users) || [];
      if (Array.isArray(userList) && userList.length > 0) {
        uSheet.clearContents();
        uSheet.appendRow(["UserID", "Username", "Password", "ชื่อ", "สาขา", "Role", "LINE_ID", "Position"]);
        const rows = userList.map(function(u) {
          return [
            String(u.id || "").trim(),
            String(u.username || "").trim(),
            String(u.password || "").trim(),
            String(u.name || "").trim(),
            String(u.branchName || u.branchId || "").trim(),
            String(u.role || "teacher").trim(),
            String(u.lineId || "").trim(),
            String(u.position || "ครูผู้สอน").trim()
          ];
        });
        uSheet.getRange(2, 1, rows.length, 8).setValues(rows);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Users saved" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Processed" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ตรวจสอบข้อมูลคำขอ ตรวจสอบ QR หรืออนุมัติผ่านลิงก์ 1-Click
function doGet(e) {
  const p = (e && e.parameter) || {};
  const reqId = String(p.reqId || p.id || p.requestId || "").trim();
  const qrToken = String(p.qrToken || p.token || "").trim();
  const action = String(p.action || "").toLowerCase().trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const data = reqSheet.getDataRange().getValues();

  // Push LINE via GET (Works 100% from GitHub Pages static sites)
  if (action === "push_line") {
    var pushTo = String(p.to || "").trim();
    var pushToken = String(p.token || "").trim() || getSettingValue("LINE_CHANNEL_ACCESS_TOKEN") || "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=";
    var msgs = [];
    try {
      msgs = JSON.parse(p.messages || p.payload || "[]");
    } catch(err) {}

    // ป้องกันการส่ง Flex ซ้ำซ้อน
    var pReqId = String(p.reqId || p.requestId || "").trim();
    if (!pReqId && msgs.length > 0) {
      var mMatch = String(msgs[0].altText || "").match(/REQ-\d+-\d+/i);
      if (mMatch) pReqId = mMatch[0];
    }
    if (pReqId) {
      var scriptCache = CacheService.getScriptCache();
      var cachePushKey = "lock_push_get_" + pReqId + "_" + pushTo;
      if (scriptCache && scriptCache.get(cachePushKey)) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", skippedDuplicate: true })).setMimeType(ContentService.MimeType.JSON);
      }
      if (scriptCache) scriptCache.put(cachePushKey, "sent", 900);
    }

    if (pushTo && msgs.length > 0) {
      var resp = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + pushToken
        },
        payload: JSON.stringify({ to: pushTo, messages: msgs }),
        muteHttpExceptions: true
      });
      return ContentService.createTextOutput(resp.getContentText()).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Missing to or messages" })).setMimeType(ContentService.MimeType.JSON);
  }

  // 0.1 จัดการสร้างคำขอผ่าน GET (สำหรับ Static Client / GitHub Pages)
  if (action === "create_request") {
    var rawPayload = e.parameter.payload;
    var reqObj = {};
    try {
      reqObj = typeof rawPayload === "string" ? JSON.parse(rawPayload) : (rawPayload || {});
    } catch(err) {
      reqObj = e.parameter;
    }
    return handleCreateRequest(reqObj);
  }

  // 0.2 จัดการอัปเดตสถานะผ่าน GET
  if (action === "update_status") {
    var rawPayload = e.parameter.payload;
    var reqObj = {};
    try {
      reqObj = typeof rawPayload === "string" ? JSON.parse(rawPayload) : (rawPayload || {});
    } catch(err) {
      reqObj = e.parameter;
    }
    return handleUpdateStatus(reqObj);
  }

  // 0. ดึงรายชื่อผู้ใช้เดี่ยวๆ
  if (action === "get_users") {
    var userList = [];
    var uSheet = ss.getSheetByName("Users");
    if (uSheet && uSheet.getLastRow() > 1) {
      var uData = uSheet.getDataRange().getValues();
      for (var u = 1; u < uData.length; u++) {
        var uRow = uData[u];
        if (!uRow[0] && !uRow[1]) continue;
        userList.push({
          id: String(uRow[0] || "").trim(),
          username: String(uRow[1] || "").trim(),
          password: String(uRow[2] || "").trim(),
          name: String(uRow[3] || "").trim(),
          branchName: String(uRow[4] || "").trim(),
          branchId: String(uRow[4] || "").trim(),
          role: String(uRow[5] || "teacher").trim(),
          lineId: String(uRow[6] || "").trim(),
          position: String(uRow[7] || "ครูผู้สอน").trim()
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ found: true, users: userList }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 1. ดึงรายการคำขอทั้งหมด (สำหรับ Sync กับ Web App)
  if (action === "get_all" || action === "sync") {
    const list = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      list.push({
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
        status: row[10] || "pending",
        approvedAt: row[11],
        notes: row[12],
        travelMethod: row[13],
        qrToken: row[14]
      });
    }

    // Also read settings from Settings sheet if exists
    var settingsObj = {};
    var setSheet = ss.getSheetByName("Settings");
    if (setSheet) {
      var sData = setSheet.getDataRange().getValues();
      for (var s = 1; s < sData.length; s++) {
        var k = String(sData[s][0] || "").trim();
        var v = String(sData[s][1] || "").trim();
        if (k) settingsObj[k] = v;
      }
    }

    // Also read users from Users sheet if exists
    var userList = [];
    var uSheet = ss.getSheetByName("Users");
    if (uSheet && uSheet.getLastRow() > 1) {
      var uData = uSheet.getDataRange().getValues();
      for (var u = 1; u < uData.length; u++) {
        var uRow = uData[u];
        if (!uRow[0] && !uRow[1]) continue;
        userList.push({
          id: String(uRow[0] || "").trim(),
          username: String(uRow[1] || "").trim(),
          password: String(uRow[2] || "").trim(),
          name: String(uRow[3] || "").trim(),
          branchName: String(uRow[4] || "").trim(),
          branchId: String(uRow[4] || "").trim(),
          role: String(uRow[5] || "teacher").trim(),
          lineId: String(uRow[6] || "").trim(),
          position: String(uRow[7] || "ครูผู้สอน").trim()
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ found: true, requests: list, settings: settingsObj, users: userList }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 2. กดอนุมัติ/ไม่อนุมัติผ่านลิงก์ 1-Click ใน LINE (เปิดในมือถือหรือ LINE In-App Browser ได้ทันที)
  if (reqId && (action === "approve" || action === "reject" || action === "direct_approve" || action === "direct_reject")) {
    const isApprove = action.indexOf("approve") !== -1;
    let logSheet = ss.getSheetByName("ApprovalLog");
    if (!logSheet) {
      logSheet = ss.insertSheet("ApprovalLog");
      logSheet.appendRow(["LogID", "RequestID", "ApproverName", "Action", "Timestamp", "Notes"]);
    }

    let matchedRow = -1;
    let matchedReq = null;

    for (let i = 1; i < data.length; i++) {
      const cellId = String(data[i][0] || "").trim().toUpperCase();
      if (cellId === reqId.toUpperCase()) {
        matchedRow = i + 1;
        matchedReq = {
          id: data[i][0],
          submittedAt: data[i][1],
          userName: data[i][2],
          branchName: data[i][3],
          exitDate: data[i][4],
          exitTime: data[i][5],
          returnTime: data[i][6],
          destination: data[i][7],
          reason: data[i][8],
          assignedApproverName: data[i][9],
          status: isApprove ? "approved" : "rejected",
          userId: data[i][2]
        };
        break;
      }
    }

    const now = new Date();
    if (matchedRow > 0) {
      reqSheet.getRange(matchedRow, 11).setValue(isApprove ? "approved" : "rejected");
      reqSheet.getRange(matchedRow, 12).setValue(now);

      logSheet.appendRow([
        "LOG-" + now.getTime(),
        reqId,
        "หัวหน้าสาขา (อนุมัติผ่าน LINE)",
        isApprove ? "approve" : "reject",
        now,
        isApprove ? "หัวหน้าสาขากดอนุมัติคำขอผ่านลิงก์ LINE สำเร็จ" : "หัวหน้าสาขากดไม่อนุมัติคำขอผ่านลิงก์ LINE"
      ]);

      if (matchedReq) {
        sendLineNotificationToTeacher(matchedReq);
      }
    }

    const statusTitle = isApprove ? 'อนุมัติเรียบร้อยแล้ว' : 'ไม่อนุมัติคำขอ';
    const teacherName = matchedReq ? matchedReq.userName : '-';
    const branchName = matchedReq ? matchedReq.branchName : '-';
    const dest = matchedReq ? matchedReq.destination : '-';
    const timeRange = matchedReq ? (matchedReq.exitTime + ' – ' + matchedReq.returnTime + ' น.') : '-';

    const htmlContent = '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + statusTitle + '</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Prompt",sans-serif;background:#f0fdf4;padding:24px 16px;text-align:center;color:#0f172a}.card{max-width:420px;margin:16px auto;background:#ffffff;border-radius:28px;padding:32px 22px;box-shadow:0 12px 36px -8px rgba(0,0,0,0.08);border:2px solid ' + (isApprove ? '#86efac' : '#fca5a5') + '}.icon-box{width:76px;height:76px;border-radius:24px;background:' + (isApprove ? '#dcfce7' : '#ffe4e6') + ';color:' + (isApprove ? '#16a34a' : '#e11d48') + ';font-size:38px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-weight:900}.title{font-size:21px;font-weight:800;color:' + (isApprove ? '#14532d' : '#881337') + ';margin-bottom:6px}.req-badge{display:inline-block;padding:5px 16px;background:#f1f5f9;border-radius:999px;font-size:12px;font-weight:700;color:#334155;margin-bottom:18px}.detail-box{background:#f8fafc;border-radius:20px;padding:16px;font-size:13px;text-align:left;line-height:1.8;border:1px solid #e2e8f0;margin-bottom:20px}.row{display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding:4px 0}.row:last-child{border-bottom:none}.lbl{color:#64748b}.val{font-weight:700;color:#0f172a;text-align:right}.success-desc{font-size:12px;color:#15803d;background:#dcfce7;border:1px solid #86efac;border-radius:14px;padding:10px 12px;margin-bottom:20px;line-height:1.6;text-align:left}.close-btn{display:block;width:100%;padding:14px;background:' + (isApprove ? '#16a34a' : '#475569') + ';color:#ffffff;border-radius:18px;font-weight:700;border:none;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(22,163,74,0.25)}</style></head><body><div class="card"><div class="icon-box">' + (isApprove ? '✓' : '✕') + '</div><div class="title">' + (isApprove ? 'บันทึกการอนุมัติสำเร็จแล้ว' : 'บันทึกไม่อนุมัติคำขอ') + '</div><div class="req-badge">รหัสคำขอ: ' + reqId + '</div><div class="detail-box"><div class="row"><span class="lbl">ครูผู้ขอ:</span><span class="val">' + teacherName + '</span></div><div class="row"><span class="lbl">สาขาวิชา:</span><span class="val">' + branchName + '</span></div><div class="row"><span class="lbl">สถานที่:</span><span class="val">' + dest + '</span></div><div class="row"><span class="lbl">เวลา:</span><span class="val">' + timeRange + '</span></div><div class="row"><span class="lbl">สถานะ:</span><span class="val" style="color:' + (isApprove ? '#16a34a' : '#e11d48') + ';font-weight:800">' + (isApprove ? 'อนุมัติแล้ว (Approved)' : 'ไม่อนุมัติ (Rejected)') + '</span></div></div><div class="success-desc">✓ ระบบได้ปรับปรุงสถานะในระบบเว็บ ทั้งของผู้ขอและของหัวหน้าสาขาเรียบร้อยแล้ว<br>✓ ส่งแจ้งเตือนออกบัตรผ่าน QR Code ไปยัง LINE ของครูเรียบร้อยแล้ว</div><button type="button" class="close-btn" onclick="window.close();">✓ ปิดหน้านี้และกลับสู่ LINE</button></div></body></html>';
    const out = HtmlService.createHtmlOutput(htmlContent);
    try {
      if (HtmlService && HtmlService.XFrameOptionsMode && HtmlService.XFrameOptionsMode.ALLOWALL) {
        out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    } catch (e) {}
    return out;
  }

  // 2.2 กดรับทราบภาระงานสอนแทนผ่านลิงก์ 1-Click (substitute_ack)
  if (reqId && (action === "substitute_ack" || action === "sub_ack" || action === "substitute")) {
    let logSheet = ss.getSheetByName("ApprovalLog");
    if (!logSheet) {
      logSheet = ss.insertSheet("ApprovalLog");
      logSheet.appendRow(["LogID", "RequestID", "ApproverName", "Action", "Timestamp", "Notes"]);
    }

    let matchedRow = -1;
    let matchedReq = null;

    for (let i = 1; i < data.length; i++) {
      const cellId = String(data[i][0] || "").trim().toUpperCase();
      if (cellId === reqId.toUpperCase()) {
        matchedRow = i + 1;
        matchedReq = {
          id: data[i][0],
          submittedAt: data[i][1],
          userName: data[i][2],
          branchName: data[i][3],
          exitDate: data[i][4],
          exitTime: data[i][5],
          returnTime: data[i][6],
          destination: data[i][7],
          reason: data[i][8],
          assignedApproverName: data[i][9],
          status: data[i][10],
          hasClasses: true,
          substituteTeacherName: data[i][16] || "ครูผู้สอนแทน",
          substituteSubject: data[i][17] || "",
          substituteStatus: "acknowledged"
        };
        break;
      }
    }

    const now = new Date();
    if (matchedRow > 0) {
      // คอลัมน์ 19: สถานะสอนแทน
      reqSheet.getRange(matchedRow, 19).setValue("acknowledged");

      logSheet.appendRow([
        "LOG-" + now.getTime(),
        reqId,
        matchedReq ? matchedReq.substituteTeacherName : "ครูผู้สอนแทน",
        "substitute_ack",
        now,
        "ครูผู้สอนแทนกดรับทราบภาระงานสอนแทนผ่านลิงก์ 1-Click สำเร็จ ส่งต่อให้หัวหน้าสาขา"
      ]);

      // ส่ง LINE Flex Message ข้อความที่ 1 ให้หัวหน้าสาขาทันที!
      if (matchedReq) {
        sendLineFlexMessageToApprover(matchedReq);
      }
    }

    const teacherName = matchedReq ? matchedReq.userName : "-";
    const subTeacherName = matchedReq ? matchedReq.substituteTeacherName : "ครูผู้สอนแทน";
    const subSubject = matchedReq ? (matchedReq.substituteSubject || "ภาระงานสอนประจำวัน") : "-";
    const branchName = matchedReq ? matchedReq.branchName : "-";
    const timeRange = matchedReq ? (matchedReq.exitTime + " – " + matchedReq.returnTime + " น.") : "-";
    const dateStr = matchedReq ? matchedReq.exitDate : "-";

    const subHtmlContent = '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>รับทราบภาระงานสอนแทนเรียบร้อยแล้ว</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Prompt",sans-serif;background:#fffbeb;padding:24px 16px;text-align:center;color:#0f172a}.card{max-width:440px;margin:16px auto;background:#ffffff;border-radius:28px;padding:32px 22px;box-shadow:0 12px 36px -8px rgba(0,0,0,0.08);border:2px solid #fde68a}.icon-box{width:76px;height:76px;border-radius:24px;background:#fef3c7;color:#d97706;font-size:38px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-weight:900}.title{font-size:21px;font-weight:800;color:#92400e;margin-bottom:6px}.req-badge{display:inline-block;padding:5px 16px;background:#f1f5f9;border-radius:999px;font-size:12px;font-weight:700;color:#334155;margin-bottom:18px}.detail-box{background:#f8fafc;border-radius:20px;padding:16px;font-size:13px;text-align:left;line-height:1.8;border:1px solid #e2e8f0;margin-bottom:20px}.row{display:flex;justify-content:space-between;border-bottom:1px dashed #e2e8f0;padding:4px 0}.row:last-child{border-bottom:none}.lbl{color:#64748b}.val{font-weight:700;color:#0f172a;text-align:right}.success-desc{font-size:12px;color:#15803d;background:#dcfce7;border:1px solid #86efac;border-radius:14px;padding:12px 14px;margin-bottom:20px;line-height:1.6;text-align:left}.btn-group{display:flex;flex-direction:column;gap:10px}.close-btn{display:block;width:100%;padding:14px;background:#16a34a;color:#ffffff;border-radius:18px;font-weight:700;border:none;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(22,163,74,0.25)}.web-btn{display:block;width:100%;padding:13px;background:#ffffff;color:#0f172a;border-radius:18px;font-weight:700;border:1.5px solid #cbd5e1;font-size:13px;text-decoration:none;box-sizing:border-box}</style></head><body><div class="card"><div class="icon-box">✓</div><div class="title">บันทึกรับทราบสอนแทนสำเร็จ</div><div class="req-badge">รหัสคำขอ: ' + reqId + '</div><div class="detail-box"><div class="row"><span class="lbl">ครูผู้ขอออก:</span><span class="val">' + teacherName + ' (' + branchName + ')</span></div><div class="row"><span class="lbl">ครูผู้สอนแทน:</span><span class="val">' + subTeacherName + '</span></div><div class="row"><span class="lbl">วิชาสอนแทน:</span><span class="val" style="color:#d97706">' + subSubject + '</span></div><div class="row"><span class="lbl">วัน-เวลา:</span><span class="val">' + dateStr + ' (' + timeRange + ')</span></div><div class="row"><span class="lbl">สถานะสอนแทน:</span><span class="val" style="color:#16a34a;font-weight:800">รับทราบแล้ว (Acknowledged)</span></div></div><div class="success-desc">✓ ระบบได้บันทึกการรับทราบภาระงานสอนแทนของท่านเรียบร้อยแล้ว<br>✓ ส่ง LINE Flex Message ข้อความที่ 1 แจ้งเตือนไปยังหัวหน้าสาขาเพื่อพิจารณาอนุมัติต่อไปเรียบร้อยแล้วครับ</div><div class="btn-group"><button type="button" class="close-btn" onclick="window.close();">✓ ปิดหน้านี้และกลับสู่ LINE</button><a href="https://dbsscoredigital-spec.github.io/Permission-permission-system/" target="_blank" class="web-btn">🌐 เปิดเข้าระบบหลัก Web App</a></div></div></body></html>';
    const subOut = HtmlService.createHtmlOutput(subHtmlContent);
    try {
      if (HtmlService && HtmlService.XFrameOptionsMode && HtmlService.XFrameOptionsMode.ALLOWALL) {
        subOut.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    } catch (e) {}
    return subOut;
  }

  // 3. ตรวจสอบข้อมูลคำขอรายรายการตาม reqId หรือ qrToken
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

// จัดการ Webhook เมื่อมีเหตุการณ์จาก LINE (เช่น กดปุ่ม อนุมัติ / ไม่อนุมัติ ใน LINE Flex Message)
function handleLineEvents(events) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const logSheet = ss.getSheetByName("ApprovalLog");
  const token = getSettingValue("LINE_CHANNEL_ACCESS_TOKEN");

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    let action = "";
    let reqId = "";

    // 1. จากการกดปุ่ม Postback ใน LINE Flex Message
    if (event.type === "postback" && event.postback && event.postback.data) {
      const dataStr = event.postback.data;
      const pairs = dataStr.split("&");
      for (let p = 0; p < pairs.length; p++) {
        const kv = pairs[p].split("=");
        if (kv[0] === "action") action = decodeURIComponent(kv[1] || "");
        if (kv[0] === "reqId") reqId = decodeURIComponent(kv[1] || "");
      }
    } 
    // 2. จากการพิมพ์ข้อความในแชท LINE (เช่น พิมพ์ อนุมัติ, อนุมัติ REQ-..., ไม่อนุมัติ)
    else if (event.type === "message" && event.message && event.message.type === "text") {
      const msgText = (event.message.text || "").trim();
      const isReject = msgText.indexOf("ไม่อนุมัติ") !== -1 || msgText.toLowerCase().indexOf("reject") !== -1;
      const isApprove = !isReject && (
        msgText.indexOf("อนุมัติ") !== -1 || 
        msgText.toLowerCase().indexOf("approve") !== -1 || 
        msgText.indexOf("ตกลง") !== -1 || 
        msgText.toLowerCase().indexOf("ok") !== -1
      );

      if (isReject) action = "reject";
      if (isApprove) action = "approve";

      if (action) {
        const match = msgText.match(/REQ-[\\w-]+/i);
        if (match) {
          reqId = match[0].toUpperCase();
        } else {
          // ค้นหาคำขอล่าสุดที่ยังรออนุมัติ
          const data = reqSheet.getDataRange().getValues();
          for (let r = data.length - 1; r >= 1; r--) {
            if (data[r][10] === "pending") {
              reqId = data[r][0];
              break;
            }
          }
        }
      }
    }

    if (!reqId || !action) continue;
    const isApprove = action === "approve";

      // ค้นหาแถวในตาราง Requests
      const data = reqSheet.getDataRange().getValues();
      let matchedReq = null;
      let matchedRowIdx = -1;

      for (let r = 1; r < data.length; r++) {
        if (data[r][0] === reqId) {
          matchedRowIdx = r + 1;
          matchedReq = {
            id: data[r][0],
            submittedAt: data[r][1],
            userName: data[r][2],
            branchName: data[r][3],
            exitDate: data[r][4],
            exitTime: data[r][5],
            returnTime: data[r][6],
            destination: data[r][7],
            reason: data[r][8],
            assignedApproverName: data[r][9],
            status: isApprove ? "approved" : "rejected",
            userId: data[r][2]
          };
          break;
        }
      }

      const now = new Date();
      if (matchedRowIdx > 0) {
        reqSheet.getRange(matchedRowIdx, 11).setValue(isApprove ? "approved" : "rejected");
        reqSheet.getRange(matchedRowIdx, 12).setValue(now);

        // บันทึก ApprovalLog
        logSheet.appendRow([
          "LOG-" + now.getTime(),
          reqId,
          "หัวหน้าสาขา (ผ่าน LINE Webhook)",
          isApprove ? "approve" : "reject",
          now,
          isApprove ? "อนุมัติคำขอผ่าน LINE สำเร็จ" : "ไม่อนุมัติคำขอผ่าน LINE"
        ]);

        // ส่งแจ้งเตือนกลับหาครูผู้ขอใน LINE
        if (matchedReq) {
          sendLineNotificationToTeacher(matchedReq);
        }

        // ส่งข้อความตอบกลับยืนยันให้หัวหน้าสาขาทันทีในห้องแชท LINE (ไม่เสียโควต้าข้อความ)
        if (event.replyToken && token) {
          replyToLine(token, event.replyToken, [
            {
              type: "text",
              text: isApprove
                ? "✅ อนุมัติคำขอ " + reqId + " ของครู" + (matchedReq ? matchedReq.userName : "") + " เรียบร้อยแล้ว\\n\\n✓ ในระบบเว็บได้เปลี่ยนสถานะเป็น «อนุมัติแล้ว» ให้ทั้งครูผู้ขอและหัวหน้าสาขาเรียบร้อยแล้ว\\n✓ ระบบส่งบัตรผ่าน QR Code ให้แก่ครูผู้ขอทาง LINE เรียบร้อยแล้ว"
                : "❌ บันทึกผล «ไม่อนุมัติ» คำขอ " + reqId + " เรียบร้อยแล้ว"
            }
          ]);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "LINE events processed" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

// 1. จัดการสร้างคำขอใหม่
function handleCreateRequest(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const logSheet = ss.getSheetByName("ApprovalLog");

  const reqId = String(req && req.id || "").trim();
  if (!reqId) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Missing request id" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ป้องกันการบันทึกซ้ำซ้อน: หากมีคำขอนี้ในระบบแล้ว ให้ข้ามทันที ไม่สร้างแถวซ้ำและไม่ส่ง Flex เบิ้ล
  if (reqSheet && reqSheet.getLastRow() > 1) {
    const existingRows = reqSheet.getDataRange().getValues();
    for (let r = 1; r < existingRows.length; r++) {
      if (String(existingRows[r][0] || "").trim() === reqId) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", requestId: reqId, duplicate: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

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
    req.hasClasses ? ("ยื่นคำขอใหม่ มีภาระงานสอน รอครูสอนแทน (" + (req.substituteTeacherName || "") + ") รับทราบ") : ("ยื่นคำขอใหม่ ส่งตรงไปยัง " + req.assignedApproverName)
  ]);

  // ส่งแจ้งเตือน LINE ไปยังหัวหน้าสาขา
  // เงื่อนไข: หากมีคาบสอน (hasClasses) และครูผู้สอนแทนยังไม่ได้รับทราบ ให้รอครูสอนแทนกดรับทราบในเว็บก่อน ค่อยส่ง LINE ให้หัวหน้าสาขา
  const hasPendingSubstitute = Boolean(req && req.hasClasses && req.substituteStatus !== "acknowledged");
  if (!hasPendingSubstitute) {
    sendLineFlexMessageToApprover(req);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", requestId: req.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. จัดการเมื่อครูผู้สอนแทนกดรับทราบในเว็บ (substitute_ack)
function handleSubstituteAck(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("ApprovalLog");

  if (logSheet) {
    logSheet.appendRow([
      "LOG-" + new Date().getTime(),
      req.id,
      req.substituteTeacherName || "ครูผู้สอนแทน",
      "substitute_ack",
      new Date(),
      "ครูผู้สอนแทน (" + (req.substituteTeacherName || "") + ") กดรับทราบภาระงานสอนแทนแล้ว ส่ง LINE Flex แจ้งเตือนหัวหน้าสาขา"
    ]);
  }

  // ส่ง LINE Flex ข้อความแจ้งเตือนหาหัวหน้าสาขาทันทีเมื่อครูสอนแทนกดรับทราบแล้ว
  sendLineFlexMessageToApprover(req);

  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Substitute acknowledged and approver notified" }))
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

// 2.3 ลบรายการคำขอ (Admin Action)
function handleDeleteRequest(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName("Requests");
  const logSheet = ss.getSheetByName("ApprovalLog");
  const data = reqSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.requestId) {
      reqSheet.deleteRow(i + 1);
      break;
    }
  }

  logSheet.appendRow([
    "LOG-" + new Date().getTime(),
    payload.requestId,
    payload.deletedBy || "ผู้ดูแลระบบ",
    "delete",
    new Date(),
    "ผู้ดูแลระบบลบรายการคำขอเลขที่ " + payload.requestId + " ของครู " + (payload.userName || "")
  ]);

  return ContentService.createTextOutput(JSON.stringify({ status: "success", deleted: payload.requestId }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 3. ส่ง LINE Flex Message ข้อความที่ 1/2 ให้หัวหน้าสาขา
// (นโยบายประหยัดโควต้า: คำขอ 1 ครั้ง ส่ง Flex แจ้งเตือนหาหัวหน้าเพียง 1 ข้อความเท่านั้น)
function sendLineFlexMessageToApprover(req) {
  const reqId = String(req && req.id || "").trim();
  if (!reqId) return;

  // กฎเหล็ก: ป้องกันการส่ง Flex ซ้ำให้หัวหน้าเด็ดขาด (ตรวจ Cache และ Lock 15 นาที)
  const scriptCache = CacheService.getScriptCache();
  const cacheKey = "lock_approver_flex_" + reqId;
  if (scriptCache && scriptCache.get(cacheKey)) {
    Logger.log("Approver Flex already sent for " + reqId + ", skipping duplicate.");
    return;
  }
  if (scriptCache) {
    scriptCache.put(cacheKey, "sent", 900);
  }

  const token = (req && req.lineToken) || getSettingValue("LINE_CHANNEL_ACCESS_TOKEN") || "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=";
  if (!token || token.includes("ใส่_TOKEN")) return;

  let approverLineId = (req && req.assignedApproverLineId) || (req && req.approverLineId) || getApproverLineId(req.branchId);
  if (!approverLineId || approverLineId.indexOf("U") !== 0) {
    approverLineId = getUserLineId(req.assignedApproverName || req.approver || req.assignedApproverId);
  }
  if (!approverLineId || approverLineId.indexOf("U") !== 0) {
    approverLineId = "U81778d734346f14e047e07cb37d1ccd1"; // Default to นายศรายุทธ สมสุข
  }

  let scriptUrl = "";
  try {
    scriptUrl = ScriptApp.getService().getUrl();
  } catch (e) {}
  if (!scriptUrl) {
    scriptUrl = "https://script.google.com/macros/s/AKfycbzxJTWNOzZhMzCmLvDlRzFvFGUv36l9Perv2hfWJ9svhrkuCBJDuwWfiUw7Nn6iroNmUg/exec";
  }

  const approveLink = scriptUrl + (scriptUrl.indexOf("?") === -1 ? "?" : "&") + "action=approve&reqId=" + encodeURIComponent(req.id);
  const rejectLink = scriptUrl + (scriptUrl.indexOf("?") === -1 ? "?" : "&") + "action=reject&reqId=" + encodeURIComponent(req.id);

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
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
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
                    label: "✅ กดอนุมัติทันที",
                    data: "action=approve&reqId=" + encodeURIComponent(req.id),
                    displayText: "อนุมัติ " + req.id
                  }
                },
                {
                  type: "button",
                  style: "secondary",
                  color: "#ef4444",
                  action: {
                    type: "postback",
                    label: "❌ ไม่อนุมัติ",
                    data: "action=reject&reqId=" + encodeURIComponent(req.id),
                    displayText: "ไม่อนุมัติ " + req.id
                  }
                }
              ]
            },
            {
              type: "button",
              style: "link",
              height: "sm",
              action: {
                type: "uri",
                label: "🌐 เปิดดูในระบบเว็บ",
                uri: approveLink
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

// 4. ส่งข้อความแจ้งเตือนผลกลับไปยังครูผู้ขอ (LINE Flex Message)
function sendLineNotificationToTeacher(req) {
  const reqId = String(req && req.id || "").trim();
  if (!reqId) return;

  // กฎเหล็ก: ป้องกันการส่ง Flex ซ้ำให้ครูผู้ขอเด็ดขาด (ตรวจ Cache และ Lock 15 นาที)
  const scriptCache = CacheService.getScriptCache();
  const cacheKey = "lock_teacher_flex_" + reqId + "_" + String(req.status || "").trim();
  if (scriptCache && scriptCache.get(cacheKey)) {
    Logger.log("Teacher Flex already sent for " + reqId + ", skipping duplicate.");
    return;
  }
  if (scriptCache) {
    scriptCache.put(cacheKey, "sent", 900);
  }

  const token = (req && req.lineToken) || getSettingValue("LINE_CHANNEL_ACCESS_TOKEN") || "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=";
  if (!token || token.includes("ใส่_TOKEN")) return;

  const teacherLineId = (req.userLineId && String(req.userLineId).trim().indexOf("U") === 0)
    ? String(req.userLineId).trim()
    : ((req.teacherLineId && String(req.teacherLineId).trim().indexOf("U") === 0)
      ? String(req.teacherLineId).trim()
      : getUserLineId(req.userId || req.userName));
  if (!teacherLineId || teacherLineId.indexOf("U_") === 0) return;

  const isApproved = req.status === "approved";
  const primaryColor = isApproved ? "#059669" : "#dc2626";
  const titleText = isApproved ? "✅ ได้รับอนุมัติออกนอกสถานศึกษา" : "❌ ไม่อนุมัติคำขอออกนอกสถานศึกษา";
  const approverName = req.approvedBy || req.assignedApproverName || "หัวหน้าสาขาวิชา";

  const flexMsg = {
    type: "flex",
    altText: isApproved
      ? "✅ ผลการขออนุญาต: ได้รับอนุมัติแล้ว (" + (req.userName || "") + ")"
      : "❌ ผลการขออนุญาต: ไม่อนุมัติ (" + (req.userName || "") + ")",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: primaryColor,
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: titleText,
            weight: "bold",
            size: "md",
            color: "#ffffff"
          },
          {
            type: "text",
            text: "รหัสคำขอ: " + req.id,
            size: "xs",
            color: "#ffffff",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "👨‍🏫 ครูผู้ขอ:", size: "sm", color: "#64748b", flex: 2 },
              { type: "text", text: req.userName || "-", size: "sm", weight: "bold", color: "#0f172a", flex: 5 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "📅 วันที่:", size: "sm", color: "#64748b", flex: 2 },
              { type: "text", text: req.exitDate || "-", size: "sm", color: "#0f172a", flex: 5 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🕐 เวลา:", size: "sm", color: "#64748b", flex: 2 },
              { type: "text", text: (req.exitTime || "") + " – " + (req.returnTime || "") + " น.", size: "sm", color: "#0f172a", flex: 5 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "📍 สถานที่:", size: "sm", color: "#64748b", flex: 2 },
              { type: "text", text: req.destination || "-", size: "sm", color: "#0f172a", flex: 5, wrap: true }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "✍️ ผู้อนุมัติ:", size: "sm", color: "#64748b", flex: 2 },
              { type: "text", text: approverName, size: "sm", weight: "bold", color: isApproved ? "#059669" : "#dc2626", flex: 5 }
            ]
          },
          isApproved ? {
            type: "box",
            layout: "vertical",
            backgroundColor: "#ecfdf5",
            paddingAll: "10px",
            cornerRadius: "8px",
            contents: [
              {
                type: "text",
                text: "🎫 คำขอได้รับการอนุมัติเรียบร้อยแล้ว",
                size: "xs",
                color: "#065f46",
                wrap: true
              }
            ]
          } : {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "⚠️ เหตุผล:", size: "sm", color: "#b91c1c", flex: 2 },
              { type: "text", text: req.rejectionReason || "ไม่ระบุ", size: "sm", color: "#b91c1c", flex: 5, wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "แจ้งเตือนอัตโนมัติจากระบบขออนุญาตออกนอกสถานศึกษา",
            size: "xxs",
            color: "#94a3b8",
            align: "center"
          }
        ]
      }
    }
  };

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    payload: JSON.stringify({
      to: teacherLineId,
      messages: [flexMsg]
    }),
    muteHttpExceptions: true
  });
}

// Helper: ตอบกลับผู้ใช้ใน LINE ทันทีโดยใช้ replyToken (ฟรี ไม่จำกัด และไม่เสียโควต้าข้อความ)
function replyToLine(token, replyToken, messages) {
  if (!token || !replyToken || !messages || messages.length === 0) return;
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: messages
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("replyToLine error: " + err);
  }
}

// Helper: ดึงค่า Settings
function getSettingValue(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sSheet = ss.getSheetByName("Settings");
  if (sSheet) {
    const data = sSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === key) {
        const val = String(data[i][1] || "").trim();
        if (key === "LINE_CHANNEL_ACCESS_TOKEN") {
          if (val && val.length > 50 && val.indexOf("ใส่_TOKEN") === -1 && val.indexOf("MOCK_") === -1) {
            return val;
          }
        } else if (val) {
          return val;
        }
      }
    }
  }
  if (key === "LINE_CHANNEL_ACCESS_TOKEN") {
    return "2blq79G/0Wm2Vr3E+HpnBtw8ndTvFI5LyE8iTQTPh3I4FURk+1bizjv2kMp1nSdFid1nAMxyvRp7y84zCPr15+6VA68nOPunujUnteDs7gbejq0klBfFOyjx1bz8aB+r0VIhYj8fi5DNDQhCyIhH1wdB04t89/1O/w1cDnyilFU=";
  }
  return "";
}

// รายชื่อ LINE User ID สำรองของครูและบุคลากรวิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์ (ป้องกันกรณีชีต Users ว่าง)
var KNOWN_LINE_MAP = {
  "นายศรายุทธ สมสุข": "U81778d734346f14e047e07cb37d1ccd1",
  "นายเอกราช อาจณรงค์": "Uedc4422b785b7a8d1f6c85ae2eb950cf",
  "นายคัมภีร์ ช่วยเพชร": "U759b2ec7a4eee7f1c4565b9a7a8194e2",
  "นายสุมัณฑิต ทิพย์มนตรี": "U9474d32fb566bbfafc743b4511d46f9d",
  "นายวรวิทย์ บุญณะ": "Ucd11f927fb0627c5608f49d0e202ceaa",
  "นายปิยะพงษ์ รอดนาโพธิ์": "U9db6d7c3b5ba1c5edc4fdb395950bb01",
  "นายทิวากร สามิภักดิ์": "U6e2636be42c9019262e42e4312a687f9",
  "นายสัจจะ วิชัยดิษฐ": "Uf042efd3a0406969f203957b4bd82221",
  "นายชนะ กฤตานุพงศ์": "U0b18dbb4273993baeaf37b5d8f73e825",
  "นางนฤมล เรืองพุฒ": "U013dfdf06ab0c66db7d898540077d80e",
  "นายฉัตรชัย ดิษฐาน": "U00d0bcb58a525b4a9e29999ddd8c8246",
  "นายนคร คมขำ": "U5352fa5b7afe5b8dab92939e56540bb9",
  "นายภูมเรศ จันทร์แจ่มศรี": "U600d38ae7a9d217129d1221da32f061d",
  "นายศักดิ์สิริ นิลเอก": "U2529aae8c76082a8840d01549220f589",
  "นางสาวพุทธชาติ จันทลิลา": "Ue74d275282ab6b5d5c5264188503631d",
  "นางสาวอรอนงค์ ขุนทองแก้ว": "U84c5267a9feee6f8968d324a3c79c4af",
  "นางสาวศรีไพร ดวงภักดี": "U2723eb7c83ee781baf5c3c3e5bac47c1",
  "นางสาวศรัญญา พร้อมประเสริฐ": "U38934e344a242b1a8a7741c7ff043895",
  "นางสาววิลาวัณย์ หนูแก้ว": "U606b5325d901952b8d055d1ce9f9c921",
  "นางสาววลัยลักษณ์ ทองสาร": "U7504116d33dd060660c97ffd0ab614e7",
  "นางสาวดวงชนก สดภิบาล": "U31c5482900420051ca5ef62a94694cc0",
  "นายวิบูลย์ศักดิ์ วงษ์แหวน": "U1815d934070b4927ddb7088c5e176aff",
  "นางเสาวณี ชุมศรี": "U35fa00096ca7f74fce5d0ce9feccacb1",
  "นางกนกวรรณ ธนาพล": "U0b1a90a74dacb8fbb2be07d19189932c",
  "นางศรัญญา กลการ": "Ube1f1d0c57321a5d20f5ee53149c9f76",
  "นางอันธิกา ชายแก้ว": "U560ee7aecc0b9f8b3a22566956f39eac",
  "นายกนกศักดิ์ บุญไทย": "U6ff07b616d038bc78b1a6602cb0a4120",
  "usr-import-85622": "U81778d734346f14e047e07cb37d1ccd1",
  "usr-import-85625": "Uedc4422b785b7a8d1f6c85ae2eb950cf",
  "7777": "Uedc4422b785b7a8d1f6c85ae2eb950cf",
  "8888": "U81778d734346f14e047e07cb37d1ccd1",
  "admin": "U81778d734346f14e047e07cb37d1ccd1"
};

// Helper: ดึง LINE ID ของหัวหน้าสาขา
function getApproverLineId(branchId) {
  var bQuery = String(branchId || "").trim().toLowerCase();
  if (bQuery === "db" || bQuery.indexOf("ธุรกิจ") !== -1 || bQuery.indexOf("ดิจิทัล") !== -1) {
    return "U81778d734346f14e047e07cb37d1ccd1"; // นายศรายุทธ สมสุข
  }
  if (bQuery === "me" || bQuery.indexOf("กล") !== -1) {
    return "U759b2ec7a4eee7f1c4565b9a7a8194e2"; // นายคัมภีร์ ช่วยเพชร
  }
  if (bQuery === "ac" || bQuery.indexOf("บัญชี") !== -1) {
    return "U84c5267a9feee6f8968d324a3c79c4af"; // นางสาวอรอนงค์ ขุนทองแก้ว
  }
  if (bQuery === "el" || bQuery.indexOf("ไฟฟ้า") !== -1) {
    return "U013dfdf06ab0c66db7d898540077d80e"; // นางนฤมล เรืองพุฒ
  }
  if (bQuery === "at" || bQuery.indexOf("ยนต์") !== -1) {
    return "U00d0bcb58a525b4a9e29999ddd8c8246"; // นายฉัตรชัย ดิษฐาน
  }
  if (bQuery === "gen" || bQuery.indexOf("สามัญ") !== -1) {
    return "U0b1a90a74dacb8fbb2be07d19189932c"; // นางกนกวรรณ ธนาพล
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bSheet = ss.getSheetByName("Branches");
  const uSheet = ss.getSheetByName("Users");
  if (bSheet && uSheet) {
    const bData = bSheet.getDataRange().getValues();
    let approverUserId = "";
    for (let i = 1; i < bData.length; i++) {
      const bId = String(bData[i][0] || "").trim().toLowerCase();
      const bName = String(bData[i][1] || "").trim().toLowerCase();
      if (bId === bQuery || bName === bQuery || bName.indexOf(bQuery) !== -1) {
        approverUserId = bData[i][2];
        break;
      }
    }
    if (approverUserId) {
      const uData = uSheet.getDataRange().getValues();
      const uQuery = String(approverUserId || "").trim().toLowerCase();
      for (let j = 1; j < uData.length; j++) {
        const rowId = String(uData[j][0] || "").trim().toLowerCase();
        const rowName = String(uData[j][3] || "").trim().toLowerCase();
        if (rowId === uQuery || (uQuery.length > 3 && rowName.indexOf(uQuery) !== -1)) {
          var foundLineId = String(uData[j][6] || "").trim();
          if (foundLineId && foundLineId.indexOf("U") === 0 && foundLineId.indexOf("U_") !== 0) {
            return foundLineId;
          }
        }
      }
    }
  }

  return "U81778d734346f14e047e07cb37d1ccd1"; // Fallback to นายศรายุทธ สมสุข
}

// Helper: ดึง LINE ID ของผู้ใช้
function getUserLineId(userId) {
  var raw = String(userId || "").trim();
  if (!raw) return "";

  // 1. Direct check in known map
  for (var k in KNOWN_LINE_MAP) {
    if (raw === k || raw.indexOf(k) !== -1 || k.indexOf(raw) !== -1) {
      return KNOWN_LINE_MAP[k];
    }
  }

  // 2. Check Users sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName("Users");
  if (uSheet && uSheet.getLastRow() > 1) {
    const uData = uSheet.getDataRange().getValues();
    const query = raw.replace(/\\s+/g, ' ').toLowerCase();
    for (let i = 1; i < uData.length; i++) {
      const rowId = String(uData[i][0] || "").trim().toLowerCase();
      const rowUsername = String(uData[i][1] || "").trim().toLowerCase();
      const rowName = String(uData[i][3] || "").replace(/\\s+/g, ' ').trim().toLowerCase();
      if (rowId === query || rowUsername === query || (query.length > 2 && (rowName === query || rowName.indexOf(query) !== -1 || query.indexOf(rowName) !== -1))) {
        var lId = String(uData[i][6] || "").trim();
        if (lId && lId.indexOf("U") === 0 && lId.indexOf("U_") !== 0) {
          return lId;
        }
      }
    }
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
