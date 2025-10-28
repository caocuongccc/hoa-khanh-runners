import React, { useState, useEffect } from "react";
import { db, storage } from "../../services/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  PlusCircle,
  Trash2,
  Edit,
  Settings,
  Loader2,
  CheckCircle,
} from "lucide-react";
import EventFormModal from "./EventFormModal";
import RulesEditor from "./RulesEditor";

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  // Load tất cả event
  const loadEvents = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "events"));
    setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleAdd = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá sự kiện này?")) return;
    await deleteDoc(doc(db, "events", id));
    loadEvents();
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingEvent) {
        // update
        await updateDoc(doc(db, "events", editingEvent.id), formData);
      } else {
        // add
        await addDoc(collection(db, "events"), formData);
      }
      setShowModal(false);
      loadEvents();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu sự kiện");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quản lý sự kiện</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4" /> Thêm sự kiện
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" /> Đang tải...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 overflow-hidden">
                <img
                  src={
                    event.coverImage ||
                    "https://source.unsplash.com/800x400/?running"
                  }
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {event.startDate} → {event.endDate}
                </p>
                <p className="text-gray-700 text-sm line-clamp-2">
                  {event.description}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={() => handleEdit(event)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Xoá
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t">
                  <details>
                    <summary className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer hover:text-blue-600">
                      <Settings className="w-4 h-4" /> Rule Editor
                    </summary>
                    <div className="mt-3">
                      <RulesEditor eventId={event.id} />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EventFormModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          eventData={editingEvent}
        />
      )}
    </div>
  );
}
