import { useEffect, useState } from "react";
import { Field } from "../components/ui";
import { cloudClient } from "../data/cloudWorkspace";

type Contact = {
  id: number;
  name: string;
  title: string;
  specialty: string;
  email: string;
  phone: string;
};

export default function OfficeContacts() {
  const [contacts, setContacts] = useState<Contact[]>();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!cloudClient) return;
    let active = true;
    void cloudClient.rpc("read_office_contacts").then(({ data, error }) => {
      if (!active) return;
      if (error)
        setError(
          error.code === "PGRST202"
            ? "יש להפעיל את עדכון מסד הנתונים של ספר הטלפונים."
            : "טעינת אנשי הקשר נכשלה.",
        );
      else setContacts(data as Contact[]);
    });
    return () => {
      active = false;
    };
  }, []);
  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  const visible = contacts?.filter(
    (contact) =>
      [
        contact.name,
        contact.title,
        contact.specialty,
        contact.email,
        contact.phone,
      ].some((value) => value.toLowerCase().includes(term)) ||
      (digits &&
        /^[0-9\s()+-]+$/.test(term) &&
        contact.phone.replace(/\D/g, "").includes(digits)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">משרד רסולי</span>
          <h1>ספר טלפונים ארגוני</h1>
          <p className="muted">
            טלפון משרד:{" "}
            <a href="tel:086322891" dir="ltr">
              08-6322891
            </a>{" "}
            · פקס: <span dir="ltr">153-86322891</span>
          </p>
        </div>
        <Field label="חיפוש אנשי קשר">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="שם, תפקיד, תחום, טלפון או מייל"
          />
        </Field>
      </div>
      {(!cloudClient || error) && (
        <p role="alert" className="notice">
          {error || "ספר הטלפונים זמין בחיבור לשרת."}
        </p>
      )}
      {cloudClient && !contacts && !error && (
        <p role="status">טוען אנשי קשר…</p>
      )}
      {visible?.length === 0 && <p>לא נמצאו אנשי קשר.</p>}
      <div className="office-contact-grid">
        {visible?.map((contact) => (
          <article key={contact.id} className="panel padded contact-card">
            <h2>{contact.name}</h2>
            <p className="muted">
              {[contact.title, contact.specialty].filter(Boolean).join(" · ")}
            </p>
            <div className="contact-links">
              <a href={`tel:${contact.phone.replace(/\D/g, "")}`} dir="ltr">
                {contact.phone}
              </a>
              <a href={`mailto:${contact.email}`} dir="ltr">
                {contact.email}
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
