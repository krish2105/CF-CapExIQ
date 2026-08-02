import React from 'react';
import { LoginForm } from './LoginForm';
import { safeRedirect } from '@/lib/auth/redirect';

/**
 * Sign-in route.
 *
 * A server component that reads `next` from searchParams and hands it to the
 * client form as a prop. Reading it with `useSearchParams` inside the form
 * would force the route behind a Suspense boundary, and the whole page then
 * server-renders as an empty document — the sign-in screen would arrive blank
 * and only paint after hydration.
 */

export const dynamic = 'force-dynamic';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return <LoginForm next={safeRedirect(searchParams.next)} />;
}
