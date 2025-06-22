import type {
  Group,
  Category,
  Person,
  Allocation,
  Task,
  Responsibility,
  TaskAllocation,
  Leave,
  Workflow,
} from "@/lib/types";

// Utility function to escape CSV fields
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Generic CSV export function
function exportToCSV(data: any[], filename: string, headers: string[]) {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Create CSV content
  const csvContent = [
    headers.join(","), // Header row
    ...data.map(row => 
      headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, "");
        return escapeCSVField(row[key]);
      }).join(",")
    )
  ].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export functions for each data type
export function exportGroups(groups: Group[]) {
  const headers = ["Name", "Description", "Icon"];
  const data = groups.map(group => ({
    name: group.name,
    description: group.description,
    icon: group.icon || "",
  }));
  
  exportToCSV(data, "groups", headers);
}

export function exportCategories(categories: Category[], groups: Group[]) {
  const headers = ["Name", "Description", "Group", "Source Link"];
  const data = categories.map(category => {
    const group = groups.find(g => g.id === category.groupId);
    return {
      name: category.name,
      description: category.description,
      group: group?.name || "Unknown Group",
      sourcelink: category.sourceLink || "",
    };
  });
  
  exportToCSV(data, "categories", headers);
}

export function exportPeople(people: Person[]) {
  const headers = ["Name", "Email", "Organisation", "Role"];
  const data = people.map(person => ({
    name: person.name,
    email: person.email,
    organisation: person.organisation,
    role: person.role,
  }));
  
  exportToCSV(data, "people", headers);
}

export function exportAllocations(
  allocations: Allocation[],
  people: Person[],
  categories: Category[],
  groups: Group[]
) {
  const headers = ["Person", "Category", "Group", "Organisation", "Is Lead"];
  const data = allocations.map(allocation => {
    const person = people.find(p => p.id === allocation.personId);
    const category = categories.find(c => c.id === allocation.categoryId);
    const group = groups.find(g => g.id === category?.groupId);
    
    return {
      person: person?.name || "Unknown Person",
      category: category?.name || "Unknown Category",
      group: group?.name || "Unknown Group",
      organisation: person?.organisation || "",
      islead: allocation.isLead ? "Yes" : "No",
    };
  });
  
  exportToCSV(data, "allocations", headers);
}

export function exportTasks(tasks: Task[], categories: Category[], groups: Group[]) {
  const headers = ["Name", "Description", "Category", "Group", "Hours Per Week", "Source Links", "Created Date"];
  const data = tasks.map(task => {
    const category = categories.find(c => c.id === task.categoryId);
    const group = groups.find(g => g.id === category?.groupId);
    const sourceLinks = task.sourceLinks?.map(link => `${link.description}: ${link.url}`).join("; ") || "";
    
    return {
      name: task.name,
      description: task.description,
      category: category?.name || "Unknown Category",
      group: group?.name || "Unknown Group",
      hoursperweek: task.hoursPerWeek,
      sourcelinks: sourceLinks,
      createddate: new Date(task.createdAt).toLocaleDateString(),
    };
  });
  
  exportToCSV(data, "tasks", headers);
}

export function exportResponsibilities(
  responsibilities: Responsibility[],
  tasks: Task[],
  people: Person[],
  categories: Category[],
  groups: Group[]
) {
  const headers = ["Description", "Task", "Category", "Group", "Assigned Person", "Weekly Hours"];
  const data = responsibilities.map(responsibility => {
    const task = tasks.find(t => t.id === responsibility.taskId);
    const category = categories.find(c => c.id === task?.categoryId);
    const group = groups.find(g => g.id === category?.groupId);
    const assignedPerson = people.find(p => p.id === responsibility.assignedPersonId);
    
    return {
      description: responsibility.description,
      task: task?.name || "Unknown Task",
      category: category?.name || "Unknown Category",
      group: group?.name || "Unknown Group",
      assignedperson: assignedPerson?.name || "Unassigned",
      weeklyhours: responsibility.estimatedWeeklyHours,
    };
  });
  
  exportToCSV(data, "responsibilities", headers);
}

export function exportTaskAllocations(
  taskAllocations: TaskAllocation[],
  tasks: Task[],
  people: Person[],
  categories: Category[],
  groups: Group[]
) {
  const headers = ["Task", "Category", "Group", "Person", "Organisation", "Is Lead", "Weekly Hours"];
  const data = taskAllocations.map(allocation => {
    const task = tasks.find(t => t.id === allocation.taskId);
    const category = categories.find(c => c.id === task?.categoryId);
    const group = groups.find(g => g.id === category?.groupId);
    const person = people.find(p => p.id === allocation.personId);
    
    return {
      task: task?.name || "Unknown Task",
      category: category?.name || "Unknown Category",
      group: group?.name || "Unknown Group",
      person: person?.name || "Unknown Person",
      organisation: person?.organisation || "",
      islead: allocation.isLead ? "Yes" : "No",
      weeklyhours: allocation.estimatedWeeklyHours,
    };
  });
  
  exportToCSV(data, "task-allocations", headers);
}

export function exportLeave(leave: Leave[], people: Person[]) {
  const headers = ["Person", "Organisation", "Start Date", "End Date", "Description", "Duration (Days)"];
  const data = leave.map(leaveRecord => {
    const person = people.find(p => p.id === leaveRecord.personId);
    const startDate = new Date(leaveRecord.startDate);
    const endDate = new Date(leaveRecord.endDate);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    
    return {
      person: person?.name || "Unknown Person",
      organisation: person?.organisation || "",
      startdate: startDate.toLocaleDateString(),
      enddate: endDate.toLocaleDateString(),
      description: leaveRecord.description || "",
      duration: durationDays,
    };
  });
  
  exportToCSV(data, "leave", headers);
}

export function exportWorkflows(workflows: Workflow[], tasks: Task[], categories: Category[], groups: Group[]) {
  const headers = ["Name", "Description", "Task", "Category", "Group", "Status", "Created Date", "Updated Date"];
  const data = workflows.map(workflow => {
    const task = tasks.find(t => t.id === workflow.taskId);
    const category = categories.find(c => c.id === task?.categoryId);
    const group = groups.find(g => g.id === category?.groupId);
    
    return {
      name: workflow.name,
      description: workflow.description,
      task: task?.name || "Unknown Task",
      category: category?.name || "Unknown Category",
      group: group?.name || "Unknown Group",
      status: workflow.isActive ? "Active" : "Inactive",
      createddate: new Date(workflow.createdAt).toLocaleDateString(),
      updateddate: new Date(workflow.updatedAt).toLocaleDateString(),
    };
  });
  
  exportToCSV(data, "workflows", headers);
}

// Comprehensive export function that exports all data types
export function exportAllData(
  groups: Group[],
  categories: Category[],
  people: Person[],
  allocations: Allocation[],
  tasks: Task[],
  responsibilities: Responsibility[],
  taskAllocations: TaskAllocation[],
  leave: Leave[],
  workflows: Workflow[]
) {
  // Export each data type with a slight delay to prevent browser blocking
  const exports = [
    () => exportGroups(groups),
    () => exportCategories(categories, groups),
    () => exportPeople(people),
    () => exportAllocations(allocations, people, categories, groups),
    () => exportTasks(tasks, categories, groups),
    () => exportResponsibilities(responsibilities, tasks, people, categories, groups),
    () => exportTaskAllocations(taskAllocations, tasks, people, categories, groups),
    () => exportLeave(leave, people),
    () => exportWorkflows(workflows, tasks, categories, groups),
  ];

  exports.forEach((exportFn, index) => {
    setTimeout(exportFn, index * 200); // 200ms delay between each export
  });
}

// Matrix-style export showing person-category allocations
export function exportResponsibilityMatrix(
  allocations: Allocation[],
  people: Person[],
  categories: Category[],
  groups: Group[]
) {
  // Create a matrix where rows are people and columns are categories
  const headers = ["Person", "Organisation", ...categories.map(cat => cat.name)];
  
  const data = people.map(person => {
    const row: any = {
      person: person.name,
      organisation: person.organisation,
    };
    
    // For each category, check if this person is allocated
    categories.forEach(category => {
      const allocation = allocations.find(
        a => a.personId === person.id && a.categoryId === category.id
      );
      const key = category.name.toLowerCase().replace(/\s+/g, "");
      row[key] = allocation ? (allocation.isLead ? "Lead" : "Allocated") : "";
    });
    
    return row;
  });
  
  exportToCSV(data, "responsibility-matrix", headers);
} 