import { useState } from "react";
import { Plus, X, Lightbulb, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateCustomLens, CreateCustomLensInput, CustomLens, useUpdateCustomLens } from "@/hooks/use-custom-lenses";

interface CreateCustomLensDialogProps {
  trigger?: React.ReactNode;
  editLens?: CustomLens;
  onClose?: () => void;
}

export function CreateCustomLensDialog({ trigger, editLens, onClose }: CreateCustomLensDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editLens?.name || "");
  const [decisionQuestion, setDecisionQuestion] = useState(editLens?.decision_question || "");
  const [focusAreas, setFocusAreas] = useState<string[]>(editLens?.focus_areas || []);
  const [exclusions, setExclusions] = useState<string[]>(editLens?.exclusions || []);
  const [newFocusArea, setNewFocusArea] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  
  const createMutation = useCreateCustomLens();
  const updateMutation = useUpdateCustomLens();
  const isEditing = !!editLens;
  
  const resetForm = () => {
    if (!editLens) {
      setName("");
      setDecisionQuestion("");
      setFocusAreas([]);
      setExclusions([]);
    }
    setNewFocusArea("");
    setNewExclusion("");
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
      onClose?.();
    }
  };
  
  const addFocusArea = () => {
    if (newFocusArea.trim() && focusAreas.length < 3) {
      setFocusAreas([...focusAreas, newFocusArea.trim()]);
      setNewFocusArea("");
    }
  };
  
  const removeFocusArea = (index: number) => {
    setFocusAreas(focusAreas.filter((_, i) => i !== index));
  };
  
  const addExclusion = () => {
    if (newExclusion.trim() && exclusions.length < 3) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };
  
  const removeExclusion = (index: number) => {
    setExclusions(exclusions.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !decisionQuestion.trim() || focusAreas.length === 0) {
      return;
    }
    
    const input: CreateCustomLensInput = {
      name: name.trim(),
      decision_question: decisionQuestion.trim(),
      focus_areas: focusAreas,
      exclusions,
    };
    
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: editLens.id, ...input });
      } else {
        await createMutation.mutateAsync(input);
      }
      handleOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const isValid = name.trim().length > 0 && 
                  decisionQuestion.trim().length > 0 && 
                  focusAreas.length > 0;
  
  const isPending = createMutation.isPending || updateMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            Create Lens
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Custom Lens' : 'Create Custom Lens'}</DialogTitle>
            <DialogDescription>
              Define your own decision lens with a specific question, focus areas, and exclusions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-5">
            {/* Lens Name */}
            <div className="space-y-2">
              <Label htmlFor="lens-name">Lens Name</Label>
              <Input
                id="lens-name"
                placeholder="e.g., AI Supply Chain Risk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="glass-input"
              />
            </div>
            
            {/* Decision Question */}
            <div className="space-y-2">
              <Label htmlFor="decision-question">Decision Question</Label>
              <Textarea
                id="decision-question"
                placeholder="e.g., Are investors worried about supply chain constraints?"
                value={decisionQuestion}
                onChange={(e) => setDecisionQuestion(e.target.value)}
                maxLength={200}
                className="glass-input min-h-[70px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The specific question this lens answers for decision-makers.
              </p>
            </div>
            
            {/* Focus Areas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <Label>Focus Areas (max 3)</Label>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {focusAreas.map((area, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeFocusArea(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {focusAreas.length < 3 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., supply constraints, customer concentration"
                    value={newFocusArea}
                    onChange={(e) => setNewFocusArea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFocusArea();
                      }
                    }}
                    maxLength={100}
                    className="glass-input flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addFocusArea}
                    disabled={!newFocusArea.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
            
            {/* Exclusions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-muted-foreground" />
                <Label>Exclusions (max 3, optional)</Label>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {exclusions.map((exclusion, index) => (
                  <Badge key={index} variant="outline" className="gap-1 pr-1 text-muted-foreground">
                    {exclusion}
                    <button
                      type="button"
                      onClick={() => removeExclusion(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {exclusions.length < 3 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., price action, memes, short-term trading"
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExclusion();
                      }
                    }}
                    maxLength={100}
                    className="glass-input flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addExclusion}
                    disabled={!newExclusion.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isPending}
            >
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Lens'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
