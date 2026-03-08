"use client";
import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Checkbox } from "~/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { AnimatedBackground } from "~/components/ui/animated-background";
import { signupStep1Schema, signupStep2Schema, type SignupStep1Values, type SignupStep2Values } from "~/lib/validation";
import { useCreateAccountMutation } from "~/redux/apis/auth.api";
import useUpload from "~/hooks/use-upload";
import { ConfigPrefix } from "~/interfaces/app.interface";
import { Spinner } from "~/components/ui/spinner";
import {
  IconArrowRight,
  IconAt,
  IconCheck,
  IconEyeFilled,
  IconEyeOff,
  IconLock,
  IconMail,
  IconPhotoPlus,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { ImageCropperInline } from "~/components/image-cropper";
import { sileo } from "sileo";

export default function SignupPage() {
  const [step, setStep] = useState<number>(1);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isUploadingLoading, setIsUploadingLoading] = useState<boolean>(false);
  const [step1Data, setStep1Data] = useState<SignupStep1Values | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [createAccount, { isLoading: isCreatingAccount }] = useCreateAccountMutation();
  const { startUpload } = useUpload(ConfigPrefix.SINGLE_IMAGE_UPLOADER, setIsUploadingLoading);
  const router = useRouter();

  const step1Form = useForm<SignupStep1Values>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false as unknown as true,
    },
  });

  const step2Form = useForm<SignupStep2Values>({
    resolver: zodResolver(signupStep2Schema),
    defaultValues: {
      username: "",
      profileImage: undefined,
    },
  });

  const password = step1Form.watch("password");

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
  ];

  const onStep1Submit = (data: SignupStep1Values) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setOriginalImageUrl(imageUrl);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setOriginalImageUrl(null);
  };

  const handleCropApply = (croppedFile: File) => {
    step2Form.setValue("profileImage", croppedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImageUrl(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);

    setIsCropping(false);
    setOriginalImageUrl(null);
  };

  const onStep2Submit = async (data: SignupStep2Values) => {
    if (!step1Data) return;
    if (data.profileImage) {
      await startUpload([data.profileImage]).then(async (res) => {
        if (res) {
          await createAccount({
            email: step1Data.email,
            password: step1Data.password,
            firstName: step1Data.firstName,
            lastName: step1Data.lastName,
            displayName: `${step1Data.firstName} ${step1Data.lastName}`,
            username: data.username,
            profilePicture: res[0].ufsUrl,
            provider: "email",
          })
            .unwrap()
            .then((res) => {
              if (res) {
                step2Form.reset();
                step1Form.reset();
                setStep1Data(null);
                setProfileImageUrl(null);
                router.push("/login");
                sileo.success({
                  title: "Account has been created",
                  description: "Your account has been created successfully 🎉",
                });
              }
            });
        }
      });
    } else {
      await createAccount({
        email: step1Data.email,
        password: step1Data.password,
        firstName: step1Data.firstName,
        lastName: step1Data.lastName,
        profilePicture: SHORT_LOGO_URL,
        displayName: `${step1Data.firstName.charAt(0).toUpperCase()}${step1Data.firstName.slice(1)} ${step1Data.lastName
          .charAt(0)
          .toUpperCase()}${step1Data.lastName.slice(1)}`,
        username: data.username,
        provider: "email",
      })
        .unwrap()
        .then((res) => {
          if (res) {
            step2Form.reset();
            step1Form.reset();
            setStep1Data(null);
            setProfileImageUrl(null);
            router.push(`/channels/${res.channelSlug}`);
            sileo.success({
              title: "Account has been created",
              description: "Your account has been created successfully 🎉",
            });
          }
        });
    }
  };

  const handleSkipImage = async () => {
    if (!step1Data) return;
    const isValid = await step2Form.trigger("username");
    if (!isValid) return;

    await createAccount({
      email: step1Data.email,
      password: step1Data.password,
      firstName: step1Data.firstName,
      lastName: step1Data.lastName,
      profilePicture: SHORT_LOGO_URL,
      displayName: `${step1Data.firstName} ${step1Data.lastName}`,
      username: step2Form.getValues("username"),
      provider: "email",
    })
      .unwrap()
      .then((res) => {
        if (res) {
          step2Form.reset();
          step1Form.reset();
          setStep1Data(null);
          setProfileImageUrl(null);
          router.push("/login");
          sileo.success({
            title: "Account has been created",
            description: "Your account has been created successfully 🎉",
          });
        }
      });
  };

  const handleGoogleSignup = () => {
    router.push(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT!);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <AnimatedBackground />

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/vyral-full-logo.svg" alt="Vyral" width={200} height={200} className="object-cover h-20 w-90" />
          </Link>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pb-4">
            <div className="relative overflow-hidden">
              <div
                className="transition-all duration-500 ease-in-out"
                style={{
                  transform: step === 1 ? "translateY(0)" : "translateY(-100%)",
                  opacity: step === 1 ? 1 : 0,
                  position: step === 1 ? "relative" : "absolute",
                }}
              >
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <CardDescription className="mt-1.5">Start chatting with friends and family in minutes</CardDescription>
              </div>
              <div
                className="transition-all duration-500 ease-in-out"
                style={{
                  transform: step === 2 ? "translateY(0)" : "translateY(100%)",
                  opacity: step === 2 ? 1 : 0,
                  position: step === 2 ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <CardTitle className="text-2xl">Set up your profile</CardTitle>
                <CardDescription className="mt-1.5">Add a photo and choose your username</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button type="button" variant="outline" className="w-full rounded-full h-11 bg-transparent" onClick={handleGoogleSignup}>
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
            <div className="relative min-h-[420px]">
              {/* Step 1 Form */}
              <div
                className={`transition-all duration-500 ease-in-out ${step === 1 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full absolute inset-0 pointer-events-none"
                  }`}
              >
                <Form {...step1Form}>
                  <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={step1Form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="text" placeholder="John" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={step1Form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="text" placeholder="Doe" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={step1Form.control}
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
                      control={step1Form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
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
                          {password.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              {passwordRequirements.map((req) => (
                                <div key={req.label} className="flex items-center gap-1.5 text-xs">
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${req.met ? "bg-accent text-accent-foreground" : "bg-muted"
                                      }`}
                                  >
                                    {req.met && <IconCheck className="h-2.5 w-2.5" />}
                                  </div>
                                  <span className={req.met ? "text-foreground" : "text-muted-foreground"}>{req.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="pl-10 pr-10 h-11"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showConfirmPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEyeFilled className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step1Form.control}
                      name="agreeTerms"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                          </FormControl>
                          <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer leading-5">
                            I agree to the{" "}
                            <Link href="/terms" className="text-accent hover:underline">
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-accent hover:underline">
                              Privacy Policy
                            </Link>
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full rounded-full h-11 bg-accent text-accent-foreground hover:bg-accent/90">
                      Continue
                      <IconArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="text-accent font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Step 2 Form */}
              <div
                className={`transition-all duration-500 ease-in-out ${step === 2 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full absolute inset-0 pointer-events-none"
                  }`}
              >
                {isCropping && originalImageUrl ? (
                  <ImageCropperInline
                    imageUrl={originalImageUrl}
                    onApply={handleCropApply}
                    onCancel={handleCropCancel}
                    title="Crop Profile Picture"
                  />
                ) : (
                  <Form {...step2Form}>
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                          {profileImageUrl && (
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              className="absolute top-0 right-0 rounded-full z-10"
                              onClick={() => {
                                setProfileImageUrl(null);
                                step2Form.setValue("profileImage", undefined);
                              }}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                          <div
                            className={`w-28 h-28 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-accent ${profileImageUrl ? "border-solid border-accent" : ""
                              }`}
                          >
                            {profileImageUrl ? (
                              <img src={profileImageUrl || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <IconPhotoPlus stroke={2} className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">Click to upload a profile picture (optional)</p>
                      </div>

                      <FormField
                        control={step2Form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <IconAt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="yourname"
                                  className="pl-10 h-11"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                            <FormDescription className="text-xs">Only lowercase letters, numbers, and underscores allowed</FormDescription>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <Button
                          type="submit"
                          className="w-full rounded-full h-11 bg-accent text-accent-foreground hover:bg-accent/90"
                          disabled={isUploadingLoading || isCreatingAccount}
                        >
                          {isCreatingAccount || isUploadingLoading ? (
                            <>
                              <Spinner />
                              Creating...
                            </>
                          ) : (
                            <>Create Account</>
                          )}
                        </Button>

                        <Button type="button" variant="outline" className="w-full rounded-full h-11 bg-transparent" onClick={() => setStep(1)}>
                          Back
                        </Button>

                        {!profileImageUrl && step2Form.watch("username").length >= 3 && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-foreground"
                            onClick={handleSkipImage}
                            disabled={isUploadingLoading || isCreatingAccount}
                          >
                            Skip profile picture for now
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                )}

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="text-accent font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
