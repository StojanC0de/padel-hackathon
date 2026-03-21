import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ClubDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [courts, setCourts] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Acordeon dublu: Teren -> Zi
  const [openCourtId, setOpenCourtId] = useState(null);
  const [openDay, setOpenDay] = useState(null);

  // Modal și Selecție
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ court: null, hour: null });
  const [duration, setDuration] = useState(60);

  // Generăm 7 zile (Azi + următoarele 6)
  const getNextSevenDays = () => {
    const days = [];
    const numeZile = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        label: i === 0 ? "Azi" : numeZile[d.getDay()],
        dateStr: d.toISOString().split('T')[0],
        displayDate: d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }),
      });
    }
    return days;
  };
  const zileDisponibile = getNextSevenDays();

  // Ore: 09:00 -> 00:30 (pentru închidere la 02:00)
  const hours = [];
  for (let h = 9; h <= 23; h++) {
    const hh = h.toString().padStart(2, '0');
    hours.push(`${hh}:00`, `${hh}:30`);
  }
  hours.push("00:00", "00:30");

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`http://127.0.0.1:8000/api/clubs/${id}/`).then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/courts/`).then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/bookings/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      }).then(res => res.ok ? res.json() : [])
    ]).then(([clubData, courtsData, bookingsData]) => {
      setClub(clubData);
      setCourts(courtsData.filter(c => String(c.club) === String(id)));
      setExistingBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setLoading(false);
    }).catch(err => console.error("Eroare la încărcare:", err));
  }, [id]);

  const isSlotTaken = (courtId, hour, dateStr) => {
    if (!existingBookings.length) return false;
    return existingBookings.some(b => {
      if (String(b.court) !== String(courtId)) return false;
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      const [h, m] = hour.split(':');
      const slotTime = new Date(dateStr);
      slotTime.setHours(parseInt(h), parseInt(m), 0, 0);
      return slotTime >= bStart && slotTime < bEnd;
    });
  };

  const confirmBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) { alert("Te rugăm să te loghezi!"); navigate('/auth'); return; }

    const [h, m] = selectedSlot.hour.split(':');
    const finalDate = new Date(openDay.dateStr);
    finalDate.setHours(parseInt(h), parseInt(m), 0, 0);

    const bookingData = {
      court: selectedSlot.court.id,
      start_time: finalDate.toISOString(),
      duration_minutes: duration
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        alert("✅ Rezervare efectuată cu succes!");
        navigate('/my-bookings');
      } else {
        const error = await response.json();
        alert("Eroare: " + (error.error || "Suprapunere de program"));
      }
    } catch (e) { alert("Eroare de conexiune!"); }
  };

  if (loading) return <div className="p-20 text-center font-black italic animate-pulse">SE ÎNCARCĂ TERENURILE...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <h1 className="text-5xl font-black italic uppercase mb-10 tracking-tighter">{club?.name}</h1>
      
      <div className="space-y-6">
        {courts.map((court) => (
          <div key={court.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <button 
              onClick={() => {setOpenCourtId(openCourtId === court.id ? null : court.id); setOpenDay(null);}}
              className="w-full p-8 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-4 text-2xl font-black italic uppercase">
                <span className={`text-[#ccff00] transition-transform ${openCourtId === court.id ? 'rotate-90' : ''}`}>▶</span>
                {court.name}
              </div>
              <span className="text-gray-400 font-bold text-sm tracking-widest">{court.price_per_hour} RON/H</span>
            </button>

            {openCourtId === court.id && (
              <div className="px-8 pb-8 space-y-3">
                {zileDisponibile.map((zi) => (
                  <div key={zi.dateStr} className="border border-gray-50 rounded-[1.5rem] overflow-hidden">
                    <button 
                      onClick={() => setOpenDay(openDay?.dateStr === zi.dateStr ? null : zi)}
                      className={`w-full p-4 flex justify-between items-center transition-all ${openDay?.dateStr === zi.dateStr ? 'bg-black text-[#ccff00]' : 'bg-gray-50 text-gray-800'}`}
                    >
                      <span className="font-black uppercase italic text-xs tracking-widest">{zi.label} — {zi.displayDate}</span>
                      <span className={`text-[10px] ${openDay?.dateStr === zi.dateStr ? 'rotate-90' : ''}`}>▶</span>
                    </button>

                    {openDay?.dateStr === zi.dateStr && (
                      <div className="p-6 grid grid-cols-3 sm:grid-cols-6 gap-2 bg-white">
                        {hours.map(hour => {
                          const taken = isSlotTaken(court.id, hour, zi.dateStr);
                          return (
                            <button 
                              key={hour} 
                              disabled={taken}
                              onClick={() => {setSelectedSlot({court, hour}); setShowModal(true);}}
                              className={`py-3 rounded-xl font-black text-[10px] transition-all ${
                                taken ? 'bg-gray-100 text-gray-300 line-through' : 'bg-gray-50 hover:bg-[#ccff00] text-black border border-transparent hover:border-black'
                              }`}
                            >
                              {hour}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black italic uppercase mb-2">Rezervare</h2>
            <p className="text-gray-400 font-bold text-[10px] mb-8 uppercase tracking-widest leading-relaxed">
               {selectedSlot.court?.name} <br/>
               {openDay?.label}, {openDay?.displayDate} @ {selectedSlot.hour}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-8">
              {[60, 90, 120].map(val => (
                <button key={val} onClick={() => setDuration(val)} className={`py-4 rounded-2xl font-black text-xs ${duration === val ? 'bg-black text-[#ccff00]' : 'bg-gray-100 text-gray-400'}`}>
                  {val === 60 ? '1H' : val === 90 ? '1.5H' : '2H'}
                </button>
              ))}
            </div>

            <button onClick={confirmBooking} className="w-full bg-[#ccff00] py-5 rounded-[1.5rem] font-black uppercase italic shadow-xl hover:scale-105 active:scale-95 transition-all">
              Confirmă Rezervarea
            </button>
            <button onClick={() => setShowModal(false)} className="w-full mt-4 font-bold text-gray-300 text-[10px] uppercase tracking-widest text-center">Închide</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubDetail;