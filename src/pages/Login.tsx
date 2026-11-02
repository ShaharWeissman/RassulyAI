import { useState } from "react";
import { Field, Icon } from "../components/ui";
export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="wordmark" dir="ltr">
          <span className="logo-symbol">R</span>Rassuly<span>AI</span>
        </div>
        <div>
          <span className="eyebrow">רסולי הנדסה · סביבת העבודה שלך</span>
          <h1>
            התמונה המלאה.
            <br />
            בכל פרויקט.
          </h1>
          <p>
            פרויקטים, משימות והחלטות —<br />
            במקום אחד, לאורך כל הדרך.
          </p>
          <div className="engineering-drawing" aria-hidden="true">
            <div />
            <div />
            <div />
            <span>RASSULY ENGINEERING / PROJECT WORKSPACE</span>
          </div>
        </div>
        <small>ניהול מקצועי. עבודה מסודרת.</small>
      </section>
      <section className="login-form-wrap">
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
        >
          <span className="eyebrow">ברוכים הבאים</span>
          <h2>כניסה למערכת</h2>
          <p className="muted">סביבת ניהול הפרויקטים של רסולי הנדסה</p>
          <Field label="שם משתמש / דוא״ל">
            <input
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.co.il"
              dir="auto"
            />
          </Field>
          <Field label="סיסמה">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הסיסמה שלך"
            />
          </Field>
          <button className="primary" type="submit">
            התחברות <Icon name="arrow" />
          </button>
          <p className="demo-note">סביבת הדגמה · ניתן להיכנס ללא פרטי משתמש</p>
        </form>
        <small className="login-footer">RassulyAI · מערכת ניהול פרויקטים</small>
      </section>
    </main>
  );
}
