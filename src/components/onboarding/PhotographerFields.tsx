/**
 * PhotographerFields component - conditional fields for photographer profiles
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PhotographerFieldsProps, SocialLinkEntry } from "./types";

export function PhotographerFields({
  companyName,
  websiteUrl,
  socialLinks,
  onCompanyNameChange,
  onWebsiteUrlChange,
  onSocialLinksChange,
  errors,
}: PhotographerFieldsProps) {
  const handleAddSocialLink = () => {
    const newLink: SocialLinkEntry = {
      id: `social-${Date.now()}`,
      label: "",
      url: "",
    };
    onSocialLinksChange([...socialLinks, newLink]);
  };

  const handleRemoveSocialLink = (id: string) => {
    onSocialLinksChange(socialLinks.filter((link) => link.id !== id));
  };

  const handleSocialLinkChange = (id: string, field: "label" | "url", value: string) => {
    onSocialLinksChange(socialLinks.map((link) => (link.id === id ? { ...link, [field]: value } : link)));
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Photographer Details</h3>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="company_name">Company Name (Optional)</Label>
        <Input
          id="company_name"
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="e.g., John Doe Photography"
          maxLength={100}
          aria-invalid={!!errors?.company_name}
          aria-describedby={errors?.company_name ? "company_name-error" : undefined}
        />
        {errors?.company_name && (
          <p id="company_name-error" className="text-sm text-red-600 dark:text-red-400">
            {errors.company_name}
          </p>
        )}
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <Label htmlFor="website_url">Website (Optional)</Label>
        <Input
          id="website_url"
          type="url"
          value={websiteUrl}
          onChange={(e) => onWebsiteUrlChange(e.target.value)}
          placeholder="https://example.com"
          aria-invalid={!!errors?.website_url}
          aria-describedby={errors?.website_url ? "website_url-error" : undefined}
        />
        {errors?.website_url && (
          <p id="website_url-error" className="text-sm text-red-600 dark:text-red-400">
            {errors.website_url}
          </p>
        )}
      </div>

      {/* Social Links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Social Links (Optional)</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSocialLink}>
            + Add Link
          </Button>
        </div>

        {socialLinks.length > 0 && (
          <div className="space-y-3">
            {socialLinks.map((link) => (
              <div key={link.id} className="flex gap-2">
                <Input
                  type="text"
                  value={link.label}
                  onChange={(e) => handleSocialLinkChange(link.id, "label", e.target.value)}
                  placeholder="Platform (e.g., Instagram)"
                  className="flex-1"
                  aria-label="Social platform name"
                />
                <Input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleSocialLinkChange(link.id, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-[2]"
                  aria-label="Social profile URL"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSocialLink(link.id)}
                  aria-label="Remove social link"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {errors?.social_links && <p className="text-sm text-red-600 dark:text-red-400">{errors.social_links}</p>}
      </div>
    </div>
  );
}
