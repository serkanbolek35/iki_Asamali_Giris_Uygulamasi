import React, { useState, useEffect } from "react"; // React ve state/effect araçlarını içe aktarır
import { useAuth } from "../AuthContext"; // Giriş yapan kullanıcı bilgisini getirir
import { useNavigate } from "react-router-dom"; // Sayfa yönlendirme için kullanılır
import { doc, getDoc, setDoc } from "firebase/firestore"; // Firestore'dan veri okuma/yazma fonksiyonları
import { db } from "../firebase"; // Firebase veritabanı bağlantısı
import * as OTPAuth from "otpauth"; // 2FA kod üretimi ve doğrulama kütüphanesi
import QRCode from "qrcode"; // QR kod oluşturma kütüphanesi

export default function Dashboard() {
  const { currentUser, logout } = useAuth(); // Giris yapan kullanici ve cikis fonksiyonu
  const navigate = useNavigate(); // Sayfa yonlendirme fonksiyonu

  const [twoFAEnabled, setTwoFAEnabled] = useState(false); // 2FA acik mi kapali mi
  const [showSetup, setShowSetup] = useState(false); // QR kurulum ekrani gorünsün mü
  const [qrUrl, setQrUrl] = useState(""); // QR kod resmi
  const [secret, setSecret] = useState(""); // 2FA gizli anahtari
  const [verifyCode, setVerifyCode] = useState(""); // Kullanicinin girdigi 6 haneli kod
  const [message, setMessage] = useState(""); // Ekranda gösterilecek mesaj
  const [loading, setLoading] = useState(true); // Sayfa yuklenme durumu

  useEffect(() => {
    async function check2FA() {
      const ref = doc(db, "users", currentUser.uid); // Firestore'da kullanicinin belgesi
      const snap = await getDoc(ref); // Belgeyi oku
      if (snap.exists() && snap.data().twoFAEnabled) { // 2FA aciksa
        setTwoFAEnabled(true); // State'i güncelle
      }
      setLoading(false); // Yukleme bitti
    }
    check2FA(); // Sayfa acilinca 2FA durumunu kontrol et
  }, [currentUser]);

  async function handleLogout() {
    await logout(); // Firebase'den cikis yap
    navigate("/login"); // Login sayfasina yonlendir
  }

  async function setup2FA() {
    const totp = new OTPAuth.TOTP({ // Yeni bir TOTP nesnesi olustur
      issuer: "MyApp", // Uygulama adi (Authenticator'da görünür)
      label: currentUser.email, // Kullanici e-postasi (Authenticator'da görünür)
      digits: 6, // 6 haneli kod üretilecek
    });
    const newSecret = totp.secret.base32; // Gizli anahtari base32 formatinda al
    setSecret(newSecret); // Gizli anahtari state'e kaydet
    const otpauth = totp.toString(); // QR kod icin otpauth URL'i olustur
    const url = await QRCode.toDataURL(otpauth); // QR kod resmi olustur
    setQrUrl(url); // QR resmi state'e kaydet
    setShowSetup(true); // Kurulum ekranini göster
    setMessage(""); // Onceki mesaji temizle
  }

  async function verify2FA() {
    const totp = new OTPAuth.TOTP({ secret: secret, digits: 6 }); // Gizli anahtarla TOTP nesnesi olustur
    const delta = totp.validate({ token: verifyCode, window: 1 }); // Kullanicinin kodunu dogrula (1 periyot tolerans)

    if (delta !== null) { // Kod dogruysa (delta null degilse gecerli demek)
      await setDoc(doc(db, "users", currentUser.uid), {
        twoFAEnabled: true, // 2FA aktif olarak kaydet
        twoFASecret: secret, // Gizli anahtari Firestore'a kaydet
      });
      setTwoFAEnabled(true); // State'i güncelle
      setShowSetup(false); // Kurulum ekranini kapat
      setMessage("2FA basariyla aktif edildi!"); // Basari mesaji goster
    } else { // Kod yanlissa
      setMessage("Kod yanlis, tekrar dene."); // Hata mesaji goster
    }
  }

  async function disable2FA() {
    await setDoc(doc(db, "users", currentUser.uid), {
      twoFAEnabled: false, // 2FA'yi kapat
      twoFASecret: "", // Gizli anahtari sil
    });
    setTwoFAEnabled(false); // State'i güncelle
    setMessage("2FA devre disi birakildi."); // Bilgi mesaji goster
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) // Ismin bas harflerini al (örn: "Serkan Bolek" -> "SB")
    : currentUser?.email?.[0].toUpperCase(); // Isim yoksa e-postanin ilk harfi

  if (loading) return ( // Yukleniyorsa bekletme ekrani goster
    <div className="dashboard-container" style={{display:"flex",alignItems:"center",justifyContent:"center",color:"#6b6b80"}}>
      Yukleniyor...
    </div>
  );

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-logo">MyApp</div>
        <button className="logout-btn" onClick={handleLogout}>Cikis Yap</button> {/* Cikis butonu */}
      </nav>

      <div className="dashboard-content">
        <div className="welcome-card">
          <div className="avatar">{initials}</div> {/* Kullanicinin bas harfleri */}
          <div className="welcome-text">
            <h1>Hosgeldin, {currentUser?.displayName || "Kullanici"}!</h1> {/* Kullanici adi */}
            <p>{currentUser?.email}</p> {/* Kullanici e-postasi */}
          </div>
        </div>

        {/* 2FA KARTI */}
        <div className="stat-card" style={{marginTop:"1rem", flexDirection:"column", alignItems:"flex-start", gap:"1rem", padding:"1.5rem"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%"}}>
            <div style={{display:"flex", alignItems:"center", gap:"0.75rem"}}>
              <span className="stat-icon">🔐</span>
              <div>
                <p className="stat-label">Iki Faktorlu Dogrulama (2FA)</p>
                <p className="stat-value" style={{color: twoFAEnabled ? "#4ade80" : "#f87171"}}>
                  {twoFAEnabled ? "Aktif" : "Pasif"} {/* 2FA durumu */}
                </p>
              </div>
            </div>
            {!twoFAEnabled ? ( // 2FA kapaliylsa "Aktif Et" butonu goster
              <button className="auth-btn" style={{width:"auto", padding:"0.5rem 1.25rem", marginTop:0}} onClick={setup2FA}>
                Aktif Et
              </button>
            ) : ( // 2FA aciksa "Devre Disi Birak" butonu goster
              <button className="logout-btn" onClick={disable2FA}>
                Devre Disi Birak
              </button>
            )}
          </div>

          {message && ( // Mesaj varsa goster
            <p style={{fontSize:"0.85rem", color: message.includes("basariyla") ? "#4ade80" : message.includes("yanlis") ? "#f87171" : "#6b6b80"}}>
              {message}
            </p>
          )}

          {showSetup && ( // Kurulum ekrani aciksa goster
            <div style={{width:"100%", borderTop:"1px solid #1e1e2e", paddingTop:"1rem"}}>
              <p style={{fontSize:"0.85rem", color:"#e8e8f0", marginBottom:"0.75rem"}}>
                1. Microsoft Authenticator veya Google Authenticator uygulamasini ac
              </p>
              <p style={{fontSize:"0.85rem", color:"#e8e8f0", marginBottom:"0.75rem"}}>
                2. Asagidaki QR kodu tara
              </p>
              {qrUrl && ( // QR kod hazirsa goster
                <img src={qrUrl} alt="QR Code" style={{width:"180px", height:"180px", borderRadius:"8px", marginBottom:"1rem", background:"white", padding:"8px"}} />
              )}
              <p style={{fontSize:"0.85rem", color:"#e8e8f0", marginBottom:"0.5rem"}}>
                3. Uygulamadan gelen 6 haneli kodu gir
              </p>
              <div style={{display:"flex", gap:"0.75rem", alignItems:"center"}}>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6} // En fazla 6 karakter
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)} // Kullanici yazdikca state'i güncelle
                  style={{background:"rgba(255,255,255,0.05)", border:"1px solid #1e1e2e", borderRadius:"8px", padding:"0.5rem 0.75rem", color:"#e8e8f0", fontSize:"1rem", letterSpacing:"0.2em", width:"140px", fontFamily:"monospace"}}
                />
                <button className="auth-btn" style={{width:"auto", padding:"0.5rem 1.25rem", marginTop:0}} onClick={verify2FA}>
                  Dogrula {/* Kodu dogrula butonu */}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="stats-grid" style={{marginTop:"1rem"}}>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <div>
              <p className="stat-label">Kayit Tarihi</p>
              <p className="stat-value">
                {new Date(currentUser?.metadata?.creationTime).toLocaleDateString("tr-TR")} {/* Hesap olusturma tarihi */}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <div>
              <p className="stat-label">Son Giris</p>
              <p className="stat-value">
                {new Date(currentUser?.metadata?.lastSignInTime).toLocaleDateString("tr-TR")} {/* Son giris tarihi */}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}