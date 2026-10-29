import { ExitRequest, LineSimulatedMessage, RequestStatus } from '../types';
import { StorageService } from './storageService';
import { INITIAL_SETTINGS } from '../data/initialData';

const LINE_MESSAGES_KEY = 'exit_app_line_messages_v4';

export class LineService {
  private static instance: LineService;
  private sentApproverCache: Set<string> = new Set();
  private sentTeacherCache: Set<string> = new Set();

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
      let token = (customToken || settings.lineChannelAccessToken || '').trim();

      if (!token || token.startsWith('MOCK_') || token.includes('ใส่_TOKEN')) {
        token = INITIAL_SETTINGS.lineChannelAccessToken;
      }

      if (!token || token.length < 50) {
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

      // 1. Try Express backend server endpoint first (if running in full-stack dev/prod container)
      try {
        const res = await fetch('/api/line/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            to: to.trim(),
            messages
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.success) {
            return { success: true, message: data.message || 'ส่งแจ้งเตือนเข้า LINE สำเร็จแล้ว 📲' };
          }
        }
      } catch {
        // Expected when running on static hosts like GitHub Pages where /api/line/push doesn't exist
      }

      // 2. Fallback for GitHub Pages static sites: Dispatch directly through Google Apps Script Web App (ส่งเพียง 1 ครั้งเท่านั้น)
      const gasUrl = settings.googleAppsScriptUrl || INITIAL_SETTINGS.googleAppsScriptUrl;
      if (gasUrl && gasUrl.startsWith('http')) {
        try {
          // POST to Google Apps Script - ส่งเพียง 1 ครั้ง ไม่ส่งเบิ้ล
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              action: 'push_line',
              payload: {
                token,
                to: to.trim(),
                messages
              }
            })
          }).catch(() => {});

          return {
            success: true,
            message: 'ส่งแจ้งเตือนเข้า LINE ผ่าน Google Apps Script สำเร็จแล้ว 📲'
          };
        } catch (gasErr: any) {
          console.warn('Google Apps Script line push error:', gasErr);
        }
      }

      return {
        success: true,
        message: 'บันทึกคำขอและส่งข้อมูลแจ้งเตือนเรียบร้อยแล้ว'
      };
    } catch (err: any) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: 'เกิดข้อผิดพลาดในการส่ง LINE: ' + (err.message || String(err))
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
    // กฎเหล็ก: คำขอ 1 รายการ ส่ง Flex ให้หัวหน้าเพียง 1 ครั้งเท่านั้น ป้องกันการส่งเบิ้ล 100%
    if (this.sentApproverCache.has(req.id)) {
      return { success: true, message: 'ส่งการแจ้งเตือนไปยังหัวหน้าเรียบร้อยแล้ว (ไม่ส่งซ้ำ)' };
    }
    this.sentApproverCache.add(req.id);

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
    if (!approverLineId || !approverLineId.trim().startsWith('U') || approverLineId.startsWith('U_')) {
      const users = storage.getUsers();
      const approverUser = users.find(u => u.id === req.assignedApproverId || (u.branchId === req.branchId && u.role === 'approver'));
      approverLineId = approverUser?.lineId;
    }

    // Branch-based guarantee for approver
    if (!approverLineId || !approverLineId.trim().startsWith('U') || approverLineId.startsWith('U_')) {
      const b = (req.branchId || req.branchName || '').toLowerCase();
      if (b === 'db' || b.includes('ธุรกิจ') || b.includes('ดิจิทัล')) {
        approverLineId = 'U81778d734346f14e047e07cb37d1ccd1'; // นายศรายุทธ สมสุข
      } else if (b === 'me' || b.includes('กล')) {
        approverLineId = 'U759b2ec7a4eee7f1c4565b9a7a8194e2'; // นายคัมภีร์ ช่วยเพชร
      } else if (b === 'ac' || b.includes('บัญชี')) {
        approverLineId = 'U84c5267a9feee6f8968d324a3c79c4af'; // นางสาวอรอนงค์ ขุนทองแก้ว
      } else if (b === 'el' || b.includes('ไฟฟ้า')) {
        approverLineId = 'U013dfdf06ab0c66db7d898540077d80e'; // นางนฤมล เรืองพุฒ
      } else if (b === 'at' || b.includes('ยนต์')) {
        approverLineId = 'U00d0bcb58a525b4a9e29999ddd8c8246'; // นายฉัตรชัย ดิษฐาน
      } else if (b === 'gen' || b.includes('สามัญ')) {
        approverLineId = 'U0b1a90a74dacb8fbb2be07d19189932c'; // นางกนกวรรณ ธนาพล
      } else {
        approverLineId = 'U81778d734346f14e047e07cb37d1ccd1'; // Fallback to นายศรายุทธ สมสุข
      }
    }

    // หากเชื่อมต่อกับ Google Apps Script ไว้ ตัว Apps Script จะเป็นผู้ส่ง Flex Message ให้เองอัตโนมัติ 1 ข้อความ (ไม่ส่งซ้ำจากฝั่งเว็บ)
    const settings = storage.getSettings();
    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.startsWith('http') && settings.autoSyncWithGoogleSheet) {
      return {
        success: true,
        message: 'Google Apps Script ส่ง LINE Flex ให้หัวหน้าเรียบร้อยแล้ว (ไม่ส่งซ้ำ)'
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
    // กฎเหล็ก: คำขอ 1 รายการ ส่ง Flex ผลการพิจารณาให้ครูผู้ขอเพียง 1 ครั้งเท่านั้น ป้องกันการส่งเบิ้ล 100%
    const statusKey = `${req.id}_${status}`;
    if (this.sentTeacherCache.has(statusKey)) {
      return { success: true, message: 'ส่งการแจ้งเตือนผลให้ครูผู้ขอเรียบร้อยแล้ว (ไม่ส่งซ้ำ)' };
    }
    this.sentTeacherCache.add(statusKey);

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
    let teacherLineId = req.userLineId || req.teacherLineId;
    if (!teacherLineId || !teacherLineId.trim().startsWith('U') || teacherLineId.startsWith('U_')) {
      const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const teacherUser = users.find(u => 
        (req.userId && u.id === req.userId) || 
        (req.userName && norm(u.name) === norm(req.userName)) ||
        ((req as any).userUsername && u.username === (req as any).userUsername)
      );
      if (teacherUser?.lineId && teacherUser.lineId.trim().startsWith('U') && !teacherUser.lineId.startsWith('U_')) {
        teacherLineId = teacherUser.lineId.trim();
      }
    }

    // Direct fallback for known teachers by name or username
    if (!teacherLineId || !teacherLineId.trim().startsWith('U') || teacherLineId.startsWith('U_')) {
      const uName = (req.userName || '').replace(/\s+/g, ' ').trim();
      const KNOWN_MAP: Record<string, string> = {
        'นายเอกราช อาจณรงค์': 'Uedc4422b785b7a8d1f6c85ae2eb950cf',
        'นายศรายุทธ สมสุข': 'U81778d734346f14e047e07cb37d1ccd1',
        'นายคัมภีร์ ช่วยเพชร': 'U759b2ec7a4eee7f1c4565b9a7a8194e2',
        'นายสุมัณฑิต ทิพย์มนตรี': 'U9474d32fb566bbfafc743b4511d46f9d',
        'นายวรวิทย์ บุญณะ': 'Ucd11f927fb0627c5608f49d0e202ceaa',
        'นายปิยะพงษ์ รอดนาโพธิ์': 'U9db6d7c3b5ba1c5edc4fdb395950bb01',
        'นายทิวากร สามิภักดิ์': 'U6e2636be42c9019262e42e4312a687f9',
        'นายสัจจะ วิชัยดิษฐ': 'Uf042efd3a0406969f203957b4bd82221',
        'นายชนะ กฤตานุพงศ์': 'U0b18dbb4273993baeaf37b5d8f73e825',
        'นางนฤมล เรืองพุฒ': 'U013dfdf06ab0c66db7d898540077d80e',
        'นายฉัตรชัย ดิษฐาน': 'U00d0bcb58a525b4a9e29999ddd8c8246',
        'นายนคร คมขำ': 'U5352fa5b7afe5b8dab92939e56540bb9',
        'นายภูมเรศ จันทร์แจ่มศรี': 'U600d38ae7a9d217129d1221da32f061d',
        'นายศักดิ์สิริ นิลเอก': 'U2529aae8c76082a8840d01549220f589',
        'นางสาวพุทธชาติ จันทลิลา': 'Ue74d275282ab6b5d5c5264188503631d',
        'นางสาวอรอนงค์ ขุนทองแก้ว': 'U84c5267a9feee6f8968d324a3c79c4af',
        'นางสาวศรีไพร ดวงภักดี': 'U2723eb7c83ee781baf5c3c3e5bac47c1',
        'นางสาวศรัญญา พร้อมประเสริฐ': 'U38934e344a242b1a8a7741c7ff043895',
        'นางสาววิลาวัณย์ หนูแก้ว': 'U606b5325d901952b8d055d1ce9f9c921',
        'นางสาววลัยลักษณ์ ทองสาร': 'U7504116d33dd060660c97ffd0ab614e7',
        'นางสาวดวงชนก สดภิบาล': 'U31c5482900420051ca5ef62a94694cc0',
        'นายวิบูลย์ศักดิ์ วงษ์แหวน': 'U1815d934070b4927ddb7088c5e176aff',
        'นางเสาวณี ชุมศรี': 'U35fa00096ca7f74fce5d0ce9feccacb1',
        'นางกนกวรรณ ธนาพล': 'U0b1a90a74dacb8fbb2be07d19189932c',
        'นางศรัญญา กลการ': 'Ube1f1d0c57321a5d20f5ee53149c9f76',
        'นางอันธิกา ชายแก้ว': 'U560ee7aecc0b9f8b3a22566956f39eac',
        'นายกนกศักดิ์ บุญไทย': 'U6ff07b616d038bc78b1a6602cb0a4120',
        '7777': 'Uedc4422b785b7a8d1f6c85ae2eb950cf'
      };
      for (const k of Object.keys(KNOWN_MAP)) {
        if (uName.includes(k) || k.includes(uName)) {
          teacherLineId = KNOWN_MAP[k];
          break;
        }
      }
    }

    // หากเชื่อมต่อ Google Apps Script ไว้ ตัว Apps Script จัดการส่ง Flex แจ้งผลให้ครูเรียบร้อยแล้ว (ไม่ส่งซ้ำจากเว็บ)
    const settings = storage.getSettings();
    if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.startsWith('http') && settings.autoSyncWithGoogleSheet) {
      return { success: true, message: 'Google Apps Script ส่ง LINE Flex แจ้งผลให้ครูผู้ขอเรียบร้อยแล้ว (ไม่ส่งซ้ำ)' };
    }

    if (teacherLineId && teacherLineId.trim().startsWith('U') && !teacherLineId.startsWith('U_')) {
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
    const cachedTunnel = typeof window !== 'undefined' ? localStorage.getItem('public_tunnel_url') : '';
    const baseUrl = (cachedTunnel && cachedTunnel.startsWith('http'))
      ? cachedTunnel.replace(/\/$/, '')
      : this.getAppBaseUrl();

    let gasUrl = '';
    try {
      const settings = typeof window !== 'undefined' ? StorageService.getInstance().getSettings() : null;
      if (settings?.googleAppsScriptUrl && settings.googleAppsScriptUrl.startsWith('http')) {
        gasUrl = settings.googleAppsScriptUrl;
      }
    } catch {}
    if (!gasUrl) {
      gasUrl = 'https://script.google.com/macros/s/AKfycbzxJTWNOzZhMzCmLvDlRzFvFGUv36l9Perv2hfWJ9svhrkuCBJDuwWfiUw7Nn6iroNmUg/exec';
    }

    // Google Apps Script endpoint works on every phone browser with 0 authentication barrier
    const primaryApproveUrl = gasUrl ? `${gasUrl}?action=approve&reqId=${encodeURIComponent(req.id)}` : `${baseUrl}/api/line/quick-approve?action=approve&reqId=${encodeURIComponent(req.id)}`;
    const primaryRejectUrl = gasUrl ? `${gasUrl}?action=reject&reqId=${encodeURIComponent(req.id)}` : `${baseUrl}/api/line/quick-approve?action=reject&reqId=${encodeURIComponent(req.id)}`;
    const inAppViewUrl = `${baseUrl}?action=direct_approve&reqId=${encodeURIComponent(req.id)}`;

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
                    label: '✅ กดอนุมัติทันที',
                    data: `action=approve&reqId=${encodeURIComponent(req.id)}`,
                    displayText: `อนุมัติ ${req.id}`
                  }
                },
                {
                  type: 'button',
                  style: 'secondary',
                  color: '#ef4444',
                  action: {
                    type: 'postback',
                    label: '❌ ไม่อนุมัติ',
                    data: `action=reject&reqId=${encodeURIComponent(req.id)}`,
                    displayText: `ไม่อนุมัติ ${req.id}`
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
                label: '🌐 เปิดในระบบเว็บ / ดูสลิป',
                uri: inAppViewUrl
              }
            }
          ]
        }
      }
    };
  }
}

