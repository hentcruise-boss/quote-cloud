// 共用常數 (從原 App.jsx 抽出)

export const SPACE_TYPES = ['總裁室','高管室','主管室','職員區','會議室','儲物室','培訓室','公共區','櫃台','茶水間']

export const EMPTY_PRODUCT = {
  sku:'', name:'', spaces:[], spec:'', material:'', price:0, cost:0, vendor:'',
  lead_time:'', volume:'', weight:'', assembly_fee:'', logistics_fee:'', labor_hours:'',
}

// 案件階段 (看板欄位順序)。badge/dot 用完整 class 字串, 確保 Tailwind 不被 purge。
export const STAGES = [
  { key:'initiation', label:'立項',     badge:'bg-slate-50 text-slate-600 border-slate-200',     dot:'bg-slate-400'   },
  { key:'presales',   label:'售前/報價', badge:'bg-indigo-50 text-indigo-700 border-indigo-200',   dot:'bg-indigo-500'  },
  { key:'contract',   label:'簽約',     badge:'bg-violet-50 text-violet-700 border-violet-200',   dot:'bg-violet-500'  },
  { key:'production', label:'生產',     badge:'bg-amber-50 text-amber-700 border-amber-200',      dot:'bg-amber-500'   },
  { key:'delivery',   label:'交貨/安裝', badge:'bg-orange-50 text-orange-700 border-orange-200',   dot:'bg-orange-500'  },
  { key:'inspection', label:'QC驗收',   badge:'bg-cyan-50 text-cyan-700 border-cyan-200',         dot:'bg-cyan-500'    },
  { key:'aftersales', label:'售後',     badge:'bg-teal-50 text-teal-700 border-teal-200',         dot:'bg-teal-500'    },
  { key:'closed',     label:'結案',     badge:'bg-emerald-50 text-emerald-700 border-emerald-200', dot:'bg-emerald-500' },
  { key:'lost',       label:'流失',     badge:'bg-rose-50 text-rose-700 border-rose-200',         dot:'bg-rose-400'    },
]
export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))
// 看板主要顯示的階段 (結案/流失收在最後)
export const BOARD_STAGES = STAGES

export const STATUSES = [
  { key:'active',  label:'進行中' },
  { key:'on_hold', label:'暫停'   },
  { key:'closed',  label:'已結案' },
  { key:'lost',    label:'已流失' },
]
export const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]))

export const ROLES = [
  { key:'admin',    label:'管理員'        },
  { key:'staff',    label:'內部員工'      },
  { key:'customer', label:'客戶'          },
  { key:'supplier', label:'供應商/工廠'   },
  { key:'field',    label:'現場人員'      },
]
export const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.key, r]))
export const INTERNAL_ROLES = ['admin','staff']

// 時間軸事件類型 → 顯示文字
export const EVENT_LABELS = {
  created:        '建立案件',
  stage_changed:  '階段變更',
  status_changed: '狀態變更',
  quote_sent:     '報價送出',
  quote_accepted: '報價接受',
  comment:        '留言',
  attachment:     '上傳檔案',
  note:           '備註',
}

// ── 第三階段:生產 / QC / 交貨 ──────────────────────────────
export const PRODUCTION_STATUS = [
  { key:'pending',     label:'待生產', badge:'bg-slate-100 text-slate-600'  },
  { key:'in_progress', label:'生產中', badge:'bg-amber-100 text-amber-700'  },
  { key:'done',        label:'完成',   badge:'bg-emerald-100 text-emerald-700' },
  { key:'blocked',     label:'卡關',   badge:'bg-rose-100 text-rose-700'    },
]
export const PRODUCTION_STATUS_MAP = Object.fromEntries(PRODUCTION_STATUS.map(s => [s.key, s]))

export const QC_RESULT = [
  { key:'pending', label:'未檢',   badge:'bg-slate-100 text-slate-600' },
  { key:'pass',    label:'合格',   badge:'bg-emerald-100 text-emerald-700' },
  { key:'fail',    label:'不合格', badge:'bg-rose-100 text-rose-700' },
  { key:'na',      label:'不適用', badge:'bg-slate-100 text-slate-400' },
]
export const QC_RESULT_MAP = Object.fromEntries(QC_RESULT.map(s => [s.key, s]))

export const DELIVERY_STATUS = [
  { key:'pending',   label:'待交貨', badge:'bg-slate-100 text-slate-600' },
  { key:'delivered', label:'已送達', badge:'bg-amber-100 text-amber-700' },
  { key:'signed',    label:'已簽收', badge:'bg-emerald-100 text-emerald-700' },
]
export const DELIVERY_STATUS_MAP = Object.fromEntries(DELIVERY_STATUS.map(s => [s.key, s]))

// QC 預設檢查表
export const QC_TEMPLATE = [
  '外觀無刮傷/破損',
  '尺寸符合規格',
  '顏色/材質正確',
  '五金配件齊全',
  '功能正常(抽屜/門/升降)',
  '安裝穩固、水平',
  '現場清潔完成',
]

// ── 第四階段:售後工單 ──────────────────────────────────────
export const TICKET_STATUS = [
  { key:'open',        label:'待處理', badge:'bg-amber-100 text-amber-700'   },
  { key:'in_progress', label:'處理中', badge:'bg-indigo-100 text-indigo-700' },
  { key:'resolved',    label:'已解決', badge:'bg-emerald-100 text-emerald-700' },
  { key:'closed',      label:'已結案', badge:'bg-slate-100 text-slate-500'   },
]
export const TICKET_STATUS_MAP = Object.fromEntries(TICKET_STATUS.map(s => [s.key, s]))

export const TICKET_PRIORITY = [
  { key:'low',    label:'低',   badge:'bg-slate-100 text-slate-500' },
  { key:'normal', label:'一般', badge:'bg-sky-100 text-sky-700'     },
  { key:'high',   label:'緊急', badge:'bg-rose-100 text-rose-700'   },
]
export const TICKET_PRIORITY_MAP = Object.fromEntries(TICKET_PRIORITY.map(s => [s.key, s]))

export const TICKET_CATEGORY = [
  { key:'warranty',  label:'保固'     },
  { key:'service',   label:'維修服務' },
  { key:'complaint', label:'客訴'     },
  { key:'other',     label:'其他'     },
]
export const TICKET_CATEGORY_MAP = Object.fromEntries(TICKET_CATEGORY.map(s => [s.key, s]))
