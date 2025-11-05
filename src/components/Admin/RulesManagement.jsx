import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Layers } from "lucide-react";
import { getRules, getRuleGroups } from "../../services/firebase-service";
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

const RulesManagement = () => {
  const [rules, setRules] = useState([]);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [filteredRules, setFilteredRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRules();
  }, [rules, searchTerm, groupFilter]);

  const loadData = async () => {
    setLoading(true);
    const [rulesRes, groupsRes] = await Promise.all([
      getRules(),
      getRuleGroups(),
    ]);
    if (rulesRes.success) setRules(rulesRes.data);
    if (groupsRes.success) setRuleGroups(groupsRes.data);
    setLoading(false);
  };

  const filterRules = () => {
    let filtered = [...rules];

    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (groupFilter !== "all") {
      filtered = filtered.filter((r) => r.groupId === groupFilter);
    }

    setFilteredRules(filtered);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm("Bạn có chắc muốn xóa rule này?")) return;

    try {
      await deleteDoc(doc(db, "rules", ruleId));
      alert("✅ Xóa rule thành công!");
      loadData();
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert("❌ Lỗi: " + error.message);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Rules</h1>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Tạo rule mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm rule..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
            >
              <option value="all">Tất cả nhóm</option>
              {ruleGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Tìm thấy <strong>{filteredRules.length}</strong> rules
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Không tìm thấy rule nào</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => {
            const group = ruleGroups.find((g) => g.id === rule.groupId);
            return (
              <div
                key={rule.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{group?.icon || "📌"}</span>
                      <h3 className="font-bold text-gray-900">{rule.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {rule.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Nhóm:</span>
                    <span className="font-medium text-gray-900">
                      {group?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Loại:</span>
                    <span className="font-medium text-gray-900">
                      {rule.config?.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Điểm mặc định:</span>
                    <span className="font-medium text-blue-600">
                      {rule.defaults?.points || 0}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal - Simplified version */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingRule ? "Chỉnh sửa Rule" : "Tạo Rule mới"}
            </h2>
            <p className="text-gray-600 mb-4">
              Chức năng này đang được phát triển. Vui lòng sử dụng Firestore Console để tạo/chỉnh sửa rules.
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                setEditingRule(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesManagement;