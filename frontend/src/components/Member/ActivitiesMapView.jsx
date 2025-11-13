import { useState } from "react";
import { Map, List, Activity as ActivityIcon, MapPin } from "lucide-react";

const ActivitiesMapView = ({ activities, onActivityClick }) => {
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"

  // Decode Strava polyline
  const decodePolyline = (encoded) => {
    if (!encoded) return [];
    
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates = [];

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push([lat / 1e5, lng / 1e5]);
    }

    return coordinates;
  };

  // List View
  const ListView = () => (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          onClick={() => onActivityClick?.(activity)}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-start gap-4">
            {activity.map?.summaryPolyline ? (
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-3+f44-0.5(${encodeURIComponent(
                    activity.map.summaryPolyline
                  )})/auto/300x300@2x?access_token=YOUR_MAPBOX_TOKEN`}
                  alt="Route"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/300x300/e5e7eb/9ca3af?text=No+Map`;
                  }}
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-1 truncate">
                {activity.name}
              </h3>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                <span className="font-semibold text-blue-600">
                  {activity.distance?.toFixed(2)} km
                </span>
                <span>•</span>
                <span>{activity.date}</span>
                <span>•</span>
                <span>{activity.type || "Run"}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>⏱️ {activity.duration?.movingTimeFormatted}</span>
                <span>⚡ {activity.pace?.averageFormatted}</span>
                <span>📈 {activity.elevation?.total}m</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Map Grid View
  const MapView = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          onClick={() => onActivityClick?.(activity)}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          {activity.map?.summaryPolyline ? (
            <div className="h-48 bg-gray-100">
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-3+f44-0.5(${encodeURIComponent(
                  activity.map.summaryPolyline
                )})/auto/400x400@2x?access_token=YOUR_MAPBOX_TOKEN`}
                alt="Route"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://via.placeholder.com/400x400/e5e7eb/9ca3af?text=No+Map`;
                }}
              />
            </div>
          ) : (
            <div className="h-48 bg-gray-100 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
          )}

          <div className="p-4">
            <h3 className="font-bold text-gray-900 mb-2 truncate">
              {activity.name}
            </h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-blue-600">
                {activity.distance?.toFixed(2)} km
              </span>
              <span className="text-gray-500">{activity.date}</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>⏱️ {activity.duration?.movingTimeFormatted}</span>
              <span>⚡ {activity.pace?.averageFormatted}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">Danh sách</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="text-sm font-medium">Bản đồ</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <ActivityIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có hoạt động nào</p>
        </div>
      ) : viewMode === "list" ? (
        <ListView />
      ) : (
        <MapView />
      )}
    </div>
  );
};

export default ActivitiesMapView;