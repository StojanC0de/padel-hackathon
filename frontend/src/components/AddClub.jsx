import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddClub = () => {
  const navigate = useNavigate();
  const [clubData, setClubData] = useState({
    name: '', 
    address: '', 
    description: '', // Am adăugat asta pentru modelul tău
    city: 'București', 
    image_url: ''
  });
  const [courts, setCourts] = useState([{ name: '', price_per_hour: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCourtRow = () => setCourts([...courts, { name: '', price_per_hour: '' }]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      // 1. Creează Clubul
      const clubRes = await fetch('http://127.0.0.1:8000/api/clubs/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify(clubData)
      });

      if (!clubRes.ok) throw new Error("Eroare la crearea clubului");
      const newClub = await clubRes.json();

      // 2. Creează Terenurile (folosim Promise.all pentru viteză)
      const courtPromises = courts
        .filter(court => court.name && court.price_per_hour)
        .map(court => 
          fetch('http://127.0.0.1:8000/api/courts/', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Token ${token}` 
            },
            body: JSON.stringify({ ...court, club: newClub.id })
          })
        );

      await Promise.all(courtPromises);

      alert("🎉 Clubul și terenurile au fost publicate!");
      navigate('/');
      window.location.reload(); // Refresh pentru a actualiza lista de cluburi
    } catch (err) {
      alert("Eroare la salvare: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl mt-10 mb-20 animate-in fade-in zoom-in duration-500">
      <h1 className="text-4xl font-black italic uppercase mb-8 tracking-tighter text-gray-900">Configurare Club Nou</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            className="p-5 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 ring-[#ccff00] transition-all" 
            placeholder="Nume Club (ex: Padel Arena)" 
            onChange={e => setClubData({...clubData, name: e.target.value})} 
            required 
          />
          <input 
            className="p-5 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 ring-[#ccff00] transition-all" 
            placeholder="Oraș" 
            value={clubData.city} 
            onChange={e => setClubData({...clubData, city: e.target.value})} 
          />
        </div>

        <input 
          className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 ring-[#ccff00] transition-all" 
          placeholder="Adresă (Strada, Număr...)" 
          onChange={e => setClubData({...clubData, address: e.target.value})} 
          required 
        />

        <textarea 
          className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-none focus:ring-2 ring-[#ccff00] transition-all min-h-[100px]" 
          placeholder="Descriere Club (facilități, program, etc.)" 
          onChange={e => setClubData({...clubData, description: e.target.value})} 
        />

        <input 
          className="w-full p-5 bg-gray-50 rounded-2xl font-bold border-none text-xs focus:ring-2 ring-[#ccff00] transition-all" 
          placeholder="URL Imagine (Link către o poză cu clubul)" 
          onChange={e => setClubData({...clubData, image_url: e.target.value})} 
        />

        <div className="pt-8 border-t border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black italic uppercase text-gray-900">Terenurile tale</h3>
            <button 
              type="button" 
              onClick={handleAddCourtRow} 
              className="bg-black text-[#ccff00] px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              + Adaugă rând
            </button>
          </div>
          
          {courts.map((court, index) => (
            <div key={index} className="flex gap-4 mb-4 animate-in slide-in-from-left duration-300">
              <input 
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold text-sm focus:bg-white focus:ring-1 ring-gray-200 transition-all" 
                placeholder="Nume Teren (ex: Teren 1)" 
                required
                onChange={e => {
                  const newCourts = [...courts];
                  newCourts[index].name = e.target.value;
                  setCourts(newCourts);
                }} 
              />
              <input 
                className="w-32 p-4 bg-gray-100 rounded-2xl font-bold text-sm focus:bg-white focus:ring-1 ring-gray-200 transition-all" 
                placeholder="RON/h" 
                type="number" 
                required
                onChange={e => {
                  const newCourts = [...courts];
                  newCourts[index].price_per_hour = e.target.value;
                  setCourts(newCourts);
                }}
              />
            </div>
          ))}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`w-full ${isSubmitting ? 'bg-gray-400' : 'bg-[#ccff00]'} py-6 rounded-3xl font-black uppercase italic text-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[#ccff00]/20`}
        >
          {isSubmitting ? 'Se publică...' : 'Salvează și Publică Clubul'}
        </button>
      </form>
    </div>
  );
};

export default AddClub;