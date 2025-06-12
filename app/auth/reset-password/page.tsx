"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" // Using next/navigation
import { supabase } from "@/lib/supabase/client" // Ensure this is your v2 client
import Image from "next/image"

// --- Helper Components (for illustration) ---
const LoadingScreen = () => <div>Loading...</div>;
const ErrorScreen = ({ message }: { message: string }) => <div>Error: {message}</div>;

// Dummy PasswordForm for now
const PasswordForm = ({ onSubmit, loading }: { onSubmit: (password: string) => Promise<void>, loading: boolean }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (password.length < 6) { // Example: Add basic validation
        setFormError("Password must be at least 6 characters.");
        return;
    }
    setFormError('');
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Set New Password</h2>
      <div>
        <label htmlFor="new-password">New Password:</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="confirm-password">Confirm New Password:</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
};

const SuccessScreen = ({ message }: { message: string }) => <div>{message}</div>;
// --- End Helper Components ---


export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "password" | "processing" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success messages
  const [isSessionReadyForUpdate, setIsSessionReadyForUpdate] = useState(false);

  useEffect(() => {
    console.log("[ResetPasswordPage] Mounted. Setting up auth listener.");
    setStep("loading"); // Start in loading state

    // Check for explicit errors in URL from Supabase redirect
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hashParams.get("error");
    const errorDescription = hashParams.get("error_description");

    if (errorCode) {
      console.error("[ResetPasswordPage] Error in URL hash:", errorDescription || errorCode);
      setError(errorDescription || `An error occurred: ${errorCode}. Please try requesting a new link.`);
      setStep("error");
      // Clean the hash
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return; // Stop further processing
    }

    // If no explicit error, listen for Supabase to process the recovery token
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[ResetPasswordPage] Auth event: ${event}`);
      if (session) {
        console.log("[ResetPasswordPage] Session details:", session.user?.id, session.expires_at);
      }


      if (event === "PASSWORD_RECOVERY") {
        console.log("[ResetPasswordPage] PASSWORD_RECOVERY event received. Ready for password update.");
        setIsSessionReadyForUpdate(true);
        setStep("password");
        // It's good practice to remove the hash from the URL now.
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } else if (event === "SIGNED_IN" && session && isSessionReadyForUpdate) {
        // This might fire after PASSWORD_RECOVERY if a full session is established.
        // The important part is that `isSessionReadyForUpdate` was set by PASSWORD_RECOVERY.
        console.log("[ResetPasswordPage] SIGNED_IN after PASSWORD_RECOVERY. Still good.");
      } else if (event === "INITIAL_SESSION") {
        // This might fire if there's no recovery token or an existing session.
        // We need to check if the hash *looks* like a recovery attempt.
        if (window.location.hash.includes("type=recovery")) {
            console.log("[ResetPasswordPage] INITIAL_SESSION, but URL hash has type=recovery. Waiting for PASSWORD_RECOVERY event.");
            // Keep loading, Supabase should process it soon.
        } else if (session) {
            console.warn("[ResetPasswordPage] User is already signed in and not in recovery mode. Redirecting...");
            // Optionally redirect if user is already signed in and not in recovery mode
            // router.push('/dashboard');
            setError("You are already logged in. If you want to change your password, go to account settings.");
            setStep("error");
        } else {
            console.warn("[ResetPasswordPage] No recovery token found in URL, and no active session.");
            setError("Invalid or expired password reset link. Please request a new one.");
            setStep("error");
        }
      }
    });

    // Initial check: if after a short delay, no PASSWORD_RECOVERY and hash had type=recovery
    // it likely means the token was invalid/expired right away.
    const timer = setTimeout(() => {
        if (step === "loading" && window.location.hash.includes("type=recovery") && !isSessionReadyForUpdate) {
            console.warn("[ResetPasswordPage] Timeout: Still loading and no PASSWORD_RECOVERY event, but URL had recovery type. Link might be invalid.");
            setError("Invalid or expired password reset link. It might have been used already or is too old. Please request a new one.");
            setStep("error");
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } else if (step === "loading" && !window.location.hash.includes("type=recovery")) {
            // If there's no recovery hash at all
             console.warn("[ResetPasswordPage] Timeout: Still loading and no recovery type in URL.");
             setError("No password reset information found in the link. Please request a new one.");
             setStep("error");
        }
    }, 3000); // 3-second timeout for Supabase to process the token


    return () => {
      console.log("[ResetPasswordPage] Unmounting. Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]); // router added to dependency array just in case of future use, not strictly needed for current logic

  const handlePasswordUpdate = async (newPassword: string) => {
    if (!isSessionReadyForUpdate) {
      setError("Session is not ready for password update. Please ensure you've used a valid, recent link.");
      setStep("error");
      return;
    }

    setStep("processing");
    setError(null);

    const { error: updateError, data } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("[ResetPasswordPage] Error updating password:", updateError);
      let friendlyMessage = "Failed to update password. Please try again.";
      if (updateError.message.includes("same as the old")) {
        friendlyMessage = "New password cannot be the same as the old password.";
      } else if (updateError.message.toLowerCase().includes("recently used")) {
        friendlyMessage = "This password has been used recently. Please choose a different one.";
      } else if (updateError.message.toLowerCase().includes("security policy")) {
         friendlyMessage = "Password does not meet security requirements (e.g., too short, too common)."
      }
      setError(friendlyMessage);
      setStep("password"); // Go back to password form to allow re-entry
    } else {
      console.log("[ResetPasswordPage] Password updated successfully:", data.user);
      setMessage("Your password has been successfully updated! You can now log in with your new password.");
      setStep("success");
      // Optional: Sign the user out explicitly after password change for security
      // await supabase.auth.signOut();
      // router.push("/login"); // Redirect to login
    }
  };

  if (step === "loading") return <LoadingScreen />;
  if (step === "error") return <ErrorScreen message={error || "An unknown error occurred."} />;
  if (step === "success") return <SuccessScreen message={message || "Operation successful."} />;
  if (step === "password" || step === "processing") {
    return (
      <div>
        <PasswordForm onSubmit={handlePasswordUpdate} loading={step === "processing"} />
        {/* Render any top-level error messages here if PasswordForm doesn't handle them all */}
        {step === "password" && error && <p style={{color: 'red', marginTop: '10px'}}>Error: {error}</p>}
      </div>
    );
  }

  return <ErrorScreen message="Invalid application state." />; // Fallback
}
