// FILE: src/components/SetupAdmin.jsx
import React, { useState } from "react";
import {
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";

const SetupAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const users = [
    {
      email: "hoakhanhrunners@gmail.com",
      password: "Admin@123",
      name: "Admin Hòa Khánh",
      role: "admin",
    },
    {
      email: "member@gmail.com",
      password: "Member@123",
      name: "Member Demo",
      role: "member",
    },
  ];

  const createUser = async (userData) => {
    try {
      // Tạo user trong Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const user = userCredential.user;

      // Lưu thông tin vào Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        createdAt: new Date(),
        stravaIntegration: {
          isConnected: false,
        },
      });

      return {
        success: true,
        email: userData.email,
        role: userData.role,
        uid: user.uid,
      };
    } catch (error) {
      console.error("Error creating user:", error);

      // Nếu user đã tồn tại
      if (error.code === "auth/email-already-in-use") {
        return {
          success: false,
          email: userData.email,
          error: "User đã tồn tại (bỏ qua)",
        };
      }

      return {
        success: false,
        email: userData.email,
        error: error.message,
      };
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setResults(null);

    const userResults = [];

    for (const userData of users) {
      const result = await createUser(userData);
      userResults.push(result);
    }

    setResults(userResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Setup Admin & Demo Users
          </h1>
          <p className="text-gray-600">Tạo tài khoản Admin và Member demo</p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Lưu ý:</p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                <li>• Script sẽ tạo 2 users: Admin và Member</li>
                <li>• Nếu user đã tồn tại, sẽ bỏ qua</li>
                <li>
                  • Sau khi tạo xong, bạn có thể đăng nhập bằng các tài khoản
                  này
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Users to create */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            👥 Users sẽ được tạo:
          </h3>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.email}
                className="bg-white rounded-lg p-3 border border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role === "admin" ? "👑 Admin" : "👤 Member"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Button */}
        <button
          onClick={handleSetup}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all mb-4 shadow-lg ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Đang tạo users...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              Tạo Users Ngay
            </span>
          )}
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Kết quả:</h3>

            {results.map((result, index) => (
              <div
                key={index}
                className={`border-l-4 rounded p-4 flex items-start gap-3 ${
                  result.success
                    ? "bg-green-50 border-green-500"
                    : result.error?.includes("đã tồn tại")
                    ? "bg-yellow-50 border-yellow-500"
                    : "bg-red-50 border-red-500"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      result.success
                        ? "text-green-900"
                        : result.error?.includes("đã tồn tại")
                        ? "text-yellow-900"
                        : "text-red-900"
                    }`}
                  >
                    {result.email}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      result.success
                        ? "text-green-700"
                        : result.error?.includes("đã tồn tại")
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {result.success
                      ? `✓ Tạo thành công - Role: ${result.role}`
                      : `✗ ${result.error}`}
                  </p>
                </div>
              </div>
            ))}

            {results.every(
              (r) => r.success || r.error?.includes("đã tồn tại")
            ) && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-sm text-blue-800">
                  🎉 <strong>Hoàn thành!</strong> Bạn có thể:
                  <br />
                  <span className="block mt-2">
                    1.{" "}
                    <a
                      href="/"
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Quay về trang đăng nhập
                    </a>
                    <br />
                    2. Đăng nhập với tài khoản Admin hoặc Member
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">
            💡 Sau khi tạo xong:
          </h4>
          <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
            <li>
              Quay về trang chủ:{" "}
              <code className="bg-gray-100 px-2 py-0.5 rounded">
                http://localhost:3000
              </code>
            </li>
            <li>
              Đăng nhập Admin:{" "}
              <code className="bg-gray-100 px-2 py-0.5 rounded">
                hoakhanhrunners@gmail.com / Admin@123
              </code>
            </li>
            <li>
              Hoặc Member:{" "}
              <code className="bg-gray-100 px-2 py-0.5 rounded">
                member@gmail.com / Member@123
              </code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SetupAdmin;
