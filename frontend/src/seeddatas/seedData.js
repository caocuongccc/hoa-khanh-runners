// ============================================
// FILE: src/seedData.js
// Chạy file này 1 lần để import dữ liệu mẫu vào Firebase
// ============================================

import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from './services/firebase-config';

// ===== DỮ LIỆU MẪU =====

// 1. Rule Groups
const ruleGroups = [
  {
    id: 'group_distance',
    name: 'Khoảng cách',
    nameEn: 'Distance',
    description: 'Các rules liên quan đến khoảng cách chạy',
    icon: '🏃',
    color: '#3B82F6',
    order: 1,
    isActive: true
  },
  {
    id: 'group_pace',
    name: 'Tốc độ/Pace',
    nameEn: 'Pace',
    description: 'Các rules liên quan đến tốc độ chạy',
    icon: '⚡',
    color: '#10B981',
    order: 2,
    isActive: true
  },
  {
    id: 'group_elevation',
    name: 'Độ cao',
    nameEn: 'Elevation',
    description: 'Các rules liên quan đến độ cao',
    icon: '⛰️',
    color: '#F59E0B',
    order: 3,
    isActive: true
  },
  {
    id: 'group_frequency',
    name: 'Tần suất',
    nameEn: 'Frequency',
    description: 'Các rules liên quan đến tần suất chạy',
    icon: '📊',
    color: '#8B5CF6',
    order: 4,
    isActive: true
  },
  {
    id: 'group_special',
    name: 'Đặc biệt',
    nameEn: 'Special',
    description: 'Các rules đặc biệt',
    icon: '⭐',
    color: '#EC4899',
    order: 5,
    isActive: true
  }
];

// 2. Rules
const rules = [
  // Distance rules
  {
    id: 'rule_min_distance_5km',
    name: 'Tối thiểu 5km mỗi lần',
    nameEn: 'Minimum 5km per run',
    description: 'Mỗi hoạt động phải có khoảng cách tối thiểu 5km',
    groupId: 'group_distance',
    config: {
      type: 'distance',
      field: 'distance',
      operator: '>=',
      value: 5,
      unit: 'km'
    },
    display: {
      label: 'Khoảng cách tối thiểu',
      placeholder: 'Nhập khoảng cách (km)',
      inputType: 'number',
      icon: '📏',
      allowCustomValue: true
    },
    defaults: {
      isRequired: true,
      points: 10,
      weight: 1.0
    },
    validation: {
      minValue: 0,
      maxValue: 100,
      step: 0.1
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule_distance_range',
    name: 'Khoảng cách 5-42km',
    nameEn: 'Distance between 5-42km',
    description: 'Mỗi hoạt động phải nằm trong khoảng 5-42km',
    groupId: 'group_distance',
    config: {
      type: 'distance',
      field: 'distance',
      operator: 'between',
      value: { min: 5, max: 42 },
      unit: 'km'
    },
    display: {
      label: 'Khoảng cách từ-đến',
      placeholder: 'Nhập khoảng (km)',
      inputType: 'range',
      icon: '📏',
      allowCustomValue: true
    },
    defaults: {
      isRequired: false,
      points: 15,
      weight: 1.2
    },
    validation: {
      minValue: 0,
      maxValue: 100,
      step: 0.1
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule_total_distance',
    name: 'Tổng khoảng cách tối thiểu',
    nameEn: 'Minimum total distance',
    description: 'Tổng khoảng cách trong sự kiện phải đạt tối thiểu',
    groupId: 'group_distance',
    config: {
      type: 'total_distance',
      field: 'distance',
      operator: '>=',
      value: 100,
      unit: 'km',
      aggregate: 'sum'
    },
    display: {
      label: 'Tổng km tối thiểu',
      placeholder: 'Nhập tổng km',
      inputType: 'number',
      icon: '🎯',
      allowCustomValue: true
    },
    defaults: {
      isRequired: true,
      points: 50,
      weight: 2.0
    },
    validation: {
      minValue: 10,
      maxValue: 1000,
      step: 5
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  
  // Pace rules
  {
    id: 'rule_max_pace',
    name: 'Pace không quá 7:00/km',
    nameEn: 'Max pace 7:00/km',
    description: 'Pace trung bình không được vượt quá 7:00/km',
    groupId: 'group_pace',
    config: {
      type: 'pace',
      field: 'pace.average',
      operator: '<=',
      value: 420,
      unit: 's/km'
    },
    display: {
      label: 'Pace tối đa',
      placeholder: 'VD: 420 (7:00/km)',
      inputType: 'number',
      icon: '⚡',
      allowCustomValue: true
    },
    defaults: {
      isRequired: false,
      points: 10,
      weight: 1.0
    },
    validation: {
      minValue: 180,
      maxValue: 600,
      step: 5
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  
  // Elevation rules
  {
    id: 'rule_min_elevation',
    name: 'Độ cao tối thiểu 100m',
    nameEn: 'Minimum elevation 100m',
    description: 'Mỗi hoạt động phải có độ cao tối thiểu 100m',
    groupId: 'group_elevation',
    config: {
      type: 'elevation',
      field: 'elevation.total',
      operator: '>=',
      value: 100,
      unit: 'm'
    },
    display: {
      label: 'Độ cao tối thiểu',
      placeholder: 'Nhập độ cao (m)',
      inputType: 'number',
      icon: '⛰️',
      allowCustomValue: true
    },
    defaults: {
      isRequired: false,
      points: 15,
      weight: 1.5
    },
    validation: {
      minValue: 0,
      maxValue: 5000,
      step: 10
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  
  // Frequency rules
  {
    id: 'rule_min_activities',
    name: 'Tối thiểu 10 lần chạy',
    nameEn: 'Minimum 10 activities',
    description: 'Phải hoàn thành tối thiểu 10 hoạt động',
    groupId: 'group_frequency',
    config: {
      type: 'activity_count',
      field: 'count',
      operator: '>=',
      value: 10,
      unit: 'lần'
    },
    display: {
      label: 'Số lần chạy tối thiểu',
      placeholder: 'Nhập số lần',
      inputType: 'number',
      icon: '🔢',
      allowCustomValue: true
    },
    defaults: {
      isRequired: true,
      points: 20,
      weight: 1.0
    },
    validation: {
      minValue: 1,
      maxValue: 100,
      step: 1
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  
  // Special rules
  {
    id: 'rule_morning_run',
    name: 'Chạy buổi sáng (5h-7h)',
    nameEn: 'Morning run (5am-7am)',
    description: 'Hoạt động phải diễn ra trong khoảng 5h-7h sáng',
    groupId: 'group_special',
    config: {
      type: 'time_of_day',
      field: 'startDateTime',
      operator: 'between',
      value: { start: '05:00', end: '07:00' },
      unit: 'time'
    },
    display: {
      label: 'Khung giờ chạy',
      placeholder: 'Chọn giờ',
      inputType: 'time',
      icon: '🌅',
      allowCustomValue: true
    },
    defaults: {
      isRequired: false,
      points: 5,
      weight: 0.5
    },
    validation: {
      minValue: null,
      maxValue: null,
      step: null
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  },
  {
    id: 'rule_streak',
    name: 'Chạy liên tục 7 ngày',
    nameEn: 'Run streak 7 days',
    description: 'Chạy liên tục ít nhất 7 ngày không nghỉ',
    groupId: 'group_special',
    config: {
      type: 'streak',
      field: 'consecutive_days',
      operator: '>=',
      value: 7,
      unit: 'ngày'
    },
    display: {
      label: 'Số ngày chạy liên tục',
      placeholder: 'Nhập số ngày',
      inputType: 'number',
      icon: '🔥',
      allowCustomValue: true
    },
    defaults: {
      isRequired: false,
      points: 30,
      weight: 2.0
    },
    validation: {
      minValue: 2,
      maxValue: 365,
      step: 1
    },
    stats: {
      usageCount: 0,
      popularityScore: 0
    },
    isActive: true,
    isSystem: true
  }
];

// 3. Events mẫu
const events = [
  {
    name: 'CHALLENGE "CHẠY ĐÓN TẾT" 2025',
    description: 'Nối tiếp thành công của các challenge trước, chúng ta tiếp tục với thử thách chạy đón Tết Nguyên Đán 2025. Hãy cùng nhau tích lũy km để đón một năm mới tràn đầy năng lượng!',
    media: {
      coverImage: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      gallery: []
    },
    startDate: '2025-01-06',
    endDate: '2025-02-02',
    timezone: 'Asia/Ho_Chi_Minh',
    registration: {
      isOpen: true,
      maxParticipants: null,
      currentParticipants: 0,
      registrationDeadline: '2025-01-05'
    },
    scoring: {
      enabled: true,
      method: 'points'
    },
    status: 'active'
  },
  {
    name: 'The Last Man Standing 2024 - MÙA BA',
    description: 'TLMS là một trong số các sự kiện nổi bật do CLB Hòa Khánh Runners tổ chức. Thử thách về sức bền và ý chí với format độc đáo.',
    media: {
      coverImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800',
      thumbnail: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400',
      gallery: []
    },
    startDate: '2024-11-01',
    endDate: '2024-11-24',
    timezone: 'Asia/Ho_Chi_Minh',
    registration: {
      isOpen: false,
      maxParticipants: 100,
      currentParticipants: 89,
      registrationDeadline: '2024-10-31'
    },
    scoring: {
      enabled: true,
      method: 'distance'
    },
    status: 'completed'
  }
];

// ===== FUNCTIONS IMPORT =====

export const seedRuleGroups = async () => {
  console.log('🌱 Đang import Rule Groups...');
  
  try {
    const batch = writeBatch(db);
    
    ruleGroups.forEach((group) => {
      const docRef = doc(db, 'ruleGroups', group.id);
      batch.set(docRef, {
        ...group,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
    console.log(`✅ Import thành công ${ruleGroups.length} rule groups`);
    return { success: true, count: ruleGroups.length };
  } catch (error) {
    console.error('❌ Lỗi import rule groups:', error);
    return { success: false, error: error.message };
  }
};

export const seedRules = async () => {
  console.log('🌱 Đang import Rules...');
  
  try {
    const batch = writeBatch(db);
    
    rules.forEach((rule) => {
      const docRef = doc(db, 'rules', rule.id);
      batch.set(docRef, {
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
    console.log(`✅ Import thành công ${rules.length} rules`);
    return { success: true, count: rules.length };
  } catch (error) {
    console.error('❌ Lỗi import rules:', error);
    return { success: false, error: error.message };
  }
};

export const seedEvents = async () => {
  console.log('🌱 Đang import Events...');
  
  try {
    let count = 0;
    
    for (const event of events) {
      await addDoc(collection(db, 'events'), {
        ...event,
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      count++;
    }
    
    console.log(`✅ Import thành công ${count} events`);
    return { success: true, count: count };
  } catch (error) {
    console.error('❌ Lỗi import events:', error);
    return { success: false, error: error.message };
  }
};

// Hàm chạy tất cả
export const seedAll = async () => {
  console.log('🚀 BẮT ĐẦU IMPORT DỮ LIỆU MẪU...\n');
  
  const results = {
    ruleGroups: await seedRuleGroups(),
    rules: await seedRules(),
    events: await seedEvents()
  };
  
  console.log('\n📊 KẾT QUẢ:');
  console.log('Rule Groups:', results.ruleGroups);
  console.log('Rules:', results.rules);
  console.log('Events:', results.events);
  
  const allSuccess = Object.values(results).every(r => r.success);
  
  if (allSuccess) {
    console.log('\n🎉 HOÀN THÀNH! Tất cả dữ liệu đã được import thành công.');
  } else {
    console.log('\n⚠️ CÓ MỘT SỐ LỖI. Vui lòng kiểm tra logs ở trên.');
  }
  
  return results;
};