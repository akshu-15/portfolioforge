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
import { useWizard, type Project } from "@/components/wizard/WizardContext";
import {
  Plus,
  Trash2,
  FolderGit2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Github,
  Code,
  Upload,
  X,
} from "lucide-react";
import { cn, normalizeExternalUrl } from "@/lib/utils";

// Schema for a single project entry
const projectItemSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description cannot exceed 200 characters"),
  technologies: z.string().min(1, "Please enter at least one technology (comma-separated)"),
  link: z
    .string()
    .refine((val) => !val || !/\s/.test(val), {
      message: "URL cannot contain spaces",
    })
    .optional()
    .or(z.literal("")),
  githubLink: z
    .string()
    .refine((val) => !val || !/\s/.test(val), {
      message: "GitHub URL cannot contain spaces",
    })
    .optional()
    .or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
});

type ProjectFormValues = z.infer<typeof projectItemSchema>;

export const ProjectsStep = () => {
  const { state, dispatch } = useWizard();
  const [isAdding, setIsAdding] = React.useState(state.projects.length === 0);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectItemSchema),
    defaultValues: {
      name: "",
      description: "",
      technologies: "",
      link: "",
      githubLink: "",
      image: "",
    },
    mode: "onChange",
  });

  const { handleSubmit, control, reset, setValue, watch } = form;

  const handleAddOrUpdate = (data: ProjectFormValues) => {
    // Parse comma-separated technologies into string array
    const parsedTechs = data.technologies
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const projectData: Project = {
      name: data.name,
      description: data.description,
      technologies: parsedTechs,
      link: data.link?.trim() || "",
      githubLink: data.githubLink?.trim() || "",
      image: data.image || "",
    };

    dispatch((prev) => {
      const updatedProjects = [...prev.projects];
      if (editingIdx !== null) {
        updatedProjects[editingIdx] = projectData;
      } else {
        updatedProjects.push(projectData);
      }
      return {
        ...prev,
        projects: updatedProjects,
      };
    });

    // Reset state
    reset({
      name: "",
      description: "",
      technologies: "",
      link: "",
      githubLink: "",
      image: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const handleEdit = (idx: number) => {
    const item = state.projects[idx];
    setValue("name", item.name);
    setValue("description", item.description);
    setValue("technologies", item.technologies.join(", "));
    setValue("link", item.link || "");
    setValue("githubLink", item.githubLink || "");
    setValue("image", item.image || "");
    setEditingIdx(idx);
    setIsAdding(true);
  };

  const handleDelete = (idx: number) => {
    dispatch((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx),
    }));
    if (state.projects.length <= 1) {
      setIsAdding(true);
    }
  };

  const handleProjectLinkChange = (idx: number, link: string) => {
    dispatch((prev) => ({
      ...prev,
      projects: prev.projects.map((project, projectIdx) =>
        projectIdx === idx ? { ...project, link: link.trim() } : project,
      ),
    }));
  };

  const handleCancel = () => {
    reset({
      name: "",
      description: "",
      technologies: "",
      link: "",
      githubLink: "",
      image: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("image", reader.result as string, { shouldValidate: true });
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
        setValue("image", reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setValue("image", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const goToNext = () => {
    dispatch((prev) => ({
      ...prev,
      step: "theme",
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "experience",
    }));
  };

  const currentImage = watch("image");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-[var(--cyan-accent)]" />
          <h3 className="text-lg font-bold text-foreground">Projects</h3>
        </div>
        {!isAdding && (
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 gap-1"
          >
            <Plus className="h-4 w-4" /> Add New
          </Button>
        )}
      </div>

      {/* List of Added Projects */}
      {state.projects.length > 0 && !isAdding && (
        <div className="space-y-3">
          {state.projects.map((proj, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-4 flex items-start justify-between border border-white/5 hover:border-white/10 transition-colors group"
            >
              <div className="flex gap-4 min-w-0">
                {proj.image ? (
                  <div className="h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                    <img src={proj.image} alt={proj.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-24 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground border border-white/5">
                    <Code className="h-6 w-6 opacity-30" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{proj.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-lg line-clamp-2">
                    {proj.description}
                  </p>
                  {/* Tech stack badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono rounded bg-white/5 border border-white/10 text-muted-foreground px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 max-w-md">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Demo Link
                    </label>
                    <Input
                      value={proj.link || ""}
                      onChange={(event) => handleProjectLinkChange(idx, event.target.value)}
                      placeholder="https://myproject.com"
                      className="glass mt-1 h-8 text-xs"
                    />
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-4 mt-3">
                    {proj.link && (
                      <a
                        href={normalizeExternalUrl(proj.link)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--cyan-accent)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Live Demo
                      </a>
                    )}
                    {proj.githubLink && (
                      <a
                        href={normalizeExternalUrl(proj.githubLink)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Github className="h-3 w-3" /> GitHub Repo
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(idx)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(idx)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form to Add / Edit */}
      {isAdding && (
        <Form {...form}>
          <form
            onSubmit={handleSubmit(handleAddOrUpdate)}
            className="space-y-4 glass-strong p-4 sm:p-5 rounded-2xl border border-white/10"
          >
            <div className="text-sm font-bold text-foreground mb-2">
              {editingIdx !== null ? "Edit Project Details" : "Add Project Details"}
            </div>

            {/* Project Image Upload zone */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-3.5 rounded-xl border border-white/5">
              <div className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center group shadow-inner">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt="Project preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 h-5 w-5 rounded-md bg-black/75 hover:bg-red-500/90 text-white flex items-center justify-center transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-1">
                    <FolderGit2 className="h-6 w-6 opacity-35" />
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">
                      No Image
                    </span>
                  </div>
                )}
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex-1 w-full border border-dashed border-white/10 hover:border-[var(--cyan-accent)]/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer text-center bg-black/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] font-semibold text-foreground">
                  Drag & Drop project image, or{" "}
                  <span className="text-[var(--cyan-accent)] hover:underline">browse</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AI Resume Parser" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Briefly describe what this project does..."
                      className="glass min-h-[70px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="technologies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technologies Used (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="React, TypeScript, Tailwind CSS, Vite"
                      className="glass"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground">
                    Separate items with a comma (e.g. React, Node, Python)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Demo Link{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://myproject.com" className="glass" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">
                      Paste the deployed app, case study, or hosted project URL.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="githubLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Repo Link</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://github.com/user/repo"
                        className="glass"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              {state.projects.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="glass"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--cyan-accent)] text-background hover:bg-[var(--cyan-accent)]/80"
              >
                {editingIdx !== null ? "Update Project" : "Add Project"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Navigation Buttons */}
      {!isAdding && (
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goToPrevious}
            className="w-full sm:w-auto glass"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            type="button"
            size="lg"
            onClick={goToNext}
            className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow"
          >
            Save & Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
