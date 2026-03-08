"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { AnimatedBackground } from "~/components/ui/animated-background";
import { googleSignupCompletionSchema, GoogleSignupCompletionValues, loginSchema, type LoginFormValues } from "~/lib/validation";
import { tempTokenCompare } from "~/lib/utils";
import { useFinalizingProviderUsernameMutation, useSignInMutation } from "~/redux/apis/auth.api";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { NestErrorResponse, USERNAME_CONFLICT } from "~/interfaces/error.interface";
import { Spinner } from "~/components/ui/spinner";
import Image from "next/image";
import { IconArrowRight, IconEyeFilled, IconEyeOff, IconLock, IconMail, IconUser } from "@tabler/icons-react";
import { sileo } from "sileo";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isProviderSetup, setIsProviderSetup] = useState<boolean>(false);
  const [finalizingProviderUsername, { isLoading: isFinalizingProviderUsernameLoading }] = useFinalizingProviderUsernameMutation();
  const [signIn, { isLoading: isSignInLoading }] = useSignInMutation();
  const router = useRouter();
  const queryParams = useSearchParams().get("temp_provider_setup");
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const googleSignupCompletionForm = useForm<GoogleSignupCompletionValues>({
    resolver: zodResolver(googleSignupCompletionSchema),
    defaultValues: {
      username: "",
    },
  });

  useEffect(() => {
    if (queryParams) {
      tempTokenCompare(queryParams).then((result) => {
        setIsProviderSetup(result);
      });
    }
  }, [queryParams]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await signIn({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      })
        .unwrap()
        .then((res) => {
          router.push(`/channels/${res.slug}`);
        });
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      sileo.error({
        title: "Something went wrong",
        description: errData?.message || "Please try again later.",
      });
    }
  };

  const onGoogleSignupCompletionSubmit = async (data: GoogleSignupCompletionValues) => {
    try {
      await finalizingProviderUsername({ username: data.username })
        .unwrap()
        .then((res) => {
          router.push(`/channels/${res.slug}`);
        });
    } catch (error) {
      const errData = (error as FetchBaseQueryError).data as NestErrorResponse;
      if (errData.error === USERNAME_CONFLICT) {
        googleSignupCompletionForm.setError("username", {
          type: "manual",
          message: errData.message,
        });
      } else {
        sileo.error({
          title: "Something went wrong",
          description: errData?.message || "Please try again later.",
        });
      }
    }
  };

  const handleGoogleLogin = () => {
    router.push(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT!);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <AnimatedBackground />
      {isProviderSetup ? (
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/vyral-full-logo.svg" alt="Vyral" width={200} height={200} className="object-cover h-20 w-90" />
            </Link>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Complete your signup</CardTitle>
              <CardDescription>Add a username to your account to continue chatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...googleSignupCompletionForm}>
                <form onSubmit={googleSignupCompletionForm.handleSubmit(onGoogleSignupCompletionSubmit)} className="space-y-4">
                  <FormField
                    control={googleSignupCompletionForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="text" placeholder="yourname" className="pl-10 h-11" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full rounded-full h-11 bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isFinalizingProviderUsernameLoading}
                  >
                    {isFinalizingProviderUsernameLoading ? (
                      <>
                        <Spinner />
                        Finalizing username...
                      </>
                    ) : (
                      <>
                        Sign In
                        <IconArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/vyral-full-logo.svg" alt="Vyral" width={200} height={200} className="object-cover h-20 w-90" />
            </Link>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue chatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button type="button" variant="outline" className="w-full rounded-full h-11 bg-transparent" onClick={handleGoogleLogin}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="you@example.com" className="pl-10 h-11" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link href="/forgot-password" className="text-sm text-accent hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10 h-11"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEyeFilled className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">Remember me for 30 days</FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full rounded-full h-11 bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isSignInLoading}
                  >
                    {isSignInLoading ? (
                      <>
                        <Spinner />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <IconArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-accent font-medium hover:underline">
                  Create account
                </Link>
              </p>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
