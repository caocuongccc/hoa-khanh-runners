// FILE: src/components/Admin/SeedDataPage.jsx
// Trang để import dữ liệu mẫu vào Firebase

import React, { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const SeedDataPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [step, setStep] = useState(1);

  // Dữ liệu mẫu
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
      description: 'Các rules liên quan đến tốc độ',
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
      description: 'Các rules liên quan đến tần suất',
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

  const rules = [
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
      stats: {
        usageCount: 0,
        popularityScore: 0
      },
      isActive: true,
      isSystem: true
    },
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
      stats: {
        usageCount: 0,
        popularityScore: 0
      },
      isActive: true,
      isSystem: true
    },
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
      stats: {
        usageCount: 0,
        popularityScore: 0
      },
      isActive: true,
      isSystem: true
    },
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
      stats: {
        usageCount: 0,
        popularityScore: 0
      },
      isActive: true,
      isSystem: true
    }
  ];

  const seedRuleGroups = async () => {
    try {
      const batch = writeBatch(db);
      
      ruleGroups.forEach((group) => {
        const docRef = doc(db, 'ruleGroups', group.id);
        batch.set(docRef, {
          ...group,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      return { success: true, count: ruleGroups.length };
    } catch (error) {
      console.error('Error seeding rule groups:', error);
      return { success: false, error: error.message };
    }
  };

  const seedRules = async () => {
    try {
      const batch = writeBatch(db);
      
      rules.forEach((rule) => {
        const docRef = doc(db, 'rules', rule.id);
        batch.set(docRef, {
          ...rule,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
      
      await batch.commit();
      return { success: true, count: rules.length };
    } catch (error) {
      console.error('Error seeding rules:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSeedAll = async () => {
    setLoading(true);
    setResults(null);
    setStep(1);

    try {
      // Step 1: Rule Groups
      setStep(1);
      const groupsResult = await seedRuleGroups();
      
      if (!groupsResult.success) {
        setResults({ error: true, message: groupsResult.error });
        setLoading(false);
        return;
      }

      // Step 2: Rules
      setStep(2);
      const rulesResult = await seedRules();
      
      setResults({
        ruleGroups: groupsResult,
        rules: rulesResult
      });
    } catch (error) {
      setResults({ error: true, message: error.message });
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Dữ Liệu Mẫu</h1>
          <p className="text-gray-600">Tạo Rule Groups và Rules vào Firebase</p>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-900">Lưu ý quan trọng:</p>
              <ul className="text-sm text-orange-800 mt-2 space-y-1">
                <li>• Chỉ chạy script này <strong>1 lần duy nhất</strong></li>
                <li>• Script sẽ tạo: 5 Rule Groups + 5 Rules mẫu</li>
                <li>• Nếu đã có dữ liệu, script sẽ ghi đè lên</li>
              </ul>
            </div>
          </div>
        </div>

        {/* What will be created */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">📦 Dữ liệu sẽ được tạo:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div>
              <strong>Rule Groups (5):</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>🏃 Khoảng cách</li>
                <li>⚡ Tốc độ/Pace</li>
                <li>⛰️ Độ cao</li>
                <li>📊 Tần suất</li>
                <li>⭐ Đặc biệt</li>
              </ul>
            </div>
            <div className="mt-3">
              <strong>Rules (5):</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Tối thiểu 5km mỗi lần</li>
                <li>• Tổng khoảng cách tối thiểu</li>
                <li>• Pace không quá 7:00/km</li>
                <li>• Độ cao tối thiểu 100m</li>
                <li>• Tối thiểu 10 lần chạy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Import Button */}
        <button
          onClick={handleSeedAll}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all mb-4 shadow-lg ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Đang import... (Bước {step}/2)
            </span>
          ) : (
            '🚀 Import Dữ Liệu Ngay'
          )}
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Kết quả:</h3>
            
            {results.error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Có lỗi xảy ra</p>
                  <p className="text-sm text-red-700 mt-1">{results.message}</p>
                </div>
              </div>
            ) : (
              <>
                {results.ruleGroups && (
                  <div className={`border-l-4 rounded p-4 flex items-start gap-3 ${
                    results.ruleGroups.success 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}>
                    {results.ruleGroups.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        results.ruleGroups.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Rule Groups
                      </p>
                      <p className={`text-sm mt-1 ${
                        results.ruleGroups.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {results.ruleGroups.success 
                          ? `✓ Import thành công ${results.ruleGroups.count} items`
                          : `✗ ${results.ruleGroups.error}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {results.rules && (
                  <div className={`border-l-4 rounded p-4 flex items-start gap-3 ${
                    results.rules.success 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}>
                    {results.rules.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        results.rules.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Rules
                      </p>
                      <p className={`text-sm mt-1 ${
                        results.rules.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {results.rules.success 
                          ? `✓ Import thành công ${results.rules.count} items`
                          : `✗ ${results.rules.error}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {results.ruleGroups?.success && results.rules?.success && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      🎉 <strong>Hoàn thành!</strong> Bạn có thể:
                      <br />
                      <span className="block mt-2">
                        1. Đóng trang này<br />
                        2. Vào Admin Dashboard → Tab "Quản lý Rules"<br />
                        3. Xem dữ liệu vừa tạo
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">💡 Hướng dẫn:</h4>
          <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
            <li>Đảm bảo đã setup Firebase config</li>
            <li>Click nút "Import Dữ Liệu Ngay"</li>
            <li>Chờ 5-10 giây để script chạy xong</li>
            <li>Kiểm tra Firestore Console để xác nhận</li>
            <li>Vào <code className="bg-gray-100 px-2 py-0.5 rounded">/admin</code> để xem dữ liệu</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SeedDataPage;