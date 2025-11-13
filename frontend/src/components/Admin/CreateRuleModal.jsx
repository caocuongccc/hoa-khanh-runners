import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getRuleGroups } from '../../services/firebase-service';

const CreateRuleModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    groupId: '',
    config: {
      type: 'distance',
      field: 'distance',
      operator: '>=',
      value: 5,
      unit: 'km'
    },
    defaults: {
      isRequired: true,
      points: 10,
      weight: 1.0
    }
  });

  useEffect(() => {
    loadRuleGroups();
  }, []);

  const loadRuleGroups = async () => {
    const result = await getRuleGroups();
    if (result.success) setRuleGroups(result.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'rules'), {
        ...formData,
        id: `rule_${Date.now()}`,
        display: {
          label: formData.name,
          placeholder: 'Nhập giá trị',
          inputType: 'number',
          icon: '⭐',
          allowCustomValue: true
        },
        stats: {
          usageCount: 0,
          popularityScore: 0
        },
        isActive: true,
        isSystem: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      alert('✅ Tạo rule thành công!');
      onSuccess();
      onClose();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Tạo Rule Mới</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên Rule (Tiếng Việt) *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="VD: Tối thiểu 10km mỗi lần"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên Rule (English)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.nameEn}
                onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                placeholder="Minimum 10km per run"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm Rule *</label>
              <select
                required
                value={formData.groupId}
                onChange={(e) => setFormData({...formData, groupId: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">-- Chọn nhóm --</option>
                {ruleGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.icon} {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại *</label>
                <select
                  value={formData.config.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {...formData.config, type: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="distance">Khoảng cách</option>
                  <option value="pace">Pace</option>
                  <option value="elevation">Độ cao</option>
                  <option value="activity_count">Số lần chạy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị mặc định *</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.config.value}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {...formData.config, value: parseFloat(e.target.value)}
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm *</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.defaults.points}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaults: {...formData.defaults, points: parseInt(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={formData.defaults.isRequired}
                    onChange={(e) => setFormData({
                      ...formData,
                      defaults: {...formData.defaults, isRequired: e.target.checked}
                    })}
                  />
                  Bắt buộc
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : 'Tạo Rule'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRuleModal;