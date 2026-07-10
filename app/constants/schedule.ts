export const icons = [
  {
    name: 'mdi:check-circle-outline',
    title: 'OK',
    code: '01',
  },
  {
    name: 'mdi:close-circle-outline',
    title: 'NG',
    code: '02',
  },
  {
    name: 'mdi:account-group',
    title: '会議',
    code: '11',
  },
  {
    name: 'mdi:walk',
    title: '外出',
    code: '21',
  },
  {
    name: 'mdi:alert',
    title: '重要',
    code: '31',
  },
  {
    name: 'mdi:phone',
    title: '電話',
    code: '41',
  },
  {
    name: 'mdi:account',
    title: '来客',
    code: '51',
  },
  {
    name: 'mdi:car',
    title: '車',
    code: '61',
  },
  {
    name: 'mdi:train',
    title: '電車',
    code: '71',
  },
  {
    name: 'mdi:airplane',
    title: '飛行機',
    code: '81',
  },
  {
    name: 'mdi:office-building',
    title: 'ビル・ホテル',
    code: '91',
  },
  {
    name: 'mdi:bag-suitcase',
    title: '出張・旅行',
    code: '92',
  },
  {
    name: 'mdi:web',
    title: 'ウェブ',
    code: '93',
  },
]

export const coloredIcons = [
  {
    name: 'check-circle-outline',
    title: 'OK',
    code: '03',
  },
  {
    name: 'close-circle-outline',
    title: 'NG',
    code: '04',
  },
  {
    name: 'account-group',
    title: '会議',
    code: '12',
  },
  {
    name: 'walk',
    title: '外出',
    code: '22',
  },
  {
    name: 'alert',
    title: '重要',
    code: '32',
  },
  {
    name: 'phone',
    title: '電話',
    code: '42',
  },
  {
    name: 'account',
    title: '来客',
    code: '52',
  },
  {
    name: 'car',
    title: '車',
    code: '62',
  },
  {
    name: 'train',
    title: '電車',
    code: '72',
  },
  {
    name: 'airplane',
    title: '飛行機',
    code: '82',
  },
  {
    name: 'office-building',
    title: 'ビル・ホテル',
    code: '94',
  },
  {
    name: 'bag-suitcase',
    title: '出張・旅行',
    code: '95',
  },
  {
    name: 'web',
    title: 'ウェブ',
    code: '96',
  },
]

export const textColors = [
  '000000',
  '4D4D4D',
  '800000',
  '008000',
  '000080',
  '800080',
  'FF0000',
  'FF00FF',
]

export const SCHEDULE_CODES = {
  PERSONAL: 1,
  MEETING: 4,
  TODO: 2,
}

export const SCHEDULE_CODE_LABEL_MAP = {
  [SCHEDULE_CODES.PERSONAL]: '個人',
  [SCHEDULE_CODES.MEETING]: '会議',
  [SCHEDULE_CODES.TODO]: 'ToDo',
}

export const SCHEDULE_TYPE_LIST = [
  {
    value: SCHEDULE_CODES.PERSONAL,
    label: SCHEDULE_CODE_LABEL_MAP[SCHEDULE_CODES.PERSONAL],
  },
  {
    value: SCHEDULE_CODES.MEETING,
    label: SCHEDULE_CODE_LABEL_MAP[SCHEDULE_CODES.MEETING],
  },
  {
    value: SCHEDULE_CODES.TODO,
    label: SCHEDULE_CODE_LABEL_MAP[SCHEDULE_CODES.TODO],
  },
]

export const ATTENDANCE_CODES = {
  ATTENDANCE: '01',
  ABSENCE: '02',
  NONE: '03',
}

export const ATTENDANCE_CODE_LABEL_MAP = {
  [ATTENDANCE_CODES.ATTENDANCE]: '出席',
  [ATTENDANCE_CODES.ABSENCE]: '欠席',
  [ATTENDANCE_CODES.NONE]: '未定',
}
