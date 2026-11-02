export default function CompanyBrand({
  className = "",
  symbolOnly = false,
}: {
  className?: string;
  symbolOnly?: boolean;
}) {
  return (
    <span
      className={`company-brand ${symbolOnly ? "company-brand-icon" : ""} ${className}`}
      role="img"
      aria-label="מנשה רסולי — הנדסה אזרחית בע״מ"
    >
      <span className="company-brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!symbolOnly && (
        <span className="company-brand-copy" aria-hidden="true">
          <strong>מנשה רסולי</strong>
          <small>הנדסה אזרחית בע״מ</small>
        </span>
      )}
    </span>
  );
}
