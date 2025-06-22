import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLeave } from "@/lib/data-service";
import { Person, Leave } from "@/lib/types";
import { Calendar, CalendarDays } from "lucide-react";

interface LeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  currentUserId?: string;
  isAdmin?: boolean;
  onLeaveCreated: (leave: Leave) => void;
}

export function LeaveDialog({
  open,
  onOpenChange,
  people,
  currentUserId,
  isAdmin = false,
  onLeaveCreated,
}: LeaveDialogProps) {
  const [formData, setFormData] = useState({
    personId: currentUserId || "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.personId || !formData.startDate || !formData.endDate) {
      return;
    }

    // Validate that end date is not before start date
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert("End date cannot be before start date");
      return;
    }

    setIsSubmitting(true);

    try {
      const newLeave = await createLeave({
        personId: formData.personId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
      });

      if (newLeave) {
        onLeaveCreated(newLeave);
        setFormData({
          personId: currentUserId || "",
          startDate: "",
          endDate: "",
          description: "",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating leave:", error);
      alert("Failed to create leave entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePeople = isAdmin
    ? people
    : people.filter((p) => p.id === currentUserId);
  const selectedPerson = people.find((p) => p.id === formData.personId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Add Leave
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="person">Person</Label>
            <Select
              value={formData.personId}
              onValueChange={(value) =>
                setFormData({ ...formData, personId: value })
              }
              disabled={!isAdmin && availablePeople.length <= 1}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {availablePeople.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    <div className="flex items-center gap-2">
                      <span>{person.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({person.organisation})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                min={formData.startDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional notes about this leave..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {selectedPerson && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Adding leave for <strong>{selectedPerson.name}</strong> from{" "}
                <strong>
                  {formData.startDate
                    ? new Date(formData.startDate).toLocaleDateString()
                    : "Start Date"}
                </strong>{" "}
                to{" "}
                <strong>
                  {formData.endDate
                    ? new Date(formData.endDate).toLocaleDateString()
                    : "End Date"}
                </strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Leave"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
