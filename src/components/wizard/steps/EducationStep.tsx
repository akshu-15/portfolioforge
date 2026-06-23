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
import { Plus, Trash2, Calendar, GraduationCap, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema for a single education entry
const educationItemSchema = z.object({
  institution: z.string().min(1, "Institution name is required").max(100),
  degree: z.string().min(1, "Degree is required").max(100),
  fieldOfStudy: z.string().min(1, "Field of study is required").max(100),
  startYear: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
  graduationYear: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
  cgpa: z.string().min(1, "CGPA or percentage is required").max(10),
  description: z.string().max(200, "Description cannot exceed 200 characters").optional().or(z.literal("")),
});

type EducationFormValues = z.infer<typeof educationItemSchema>;

export const EducationStep = () => {
  const { state, dispatch } = useWizard();
  const [isAdding, setIsAdding] = React.useState(state.education.length === 0);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationItemSchema),
    defaultValues: {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startYear: "",
      graduationYear: "",
      cgpa: "",
      description: "",
    },
    mode: "onChange",
  });

  const { handleSubmit, control, reset, setValue } = form;

  const handleAddOrUpdate = (data: EducationFormValues) => {
    dispatch((prev) => {
      let updatedEdu = [...prev.education];
      const entry = {
        ...data,
        description: data.description || "",
        school: data.institution, // Backwards compatibility
        endYear: data.graduationYear, // Backwards compatibility
      };
      if (editingIdx !== null) {
        updatedEdu[editingIdx] = entry;
      } else {
        updatedEdu.push(entry);
      }
      return {
        ...prev,
        education: updatedEdu,
      };
    });

    // Reset state
    reset({
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startYear: "",
      graduationYear: "",
      cgpa: "",
      description: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const handleEdit = (idx: number) => {
    const item = state.education[idx];
    setValue("institution", item.institution || item.school);
    setValue("degree", item.degree);
    setValue("fieldOfStudy", item.fieldOfStudy);
    setValue("startYear", item.startYear);
    setValue("graduationYear", item.graduationYear || item.endYear);
    setValue("cgpa", item.cgpa || "");
    setValue("description", item.description || "");
    setEditingIdx(idx);
    setIsAdding(true);
  };

  const handleDelete = (idx: number) => {
    dispatch((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx),
    }));
    if (state.education.length <= 1) {
      setIsAdding(true);
    }
  };

  const handleCancel = () => {
    reset({
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startYear: "",
      graduationYear: "",
      cgpa: "",
      description: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const goToNext = () => {
    dispatch((prev) => ({
      ...prev,
      step: "skills",
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "personal",
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-[var(--cyan-accent)]" />
          <h3 className="text-lg font-bold text-foreground">Education Details</h3>
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

      {/* List of Added Education */}
      {state.education.length > 0 && !isAdding && (
        <div className="space-y-3">
          {state.education.map((edu, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-4 flex items-start justify-between border border-white/5 hover:border-white/10 transition-colors group"
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground mt-0.5">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{edu.degree} in {edu.fieldOfStudy}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution || edu.school}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {edu.startYear} – {edu.graduationYear || edu.endYear}
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      CGPA: {edu.cgpa}
                    </span>
                  </div>
                  
                  {edu.description && (
                    <p className="text-xs text-muted-foreground/80 mt-2 italic max-w-lg">
                      "{edu.description}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
          <form onSubmit={handleSubmit(handleAddOrUpdate)} className="space-y-4 glass-strong p-4 sm:p-5 rounded-2xl border border-white/10">
            <div className="text-sm font-bold text-foreground mb-2">
              {editingIdx !== null ? "Edit Education Entry" : "Add Education Entry"}
            </div>

            <FormField
              control={control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School / College / University</FormLabel>
                  <FormControl>
                    <Input placeholder="Vellore Institute of Technology" className="glass" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="degree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degree / Certification</FormLabel>
                    <FormControl>
                      <Input placeholder="Bachelor of Technology" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="fieldOfStudy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field of Study</FormLabel>
                    <FormControl>
                      <Input placeholder="Computer Science" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={control}
                name="startYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Year</FormLabel>
                    <FormControl>
                      <Input placeholder="2021" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="graduationYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Graduation Year</FormLabel>
                    <FormControl>
                      <Input placeholder="2025" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="cgpa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CGPA / Percentage</FormLabel>
                    <FormControl>
                      <Input placeholder="8.9 / 10.0" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Accomplishments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Graduated with honors, specialized in Web Tech..."
                      className="glass min-h-[70px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 justify-end pt-2">
              {state.education.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="glass">
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" className="bg-[var(--cyan-accent)] text-background hover:bg-[var(--cyan-accent)]/80">
                {editingIdx !== null ? "Update Entry" : "Add Entry"}
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
