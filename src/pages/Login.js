import React, { useState } from "react"; // React ve state aracini ice aktarir
import { Link, useNavigate } from "react-router-dom"; // Sayfa yonlendirme ve link icin
import { useAuth } from "../AuthContext"; // Giris yapan kullanici ve auth fonksiyonlari
import { doc, getDoc } from "firebase/firestore"; // Firestore'dan veri okuma fonksiyonlari
import { db } from "../firebase"; // Firebase veritabani baglantisi
import * as OTPAuth from "otpauth"; // 2FA kod dogrulama kutuphanesi

export default function Login() {
  const [email, setEmail] = useState(""); // Kullanicinin girdigi e-posta
  const [password, setPassword] = useState(""); // Kullanicinin girdigi sifre
  const [error, setError] = useState(""); // Hata mesaji
  const [loading, setLoading] = useState(false); // Giris butonu yuklenme durumu
  const [show2FA, setShow2FA] = useState(false); // 2FA ekrani gosterilsin mi
  const [twoFACode, setTwoFACode] = useState(""); // Kullanicinin girdigi 6 haneli 2FA kodu
  const [secret, setSecret] = useState(""); // Firestore'dan gelen 2FA gizli anahtari
  const { login, setAwaitingTwoFA } = useAuth(); // Login fonksiyonu ve 2FA bekleme durumu
  const navigate = useNavigate(); // Sayfa yonlendirme fonksiyonu

  async function handleSubmit(e) {
    e.preventDefault(); // Formun sayfayi yenilemesini engelle
    e.stopPropagation(); // Olaylarin ust elemanlara yayilmasini engelle
    setError(""); // Onceki hata mesajini temizle
    setLoading(true); // Yukleme basliyor
    setAwaitingTwoFA(true); // 2FA bekleniyor, dashboard'a gecisi engelle
    try {
      const result = await login(email, password); // Firebase ile giris yap
      const ref = doc(db, "users", result.user.uid); // Firestore'da kullanicinin belgesi
      const snap = await getDoc(ref); // Belgeyi oku

      if (snap.exists() && snap.data().twoFAEnabled) { // Kullanicinin 2FA'si aciksa
        setSecret(snap.data().twoFASecret); // Gizli anahtari state'e kaydet
        setShow2FA(true); // 2FA dogrulama ekranini goster
        setLoading(false); // Yukleme bitti
      } else { // 2FA kapaliylsa
        setAwaitingTwoFA(false); // 2FA beklemeyi kaldir
        navigate("/dashboard"); // Direkt dashboard'a git
      }
    } catch (err) { // Giris hatasi olursa
      setAwaitingTwoFA(false); // 2FA beklemeyi kaldir
      const messages = {
        "auth/user-not-found": "Bu e-posta ile kayitli kullanici bulunamadi.",
        "auth/wrong-password": "Sifre yanlis, tekrar deneyin.",
        "auth/invalid-email": "Gecersiz e-posta adresi.",
        "auth/too-many-requests": "Cok fazla deneme. Lutfen bekleyin.",
        "auth/invalid-credential": "E-posta veya sifre hatali.",
      }; // Firebase hata kodlarini Turkce mesajlara cevir
      setError(messages[err.code] || "Giris yapilamadi."); // Hata mesajini goster
      setLoading(false); // Yukleme bitti
    }
  }

  function verify2FA() {
    const totp = new OTPAuth.TOTP({ secret: secret, digits: 6 }); // Gizli anahtarla TOTP nesnesi olustur
    const delta = totp.validate({ token: twoFACode, window: 1 }); // Kodu dogrula (1 periyot tolerans)
    if (delta !== null) { // Kod dogruysa
      setAwaitingTwoFA(false); // 2FA beklemeyi kaldir
      navigate("/dashboard"); // Dashboard'a git
    } else { // Kod yanlissa
      setError("Kod yanlis, tekrar dene."); // Hata mesaji goster
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") verify2FA(); // Enter tusuna basilinca kodu dogrula
  }

  if (show2FA) { // 2FA ekrani gosterilecekse
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🔐</div>
            <h1>2FA Dogrulama</h1>
            <p>Authenticator uygulamanindaki 6 haneli kodu gir</p>
          </div>
          {error && <div className="auth-error">{error}</div>} {/* Hata varsa goster */}
          <div className="auth-form">
            <div className="form-group">
              <label>Dogrulama Kodu</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6} // En fazla 6 karakter
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)} // Kullanici yazdikca state'i guncelle
                onKeyDown={handleKeyDown} // Enter tusuna basilinca dogrula
                autoFocus // Sayfa acilinca otomatik odaklan
                style={{letterSpacing:"0.2em", fontFamily:"monospace", fontSize:"1.2rem", textAlign:"center"}}
              />
            </div>
            <button className="auth-btn" onClick={verify2FA}>
              Dogrula ve Giris Yap {/* 2FA dogrulama butonu */}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return ( // Normal giris ekrani
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">⬡</div>
          <h1>Tekrar hosgeldin</h1>
          <p>Hesabina giris yap</p>
        </div>
        {error && <div className="auth-error">{error}</div>} {/* Hata varsa goster */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>E-posta</label>
            <input type="email" placeholder="ornek@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Sifre</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : "Giris Yap"} {/* Yukleniyor animasyonu veya buton yazisi */}
          </button>
        </form>
        <p className="auth-switch">
          Hesabin yok mu? <Link to="/register">Kayit ol</Link> {/* Kayit sayfasina link */}
        </p>
      </div>
    </div>
  );
}