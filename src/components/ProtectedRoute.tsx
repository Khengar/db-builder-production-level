// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";
import { type Session } from '@supabase/supabase-js';

export const ProtectedRoute = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes (e.g. user clicks logout)
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    // Optional: Show a loading spinner while checking auth
    return <div>Loading...</div>; 
  }

  // THE LOGIC:
  // If no session (Guest) -> Redirect to Login
  // If session exists -> Render the Dashboard (Outlet)
  return session ? <Outlet context={session} /> : <Navigate to="/login" />;
};