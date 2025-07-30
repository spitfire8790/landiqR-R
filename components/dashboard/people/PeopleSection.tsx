"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PersonDialog } from "@/components/modals/person-dialog";
import PeopleTable from "@/components/people-table";
import type { Person } from "@/lib/types";
import { useCrud } from "@/hooks/use-crud";
import { createPerson, updatePerson, deletePerson } from "@/lib/data-service";

interface PeopleSectionProps {
  people: Person[];
  onPeopleChange: (people: Person[]) => void;
  isAdmin: boolean;
}

export function PeopleSection({
  people,
  onPeopleChange,
  isAdmin,
}: PeopleSectionProps) {
  const crud = useCrud(people, {
    entityName: "Person",
    createFn: createPerson,
    updateFn: updatePerson,
    deleteFn: deletePerson,
    onDataChange: onPeopleChange,
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">People</h2>
          <Button onClick={crud.handleAdd} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        </div>
      )}

      {isAdmin ? (
        <PeopleTable
          people={people}
          onEdit={crud.handleEdit}
          onDelete={crud.handleDelete}
        />
      ) : (
        <div className="rounded-md border">
          <div className="p-4">
            <h3 className="font-medium mb-2">People ({people.length})</h3>
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="p-2 bg-muted rounded">
                  <div className="font-medium">{person.name}</div>
                  {person.role && (
                    <div className="text-sm text-muted-foreground">
                      {person.role}
                    </div>
                  )}
                  {person.organisation && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {person.organisation}
                    </div>
                  )}
                  {person.email && (
                    <div className="text-xs text-muted-foreground">
                      {person.email}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <PersonDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          onSave={crud.handleSave}
          defaultValues={crud.editingItem || undefined}
        />
      )}
    </div>
  );
}
