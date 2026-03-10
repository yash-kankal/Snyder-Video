"use client";

import Link from "next/link";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main className="state-screen">
          <section className="state-card">
            <p className="state-kicker">Unexpected error</p>
            <h1>Snyder hit a temporary issue.</h1>
            <p className="subtle">Refresh or try again in a moment.</p>
            <div className="state-actions">
              <button className="create-btn" onClick={reset} type="button">
                Retry
              </button>
              <Link className="ghost-btn" href="/login">
                Login
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
