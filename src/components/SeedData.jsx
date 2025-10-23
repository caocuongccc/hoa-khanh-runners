import React, { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader } from 'lucide-react';
import { seedAll, seedRuleGroups, seedRules, seedEvents } from './SeedData';

const SeedDataUI = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSeedAll = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const res = await seedAll();
      setResults(res);
    } catch (error) {
      setResults({
        error: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedIndividual = async (seedFunction, name) => {
    setLoading(true);
    setResults(null);
    
    try {
      const res = await seedFunction();
      setResults({ [name]: res });
    } catch (error) {
      setResults({
        error: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Dữ Liệu Mẫu</h1>
          <p className="text-gray-600">Chạy script để tự động import dữ liệu vào Firebase</p>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-orange-800">
            ⚠️ <strong>Lưu ý:</strong> Chỉ chạy script này 1 lần duy nhất. 
            Nếu chạy lại sẽ tạo ra dữ liệu trùng lặp!
          </p>
        </div>

        {/* Main Button */}
        <button
          onClick={handleSeedAll}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all mb-4 ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Đang import...
            </span>
          ) : (
            'Import Tất Cả Dữ Liệu'
          )}
        </button>

        {/* Individual Buttons */}
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-600 mb-2">Hoặc import từng phần:</p>
          <button
            onClick={() => handleSeedIndividual(seedRuleGroups, 'ruleGroups')}
            disabled={loading}
            className="w-full py-2 px-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Rule Groups (5 items)
          </button>
          <button
            onClick={() => handleSeedIndividual(seedRules, 'rules')}
            disabled={loading}
            className="w-full py-2 px-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Rules (8 items)
          </button>
          <button
            onClick={() => handleSeedIndividual(seedEvents, 'events')}
            disabled={loading}
            className="w-full py-2 px-4 border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Events (2 items)
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Kết quả:</h3>
            
            {results.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Có lỗi xảy ra</p>
                  <p className="text-sm text-red-700">{results.message}</p>
                </div>
              </div>
            ) : (
              <>
                {results.ruleGroups && (
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                    results.ruleGroups.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
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
                      <p className={`text-sm ${
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
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                    results.rules.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
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
                      <p className={`text-sm ${
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

                {results.events && (
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                    results.events.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {results.events.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        results.events.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Events
                      </p>
                      <p className={`text-sm ${
                        results.events.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {results.events.success 
                          ? `✓ Import thành công ${results.events.count} items`
                          : `✗ ${results.events.error}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {Object.values(results).every(r => r.success) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      🎉 <strong>Hoàn thành!</strong> Bạn có thể đóng trang này và quay lại ứng dụng chính.
                      <br />
                      <span className="text-xs mt-1 block">
                        Kiểm tra Firebase Console để xem dữ liệu đã được import.
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
          <h4 className="font-semibold text-gray-900 mb-3">Hướng dẫn:</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Đảm bảo đã setup Firebase config trong <code className="bg-gray-100 px-2 py-0.5 rounded">firebase-config.js</code></li>
            <li>Click nút "Import Tất Cả Dữ Liệu" để tự động import</li>
            <li>Chờ 5-10 giây để script chạy xong</li>
            <li>Kiểm tra Firebase Console để xác nhận</li>
            <li>Sau khi import xong, bạn có thể xóa file này</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SeedDataUI;