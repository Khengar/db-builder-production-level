import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom"; // Assuming you use React Router

// UI Component Imports
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
} from "@/components/ui/card";

import { supabaseClient } from "@/lib/supabaseClient";

// 1. Define Validation Schema with Zod
const registerSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error will show on this field
});

// Infer the type automatically from Zod (No need to write interface manually)
type RegisterFormValues = z.infer<typeof registerSchema>;

export function Register() {
    const [isLoading, setIsLoading] = useState(false);

    // 2. Setup Form
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });
    
    // 3. Frontend-only Submit Handler
    const onSubmit = async (formData: RegisterFormValues) => {
        setIsLoading(true);
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                emailRedirectTo: 'https://localhost:3000/dashboard',
            },
        })

        if (error){
            setIsLoading(false);
            console.error("Sign in failed", error.message);
            return;
        }

        if(data.session) {
            window.location.href = '/dashboard';
        }

        // Simulate API call delay
        setTimeout(() => {
            console.log("Api response timed out!");
            setIsLoading(false);
        }, 2000);
    };

    const handleSocialLogin = (provider: string) => {
        console.log(`Login with ${provider}`);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black/50">
            <Card className="w-full max-w-md border-white/10 bg-black/40 text-white backdrop-blur-xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                    <CardDescription className="text-center text-gray-400">
                        Enter your email below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Social Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-gray-200"
                            onClick={() => handleSocialLogin('Google')}
                        >
                            Google
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-gray-200"
                            onClick={() => handleSocialLogin('Github')}
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

                    {/* Form Fields */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            {/* Email Field */}
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

                            {/* Password Field */}
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

                            {/* Confirm Password Field */}
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-200">Confirm Password</FormLabel>
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
                                {isLoading ? "Creating account..." : "Create Account"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <div className="text-sm text-center text-gray-400">
                        Already have an account?{" "}
                        <Link to="/login" className="text-purple-400 hover:underline">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}