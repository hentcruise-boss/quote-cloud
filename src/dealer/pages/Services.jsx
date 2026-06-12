import React from 'react'
import { Map, Crown, Headset } from 'lucide-react'
import { useAuth } from '../../lib/auth'

// 服務全圖（A/B/C/D 四檔）—— 行銷頁，引導升級 D 全程代辦
const TIERS = [
  {
    key: 'A', name: '內地代購', price: '內地出廠價',
    terms: [['裝櫃時間', '無限制'], ['訂購數量', '整櫃出貨'], ['付款條件', '訂金 30%，餘款付清後裝櫃'], ['交貨地點', '可拆櫃工地']],
    yours: '進出口資格 · 跨境物流 · 拆櫃 · 物流 · 組裝',
  },
  {
    key: 'B', name: '到台自取', price: '台灣落地價',
    terms: [['裝櫃時間', '生產答交'], ['訂購數量', '有 MOQ，併櫃回台'], ['付款條件', '訂金 30%，到貨當月底匯款'], ['交貨地點', '當周拆櫃地點（不可指定）']],
    yours: '拆櫃人員 · 物流 · 自有倉庫',
  },
  {
    key: 'C', name: '入庫代管', price: '台灣出廠價', current: true,
    terms: [['裝櫃時間', '每周一櫃'], ['訂購數量', '無 MOQ，併櫃回台'], ['付款條件', '訂金 30%，入庫次月 10 號前匯款'], ['交貨地點', '木美家樹林倉']],
    yours: '物流 · 組裝人員',
  },
  {
    key: 'D', name: '全程代辦', price: '現場完工價', gold: true,
    terms: [['付款條件', '月結 30 天'], ['服務範圍', '配送到府 · 現場安裝 · 垃圾清運']],
    yours: null,
  },
]

export default function Services() {
  const { dealer } = useAuth()

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-lg font-bold text-stone-800"><Map className="h-5 w-5 text-teal-700" />服務全圖</h1>

      <div className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-700 p-5 text-white">
        <div className="text-lg font-bold">在你身後 · 助你向前</div>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-300">
          你專心向前沖，後面 16 件煩心事我們來——金流、產品、信息、倉庫、物流、人力，我們準備。
        </p>
        <div className="mt-3 space-y-1 rounded-xl bg-white/10 p-3 text-xs leading-relaxed">
          <div><span className="text-amber-300">您支付的</span>　僅僅是貨物出廠價 ＋ 我們替您處理的服務成本</div>
          <div><span className="text-amber-300">您得到的</span>　完成更大的業務目標 ＋ 不必增加現有的沈重負擔</div>
        </div>
      </div>

      <div className="space-y-3">
        {TIERS.map(t => (
          <div key={t.key} className={`rounded-2xl border p-4 ${t.gold ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-white' : t.current ? 'border-teal-400 bg-teal-50/40' : 'border-stone-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className={`font-serif text-2xl font-black ${t.gold ? 'text-amber-600' : 'text-teal-800'}`}>{t.key}</span>
                <span className="text-base font-bold text-stone-800">{t.name}</span>
                {t.gold && <Crown className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="flex items-center gap-2">
                {t.current && <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-[10px] font-bold text-white">您目前的檔位</span>}
                <span className={`text-sm font-bold ${t.gold ? 'text-amber-700' : 'text-stone-600'}`}>{t.price}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {t.terms.map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="w-16 flex-shrink-0 text-xs leading-5 text-stone-400">{k}</span>
                  <span className="text-stone-700">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-stone-100 pt-2 text-xs">
              {t.yours ? (
                <span className="text-stone-500">你來搞定：<b className="text-stone-700">{t.yours}</b></span>
              ) : (
                <span className="font-bold text-amber-700">不用準備 · 只出一張嘴</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* D 檔升級導購 */}
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
        <div className="flex items-center gap-2 text-base font-bold text-amber-900"><Crown className="h-5 w-5 text-amber-500" />想升級「D 全程代辦」？</div>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
          配送到府、現場安裝、垃圾清運全包，<b>月結 30 天</b>——把人力物流全部交給我們，您只需要接單。
          點右下角「聯絡專員」，{dealer?.rep_name || '專員'}會為您評估升級方案。
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700">
          <Headset className="h-4 w-4" />已助力客戶業績<b className="text-base">翻倍</b> · 兩岸一條龍服務 · 台灣 1987 至今
        </div>
      </div>
    </div>
  )
}
