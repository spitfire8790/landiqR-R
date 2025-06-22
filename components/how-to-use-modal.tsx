"use client";

import { useState, useEffect, useMemo } from "react";
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
  GitBranch,
  Calendar,
  Info,
  Home,
  Compass,
  Workflow,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HowToUseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DiagramProps {
  content: string;
  height?: string;
}

const MermaidDiagram: React.FC<DiagramProps> = ({
  content,
  height = "300px",
}) => {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    // Dynamically render mermaid diagram
    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: true,
          theme: "default",
          themeVariables: {
            primaryColor: "#e0e7ff",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#6366f1",
            lineColor: "#94a3b8",
            secondaryColor: "#fef3c7",
            tertiaryColor: "#d1fae5",
          },
        });
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, content);
        setSvg(svg);
      } catch (error) {
        console.error("Error rendering mermaid diagram:", error);
      }
    };
    renderDiagram();
  }, [content]);

  return (
    <div
      className="w-full flex justify-center items-center bg-gray-50 rounded-lg p-4 overflow-x-auto"
      style={{ minHeight: height }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const sections = [
  {
    id: "welcome",
    title: "Welcome to Land iQ - Project Management",
    icon: Home,
    content: (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-black rounded-full flex items-center justify-center">
            <Grid3X3 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-black">
            Land iQ - Project Management
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            A comprehensive responsibility allocation and project management
            system designed to help teams organise, track, and optimise their
            work across multiple organisations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="border-2 border-gray-300 hover:border-black transition-colors bg-white">
            <CardContent className="p-6 text-center">
              <Grid3X3 className="h-8 w-8 text-black mx-auto mb-3" />
              <h3 className="font-semibold mb-1 text-black">
                Visual Management
              </h3>
              <p className="text-sm text-gray-700">
                Intuitive matrix view for responsibility allocation
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-300 hover:border-black transition-colors bg-white">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-black mx-auto mb-3" />
              <h3 className="font-semibold mb-1 text-black">
                Team Collaboration
              </h3>
              <p className="text-sm text-gray-700">
                Manage people across multiple organisations
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-gray-300 hover:border-black transition-colors bg-white">
            <CardContent className="p-6 text-center">
              <BarChart className="h-8 w-8 text-black mx-auto mb-3" />
              <h3 className="font-semibold mb-1 text-black">
                Analytics & Insights
              </h3>
              <p className="text-sm text-gray-700">
                Track workload distribution and performance
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-100 border border-gray-300 p-6 rounded-lg">
          <h3 className="font-semibold text-black mb-3 flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Quick Start Guide
          </h3>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge className="mt-0.5">1</Badge>
              <span>Check your role (Admin/Read-only) in the header badge</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="mt-0.5">2</Badge>
              <span>Navigate using the tabs to explore different sections</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="mt-0.5">3</Badge>
              <span>Start with the Overview tab to see the big picture</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge className="mt-0.5">4</Badge>
              <span>
                Use Quick Add buttons (Admin only) to create new items
              </span>
            </li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "system-overview",
    title: "System Architecture",
    icon: Layers,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            How Land iQ - Project Management is Organised
          </h3>
          <p className="text-gray-700 mb-4">
            The system follows a hierarchical structure to organise
            responsibilities and tasks efficiently:
          </p>
        </div>

        <MermaidDiagram
          height="400px"
          content={`
            graph TD
              A[Organisations] --> B[Groups]
              B --> C[Categories]
              C --> D[Tasks]
              C --> E[People Allocations]
              D --> F[Responsibilities]
              D --> G[Task Allocations]
              D --> H[Workflows]
              
              A:::org
              B:::group
              C:::cat
              D:::task
              E:::people
              F:::resp
              G:::alloc
              H:::workflow
              
              classDef org fill:#e0e7ff,stroke:#6366f1,stroke-width:2px
              classDef group fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
              classDef cat fill:#d1fae5,stroke:#10b981,stroke-width:2px
              classDef task fill:#fce7f3,stroke:#ec4899,stroke-width:2px
              classDef people fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px
              classDef resp fill:#f3e8ff,stroke:#a855f7,stroke-width:2px
              classDef alloc fill:#ffe4e6,stroke:#f43f5e,stroke-width:2px
              classDef workflow fill:#ecfdf5,stroke:#10b981,stroke-width:2px
          `}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold text-black mb-2">
                🏢 Organisations
              </h4>
              <p className="text-sm text-gray-700">
                Three partner organisations collaborate:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• PDNSW</li>
                <li>• WSP Australia</li>
                <li>• Giraffe</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold text-black mb-2">
                📁 Groups & Categories
              </h4>
              <p className="text-sm text-gray-700">
                Hierarchical project structure:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Groups: Major work streams</li>
                <li>• Categories: Specific work areas</li>
                <li>• Both support custom icons & links</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold text-black mb-2">
                👥 People & Allocations
              </h4>
              <p className="text-sm text-gray-700">Team member assignments:</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• People belong to organisations</li>
                <li>• Allocated to categories</li>
                <li>• Assigned to specific tasks</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold text-black mb-2">
                ✅ Tasks & Workflows
              </h4>
              <p className="text-sm text-gray-700">Work management:</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Tasks track weekly hours</li>
                <li>• Responsibilities break down work</li>
                <li>• Workflows define processes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "user-roles",
    title: "User Roles & Permissions",
    icon: Shield,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Role-Based Access Control
          </h3>
          <p className="text-gray-700 mb-4">
            Land iQ - Project Management uses two distinct user roles with
            different permission levels to ensure secure and appropriate access:
          </p>
        </div>

        <MermaidDiagram
          height="350px"
          content={`
            graph LR
              User[User Login] --> Check{Check Role}
              Check -->|Admin| Admin[Admin User]
              Check -->|Read-only| ReadOnly[Read-Only User]
              
              Admin --> AdminPerms[Full CRUD Operations<br/>Add/Edit/Delete<br/>Manage All Features<br/>Access Chat<br/>Create Workflows]
              ReadOnly --> ReadPerms[View All Data<br/>Browse Information<br/>View Analytics<br/>Access Chat<br/>No Edit Access]
              
              AdminPerms --> Actions1[Create Groups<br/>Add People<br/>Assign Tasks]
              ReadPerms --> Actions2[View Reports<br/>Browse Data<br/>Export Info]
              
              style Admin fill:#d1fae5,stroke:#10b981,stroke-width:2px
              style ReadOnly fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
              style AdminPerms fill:#e0f2fe,stroke:#0ea5e9
              style ReadPerms fill:#ffe4e6,stroke:#f43f5e
          `}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Shield className="h-6 w-6 text-black" />
                </div>
                <h4 className="text-lg font-semibold text-black">
                  Admin Users
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">Full Control</p>
                    <p className="text-sm text-gray-700">
                      Create, read, update, and delete all entities
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">
                      Management Features
                    </p>
                    <p className="text-sm text-gray-700">
                      Access to workflows and admin tools
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">Quick Actions</p>
                    <p className="text-sm text-gray-700">
                      Use Quick Add dropdown for rapid creation
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Shield className="h-6 w-6 text-black" />
                </div>
                <h4 className="text-lg font-semibold text-black">
                  Read-Only Users
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">View Access</p>
                    <p className="text-sm text-gray-700">
                      Browse all data without modification rights
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">Analytics Access</p>
                    <p className="text-sm text-gray-700">
                      View reports and responsibility charts
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">
                      Communication Access
                    </p>
                    <p className="text-sm text-gray-700">
                      Full access to team chat for collaboration
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-black mt-0.5" />
                  <div>
                    <p className="font-medium text-black">Limited Actions</p>
                    <p className="text-sm text-gray-700">
                      No edit, delete, or creation capabilities
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "matrix-view",
    title: "Overview Matrix Guide",
    icon: Grid3X3,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Understanding the Overview Matrix
          </h3>
          <p className="text-gray-700 mb-4">
            The Overview tab displays the Land iQ Functional Responsibility
            Chart - a visual matrix showing how people are allocated to
            different categories within groups across the three partner
            organisations.
          </p>
        </div>

        <MermaidDiagram
          height="300px"
          content={`
            graph LR
              Groups[Groups with Icons] --> Categories[Categories]
              Categories --> Matrix[Matrix View]
              Matrix --> People[People Allocations]
              
              People --> PDNSW[PDNSW Staff<br/>Blue Background]
              People --> WSP[WSP Staff<br/>Red Background]  
              People --> Giraffe[Giraffe Staff<br/>Orange Background]
              
              style Groups fill:#f1f5f9,stroke:#475569,stroke-width:2px
              style Categories fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
              style Matrix fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px
              style PDNSW fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
              style WSP fill:#fee2e2,stroke:#ef4444,stroke-width:2px
              style Giraffe fill:#fed7aa,stroke:#f59e0b,stroke-width:2px
          `}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-black">
                📋 Matrix Layout
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-600 mt-1.5" />
                  <span>
                    <strong>Group Headers:</strong> Dark sections with custom
                    icons
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                  <span>
                    <strong>Category Columns:</strong> Work areas within each
                    group
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                  <span>
                    <strong>Person Cards:</strong> Show allocations with org
                    logos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5" />
                  <span>
                    <strong>Lead Indicators:</strong> Star icon shows leads
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-black">
                🖱️ Admin Features
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    Click
                  </Badge>
                  <span>Empty spaces to add allocations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    Drag
                  </Badge>
                  <span>Reorder groups and categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    Delete
                  </Badge>
                  <span>Remove allocations with X button</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    Filter
                  </Badge>
                  <span>Use person dropdown to focus view</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "tasks-workflows",
    title: "Tasks & Workflows",
    icon: Workflow,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Managing Tasks and Workflows
          </h3>
          <p className="text-gray-700 mb-4">
            Tasks represent work items within categories, whilst workflows
            define the process steps to complete them.
          </p>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <MermaidDiagram
              height="300px"
              content={`
                graph LR
                  Task[Task] --> Props[Properties]
                  Props --> Name[Name & Description]
                  Props --> Cat[Category Assignment]
                  Props --> Hours[Weekly Hours]
                  Props --> Links[Source Links]
                  
                  Task --> Components[Components]
                  Components --> Resp[Responsibilities]
                  Components --> People[Task Allocations]
                  
                  Resp --> RespDetails[Description<br/>Person Assignment<br/>Weekly Hours]
                  People --> PeopleDetails[Team Members<br/>Lead Designation]
                  
                  style Task fill:#fce7f3,stroke:#ec4899,stroke-width:2px
                  style Resp fill:#f3e8ff,stroke:#a855f7,stroke-width:2px
                  style People fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px
              `}
            />

            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <h4 className="font-semibold text-black mb-2">
                Task Management Features
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>
                  • Focus on weekly hour estimation (not complex project
                  management)
                </li>
                <li>• Break down into specific responsibilities</li>
                <li>• Assign multiple people with lead designation</li>
                <li>• Add multiple source links with descriptions</li>
                <li>• Filter by category for focused view</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <MermaidDiagram
              height="350px"
              content={`
                graph TD
                  Start[Start] --> Step1[Step 1<br/>Initial Action]
                  Step1 --> Tool1{Use Tool}
                  Tool1 --> Person1[Assign Person]
                  Person1 --> Step2[Step 2<br/>Review]
                  Step2 --> Decision{Decision Point}
                  Decision -->|Approved| Step3[Step 3<br/>Implementation]
                  Decision -->|Rejected| Step1
                  Step3 --> End[End]
                  
                  style Start fill:#d1fae5,stroke:#10b981,stroke-width:2px
                  style End fill:#fce7f3,stroke:#ec4899,stroke-width:2px
                  style Tool1 fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
                  style Person1 fill:#e0f2fe,stroke:#0ea5e9,stroke-width:2px
                  style Decision fill:#f3e8ff,stroke:#a855f7,stroke-width:2px
              `}
            />

            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <h4 className="font-semibold text-black mb-2">
                Workflow Builder Features
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Visual workflow designer with drag-and-drop</li>
                <li>• Connect tools and people in process steps</li>
                <li>• Add decision points and parallel paths</li>
                <li>• Include notes and documentation</li>
                <li>• Save and reuse workflow templates</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "Analytics & Calendar",
    icon: BarChart,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Data Insights and Planning
          </h3>
          <p className="text-gray-700 mb-4">
            Use analytics to understand workload distribution and the calendar
            to plan leave and capacity.
          </p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardContent className="p-6">
                <h4 className="font-semibold text-black mb-3">
                  📊 Available Analytics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-black mb-2">
                      Responsibility Distribution
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Workload by person</li>
                      <li>• Hours per category</li>
                      <li>• Organisation breakdown</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-black mb-2">
                      Resource Analysis
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Weekly hour totals</li>
                      <li>• Allocation patterns</li>
                      <li>• Capacity planning</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card className="bg-white border-gray-300">
              <CardContent className="p-6">
                <h4 className="font-semibold text-black mb-3">
                  📅 Calendar Features
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-black mb-2">
                      Leave Management
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Request leave periods</li>
                      <li>• View team availability</li>
                      <li>• Plan around absences</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-black mb-2">
                      Task Timeline
                    </h5>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• View task schedules</li>
                      <li>• Track milestones</li>
                      <li>• Coordinate resources</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    ),
  },
  {
    id: "best-practices",
    title: "Best Practices",
    icon: Compass,
    content: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-black">
            Getting the Most from Land iQ - Project Management
          </h3>
          <p className="text-gray-700 mb-4">
            Follow these best practices to ensure smooth operation and maximum
            value from the system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Setup Best Practices
              </h4>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    1
                  </Badge>
                  <span>Create Groups with meaningful names and icons</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    2
                  </Badge>
                  <span>Define Categories that reflect actual work areas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    3
                  </Badge>
                  <span>Add all team members with correct organisations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    4
                  </Badge>
                  <span>Use the Matrix View for initial allocations</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daily Usage Guidelines
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Keep task hours realistic and updated</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Add source links for important references</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Review Analytics weekly for insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Use Calendar for leave planning</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Workflow Guidelines
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Create workflows for repeatable processes</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Include clear step descriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Assign appropriate tools and people</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Review and update as processes evolve</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-300">
            <CardContent className="p-6">
              <h4 className="font-semibold text-black mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Common Pitfalls to Avoid
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Don't create duplicate people entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Avoid overly complex category structures</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Don't forget to update task hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5" />
                  <span>Remember to allocate before assigning</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-100 border-gray-300">
          <CardContent className="p-4">
            <p className="text-sm text-black">
              <strong>🎯 Remember:</strong> Land iQ - Project Management is
              designed for responsibility tracking and weekly hour estimation,
              not complex project management. Keep it simple and focused on
              resource allocation.
            </p>
          </CardContent>
        </Card>
      </div>
    ),
  },
];

export default function HowToUseModal({
  open,
  onOpenChange,
}: HowToUseModalProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const progress = ((currentSection + 1) / sections.length) * 100;

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
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                <IconComponent className="h-6 w-6 text-blue-700" />
              </div>
              <span>{currentSectionData.title}</span>
            </DialogTitle>
            <Badge variant="outline" className="ml-4">
              {currentSection + 1} of {sections.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mt-3" />
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">
              SECTIONS
            </h3>
            <div className="space-y-1">
              {sections.map((section, index) => {
                const SectionIcon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      index === currentSection
                        ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                        : "text-gray-600 hover:bg-white hover:text-gray-900"
                    }`}
                  >
                    <SectionIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-left">{section.title}</span>
                    {index < currentSection && (
                      <CheckSquare className="h-3 w-3 text-green-600 ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-8 max-w-4xl mx-auto">
                {currentSectionData.content}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-1.5">
              {sections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSection(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSection
                      ? "bg-blue-600 w-8"
                      : index < currentSection
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  aria-label={`Go to section ${index + 1}`}
                />
              ))}
            </div>

            <Button onClick={handleNext} className="flex items-center gap-2">
              {currentSection === sections.length - 1 ? "Start Over" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
