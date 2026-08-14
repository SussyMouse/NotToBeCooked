import React from "react";
import z from "zod";

import { api, schemas, isApiClientError } from "@workspace/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/auth-context";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../components/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import devToast from "../lib/alerts";

const loginFormSchema = schemas.LoginRequest;

export function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    mode: "onSubmit",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginFormSchema>) => {
    try {
      const response = await api.auth.login(data)

      // The access token is deliberately never persisted: it lives in memory only,
      // and the HttpOnly refresh cookie is what survives a reload. Navigating with
      // the router (not window.location) keeps that in-memory token alive.
      login(response.access_token, response.user)
      navigate("/dashboard", { replace: true })
    } catch (err: unknown) {
      if (!isApiClientError(err)) {
        form.setError("root", { message: "An unexpected error occurred" })
        devToast(err)
        return
      }

      if (err.code === "INVALID_CREDENTIALS") {
        form.setError("email", { message: err.message })
        form.setError("password", { message: err.message })
      } else if (err.detail) {
        err.detail.forEach((issue) => {
          const fieldName = issue.loc[1] as "email" | "password"
          form.setError(fieldName, { message: issue.msg })
        });
      } else {
        form.setError("root", { message: err.message })
      }
      devToast(err)
    }
  };

  const rootError = form.formState.errors.root?.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md shadow-xl border border-border">
        <CardHeader className="text-center space-y-2 flex flex-col items-center">
          <img src="/ntbc-logo.png" alt="NotToBeCooked Logo" className="w-12 h-12 object-contain rounded-xl shadow-md" />
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your RAG study workspace
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Global/Server Error Banner */}
          {rootError && (
            <div role="alert" className="rounded-lg bg-destructive/15 p-3.5 text-sm font-medium text-destructive border border-destructive/20">
              {rootError}
            </div>
          )}

          <form id="form-login" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              {/* Email Field */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      aria-invalid={fieldState.invalid}
                      placeholder="example@gmail.com"
                      autoComplete="email"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Password Field */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        type={ showPassword ? "text" : "password" }
                        aria-invalid={fieldState.invalid}
                        placeholder="••••••••"
                        autoComplete="current-password"
                       />
                      <InputGroupAddon align="inline-end">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            form="form-login"
            size="lg"
            className="w-full font-semibold"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in..." : "Log In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;
