import { useState } from "react";
import { Field, Icon } from "../components/ui";
import CompanyBrand from "../components/ui/CompanyBrand";
import { authenticateDemo, demoWorkers } from "../data/auth";
import type { Worker } from "../types";
export default function Login({
  onLogin,
}: {
  onLogin: (worker: Worker) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="wordmark" dir="ltr">
          <CompanyBrand className="login-company-brand" />
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
            const worker = authenticateDemo(email, password);
            if (!worker) {
              setError("כתובת הדוא״ל או הסיסמה שגויות.");
              return;
            }
            setError("");
            onLogin(worker);
          }}
        >
          <span className="eyebrow">ברוכים הבאים</span>
          <h2>כניסה למערכת</h2>
          <p className="muted">סביבת ניהול הפרויקטים של רסולי הנדסה</p>
          <div className="login-accounts" aria-label="בחירת משתמש">
            {demoWorkers.map((worker) => (
              <button
                type="button"
                key={worker.id}
                className={email === worker.email ? "active" : ""}
                aria-pressed={email === worker.email}
                onClick={() => {
                  setEmail(worker.email);
                  setPassword("");
                  setError("");
                }}
              >
                <Icon name="user" />
                <span>
                  <strong>{worker.name}</strong>
                  <small dir="ltr">{worker.email}</small>
                </span>
              </button>
            ))}
          </div>
          <Field label="שם משתמש / דוא״ל">
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="name@rassuly-eng.co.il"
              dir="ltr"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </Field>
          <Field label="סיסמה">
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="הסיסמה שלך"
            />
          </Field>
          {error && (
            <p id="login-error" className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" type="submit">
            התחברות <Icon name="arrow" />
          </button>
          <p className="demo-note">כניסת הדגמה · סיסמה לשני המשתמשים: 1234</p>
        </form>
        <small className="login-footer">RassulyAI · מערכת ניהול פרויקטים</small>
      </section>
    </main>
  );
}
