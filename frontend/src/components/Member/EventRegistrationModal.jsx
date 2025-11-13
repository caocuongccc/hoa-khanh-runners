import { useState } from "react";
import { X } from "lucide-react";
import { registerForEvent } from "../../services/member-service";

const EventRegistrationModal = ({ event, user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  console.log("🎯 Event data:", event); // ← THÊM LOG
  console.log("👥 Teams:", event.teams); // ← THÊM LOG
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check password nếu private
    if (event.isPrivate && password !== event.password) {
      alert("❌ Mật khẩu không đúng!");
      return;
    }

    if (!selectedTeam) {
      alert("⚠️ Vui lòng chọn team!");
      return;
    }

    setLoading(true);

    const result = await registerForEvent(
      event.id,
      user.uid,
      user.name,
      selectedTeam
    );

    if (result.success) {
      alert("✅ Đăng ký thành công!");
      onSuccess();
      onClose();
    } else {
      alert("❌ " + result.error);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Đăng ký tham gia</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {event.isPrivate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu tham gia <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn Team <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">-- Chọn team --</option>
                {event.teams?.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    disabled={team.currentMembers >= team.capacity}
                  >
                    {team.name} ({team.currentMembers}/{team.capacity})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Xác nhận đăng ký"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationModal;
