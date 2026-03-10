import Link from "next/link";

export default function NotFound() {
  return (
    <main className="state-screen">
      <section className="state-card">
        <p className="state-kicker">404</p>
        <h1>Page not found.</h1>
        <p className="subtle">The page may have moved or no longer exists.</p>
        <div className="state-actions">
          <Link className="create-btn" href="/">
            Back to home
          </Link>
          <Link className="ghost-btn" href="/login">
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
