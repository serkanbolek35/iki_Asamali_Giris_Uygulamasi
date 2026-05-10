import React from "react"; // React kutuphanesini ice aktarir
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // Sayfa yonlendirme icin gerekli araclar
import { AuthProvider, useAuth } from "./AuthContext"; // Kullanici auth bilgilerini tum uygulamaya saglar
import Login from "./pages/Login"; // Giris sayfasi
import Register from "./pages/Register"; // Kayit sayfasi
import Dashboard from "./pages/Dashboard"; // Ana sayfa (giris sonrasi)
import "./App.css"; // Uygulama stilleri

function PrivateRoute({ children }) { // Sadece giris yapan kullanicilarin erisebilecegi sayfa
  const { currentUser, awaitingTwoFA } = useAuth(); // Kullanici bilgisi ve 2FA bekleme durumu
  if (!currentUser) return <Navigate to="/login" />; // Kullanici giris yapmamissa login'e gonder
  if (awaitingTwoFA) return <Navigate to="/login" />; // 2FA bekleniyor ama tamamlanmadiysa login'e gonder
  return children; // Her sey tamamsa sayfayi goster
}

function PublicRoute({ children }) { // Sadece giris yapmamis kullanicilarin erisebilecegi sayfa
  const { currentUser, awaitingTwoFA } = useAuth(); // Kullanici bilgisi ve 2FA bekleme durumu
  if (currentUser && !awaitingTwoFA) return <Navigate to="/dashboard" />; // Kullanici giris yapmis ve 2FA tamamlandi ise dashboard'a gonder
  return children; // Giris yapilmamis veya 2FA bekleniyor ise sayfayi goster
}

function App() {
  return (
    <AuthProvider> {/* Tum uygulamaya kullanici bilgisini saglar */}
      <Router> {/* HashRouter: URL'de # kullanir, GitHub Pages ile uyumlu calisir */}
        <Routes> {/* Tum sayfa rotalarini icerir */}
          <Route path="/" element={<Navigate to="/login" />} /> {/* Ana sayfa acilinca login'e yonlendir */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} /> {/* Giris sayfasi, sadece giris yapmayanlar erisebilir */}
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} /> {/* Kayit sayfasi, sadece giris yapmayanlar erisebilir */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} /> {/* Ana sayfa, sadece giris yapanlar erisebilir */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; // Bu bileseni diger dosyalarda kullanilabilir hale getirir