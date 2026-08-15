import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../api/auth.service";
import { User } from "../../api/types";
import googleSignInIcon from "../../assets/google-sign-in.png";
import loginCheckboxTick from "../../assets/login-checkbox-tick.svg";
import passwordVisibilityIcon from "../../assets/password-visibility.png";
import { useAuth } from "../../context/AuthContext";

type FormValues = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialFormValues: FormValues = {
  email: "",
  password: "",
};

/** Implements the UC-02 Figma login form and authenticated-session flow. */
const LoginForm = () => {
  const navigate = useNavigate();
  const { establishSession } = useAuth();
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  /** Updates a form value and clears feedback that is no longer applicable. */
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const fieldName = name as keyof FormValues;

    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
    setApiError("");
  };

  /** Applies BR-LOG-01 and BR-LOG-02 before the API request. */
  const validate = (): { errors: FieldErrors; normalizedEmail: string } => {
    const normalizedEmail = formValues.email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!normalizedEmail) {
      errors.email = "Email address is required.";
    } else if (normalizedEmail.length > 255) {
      errors.email = "Email address must not exceed 255 characters.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!formValues.password) {
      errors.password = "Password is required.";
    }

    return { errors, normalizedEmail };
  };

  /** Sends one valid login request and establishes the returned session. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    setApiError("");
    const { errors, normalizedEmail } = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        email: normalizedEmail,
        password: formValues.password,
      });

      if (!response.success || !response.data) {
        setApiError(
          response.message || "Đăng nhập thất bại. Vui lòng thử lại.",
        );
        return;
      }

      const { accessToken, user: authenticatedUser } = response.data;
      const mappedUser: User = {
        user_id: authenticatedUser.id,
        full_name: authenticatedUser.fullName,
        email: authenticatedUser.email,
        username: "",
        total_balance: 0,
      };

      establishSession(accessToken, mappedUser);
      navigate("/");
    } catch (error: unknown) {
      const responseMessage = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setApiError(
        Array.isArray(responseMessage)
          ? responseMessage.join(", ")
          : responseMessage || "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#f4f5f7] px-5 py-20 text-[#191d23] sm:px-8 lg:py-[160px]">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-10">
        <div className="flex flex-col items-center gap-16">
          <p className="whitespace-nowrap text-center text-[40px] font-extrabold leading-8 tracking-[3.2px] text-[#299d91]">
            FINE<span className="font-medium">bank.</span>IO
          </p>

          <div className="flex w-full flex-col gap-6">
            <form className="w-full" noValidate onSubmit={handleSubmit}>
              {apiError && (
                <p
                  aria-live="polite"
                  className="mb-4 rounded-[4px] bg-red-50 px-3 py-2 text-sm text-[#e73d1c]"
                >
                  {apiError}
                </p>
              )}

              <div className="flex flex-col gap-6">
                <div>
                  <label
                    className="block text-[16px] font-medium leading-6"
                    htmlFor="login-email"
                  >
                    Email Address
                  </label>
                  <input
                    aria-describedby={
                      fieldErrors.email ? "login-email-error" : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.email)}
                    autoComplete="email"
                    className={`mt-2 h-12 w-full rounded-[8px] border bg-transparent px-4 text-[16px] leading-6 text-[#4b5768] outline-none transition focus:border-[#4b5768] ${
                      fieldErrors.email
                        ? "border-[#e73d1c]"
                        : "border-[#d0d5dd]"
                    }`}
                    id="login-email"
                    name="email"
                    onChange={handleChange}
                    placeholder="johndoe@email.com"
                    type="email"
                    value={formValues.email}
                  />
                  {fieldErrors.email && (
                    <p
                      className="mt-1.5 text-sm text-[#e73d1c]"
                      id="login-email-error"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="text-[16px] font-medium leading-6"
                      htmlFor="login-password"
                    >
                      Password
                    </label>
                    <Link
                      className="text-right text-[12px] font-medium leading-4 text-[#299d91]"
                      to="/forgot-password"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative mt-2">
                    <input
                      aria-describedby={
                        fieldErrors.password
                          ? "login-password-error"
                          : undefined
                      }
                      aria-invalid={Boolean(fieldErrors.password)}
                      autoComplete="current-password"
                      className={`h-12 w-full rounded-[8px] border bg-transparent px-4 pr-14 text-[16px] leading-6 text-[#4b5768] outline-none transition placeholder:tracking-[4px] focus:border-[#4b5768] ${
                        fieldErrors.password
                          ? "border-[#e73d1c]"
                          : "border-[#d0d5dd]"
                      }`}
                      id="login-password"
                      name="password"
                      onChange={handleChange}
                      placeholder="••••••••••••••"
                      type={showPassword ? "text" : "password"}
                      value={formValues.password}
                    />
                    <button
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                      onClick={() => setShowPassword((isVisible) => !isVisible)}
                      type="button"
                    >
                      <img
                        alt=""
                        className="h-6 w-6"
                        src={passwordVisibilityIcon}
                      />
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p
                      className="mt-1.5 text-sm text-[#e73d1c]"
                      id="login-password-error"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-4 text-[16px] font-light leading-6">
                  <input
                    checked={keepSignedIn}
                    className="peer sr-only"
                    onChange={(event) => setKeepSignedIn(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-[#d0d5dd] peer-checked:border-[#299d91] peer-checked:bg-[#299d91] peer-focus-visible:ring-2 peer-focus-visible:ring-[#299d91]/40">
                    {keepSignedIn && (
                      <img alt="" className="h-5 w-5" src={loginCheckboxTick} />
                    )}
                  </span>
                  Keep me signed in
                </label>
                <button
                  className="flex h-12 w-full items-center justify-center rounded-[4px] bg-[#299d91] px-3 py-4 text-[16px] font-semibold leading-6 text-white transition hover:bg-[#258c82] focus:outline-none focus:ring-2 focus:ring-[#299d91] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Logging in...
                    </span>
                  ) : (
                    "Login"
                  )}
                </button>
              </div>
            </form>

            <div className="flex w-full flex-col items-center gap-6">
              <div className="flex w-full items-center text-[14px] leading-5 text-[#999da3]">
                <span className="h-px flex-1 bg-[#d0d5dd]" />
                <span className="bg-[#f4f5f7] px-2">or sign in with</span>
                <span className="h-px flex-1 bg-[#d0d5dd]" />
              </div>
              <button
                className="flex h-12 w-full items-center justify-center gap-4 rounded-[4px] bg-[#e4e7eb] px-[69px] py-3 text-[16px] leading-6 text-[#4b5768]"
                type="button"
              >
                <img alt="" className="h-6 w-6" src={googleSignInIcon} />
                <span className="whitespace-nowrap">Continue with Google</span>
              </button>
            </div>
          </div>
        </div>

        <Link
          className="text-center text-[16px] font-semibold leading-6 text-[#299d91]"
          to="/register"
        >
          Create an account
        </Link>
      </div>
    </section>
  );
};

export default LoginForm;
