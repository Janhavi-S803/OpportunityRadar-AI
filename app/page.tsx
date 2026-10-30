import { redirect } from 'next/navigation';

// Root page redirects to dashboard if logged in, otherwise to login
export default function HomePage() {
  redirect('/dashboard');
}
