// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cbgrkkpscyxcjkmrfzzg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZ3Jra3BzY3l4Y2prbXJmenpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODU0ODAsImV4cCI6MjA2MzU2MTQ4MH0.AXKHyDN1INDUzErG7Pw4IWL2zysVgSmVvcKbOr_tsDc";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);