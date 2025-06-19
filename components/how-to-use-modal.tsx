"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Layers,
  Users,
  CheckSquare,
  BarChart,
  Shield,
  ExternalLink,
  UserPlus,
  ListPlus,
  PlusCircle,
  GitBranch,
  MessageCircle,
} from "lucide-react";

interface HowToUseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    id: "overview",
    title: "Application Overview",
    icon: Grid3X3,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          The <strong>Land iQ Responsibility Allocation</strong> application helps organisations manage and track responsibility assignments across teams, projects, and categories.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Visual matrix view for responsibility allocation</li>
            <li>Task and workflow management</li>
            <li>People and team organisation</li>
            <li>Category-based project structure</li>
            <li>Role-based access control (Admin/Read-only)</li>
            <li>Analytics and reporting</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "authentication",
    title: "User Roles & Authentication",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          The application supports two user roles with different access levels:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">👑 Admin Users</h4>
            <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
              <li>Full CRUD operations</li>
              <li>Add/edit/delete all entities</li>
              <li>Manage allocations</li>
              <li>Access all features</li>
            </ul>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">👁️ Read-Only Users</h4>
            <ul className="list-disc list-inside space-y-1 text-orange-800 text-sm">
              <li>View-only access</li>
              <li>Browse all data</li>
              <li>View analytics</li>
              <li>No editing capabilities</li>
            </ul>
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Your current role is displayed as a badge in the top-right corner of the header.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "matrix-view",
    title: "Matrix View (Overview)",
    icon: Grid3X3,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          The Matrix View provides a visual representation of responsibility allocations across organisations, groups, and categories.
        </p>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Layout Structure:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li><strong>Organisations:</strong> Column headers (PDNSW, WSP, Giraffe)</li>
            <li><strong>Groups:</strong> Section dividers with custom icons</li>
            <li><strong>Categories:</strong> Row headers under each group</li>
            <li><strong>Intersection Cells:</strong> Show allocated people</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>Colour-coded people by organisation</li>
            <li>Drag-and-drop functionality (Admin only)</li>
            <li>Click empty cells to add allocations</li>
            <li>Hover effects for better interaction</li>
            <li>Sticky headers for easy navigation</li>
            <li>Shows both direct and task-based allocations</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "groups-categories",
    title: "Groups & Categories",
    icon: Layers,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          Groups and Categories form the hierarchical structure for organising responsibilities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">📁 Groups</h4>
            <ul className="list-disc list-inside space-y-1 text-purple-800 text-sm">
              <li>Top-level organisational units</li>
              <li>Custom icons available</li>
              <li>Contain multiple categories</li>
              <li>Can have source links</li>
            </ul>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="font-semibold text-indigo-900 mb-2">📋 Categories</h4>
            <ul className="list-disc list-inside space-y-1 text-indigo-800 text-sm">
              <li>Specific work areas within groups</li>
              <li>Where people are allocated</li>
              <li>Can contain tasks</li>
              <li>Support source links</li>
            </ul>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Managing Groups & Categories:</h4>
          <p className="text-blue-800 text-sm">
            Use the dedicated <strong>Groups</strong> and <strong>Categories</strong> tabs to view, filter, sort, and manage these entities. 
            Admin users can add new ones using the header buttons or edit existing ones in the tables.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "people",
    title: "People Management",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          Manage team members and their organisational affiliations.
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Person Attributes:</h4>
          <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
            <li><strong>Name:</strong> Full name of the person</li>
            <li><strong>Organisation:</strong> PDNSW, WSP, or Giraffe</li>
            <li><strong>Role:</strong> Job title or position</li>
            <li><strong>Email:</strong> Contact information</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>Colour-coded by organisation in matrix view</li>
            <li>Can be allocated to multiple categories</li>
            <li>Assigned to specific tasks and responsibilities</li>
            <li>Searchable and sortable in People tab</li>
          </ul>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Tip:</strong> People can only be assigned to tasks within categories they're already allocated to.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "tasks",
    title: "Tasks & Responsibilities",
    icon: CheckSquare,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          Tasks represent specific responsibilities within categories, focussing on weekly hour estimation rather than project management.
        </p>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-900 mb-2">Task Structure:</h4>
          <ul className="list-disc list-inside space-y-1 text-orange-800 text-sm">
            <li><strong>Name & Description:</strong> What needs to be done</li>
            <li><strong>Category Assignment:</strong> Which category it belongs to</li>
            <li><strong>Responsibilities:</strong> Specific tasks within the main task</li>
            <li><strong>Weekly Hours:</strong> Estimated hours per week</li>
            <li><strong>People Assignment:</strong> Who is responsible</li>
            <li><strong>Multiple Source Links:</strong> Reference materials</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>Simplified responsibility tracking (not complex project management)</li>
            <li>Focus on weekly hour estimation</li>
            <li>Multiple source links with descriptions</li>
            <li>Category-level restriction for assignments</li>
            <li>Filtering by category in Tasks tab</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "workflows",
    title: "Workflows",
    icon: GitBranch,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          Workflows help organise and track the steps involved in completing tasks.
        </p>
        <div className="bg-teal-50 p-4 rounded-lg">
          <h4 className="font-semibold text-teal-900 mb-2">Workflow Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-teal-800 text-sm">
            <li>Associated with specific tasks</li>
            <li>Step-by-step process definition</li>
            <li>People assignment to workflow steps</li>
            <li>Progress tracking</li>
          </ul>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Access:</strong> View and manage workflows in the dedicated Workflows tab. 
            Admin users can create, edit, and assign people to workflow steps.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "Analytics & Reporting",
    icon: BarChart,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700">
          The Analytics tab provides visual insights into responsibility distribution and workload allocation.
        </p>
        <div className="bg-pink-50 p-4 rounded-lg">
          <h4 className="font-semibold text-pink-900 mb-2">Available Reports:</h4>
          <ul className="list-disc list-inside space-y-1 text-pink-800 text-sm">
            <li>Responsibility distribution charts</li>
            <li>Workload analysis by person</li>
            <li>Allocation patterns across organisations</li>
            <li>Weekly hours aggregation</li>
          </ul>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-gray-700 text-sm">
            <strong>Purpose:</strong> Use analytics to identify workload imbalances, 
            ensure fair distribution of responsibilities, and make data-driven decisions about resource allocation.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "navigation",
    title: "Navigation & Tips",
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h4 className="font-semibold text-indigo-900 mb-2">🧭 Navigation Tips:</h4>
          <ul className="list-disc list-inside space-y-1 text-indigo-800 text-sm">
            <li><strong>Tab Navigation:</strong> Use tabs to switch between different views</li>
            <li><strong>Header Buttons:</strong> Quick access to add new entities (Admin only)</li>
            <li><strong>Table Filtering:</strong> Use dropdowns to filter data in Categories and Tasks tabs</li>
            <li><strong>Matrix Interactions:</strong> Click cells to add allocations, drag to reorganise</li>
            <li><strong>Source Links:</strong> Click external link icons to open references</li>
          </ul>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">💡 Best Practices:</h4>
          <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
            <li>Start by setting up Groups and Categories structure</li>
            <li>Add People with correct organisational assignments</li>
            <li>Use Matrix View to allocate people to categories</li>
            <li>Create Tasks with realistic weekly hour estimates</li>
            <li>Add source links for important references</li>
            <li>Regularly review Analytics for workload balance</li>
          </ul>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Need Help?</strong> Use the Chat feature (Admin only) for additional assistance or contact your system administrator.
          </p>
        </div>
      </div>
    ),
  },
];

export default function HowToUseModal({ open, onOpenChange }: HowToUseModalProps) {
  const [currentSection, setCurrentSection] = useState(0);

  const handlePrevious = () => {
    setCurrentSection((prev) => (prev > 0 ? prev - 1 : sections.length - 1));
  };

  const handleNext = () => {
    setCurrentSection((prev) => (prev < sections.length - 1 ? prev + 1 : 0));
  };

  const currentSectionData = sections[currentSection];
  const IconComponent = currentSectionData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <IconComponent className="h-6 w-6 text-blue-600" />
            <span>How to Use - {currentSectionData.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Section Navigation */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div className="flex space-x-1 overflow-x-auto">
              {sections.map((section, index) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      index === currentSection
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <SectionIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">{section.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-gray-500 ml-4">
              {currentSection + 1} of {sections.length}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="pr-4">
              {currentSectionData.content}
            </div>
          </ScrollArea>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <Button
              onClick={handlePrevious}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-2">
              {sections.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSection ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
