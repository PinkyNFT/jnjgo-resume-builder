import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '5rem', fontWeight: 900, color: '#e2e8f0', lineHeight: 1, margin: 0 }}>404</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>Page not found</h1>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>This page doesn&apos;t exist or may have been moved.</p>
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#0f172a', color: '#fff', fontWeight: 600, borderRadius: '0.75rem', textDecoration: 'none' }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
