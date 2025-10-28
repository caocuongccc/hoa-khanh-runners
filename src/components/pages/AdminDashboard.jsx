import React from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, Shirt, CreditCard } from "lucide-react";

const AdminDashboard = () => {
  const cards = [
    { label: "Tổng sự kiện", value: 12, icon: Calendar, color: "text-blue-600" },
    { label: "Vận động viên", value: 356, icon: Users, color: "text-green-600" },
    { label: "Áo đăng ký", value: 210, icon: Shirt, color: "text-orange-500" },
    { label: "Chưa thanh toán", value: 45, icon: CreditCard, color: "text-red-500" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển quản trị</h1>

      <div className="grid md:grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center">
            <Icon className={`w-8 h-8 ${color} mb-3`} />
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-gray-500 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="text-right">
        <Link
          to="/admin/events"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Quản lý sự kiện →
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
