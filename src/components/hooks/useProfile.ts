import { useState, useEffect } from "react";
import { navigate, Routes } from "@/lib/services/navigation.service";
import type { UserProfileDTO, UpdateUserProfileDTO, ChangePasswordDTO } from "@/types";

interface UseProfileReturn {
  profile: UserProfileDTO | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateProfile: (data: UpdateUserProfileDTO) => Promise<void>;
  changePassword: (data: ChangePasswordDTO) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/profiles/me");

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data: UserProfileDTO = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się załadować profilu. Spróbuj odświeżyć stronę.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Update profile (name and/or preferences)
  const updateProfile = async (data: UpdateUserProfileDTO) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/profiles/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile: UserProfileDTO = await response.json();
      setProfile(updatedProfile);
    } catch (err) {
      setError("Nie udało się zapisać zmian. Spróbuj ponownie.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const changePassword = async (data: ChangePasswordDTO) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error("Obecne hasło jest nieprawidłowe.");
        }
        throw new Error(errorData.message || "Failed to change password");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error && err.message === "Obecne hasło jest nieprawidłowe."
          ? err.message
          : err instanceof Error
            ? err.message
            : "Nie udało się zmienić hasła. Spróbuj ponownie.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch("/api/profiles/me", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete account");
      }

      // Redirect to login page after successful deletion
      // User is already signed out by the backend
      await navigate(Routes.auth.login());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nie udało się usunąć konta. Spróbuj ponownie.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    profile,
    isLoading,
    isSaving,
    error,
    updateProfile,
    changePassword,
    deleteAccount,
  };
}
