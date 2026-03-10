"use client";

import Link from "next/link";

export default function Error({ reset }) {
  return (
    <main className="state-screen">
      <section className="state-card">
        <p className="state-kicker">Something went wrong</p>
        <h1>We could not load this page.</h1>
        <p className="subtle">Please try again or return to home.</p>
        <div className="state-actions">
          <button className="create-btn" onClick={reset} type="button">
            Try again
          </button>
          <Link className="ghost-btn" href="/">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
