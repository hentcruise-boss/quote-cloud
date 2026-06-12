// 三組對外標準格式的銀行/收款帳戶。
//   type = 'TW'：戶名 / 銀行 / 帳號
//   type = 'OVERSEAS'：Beneficiary / Bank / SWIFT / A/C (USD) / A/C (CNY)
// dealers.bank_account_key 指向其中一個 key；訂單收款卡會帶該帳戶。

export const BANK_ACCOUNTS = {
  mmj_tw: {
    type: 'TW',
    label: '木美家（台幣）',
    name:  '木美家創意家具有限公司',
    bank:  '土地銀行 泰山分行',
    bankCode: '005-1345',
    account: '1340 0100 6980',
  },
  xd_tw: {
    type: 'TW',
    label: '祥鼎（台幣）',
    name:  '祥鼎辦公家具有限公司',
    bank:  '土地銀行 泰山分行',
    bankCode: '005-1345',
    account: '1340 0100 6661',
  },
  qy_overseas: {
    type: 'OVERSEAS',
    label: '清遠順貿（USD / CNY）',
    beneficiary: '清远顺贸进出口贸易有限公司',
    bank:  'Industrial and Commercial Bank of China, Guangzhou Zhongsheng Sub-branch',
    swift: 'ICBCCNBJGDG',
    usd:   '3602 1781 0910 0349 186',
    cny:   '3602 1781 0910 0346 589',
  },
}

export const DEFAULT_BANK_KEY = 'mmj_tw'

export const bankAccount = (key) => BANK_ACCOUNTS[key] || BANK_ACCOUNTS[DEFAULT_BANK_KEY]

export const BANK_KEYS = Object.keys(BANK_ACCOUNTS)

// 向後相容：給尚未改用 bankAccount() 的舊程式碼用
export const BANK_INFO = (() => {
  const a = BANK_ACCOUNTS.mmj_tw
  return {
    bank: a.bank, bankCode: a.bankCode, branch: a.bank.split(' ')[1] || '',
    account: a.account, name: a.name,
    note: '請於匯款時於備註填上訂單編號，方便對帳。',
  }
})()
