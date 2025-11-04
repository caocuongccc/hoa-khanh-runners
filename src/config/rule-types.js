export const RULE_TYPES = {
  // Basic Rules
  MIN_DISTANCE: {
    id: 'min_distance',
    name: 'Khoảng cách tối thiểu',
    icon: '📏',
    fields: [
      { name: 'value', label: 'Km tối thiểu', type: 'number', unit: 'km' }
    ]
  },
  
  // Multiplier Rules
  DATE_MULTIPLIER: {
    id: 'date_multiplier',
    name: 'Nhân điểm theo ngày',
    icon: '🎯',
    fields: [
      { name: 'dates', label: 'Chọn ngày', type: 'multi-date' },
      { name: 'multiplier', label: 'Hệ số nhân', type: 'number', min: 2, max: 10 }
    ]
  },
  
  // Progressive Rules
  DAILY_GROWTH: {
    id: 'daily_growth',
    name: 'Tăng trưởng hàng ngày',
    icon: '📈',
    fields: [
      { name: 'minIncrease', label: 'Tăng tối thiểu', type: 'number', unit: 'km' },
      { name: 'scope', label: 'Áp dụng cho', type: 'select', options: ['individual', 'team'] }
    ]
  },
  
  WEEKLY_GROWTH_PERCENT: {
    id: 'weekly_growth_percent',
    name: 'Tăng % theo tuần',
    icon: '📊',
    fields: [
      { name: 'minPercent', label: 'Tăng tối thiểu (%)', type: 'number', min: 0, max: 100 },
      { name: 'scope', label: 'Áp dụng cho', type: 'select', options: ['individual', 'team'] }
    ]
  }
};