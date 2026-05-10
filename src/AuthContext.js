import React, { createContext, useContext, useState, useEffect } from "react"; // React ve gerekli araclar
import {
  createUserWithEmailAndPassword, // Yeni kullanici olusturma fonksiyonu
  signInWithEmailAndPassword, // Email/sifre ile giris fonksiyonu
  signOut, // Cikis fonksiyonu
  onAuthStateChanged, // Kullanici durumu degisince tetiklenir (giris/cikis)
  updateProfile, // Kullanici profilini guncelleme fonksiyonu
} from "firebase/auth";
import { auth } from "./firebase"; // Firebase auth baglantisi

const AuthContext = createContext(); // Tum uygulamaya kullanici bilgisi dagitmak icin context olustur

export function useAuth() {
  return useContext(AuthContext); // Herhangi bir bilesenin AuthContext'e kolayca erisebilmesini saglar
}

export function AuthProvider({ children }) { // Tum uygulamayi sarmalayan auth saglayici
  const [currentUser, setCurrentUser] = useState(null); // Giris yapan kullanici bilgisi
  const [loading, setLoading] = useState(true); // Firebase kullanici durumunu kontrol ediyor mu
  const [awaitingTwoFA, setAwaitingTwoFAState] = useState(
    () => sessionStorage.getItem("awaitingTwoFA") === "true" // Sayfa yenilenince 2FA bekleme durumunu koru
  );

  function setAwaitingTwoFA(val) {
    sessionStorage.setItem("awaitingTwoFA", val ? "true" : "false"); // 2FA durumunu tarayici hafizasina kaydet
    setAwaitingTwoFAState(val); // State'i guncelle
  }

  function register(email, password, displayName) {
    return createUserWithEmailAndPassword(auth, email, password).then((res) =>
      updateProfile(res.user, { displayName }) // Kayit olduktan sonra kullanici adini ayarla
    );
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password); // Email ve sifre ile giris yap
  }

  function logout() {
    setAwaitingTwoFA(false); // Cikis yapinca 2FA bekleme durumunu sifirla
    return signOut(auth); // Firebase'den cikis yap
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { // Kullanici durumu degisince calis
      setCurrentUser(user); // Kullanici bilgisini state'e kaydet (giris yapildiysa user, cikis yapildiysa null)
      setLoading(false); // Yukleme tamamlandi
    });
    return unsubscribe; // Bilesen kapaninca dinleyiciyi temizle (bellek sizintisini onle)
  }, []);

  const value = { 
    currentUser,    // Giris yapan kullanici bilgisi
    register,       // Kayit fonksiyonu
    login,          // Giris fonksiyonu
    logout,         // Cikis fonksiyonu
    awaitingTwoFA,  // 2FA bekleniyor mu
    setAwaitingTwoFA // 2FA bekleme durumunu degistirme fonksiyonu
  };

  return (
    <AuthContext.Provider value={value}> {/* Tum alt bilesenler bu degerlere erisebilir */}
      {!loading && children} {/* Firebase hazir olmadan hicbir sey render etme */}
    </AuthContext.Provider>
  );
}