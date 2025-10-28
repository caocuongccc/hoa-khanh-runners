// src/pages/EventDetail.jsx
import React, { useEffect, useState } from 'react';
import { getEventById } from '../services/firebase-service';
import { useParams, useNavigate } from 'react-router-dom';


export default function EventDetail() {
const { id } = useParams();
const [event, setEvent] = useState(null);
const [loading, setLoading] = useState(true);
const navigate = useNavigate();


useEffect(() => {
(async ()=>{
const e = await getEventById(id);
setEvent(e);
setLoading(false);
})();
}, [id]);


if (loading) return <div className="p-6">Loading...</div>;
if (!event) return <div className="p-6">Không tìm thấy sự kiện</div>;


return (
<div className="max-w-5xl mx-auto p-6 space-y-6">
<div className="relative h-64 rounded-xl overflow-hidden">
<img src={event.coverImage || 'https://source.unsplash.com/1200x600/?running'} alt={event.title} className="w-full h-full object-cover" />
<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-6 flex items-end">
<div className="text-white">
<h1 className="text-2xl font-bold">{event.title}</h1>
<p className="text-sm opacity-90">{event.startDate} → {event.endDate}</p>
</div>
</div>
</div>


<div className="grid lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 space-y-4">
<div className="bg-white p-6 rounded-xl shadow">{event.description}</div>


<div className="bg-white p-6 rounded-xl shadow">
<h3 className="font-bold mb-3">Teams</h3>
<div className="grid md:grid-cols-2 gap-3">
{(event.teams || []).map(team => (
<div key={team.id} className="border rounded-lg p-4 flex items-center justify-between">
<div>
<div className="font-semibold">{team.name}</div>
<div className="text-sm text-gray-500">{team.members || 0}/{team.capacity} thành viên</div>
</div>
<div>
<button className="px-3 py-1 bg-blue-600 text-white rounded-lg">Tham gia</button>
</div>
</div>
))}
</div>
</div>
</div>


<aside className="space-y-4">
<div className="bg-white p-4 rounded-xl shadow text-center">
<h4 className="font-semibold mb-2">Kết nối Strava</h4>
<p className="text-sm text-gray-500 mb-3">Đồng bộ hoạt động tự động từ Strava</p>
<button className="w-full bg-orange-500 text-white py-2 rounded-lg">Kết nối Strava</button>
</div>


<div className="bg-white p-4 rounded-xl shadow">
<h4 className="font-semibold mb-2">Rules (tóm tắt)</h4>
<ul className="text-sm text-gray-600 space-y-1">
{(event.rules || []).map((r, idx) => (
<li key={idx}>• {r.type} — {JSON.stringify(r.params)}</li>
))}
</ul>
</div>
</aside>
</div>
</div>
);
}