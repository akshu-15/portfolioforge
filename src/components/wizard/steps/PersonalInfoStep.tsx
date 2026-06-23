import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/components/wizard/WizardContext";
import { extractGitHubUsername } from "@/lib/githubAnalytics";
import { ArrowRight, User, Upload, X } from "lucide-react";

// Zod Validation Schema
const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  role: z.string().min(1, "Role is required").max(100, "Role cannot exceed 100 characters"),
  tagline: z
    .string()
    .min(1, "Tagline is required")
    .max(150, "Tagline cannot exceed 150 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  phone: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  bio: z.string().max(300, "Bio cannot exceed 300 characters").optional().or(z.literal("")),
  website: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  github: z
    .string()
    .refine((val) => !val || Boolean(extractGitHubUsername(val)), {
      message: "Enter a GitHub username or profile URL",
    })
    .optional()
    .or(z.literal("")),
  linkedin: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "LinkedIn URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  twitter: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "Twitter URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  profilePhoto: z.string().optional().or(z.literal("")),
});

type PersonalInfoValues = z.infer<typeof personalInfoSchema>;

export const PersonalInfoStep = () => {
  const { state, dispatch } = useWizard();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const initialName =
    state.personal.name ||
    `${state.personal.firstName || ""} ${state.personal.lastName || ""}`.trim();

  const form = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: initialName,
      role: state.personal.role || "",
      tagline: state.personal.tagline || "",
      email: state.personal.email || "",
      phone: state.personal.phone || "",
      location: state.personal.location || "",
      bio: state.personal.bio || "",
      website: state.personal.website || "",
      github: state.personal.github || "",
      linkedin: state.personal.linkedin || "",
      twitter: state.personal.twitter || "",
      profilePhoto: state.personal.profilePhoto || "",
    },
    mode: "onChange",
  });

  const { handleSubmit, control, watch, setValue } = form;

  // React to form changes and sync them with WizardContext immediately for Live Preview!
  React.useEffect(() => {
    const subscription = watch((value) => {
      const nameParts = (value.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      dispatch((prev) => ({
        ...prev,
        personal: {
          ...prev.personal,
          ...(value as typeof state.personal),
          firstName,
          lastName,
        },
      }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("profilePhoto", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("profilePhoto", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setValue("profilePhoto", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: PersonalInfoValues) => {
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    dispatch((prev) => ({
      ...prev,
      personal: {
        name: data.name,
        role: data.role,
        tagline: data.tagline,
        email: data.email,
        phone: data.phone || "",
        location: data.location || "",
        bio: data.bio || "",
        website: data.website || "",
        github: data.github || "",
        linkedin: data.linkedin || "",
        twitter: data.twitter || "",
        profilePhoto: data.profilePhoto || "",
        firstName,
        lastName,
      },
      step: "education",
    }));
  };

  const currentPhoto = watch("profilePhoto");

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <User className="h-5 w-5 text-[var(--cyan-accent)]" />
          <h3 className="text-lg font-bold text-foreground">Personal Details</h3>
        </div>

        {/* Profile Photo Upload Row */}
        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Profile Photo <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Add a clean headshot to make the portfolio feel more professional.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-5 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative h-24 w-24 shrink-0 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center group shadow-inner">
              {currentPhoto ? (
                <>
                  <img
                    src={currentPhoto}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-1 right-1 h-5 w-5 rounded-md bg-black/75 hover:bg-red-500/90 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1">
                  <User className="h-8 w-8 opacity-40" />
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                    No Photo
                  </span>
                </div>
              )}
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex-1 w-full border border-dashed border-white/10 hover:border-[var(--cyan-accent)]/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center bg-black/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Drag & Drop profile picture, or{" "}
                <span className="text-[var(--cyan-accent)] hover:underline">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Supports JPG, PNG or WebP (Max 2MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </div>

        {/* Name & Role */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Akshaya KV" className="glass" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Professional Role <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Full Stack Engineer" className="glass" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Portfolio Tagline */}
        <FormField
          control={control}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Portfolio Tagline <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Scaling checkout systems handling 50k+ daily transactions"
                  className="glass"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email & Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Email Address <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="akshaya@example.com"
                    className="glass"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+91 90000 00000" className="glass" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location & Website */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Bengaluru, India" className="glass" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personal Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://mywebsite.com" className="glass" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bio */}
        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly tell recruiters about yourself..."
                  className="glass min-h-[90px] resize-none"
                  {...field}
                />
              </FormControl>
              <p className="text-[11px] text-muted-foreground text-right mt-1">
                {(field.value || "").length}/300 chars
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Social Links Header */}
        <div className="pt-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Social Links
          </h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={control}
              name="github"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://linkedin.com/in/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://twitter.com/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-end pt-4 border-t border-white/5">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Save & Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
};
