import { ExitRequest, LineSimulatedMessage, RequestStatus } from '../types';
import { StorageService } from './storageService';

const LINE_MESSAGES_KEY = 'exit_app_line_messages_v4';

export class LineService {
  private static instance: LineService;

  private constructor() {
    this.initIfEmpty();
  }

  public static getInstance(): LineService {
    if (!LineService.instance) {
      LineService.instance = new LineService();
    }
    return LineService.instance;
  }

  private initIfEmpty() {
    if (!localStorage.getItem(LINE_MESSAGES_KEY)) {
      const initialMsgs: LineSimulatedMessage[] = [
        {
          id: 'LINE-MSG-001',
          timestamp: '08:15',
          recipientType: 'approver',
          recipientName: 'อ.วิชัย ช่างทอง',
          recipientBranch: 'ช่างยนต์',
          requestId: 'REQ-20261005-001',
          teacherName: 'นายสมชาย รักเรียน',
          exitDate: '5 ต.ค. 2569',
          timeRange: '10:30 – 12:00 น.',
          destination: 'ศูนย์บริการรถยนต์ มิตซูบิชิ ปทุมวัน',
          reason: 'นำรถยนต์ราชการส่วนกลางเข้าตรวจเช็กระยะ 20,000 กม.',
          status: 'pending'
        },
        {
          id: 'LINE-MSG-002',
          timestamp: '09:30',
          recipientType: 'teacher',
          recipientName: 'นางสาวสุดา เทคโนสารสนเทศ',
          recipientBranch: 'ธุรกิจดิจิทัล',
          requestId: 'REQ-20261004-002',
          teacherName: 'นางสาวสุดา เทคโนสารสนเทศ',
          exitDate: '4 ต.ค. 2569',
          timeRange: '13:00 – 16:30 น.',
          destination: 'ธนาคารกรุงไทย สาขาศาลายา',
          reason: 'นำส่งเอกสารบัญชีเบิกจ่ายทุนการศึกษานักศึกษาฝึกประสบการณ์',
          status: 'approved',
          approverName: 'อ.วราภรณ์ ดิจิทัลวิศิษฏ์ (หัวหน้าสาขาธุรกิจดิจิทัล)'
        }
      ];
      localStorage.setItem(LINE_MESSAGES_KEY, JSON.stringify(initialMsgs));
    }
  }

  public getMessages(): LineSimulatedMessage[] {
    const data = localStorage.getItem(LINE_MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  }

  public saveMessages(msgs: LineSimulatedMessage[]) {
    localStorage.setItem(LINE_MESSAGES_KEY, JSON.stringify(msgs));
  }

  /**
   * Quota Info for LINE Official Account Free Tier (300 messages / month)
   * Strictly 2 messages per request:
   * 1. Send to Approver when request is ready (after substitute teacher acknowledged in web app)
   * 2. Send to Requesting Teacher when Approver finishes review
   */
  public getMonthlyQuotaInfo(): { used: number; total: number; remaining: number } {
    const msgs = this.getMessages();
    const used = msgs.length;
    const total = 300;
    return {
      used,
      total,
      remaining: Math.max(0, total - used)
    };
  }

  /**
   * Call backend /api/line/push to deliver real LINE messages
   */
  public async pushToLineBackend(
    to: string,
    messages: any[],
    customToken?: string
  ): Promise<{ success: boolean; message: string; code?: string; details?: any }> {
    try {
      const storage = StorageService.getInstance();
      const settings = storage.getSettings();
      const token = customToken || settings.lineChannelAccessToken;

      if (!token || token.startsWith('MOCK_') || token.includes('ใส่_TOKEN')) {
        return {
          success: false,
          code: 'TOKEN_REQUIRED',
          message: 'ยังไม่ได้ระบุ LINE Channel Access Token ในการตั้งค่าระบบ (กรุณาคัดลอก Token จาก LINE Developers Console)'
        };
      }

      if (!to || !to.trim().startsWith('U')) {
        return {
          success: false,
          code: 'INVALID_USER_ID',
          message: 'LINE User ID ไม่ถูกต้อง รูปแบบต้องขึ้นต้นด้วย U ตามด้วยรหัส 32 ตัวอักษร เช่น U81778d734346f14e047e07cb37d1ccd1'
        };
      }

      const res = await fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          to: to.trim(),
          messages
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message || 'ส่งแจ้งเตือนเข้า LINE สำเร็จแล้ว' };
      } else {
        return {
          success: false,
          code: data.code || 'API_ERROR',
          message: data.error || 'ส่งข้อความเข้า LINE ไม่สำเร็จ',
          details: data.details
        };
      }
    } catch (err: any) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อส่ง LINE ได้: ' + (err.message || String(err))
      };
    }
  }

  /**
   * Verify LINE Channel Access Token with LINE Developers API
   */
  public async verifyToken(token: string): Promise<{ success: boolean; bot?: any; error?: string }> {
    try {
      const res = await fetch('/api/line/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ Token' };
    }
  }

  /**
   * Send Test Push Notification to a specific LINE ID
   */
  public async testSendNotification(
    toLineId: string,
    recipientName: string,
    customToken?: string
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const testFlex = {
      type: 'flex',
      altText: `🔔 ทดสอบการเชื่อมต่อ LINE ระบบขออนุญาตออกนอกสถานศึกษา (${recipientName})`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#4f46e5',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: '🔔 ทดสอบระบบแจ้งเตือน LINE สำเร็จ!',
              weight: 'bold',
              size: 'md',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: 'วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์',
              size: 'xs',
              color: '#e0e7ff',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: `เรียนคุณ ${recipientName}`,
              weight: 'bold',
              size: 'sm',
              color: '#1e293b'
            },
            {
              type: 'text',
              text: 'ระบบขออนุญาตออกนอกสถานศึกษาสำหรับครู ได้เชื่อมต่อกับบัญชี LINE ของท่านเรียบร้อยแล้ว ✅',
              size: 'xs',
              color: '#475569',
              wrap: true
            },
            {
              type: 'separator',
              margin: 'md',
              color: '#e2e8f0'
            },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: [
                {
                  type: 'text',
                  text: '📌 บทบาทของคุณ:',
                  size: 'xxs',
                  color: '#64748b'
                },
                {
                  type: 'text',
                  text: 'เมื่อมีครูในสาขายื่นคำขอออกนอกสถานศึกษา ระบบจะส่งข้อความแจ้งเตือนมายัง LINE นี้ทันทีเพื่อให้ท่านพิจารณาอนุมัติ',
                  size: 'xs',
                  color: '#0f172a',
                  wrap: true
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `ส่งเมื่อ: ${new Date().toLocaleTimeString('th-TH')} น.`,
              size: 'xxs',
              color: '#94a3b8',
              align: 'center'
            }
          ]
        }
      }
    };

    // Send only Flex message (no plain text follow-up)
    return await this.pushToLineBackend(toLineId, [testFlex], customToken);
  }

  /**
   * Message 1 of 2: Sent to Department Head (Approver)
   * Also attempts real push if approver has a configured lineId
   */
  public async sendApproverNotification(req: ExitRequest): Promise<{ success: boolean; message: string; code?: string; details?: any }> {
    const msgs = this.getMessages();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: LineSimulatedMessage = {
      id: `LINE-MSG-${Date.now()}-APPROVER`,
      timestamp: timeStr,
      recipientType: 'approver',
      recipientName: req.assignedApproverName,
      recipientBranch: req.branchName,
      requestId: req.id,
      teacherName: req.userName,
      exitDate: req.exitDate,
      timeRange: `${req.exitTime} – ${req.returnTime} น.`,
      destination: req.destination,
      reason: req.reason,
      status: 'pending'
    };

    this.saveMessages([newMsg, ...msgs]);

    // Find approver's LINE ID
    const storage = StorageService.getInstance();
    let approverLineId = req.assignedApproverLineId;
    if (!approverLineId) {
      const users = storage.getUsers();
      const approverUser = users.find(u => u.id === req.assignedApproverId || (u.branchId === req.branchId && u.role === 'approver'));
      approverLineId = approverUser?.lineId;
    }

    if (!approverLineId || !approverLineId.trim().startsWith('U')) {
      return {
        success: false,
        message: `บันทึกคำขอแล้ว แต่หัวหน้าสาขา (${req.assignedApproverName}) ยังไม่ได้ระบุ LINE User ID ในข้อมูลผู้ใช้`
      };
    }

    // Send ONLY the Flex message (no trailing text message)
    const flexPayload = this.generateLineFlexMessagePayload(req);
    return await this.pushToLineBackend(approverLineId, [flexPayload]);
  }

  /**
   * Message 2 of 2: Sent to Requesting Teacher when approved or rejected
   */
  public async sendTeacherStatusNotification(
    req: ExitRequest,
    status: RequestStatus,
    approverName: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const msgs = this.getMessages();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: LineSimulatedMessage = {
      id: `LINE-MSG-${Date.now()}-TEACHER`,
      timestamp: timeStr,
      recipientType: 'teacher',
      recipientName: req.userName,
      recipientBranch: req.branchName,
      requestId: req.id,
      teacherName: req.userName,
      exitDate: req.exitDate,
      timeRange: `${req.exitTime} – ${req.returnTime} น.`,
      destination: req.destination,
      reason: req.reason,
      status,
      approverName,
      rejectionReason
    };

    // Also update any pending message for this request to show action taken
    const updated = msgs.map(m => {
      if (m.requestId === req.id && m.recipientType === 'approver') {
        return {
          ...m,
          status,
          actionTaken: status === 'approved' ? ('approved' as const) : ('rejected' as const)
        };
      }
      return m;
    });

    this.saveMessages([newMsg, ...updated]);

    // Send real LINE Flex message to requesting teacher if they have lineId
    const storage = StorageService.getInstance();
    const users = storage.getUsers();
    const teacherUser = users.find(u => u.id === req.userId);
    const teacherLineId = teacherUser?.lineId;

    if (teacherLineId && teacherLineId.trim().startsWith('U')) {
      const flexStatusPayload = this.generateTeacherStatusFlexPayload(req, status, approverName, rejectionReason);
      return await this.pushToLineBackend(teacherLineId, [flexStatusPayload]);
    }

    return { success: true, message: 'บันทึกสถานะเรียบร้อยแล้ว' };
  }

  /**
   * Build LINE Flex Message JSON payload for Teacher approval/rejection status
   */
  public generateTeacherStatusFlexPayload(
    req: ExitRequest,
    status: RequestStatus,
    approverName: string,
    rejectionReason?: string
  ) {
    const isApproved = status === 'approved';
    const primaryColor = isApproved ? '#059669' : '#dc2626';

    return {
      type: 'flex',
      altText: isApproved
        ? `✅ ผลการขออนุญาต: ได้รับอนุมัติแล้ว (${req.userName})`
        : `❌ ผลการขออนุญาต: ไม่อนุมัติ (${req.userName})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: primaryColor,
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: isApproved ? '✅ ได้รับอนุมัติออกนอกสถานศึกษา' : '❌ ไม่อนุมัติคำขอออกนอกสถานศึกษา',
              weight: 'bold',
              size: 'md',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: `รหัสคำขอ: ${req.id}`,
              size: 'xs',
              color: '#ffffff',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👨‍🏫 ครูผู้ขอ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.userName, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 วันที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.exitDate, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🕐 เวลา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: `${req.exitTime} – ${req.returnTime} น.`, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📍 สถานที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.destination, size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '✍️ ผู้อนุมัติ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: approverName, size: 'sm', weight: 'bold', color: isApproved ? '#059669' : '#dc2626', flex: 5 }
              ]
            },
            !isApproved && rejectionReason ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '⚠️ เหตุผล:', size: 'sm', color: '#b91c1c', flex: 2 },
                { type: 'text', text: rejectionReason, size: 'sm', color: '#b91c1c', flex: 5, wrap: true }
              ]
            } : {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#ecfdf5',
              paddingAll: '10px',
              cornerRadius: '8px',
              contents: [
                {
                  type: 'text',
                  text: '🎫 ท่านสามารถเปิดระบบเพื่อแสดงบัตรผ่าน QR Code แก่เจ้าหน้าที่ รปภ. ได้เลยครับ',
                  size: 'xs',
                  color: '#065f46',
                  wrap: true
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `แจ้งเตือนเมื่อ: ${new Date().toLocaleTimeString('th-TH')} น.`,
              size: 'xxs',
              color: '#94a3b8',
              align: 'center'
            }
          ]
        }
      }
    };
  }

  /**
   * Helper to get public app URL for interactive LINE buttons
   */
  public getAppBaseUrl(): string {
    const storage = StorageService.getInstance();
    const settings = storage.getSettings();
    if (settings.appUrl && settings.appUrl.trim().startsWith('http')) {
      return settings.appUrl.trim().replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin;
    }
    return 'https://ais-dev-b5n74ksxlz6u3o5szrquja-431414357592.asia-east1.run.app';
  }

  /**
   * Build LINE Flex Message JSON payload adhering strictly to LINE Messaging API format.
   * Can be directly plugged into LINE Messaging API or Google Apps Script UrlFetchApp.
   */
  public generateLineFlexMessagePayload(req: ExitRequest) {
    const baseUrl = this.getAppBaseUrl();
    const directApproveUrl = `${baseUrl}?action=direct_approve&reqId=${encodeURIComponent(req.id)}`;
    const directRejectUrl = `${baseUrl}?action=direct_reject&reqId=${encodeURIComponent(req.id)}`;
    const approveUrl = `${baseUrl}?action=approve&reqId=${encodeURIComponent(req.id)}`;

    return {
      type: 'flex',
      altText: `🔔 คำขอออกนอกสถานศึกษา: ${req.userName} (${req.branchName})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#059669',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: '🔔 มีคำขออนุญาตออกนอกสถานศึกษา',
              weight: 'bold',
              size: 'md',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: `รหัสคำขอ: ${req.id}`,
              size: 'xs',
              color: '#d1fae5',
              margin: 'xs'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '👨‍🏫 ผู้ขอ:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.userName, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🏫 สาขา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.branchName, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📅 วันที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.exitDate, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '🕐 เวลา:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: `${req.exitTime} – ${req.returnTime} น.`, size: 'sm', color: '#0f172a', flex: 5 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📍 สถานที่:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.destination, size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '📝 เหตุผล:', size: 'sm', color: '#64748b', flex: 2 },
                { type: 'text', text: req.reason, size: 'sm', color: '#0f172a', flex: 5, wrap: true }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#16a34a',
                  action: {
                    type: 'postback',
                    label: '✅ กดอนุมัติใน LINE',
                    data: `action=approve&reqId=${req.id}`,
                    displayText: `✅ อนุมัติคำขอ ${req.id}`
                  }
                },
                {
                  type: 'button',
                  style: 'secondary',
                  color: '#ef4444',
                  action: {
                    type: 'postback',
                    label: '❌ ไม่อนุมัติ',
                    data: `action=reject&reqId=${req.id}`,
                    displayText: `❌ ไม่อนุมัติคำขอ ${req.id}`
                  }
                }
              ]
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'uri',
                label: '🌐 หรือเปิดอนุมัติผ่านเว็บ',
                uri: directApproveUrl
              }
            }
          ]
        }
      }
    };
  }
}

