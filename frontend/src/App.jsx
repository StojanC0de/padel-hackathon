import React from 'react'
// Importăm piesele magice de navigare
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ClubList from './components/ClubList'
import Auth from './components/Auth'
import MyBookings from './components/MyBookings';
import ClubDetail from './components/ClubDetail';
import AddClub from './components/AddClub'; 

// Facem o componentă separată pentru Pagina Principală (HomePage)
// Ca să nu aglomerăm rutele
const HomePage = () => {
  return (
    <>
      <Hero />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ClubList />
      </main>
    </>
  )
}

function App() {
  return (
    // Împachetăm toată aplicația în <Router>
    <Router>
      <div className="min-h-screen font-sans">
        {/* Navbar-ul rămâne mereu sus, pe orice pagină */}
        <Navbar />
        
        {/* Aici se schimbă conținutul în funcție de link */}
        <Routes>
          {/* Calea implicită (Acasă) */}
          <Route path="/" element={<HomePage />} />
          
          {/* Calea pentru Login / Register */}
          <Route path="/auth" element={<Auth />} />

          {/* Calea pentru Rezervările Mele (doar dacă e logat) */}
          <Route path="/my-bookings" element={<MyBookings />} />

          {/* Calea pentru Detaliile Clubului (ex: /club/3) */}
          <Route path="/club/:id" element={<ClubDetail />} />

          {/* Căi pentru manageri (în viitor, putem adăuga protecție aici) */}
          <Route path="/add-club" element={<AddClub />} />
        </Routes>
        
        {/* Footer-ul rămâne mereu jos */}
        <footer className="text-center py-10 text-gray-500 border-t mt-16">
          © 2026 Padel Connect Hackathon MVP
        </footer>
      </div>
    </Router>
  )
}

export default App