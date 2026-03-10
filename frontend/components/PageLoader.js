"use client";

export default function PageLoader({ label = "Loading..." }) {
  return (
    <main className="page-shell page-loading">
      <div className="page-loader">
        <span className="page-loader-spinner" aria-hidden="true" />
        <p className="page-loader-text">{label}</p>
      </div>
    </main>
  );
}
