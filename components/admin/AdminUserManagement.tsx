"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Shield, User, Trash2, Search } from "lucide-react";
import { createToastHelpers } from "@/lib/toast";
import type { UserRole } from "@/contexts/auth-context";
import {
  fetchUsers,
  updateUserRole,
  addUser,
  removeUser,
  type AdminUser,
} from "@/lib/user-management";

interface AdminUserManagementProps {
  currentUserEmail: string;
}

export function AdminUserManagement({
  currentUserEmail,
}: AdminUserManagementProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("readonly");
  const [searchTerm, setSearchTerm] = useState("");

  const toast = createToastHelpers();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.loadError("users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const success = await updateUserRole(userId, newRole);
      if (success) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
        toast.success(
          "Role Updated",
          "User role has been updated successfully."
        );
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Update Failed", "Failed to update user role.");
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error("Validation Error", "Email address is required.");
      return;
    }

    if (!newUserEmail.includes("@")) {
      toast.error("Validation Error", "Please enter a valid email address.");
      return;
    }

    if (users.some((user) => user.email === newUserEmail.trim())) {
      toast.error("Validation Error", "User with this email already exists.");
      return;
    }

    try {
      const newUser = await addUser(newUserEmail.trim(), newUserRole);
      if (newUser) {
        setUsers([...users, newUser]);
        setAddDialogOpen(false);
        setNewUserEmail("");
        setNewUserRole("readonly");
        toast.success("User Added", "User has been added successfully.");
      }
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Add Failed", "Failed to add user.");
    }
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (userEmail === currentUserEmail) {
      toast.error(
        "Cannot Remove",
        "You cannot remove yourself from the system."
      );
      return;
    }

    if (
      !confirm(`Are you sure you want to remove ${userEmail} from the system?`)
    ) {
      return;
    }

    try {
      const success = await removeUser(userId);
      if (success) {
        setUsers(users.filter((user) => user.id !== userId));
        toast.success("User Removed", "User has been removed successfully.");
      }
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Remove Failed", "Failed to remove user.");
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "default";
      case "readonly":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "readonly":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Management
        </CardTitle>
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="text-muted-foreground">Loading users...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role || "readonly"}
                      onValueChange={(value: string) =>
                        handleRoleChange(user.id, value as UserRole)
                      }
                      disabled={user.email === currentUserEmail}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="readonly">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Read Only
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.last_sign_in
                      ? new Date(user.last_sign_in).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user.id, user.email)}
                      disabled={user.email === currentUserEmail}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system with specified permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUserRole || "readonly"}
                onValueChange={(value: string) =>
                  setNewUserRole(value as UserRole)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="readonly">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Read Only - View access only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
