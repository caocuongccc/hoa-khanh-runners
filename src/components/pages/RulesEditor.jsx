// src/pages/RulesEditor.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { PlusCircle, Trash2 } from "lucide-react";

export default function RulesEditor({ eventId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("min_distance");
  const [params, setParams] = useState({});
  const [error, setError] = useState("");

  // Load danh sách rule hiện có
  useEffect(() => {
    if (eventId) loadRules();
  }, [eventId]);

  const loadRules = async () => {
    setLoading(true);
    const q = query(collection(db, "events", eventId, "rules"));
    const snap = await getDocs(q);
    setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  // Thêm rule mới
  const addRule = async () => {
    try {
      setError("");
      if (!eventId) throw new Error("Thiếu eventId");
      if (!type) throw new Error("Chưa chọn loại rule");

      let parsedParams = {};
      switch (type) {
        case "min_distance":
          parsedParams = { minKm: Number(params.minKm || 0) };
          break;
        case "pace_range":
          parsedParams = {
            minPace: Number(params.minPace || 0),
            maxPace: Number(params.maxPace || 0),
          };
          break;
        case "time_window":
          parsedParams = {
            startHour: Number(params.startHour || 0),
            endHour: Number(params.endHour || 23),
          };
          break;
        case "bonus_day":
          parsedParams = { date: params.date || "", multiplier: Number(params.multiplier || 2) };
          break;
        default:
          parsedParams = {};
      }

      await addDoc(collection(db, "events", eventId, "rules"), {
        type,
        params: parsedParams,
        enabled: true,
        createdAt: new Date().toISOString(),
      });
      setParams({});
      loadRules();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeRule = async (id) => {
    if (!window.confirm("Xoá rule này?")) return;
    await deleteDoc(doc(db, "events", eventId, "rules", id));
    loadRules();
  };

  // Giao diện nhập params theo loại rule
  const renderParamInputs = () => {
    switch (type) {
      case "min_distance":
        return (
          <input
            type="number"
            placeholder="Tối thiểu km"
            value={params.minKm || ""}
            onChange={(e) => setParams({ ...params, minKm: e.target.value })}
            className="border rounded px-2 py-1"
          />
        );
      case "pace_range":
        return (
          <>
            <input
              type="number"
              placeholder="Min pace (min/km)"
              value={params.minPace || ""}
              onChange={(e) =>
                setParams({ ...params, minPace: e.target.value })
              }
              className="border rounded px-2 py-1"
            />
            <input
              type="number"
              placeholder="Max pace (min/km)"
              value={params.maxPace || ""}
              onChange={(e) =>
                setParams({ ...params, maxPace: e.target.value })
              }
              className="border rounded px-2 py-1"
            />
          </>
        );
      case "time_window":
        return (
          <>
            <input
              type="number"
              placeholder="Giờ bắt đầu"
              value={params.startHour || ""}
              onChange={(e) =>
                setParams({ ...params, startHour: e.target.value })
              }
              className="border rounded px-2 py-1 w-28"
            />
            <input
              type="number"
              placeholder="Giờ kết thúc"
              value={params.endHour || ""}
              onChange={(e) =>
                setParams({ ...params, endHour: e.target.value })
              }
              className="border rounded px-2 py-1 w-28"
            />
          </>
        );
      case "bonus_day":
        return (
          <>
            <input
              type="date"
              value={params.date || ""}
              onChange={(e) => setParams({ ...params, date: e.target.value })}
              className="border rounded px-2 py-1"
            />
            <input
              type="number"
              placeholder="Multiplier (x2, x3...)"
              value={params.multiplier || ""}
              onChange={(e) =>
                setParams({ ...params, multiplier: e.target.value })
              }
              className="border rounded px-2 py-1 w-28"
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-bold">Rules Editor</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setParams({});
          }}
          className="border rounded px-2 py-1"
        >
          <option value="min_distance">Tối thiểu km/lần</option>
          <option value="pace_range">Giới hạn pace</option>
          <option value="time_window">Khung giờ hợp lệ</option>
          <option value="bonus_day">Ngày thưởng điểm</option>
        </select>

        {renderParamInputs()}

        <button
          onClick={addRule}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4" /> Thêm
        </button>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <ul className="divide-y">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <span className="font-medium text-gray-800">{r.type}</span>
                <span className="text-gray-500 ml-2">
                  {JSON.stringify(r.params)}
                </span>
              </div>
              <button
                onClick={() => removeRule(r.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
