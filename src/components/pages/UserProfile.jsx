import React from "react";
import { Award, Calendar, Activity, MapPin } from "lucide-react";

const UserDashboard = ({ user }) => {
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center gap-6">
        <img
          src={user.photoURL || "https://i.pravatar.cc/150"}
          alt="avatar"
          className="w-20 h-20 rounded-full"
        />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {user.displayName || "Người dùng mới"}
          </h2>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <Award className="mx-auto text-yellow-500 mb-2" />
          <p className="font-bold text-xl text-gray-800">1,245</p>
          <p className="text-sm text-gray-500">Điểm tích lũy</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <Activity className="mx-auto text-green-600 mb-2" />
          <p className="font-bold text-xl text-gray-800">23</p>
          <p className="text-sm text-gray-500">Hoạt động</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <Calendar className="mx-auto text-blue-600 mb-2" />
          <p className="font-bold text-xl text-gray-800">4</p>
          <p className="text-sm text-gray-500">Sự kiện tham gia</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <MapPin className="mx-auto text-purple-600 mb-2" />
          <p className="font-bold text-xl text-gray-800">525 km</p>
          <p className="text-sm text-gray-500">Quãng đường</p>
        </div>
      </div>

      {/* Joined Events */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Sự kiện bạn đã tham gia
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border rounded-lg overflow-hidden hover:shadow-md transition"
            >
              <img
                src={`https://source.unsplash.com/random/800x400?run,${i}`}
                alt="event"
                className="w-full h-40 object-cover"
              />
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Challenge {i}
                </h4>
                <p className="text-sm text-gray-600">
                  Từ 01/01/2025 - 31/01/2025
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
