// Modal tạo event với chọn rules từ thư viện

import React, { useState, useEffect } from "react";
import { X, Check, Image as ImageIcon } from "lucide-react";
import {
  createEvent,
  getRules,
  getRuleGroups,
} from "../../services/firebase-service";
import {
  doc,
  writeBatch,
  Timestamp,
  collection,
  updateDoc,
  query, where, getDocs
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../services/firebase";

const CreateEventModal = ({ onClose, onSuccess, eventData }) => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Teams, 3: Select Rules, 4: Review
  const [loading, setLoading] = useState(false);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [rules, setRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    startTime: "00:00", // ← THÊM
    endDate: "",
    endTime: "23:59", // ← THÊM
    status: "created", // created, active, pending, closed
    numTeams: 4,
    teamCapacity: 50,
    teams: [],
    isPrivate: false,
    password: "",
    media: {
      coverImage: "",
    },
    registration: {
      isOpen: true,
      maxParticipants: null,
      currentParticipants: 0,
    },
  });
  // ✅ Load rules 1 lần duy nhất
  useEffect(() => {
    (async () => {
      const [groupsRes, rulesRes] = await Promise.all([
        getRuleGroups(),
        getRules(),
      ]);
      if (groupsRes.success) setRuleGroups(groupsRes.data);
      if (rulesRes.success) setRules(rulesRes.data);
    })();
  }, []);

  useEffect(() => {
    if (!eventData) return;
    // Load event data khi edit
    if (eventData) {
      setFormData({
        ...formData,
        ...eventData,
        startTime: eventData.startTime || "00:00",
        endTime: eventData.endTime || "23:59",
      });

      // Load selected rules nếu có
      if (eventData.id) {
        loadEventRules(eventData.id);
      }
    }
  }, [eventData?.id]);

  const loadEventRules = async (eventId) => {
    const q = query(
      collection(db, "eventRules"),
      where("eventId", "==", eventId)
    );
    const snap = await getDocs(q);
    const rules = snap.docs.map((d) => d.data());
    setSelectedRules(rules);
  };

  const loadRulesData = async () => {
    const [groupsRes, rulesRes] = await Promise.all([
      getRuleGroups(),
      getRules(),
    ]);
    if (groupsRes.success) setRuleGroups(groupsRes.data);
    if (rulesRes.success) setRules(rulesRes.data);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (eventId) => {
    if (!imageFile) return null;

    try {
      const storageRef = ref(storage, `events/${eventId}/cover.jpg`);
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const toggleRule = (ruleId) => {
    setSelectedRules((prev) => {
      const exists = prev.find((r) => r.ruleId === ruleId);
      if (exists) {
        return prev.filter((r) => r.ruleId !== ruleId);
      } else {
        const rule = rules.find((r) => r.id === ruleId);
        return [
          ...prev,
          {
            ruleId: ruleId,
            order: prev.length + 1,
            customization: {
              isRequired: rule.defaults.isRequired,
              points: rule.defaults.points,
              weight: rule.defaults.weight,
              customValue: rule.config.value,
            },
          },
        ];
      }
    });
  };

  const updateRuleCustomization = (ruleId, field, value) => {
    setSelectedRules((prev) =>
      prev.map((r) =>
        r.ruleId === ruleId
          ? { ...r, customization: { ...r.customization, [field]: value } }
          : r
      )
    );
  };

  // 2. FIX: Đảm bảo teams được lưu với metadata đầy đủ
const handleSubmit = async () => {
  if (step < 4) {
    setStep(step + 1);
    return;
  }

  setLoading(true);
  try {
    // ✅ Đảm bảo teams có đầy đủ metadata
    const teamsWithMetadata = formData.teams.map(team => ({
      id: team.id,
      name: team.name,
      capacity: team.capacity,
      currentMembers: 0, // ← QUAN TRỌNG
      members: [] // ← Khởi tạo array rỗng
    }));

    const eventPayload = {
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate,
      startTime: formData.startTime || "00:00",
      endDate: formData.endDate,
      endTime: formData.endTime || "23:59",
      startDateTime: `${formData.startDate}T${formData.startTime || "00:00"}`,
      endDateTime: `${formData.endDate}T${formData.endTime || "23:59"}`,
      status: "created",
      teams: teamsWithMetadata, // ← Dùng teams đã chuẩn hóa
      isPrivate: formData.isPrivate || false,
      password: formData.password || "",
      media: {
        coverImage: formData.media.coverImage || "",
      },
      registration: {
        isOpen: true,
        maxParticipants: formData.registration.maxParticipants || null,
        currentParticipants: 0,
        registrationDeadline: formData.startDate,
      },
      createdBy: "admin",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log("📤 Event payload:", eventPayload);
    console.log("👥 Teams to save:", eventPayload.teams);

    let eventId;

    if (formData.id) {
      // UPDATE
      await updateDoc(doc(db, "events", formData.id), {
        ...eventPayload,
        updatedAt: Timestamp.now(),
      });
      eventId = formData.id;
      console.log("✅ Updated event:", eventId);
    } else {
      // CREATE
      const eventResult = await createEvent(eventPayload);

      if (!eventResult.success) {
        alert("Lỗi tạo sự kiện: " + eventResult.error);
        setLoading(false);
        return;
      }

      eventId = eventResult.id;
      console.log("✅ Event created with ID:", eventId);
    }

    // Upload image if exists
    if (imageFile) {
      const imageUrl = await uploadImage(eventId);
      if (imageUrl) {
        await updateDoc(doc(db, "events", eventId), {
          "media.coverImage": imageUrl,
        });
      }
    }

    // Save eventRules
    if (selectedRules.length > 0) {
      if (formData.id) {
        const oldRulesQuery = query(
          collection(db, "eventRules"),
          where("eventId", "==", eventId)
        );
        const oldRulesSnap = await getDocs(oldRulesQuery);
        const batch = writeBatch(db);
        oldRulesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      const batch = writeBatch(db);
      selectedRules.forEach((rule) => {
        const docRef = doc(collection(db, "eventRules"));
        batch.set(docRef, {
          eventId: eventId,
          ruleId: rule.ruleId,
          order: rule.order,
          customization: rule.customization,
          addedAt: Timestamp.now(),
          addedBy: "admin",
        });
      });
      await batch.commit();
    }

    const successMsg = formData.id 
      ? "✅ Cập nhật sự kiện thành công!" 
      : "✅ Tạo sự kiện thành công!";
    alert(successMsg);
    setLoading(false);
    onSuccess();
    onClose();
  } catch (error) {
    console.error("❌ Error creating event:", error);
    alert("Lỗi: " + error.message);
    setLoading(false);
  }
};

  // Step 1: Basic Info
  const BasicInfoStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tên sự kiện <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="VD: Thử thách 100km tháng 12"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          rows="4"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Mô tả chi tiết về sự kiện..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày & giờ bắt đầu <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
            <input
              type="time"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.startTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startTime: e.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày & giờ kết thúc <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
            <input
              type="time"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.endTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endTime: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ảnh bìa sự kiện
        </label>

        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview("");
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">Click để upload ảnh</p>
              <p className="text-xs text-gray-500">PNG, JPG (max 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Giới hạn số người tham gia
        </label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          value={formData.registration.maxParticipants || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              registration: {
                ...formData.registration,
                maxParticipants: e.target.value
                  ? parseInt(e.target.value)
                  : null,
              },
            })
          }
          placeholder="Để trống = không giới hạn"
        />
      </div>
      {/* Private Event */}
      <div className="border-t pt-4 mt-4">
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isPrivate}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isPrivate: e.target.checked,
                password: e.target.checked ? prev.password : "",
              }))
            }
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">
            🔒 Sự kiện Private (yêu cầu mật khẩu để tham gia)
          </span>
        </label>

        {formData.isPrivate && (
          <div className="ml-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu tham gia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required={formData.isPrivate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Nhập mật khẩu (VD: hoakhanh2025)"
            />
            <p className="text-xs text-orange-700 mt-2">
              💡 Chỉ những người biết mật khẩu mới có thể đăng ký tham gia sự
              kiện này
            </p>
          </div>
        )}
      </div>
    </div>
  );
  // 1. FIX: Auto update capacity cho tất cả teams
const TeamsStep = () => {
  console.log("🔧 Current formData.teams:", formData.teams);
  console.log("🔧 numTeams:", formData.numTeams);
  console.log("🔧 teamCapacity:", formData.teamCapacity);

  const updateTeamName = (index, name) => {
    const newTeams = [...formData.teams];
    newTeams[index] = { ...newTeams[index], name };
    setFormData({ ...formData, teams: newTeams });
  };

  const updateTeamCapacity = (index, capacity) => {
    const newTeams = [...formData.teams];
    newTeams[index] = { ...newTeams[index], capacity: parseInt(capacity) };
    setFormData({ ...formData, teams: newTeams });
  };

  const generateTeams = () => {
    const newTeams = [];
    for (let i = 1; i <= formData.numTeams; i++) {
      newTeams.push({
        id: `team_${i}`,
        name: `Team ${i}`,
        members: [],
        capacity: parseInt(formData.teamCapacity),
        currentMembers: 0,
      });
    }
    console.log("✨ Generated teams:", newTeams);
    setFormData({ ...formData, teams: newTeams });
  };

  if (formData.teams.length !== formData.numTeams) {
    generateTeams();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Cấu hình Teams</h3>
      <p className="text-sm text-gray-600">
        Thiết lập số lượng teams và tùy chỉnh tên, số người cho từng team
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số lượng Teams <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="20"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.numTeams}
            onChange={(e) => {
              const numTeams = parseInt(e.target.value);
              setFormData({ ...formData, numTeams, teams: [] });
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số người/Team (mặc định) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.teamCapacity}
            onChange={(e) => {
              const newCapacity = parseInt(e.target.value);
              
              // ✅ FIX: Cập nhật capacity cho TẤT CẢ teams
              const updatedTeams = formData.teams.map(team => ({
                ...team,
                capacity: newCapacity
              }));
              
              setFormData({
                ...formData,
                teamCapacity: newCapacity,
                teams: updatedTeams // ← Cập nhật luôn
              });
            }}
          />
          <p className="text-xs text-blue-600 mt-1">
            💡 Thay đổi số này sẽ tự động cập nhật capacity cho tất cả teams bên dưới
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {formData.teams.map((team, index) => (
          <div
            key={team.id}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">
                  Tên Team {index + 1}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={team.name}
                  onChange={(e) => updateTeamName(index, e.target.value)}
                  placeholder={`Team ${index + 1}`}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Số người tối đa
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={team.capacity}
                  onChange={(e) => updateTeamCapacity(index, e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          ✓ Đã cấu hình <strong>{formData.teams.length}</strong> teams với tổng{" "}
          <strong>
            {formData.teams.reduce((sum, t) => sum + t.capacity, 0)}
          </strong>{" "}
          chỗ
        </p>
      </div>
    </div>
  );
};
  // Step 2: Select Rules
  const SelectRulesStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Chọn Rules cho sự kiện
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Chọn các rules từ thư viện. Bạn có thể tùy chỉnh giá trị cho từng rule.
      </p>

      <div className="space-y-6 max-h-96 overflow-y-auto">
        {ruleGroups.map((group) => {
          const groupRules = rules.filter((r) => r.groupId === group.id);
          if (groupRules.length === 0) return null;

          return (
            <div
              key={group.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <h4 className="font-semibold text-gray-900 mb-3">
                {group.icon} {group.name}
              </h4>
              <div className="space-y-2">
                {groupRules.map((rule) => {
                  const isSelected = selectedRules.some(
                    (r) => r.ruleId === rule.id
                  );
                  const selectedRule = selectedRules.find(
                    (r) => r.ruleId === rule.id
                  );

                  return (
                    <div
                      key={rule.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRule(rule.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {rule.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {rule.description}
                          </p>

                          {isSelected && (
                            <div className="mt-3 grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded">
                              <div>
                                <label className="text-xs text-gray-600">
                                  Giá trị
                                </label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  value={selectedRule.customization.customValue}
                                  onChange={(e) =>
                                    updateRuleCustomization(
                                      rule.id,
                                      "customValue",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">
                                  Điểm
                                </label>
                                <input
                                  type="number"
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  value={selectedRule.customization.points}
                                  onChange={(e) =>
                                    updateRuleCustomization(
                                      rule.id,
                                      "points",
                                      parseInt(e.target.value)
                                    )
                                  }
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedRule.customization.isRequired
                                    }
                                    onChange={(e) =>
                                      updateRuleCustomization(
                                        rule.id,
                                        "isRequired",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Bắt buộc
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          ✓ Đã chọn <strong>{selectedRules.length}</strong> rules
        </p>
      </div>
    </div>
  );

  // Step 3: Review
  const ReviewStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Xem lại thông tin
      </h3>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm text-gray-600">Tên sự kiện</p>
          <p className="font-semibold">{formData.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Thời gian</p>
          <p className="font-semibold">
            {formData.startDate} → {formData.endDate}
          </p>
        </div>
        {formData.description && (
          <div>
            <p className="text-sm text-gray-600">Mô tả</p>
            <p className="text-sm">{formData.description}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">Số lượng rules</p>
          <p className="font-semibold">{selectedRules.length} rules</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Số teams</p>
          <p className="font-semibold">{formData.teams.length} teams</p>
          <div className="mt-2 space-y-1">
            {formData.teams.map((team, idx) => (
              <div
                key={team.id}
                className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
              >
                {team.name}: {team.capacity} người
              </div>
            ))}
          </div>
        </div>

        {imagePreview && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Ảnh bìa</p>
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-32 object-cover rounded"
            />
          </div>
        )}
        {formData.isPrivate && (
          <div>
            <p className="text-sm text-gray-600">Loại sự kiện</p>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-600">🔒 Private</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                Mật khẩu: {formData.password}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          ⚠️ Sau khi tạo, sự kiện sẽ được publish ngay và member có thể đăng ký
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Tạo Sự Kiện Mới
            </h2>

            <div className="w-full mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      step === 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    1
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      step === 2
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    2
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      step === 3
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    3
                  </div>
                  <div className="text-sm text-gray-600 ml-3">
                    Bước {step} trên 3
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {" "}
                  {step === 1
                    ? " Thông tin"
                    : step === 2
                    ? " Chọn rules"
                    : " Xác nhận"}{" "}
                </div>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(step / 3) * 100}%`,
                    backgroundColor: "#2563eb",
                  }}
                ></div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[
              { num: 1, label: "Thông tin" },
              { num: 2, label: "Teams" },
              { num: 3, label: "Chọn Rules" },
              { num: 4, label: "Xem lại" },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s.num
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                  </div>
                  <p className="text-xs mt-2 text-gray-600">{s.label}</p>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step > s.num ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          {step === 1 && <BasicInfoStep />}
          {step === 2 && <TeamsStep />}
          {step === 3 && <SelectRulesStep />}
          {step === 4 && <ReviewStep />}

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Quay lại
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                (step === 1 &&
                  (!formData.name || !formData.startDate || !formData.endDate))
              }
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-white ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {loading
                ? "Đang xử lý..."
                : step === 4
                ? "✓ Tạo sự kiện"
                : "Tiếp tục →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;
