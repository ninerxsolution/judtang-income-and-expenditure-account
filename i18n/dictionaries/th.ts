export const thDictionary = {
  common: {
    appName: "Judtang",
    appDescription:
      "Judtang คือแพลตฟอร์มสำหรับบันทึกและจัดการรายรับรายจ่าย ทั้งส่วนตัวและในองค์กรได้อย่างมีประสิทธิภาพ",
    language: {
      english: "อังกฤษ",
      thai: "ไทย",
    },
    actions: {
      save: "บันทึก",
      cancel: "ยกเลิก",
      close: "ปิด",
      back: "ย้อนกลับ",
      open: "เปิด",
      add: "เพิ่ม",
      edit: "แก้ไข",
      delete: "ลบ",
    },
    time: {
      justNow: "เมื่อสักครู่",
      minutesAgo: "{count} นาทีที่แล้ว",
      hoursAgo: "{count} ชั่วโมงที่แล้ว",
      daysAgo: "{count} วันที่แล้ว",
    },
  },
  auth: {
    signIn: {
      title: "เข้าสู่ระบบ",
      subtitle: "เข้าสู่ระบบเพื่อใช้งานแดชบอร์ด Judtang",
      emailLabel: "อีเมล",
      passwordLabel: "รหัสผ่าน",
      submit: "เข้าสู่ระบบ",
      noAccount: "ยังไม่มีบัญชีใช่ไหม?",
      registerCta: "สร้างบัญชีใหม่",
    },
    register: {
      title: "สร้างบัญชีใหม่",
      subtitle: "ลงทะเบียนเพื่อเริ่มบันทึกรายรับรายจ่าย",
      nameLabel: "ชื่อ",
      emailLabel: "อีเมล",
      passwordLabel: "รหัสผ่าน",
      confirmPasswordLabel: "ยืนยันรหัสผ่าน",
      submit: "สร้างบัญชี",
      haveAccount: "มีบัญชีอยู่แล้ว?",
      signInCta: "เข้าสู่ระบบ",
    },
    logout: {
      button: "ออกจากระบบ",
    },
  },
  dashboard: {
    sidebar: {
      dashboard: "แดชบอร์ด",
      calendar: "ปฏิทิน",
      transactions: "รายการบันทึก",
      newTransaction: "บันทึกรายการใหม่",
      transactionsList: "ดูรายการทั้งหมด",
      tools: "เครื่องมือ",
      settings: "การตั้งค่า",
      activityLog: "ประวัติกิจกรรม",
    },
    pageTitle: {
      dashboard: "แดชบอร์ด",
      calendar: "ปฏิทิน",
      transactionsNew: "บันทึกรายรับรายจ่าย",
      transactionsList: "รายการรายรับรายจ่าย",
      tools: "เครื่องมือ",
      settings: "การตั้งค่า",
      activityLog: "ประวัติกิจกรรม",
      sessions: "เซสชัน",
    },
  },
  settings: {
    title: "การตั้งค่า",
    description: "จัดการประวัติกิจกรรม เครื่องมือข้อมูล และเซสชันที่ใช้งานอยู่",
    language: {
      title: "ภาษา",
      titleWithNative: "ภาษา / Language",
      description: "เลือกภาษาที่ต้องการใช้ในส่วนติดต่อผู้ใช้",
      optionEnglish: "English",
      optionThai: "ภาษาไทย",
      helper: "การตั้งค่านี้จะมีผลกับทั้งแดชบอร์ด",
    },
    activityLog: {
      title: "ประวัติกิจกรรม",
      description: "ดูประวัติกิจกรรมสำคัญทั้งหมดในบัญชีของคุณ",
      open: "เปิดประวัติกิจกรรม",
    },
    sessions: {
      title: "เซสชัน",
      description: "ตรวจสอบและยกเลิกเซสชันที่กำลังใช้งานในบัญชีของคุณได้อย่างรวดเร็ว",
      loading: "กำลังโหลดรายการเซสชัน…",
      error: "ไม่สามารถโหลดรายการเซสชันได้",
      empty: "ไม่มีเซสชันที่กำลังใช้งาน",
      thisDevice: "(อุปกรณ์นี้)",
      lastActivePrefix: "ใช้งานล่าสุด {relative}",
      otherDevicesSummarySingular: "{count} เซสชันบนอุปกรณ์อื่น",
      otherDevicesSummaryPlural: "{count} เซสชันบนอุปกรณ์อื่น",
      manageAll: "จัดการเซสชันทั้งหมด",
      revoke: "ยกเลิก",
    },
  },
};

export type ThDictionary = typeof thDictionary;

