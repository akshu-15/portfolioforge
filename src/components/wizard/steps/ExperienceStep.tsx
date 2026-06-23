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
import { useWizard, type Experience } from "@/components/wizard/WizardContext";
import { Plus, Trash2, Briefcase, ArrowLeft, ArrowRight, Calendar, MapPin, Building } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema for a single experience entry
const experienceItemSchema = z.object({
  company: z.string().min(1, "Company name is required").max(100),
  position: z.string().min(1, "Position is required").max(100),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date (or 'Present') is required"),
  location: z.string().max(100).optional().or(z.literal("")),
  description: z.string().min(1, "Job description is required").max(300, "Description cannot exceed 300 characters"),
});

type ExperienceFormValues = z.infer<typeof experienceItemSchema>;

export const ExperienceStep = () => {
  const { state, dispatch } = useWizard();
  const [isAdding, setIsAdding] = React.useState(state.experience.length === 0);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceItemSchema),
    defaultValues: {
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    },
    mode: "onChange",
  });

  const { handleSubmit, control, reset, setValue } = form;

  const handleAddOrUpdate = (data: ExperienceFormValues) => {
    dispatch((prev) => {
      let updatedExp = [...prev.experience];
      const entry: Experience = {
        ...data,
        location: data.location || "",
        role: data.position, // Compatibility
        duration: `${data.startDate} - ${data.endDate}`, // Compatibility
      };
      if (editingIdx !== null) {
        updatedExp[editingIdx] = entry;
      } else {
        updatedExp.push(entry);
      }
      return {
        ...prev,
        experience: updatedExp,
      };
    });

    // Reset state
    reset({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const handleEdit = (idx: number) => {
    const item = state.experience[idx];
    setValue("company", item.company);
    setValue("position", item.position || item.role);
    setValue("startDate", item.startDate || (item.duration ? item.duration.split(" - ")[0] : ""));
    setValue("endDate", item.endDate || (item.duration ? item.duration.split(" - ")[1] : ""));
    setValue("location", item.location || "");
    setValue("description", item.description);
    setEditingIdx(idx);
    setIsAdding(true);
  };

  const handleDelete = (idx: number) => {
    dispatch((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
    if (state.experience.length <= 1) {
      setIsAdding(true);
    }
  };

  const handleCancel = () => {
    reset({
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    });
    setIsAdding(false);
    setEditingIdx(null);
  };

  const goToNext = () => {
    dispatch((prev) => ({
      ...prev,
      step: "projects",
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "skills",
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[var(--cyan-accent)]" />
          <h3 className="text-lg font-bold text-foreground">Work Experience</h3>
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

      {/* List of Added Experiences */}
      {state.experience.length > 0 && !isAdding && (
        <div className="space-y-3">
          {state.experience.map((exp, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-4 flex items-start justify-between border border-white/5 hover:border-white/10 transition-colors group"
            >
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground mt-0.5">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{exp.position || exp.role}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {exp.startDate || (exp.duration ? exp.duration.split(" - ")[0] : "")} – {exp.endDate || (exp.duration ? exp.duration.split(" - ")[1] : "")}
                    </span>
                    {exp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {exp.location}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground/80 mt-2 italic max-w-lg">
                    {exp.description}
                  </p>
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
              {editingIdx !== null ? "Edit Experience Entry" : "Add Experience Entry"}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Razorpay" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position / Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Software Engineer Intern" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. June 2024" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (or 'Present')</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Present" className="glass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Bengaluru, India (or Remote)" className="glass" {...field} />
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
                  <FormLabel>Description / Responsibilities</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Designed responsive UI modules using React. Enhanced API throughput by 15% using Node.js..."
                      className="glass min-h-[95px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 justify-end pt-2">
              {state.experience.length > 0 && (
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
