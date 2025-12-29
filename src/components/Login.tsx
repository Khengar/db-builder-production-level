import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabaseClient } from "../lib/supabaseClient"; 
import { Link } from "react-router-dom";
import { type Provider } from "@supabase/supabase-js";

// UI Imports
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

// Toast Imports
import { Toaster, toast } from "sonner"; // Import toast function

// Zod Schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

interface LoginValues {
  email?: string;
  password?: string;
}

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 1. Submit Logic with Toast
  async function onSubmit(values: LoginValues) {
    setIsLoading(true);
    
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: values.email || "", 
        password: values.password || "",
      });

      if (error) {
        toast.error("Login Failed", {
          description: error.message,
        });
        return;
      }

      toast.success("Success", {
        description: "Welcome back!",
      });

    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred.",
      });
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // 2. Social Login with Toast
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: provider as Provider, // Explicit casting
      });
      
      if (error) {
        toast.error("Social Login Failed", {
          description: error.message,
        });
      }
    } catch (err) {
      toast.error("Connection Error", {
        description: "Could not connect to provider."
      });
    }
  };

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log("User is already logged in", session);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Optional: Add a small delay so they can see the success toast
        setTimeout(() => {
           window.location.href = "/dashboard"; 
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black/50">
      {/* IMPORTANT: Ideally move <Toaster /> to App.tsx so it persists across pages */}
      <Toaster richColors position="top-center" />
      
      <Card className="w-full max-w-md border-white/10 bg-black/40 text-white backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-gray-200"
              onClick={() => handleSocialLogin('google')}
            >
              Google
            </Button>
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-gray-200"
              onClick={() => handleSocialLogin('github')}
            >
              GitHub
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/40 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        {...field} 
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold mt-4"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
            <div className="text-sm text-center text-gray-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-purple-400 hover:underline">
                Sign up
              </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}