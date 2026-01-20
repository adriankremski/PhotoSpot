/**
 * ProfileSetupForm component - form for creating user profile during onboarding
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarPicker } from "./AvatarPicker";
import { PhotographerFields } from "./PhotographerFields";
import { useCreateProfile } from "./useCreateProfile";
import { getProfileSchema } from "./validation";
import type { ProfileSetupFormProps, ProfileFormValues, SocialLinkEntry, ApiCreateProfileRequest } from "./types";

export function ProfileSetupForm({ userId, role, onSuccess }: ProfileSetupFormProps) {
  const [socialLinks, setSocialLinks] = useState<SocialLinkEntry[]>([]);

  const schema = getProfileSchema(role);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: "",
      avatar_url: null,
      bio: null,
      company_name: null,
      website_url: null,
      social_links: null,
    },
  });

  const avatarUrl = watch("avatar_url");
  const companyName = watch("company_name") || "";
  const websiteUrl = watch("website_url") || "";

  const { createProfile, isLoading, error, fieldErrors } = useCreateProfile({
    userId,
    onSuccess: () => {
      onSuccess();
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    // Convert social links array to object
    let socialLinksObject: Record<string, string> | undefined = undefined;
    if (role === "photographer" && socialLinks.length > 0) {
      socialLinksObject = {};
      socialLinks.forEach((link) => {
        if (link.label && link.url) {
          socialLinksObject![link.label.toLowerCase().replace(/\s+/g, "_")] = link.url;
        }
      });
    }

    // Prepare payload - only include fields with actual values
    // Zod schema expects undefined (omitted) or empty string for optional fields, not null
    const payload: ApiCreateProfileRequest = {
      display_name: data.display_name,
    };

    // Add optional fields only if they have values (convert null/empty to empty string or omit)
    if (data.avatar_url) {
      payload.avatar_url = data.avatar_url;
    }

    if (data.bio) {
      payload.bio = data.bio;
    }

    // Add photographer fields if applicable
    if (role === "photographer") {
      if (data.company_name) {
        payload.company_name = data.company_name;
      }

      if (data.website_url) {
        payload.website_url = data.website_url;
      }

      // Only add social_links if we have at least one link
      if (socialLinksObject && Object.keys(socialLinksObject).length > 0) {
        payload.social_links = socialLinksObject;
      }
    }

    await createProfile(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Create Your Profile</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Set up your profile to get started</p>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profile Photo (Optional)</Label>
        <AvatarPicker value={avatarUrl || null} onChange={(url) => setValue("avatar_url", url)} />
        {(errors.avatar_url || fieldErrors?.avatar_url) && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.avatar_url?.message || fieldErrors?.avatar_url}
          </p>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display_name">
          Display Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="display_name"
          type="text"
          {...register("display_name")}
          placeholder="Your name"
          maxLength={100}
          aria-invalid={!!errors.display_name || !!fieldErrors?.display_name}
          aria-describedby={errors.display_name || fieldErrors?.display_name ? "display_name-error" : undefined}
        />
        {(errors.display_name || fieldErrors?.display_name) && (
          <p id="display_name-error" className="text-sm text-red-600 dark:text-red-400">
            {errors.display_name?.message || fieldErrors?.display_name}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio (Optional)</Label>
        <Textarea
          id="bio"
          {...register("bio")}
          placeholder="Tell us about yourself..."
          maxLength={500}
          rows={4}
          aria-invalid={!!errors.bio || !!fieldErrors?.bio}
          aria-describedby={errors.bio || fieldErrors?.bio ? "bio-error" : undefined}
        />
        {(errors.bio || fieldErrors?.bio) && (
          <p id="bio-error" className="text-sm text-red-600 dark:text-red-400">
            {errors.bio?.message || fieldErrors?.bio}
          </p>
        )}
      </div>

      {/* Photographer-specific fields */}
      {role === "photographer" && (
        <PhotographerFields
          companyName={companyName}
          websiteUrl={websiteUrl}
          socialLinks={socialLinks}
          onCompanyNameChange={(value) => setValue("company_name", value)}
          onWebsiteUrlChange={(value) => setValue("website_url", value)}
          onSocialLinksChange={setSocialLinks}
          errors={{
            company_name:
              (typeof errors.company_name?.message === "string" ? errors.company_name.message : undefined) ||
              fieldErrors?.company_name,
            website_url:
              (typeof errors.website_url?.message === "string" ? errors.website_url.message : undefined) ||
              fieldErrors?.website_url,
            social_links:
              (typeof errors.social_links?.message === "string" ? errors.social_links.message : undefined) ||
              fieldErrors?.social_links,
          }}
        />
      )}

      {/* General error message */}
      {error && (
        <div
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating Profile..." : "Complete Setup"}
      </Button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        You can update your profile later in settings
      </p>
    </form>
  );
}
