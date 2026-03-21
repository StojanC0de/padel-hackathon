import React, { useState, useEffect } from 'react';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    const token = localStorage.getItem('token');
    fetch('http://127.0.0.1:8000/api/bookings/', {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setBookings(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId, startTime) => {
    const token = localStorage.getItem('token');
    
    if (!canCancel(startTime)) {
      alert("Nu mai poți anula! Au rămas mai puțin de 24h până la meci.");
      return;
    }

    if (window.confirm("Ești sigur că vrei să anulezi această rezervare?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Token ${token}` }
        });

        if (response.ok) {
          alert("✅ Rezervare anulată cu succes!");
          fetchBookings(); 
        } else {
          const errorData = await response.json();
          alert(errorData.error || "Eroare la anulare.");
        }
      } catch (err) {
        alert("Eroare de rețea la anulare.");
      }
    }
  };

  const canCancel = (startTime) => {
    const now = new Date();
    const eventTime = new Date(startTime);
    const diffInMs = eventTime - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours >= 24;
  };

  if (loading) return (
    <div className="flex justify-center items-center py-20 bg-[#F8FAFC] min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ccff00]"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 min-h-screen bg-[#F8FAFC]">
      <h1 className="text-5xl font-black italic uppercase mb-10 tracking-tighter">Rezervările Mele</h1>
      
      <div className="space-y-6">
        {bookings.length > 0 ? bookings.map(b => {
          const allowable = canCancel(b.start_time);
          
          return (
            <div key={b.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center relative overflow-hidden transition-all hover:shadow-lg">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#ccff00]"></div>
              
              <div>
                <h3 className="text-2xl font-black italic uppercase text-gray-900 tracking-tighter leading-none mb-1">
                  {b.club_name || "Club Padel"}
                </h3>
                <p className="text-gray-400 font-bold text-sm uppercase mb-4 tracking-widest">📍 {b.court_name}</p>
                <div className="flex gap-4">
                  <p className="font-black text-xs uppercase italic text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    📅 {new Date(b.start_time).toLocaleDateString('ro-RO')}
                  </p>
                  <p className="font-black text-xs uppercase italic text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                    🕒 {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="bg-black text-[#ccff00] px-4 py-2 rounded-xl font-black text-xs italic shadow-md">
                  {b.duration_minutes} MIN
                </div>

                {allowable ? (
                  <button 
                    onClick={() => handleCancel(b.id, b.start_time)}
                    className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-red-100"
                  >
                    ✕ Anulează
                  </button>
                ) : (
                  <span className="text-gray-300 font-black uppercase text-[9px] tracking-widest bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-1">
                    🔒 Blocat (&lt; 24h)
                  </span>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-[3rem] italic text-gray-400 border-2 border-dashed border-gray-100">
            Nu ai nicio rezervare activă.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;