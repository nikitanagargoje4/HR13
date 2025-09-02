import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Eye, Shield, ShieldCheck, Users, Search } from "lucide-react";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position: string;
  isActive: boolean;
  customPermissions?: string[];
};

export default function RolesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Check if current user can edit (only admin)
  const canEdit = user?.role === "admin";

  // Fetch all users
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  // Filter users based on search query
  const users = allUsers.filter(user => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const role = user.role.toLowerCase();
    const position = (user.position || "").toLowerCase();
    
    return fullName.includes(query) || 
           email.includes(query) || 
           role.includes(query) || 
           position.includes(query);
  });

  // Mutation to update user permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string; customPermissions: string[] }) => {
      const response = await fetch("/api/users/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update permissions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user permissions",
        variant: "destructive",
      });
    },
  });

  const getRolePermissions = (role: string, customPermissions: string[] = []) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    const uniquePerms = new Set([...defaultPerms, ...customPermissions]);
    return Array.from(uniquePerms);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setEditingPermissions(user.customPermissions || []);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      role: editingRole,
      customPermissions: editingPermissions,
    });
  };

  const togglePermission = (permissionId: string) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    
    if (defaultPerms.includes(permissionId)) {
      // This is a default permission, can't be removed
      return;
    }

    setEditingPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "hr": return "default";
      case "manager": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-teal-600" />
            <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          </div>
          <p className="text-gray-600">
            Manage user roles and permissions across the system
            {!canEdit && " (View Only)"}
          </p>
        </div>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Permissions
          </CardTitle>
          <CardDescription>
            {canEdit 
              ? "Click on a user to edit their role and custom permissions" 
              : "View user roles and their assigned permissions"
            }
          </CardDescription>
          
          {/* Search Input */}
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, email, role, or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <div className="text-sm text-gray-500">
                {users.length} of {allUsers.length} users shown
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Permissions Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => {
                const userPermissions = getRolePermissions(user.role, user.customPermissions);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {userPermissions.length} permissions
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            {canEdit ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {canEdit ? "Edit" : "View"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5" />
                              {canEdit ? "Edit" : "View"} Permissions - {selectedUser?.firstName} {selectedUser?.lastName}
                            </DialogTitle>
                            <DialogDescription>
                              {canEdit 
                                ? "Modify the user's role and grant additional permissions" 
                                : "View the user's current role and permissions"
                              }
                            </DialogDescription>
                          </DialogHeader>

                          {selectedUser && (
                            <div className="space-y-6">
                              {/* Role Selection */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Role</label>
                                {canEdit ? (
                                  <Select value={editingRole} onValueChange={setEditingRole}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="employee">Employee</SelectItem>
                                      <SelectItem value="manager">Manager</SelectItem>
                                      <SelectItem value="hr">HR</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="text-base px-4 py-2">
                                    {selectedUser.role.toUpperCase()}
                                  </Badge>
                                )}
                              </div>

                              {/* Permissions */}
                              <div>
                                <label className="text-sm font-medium mb-3 block">Permissions</label>
                                <div className="space-y-4">
                                  {Object.entries(
                                    PERMISSIONS.reduce((acc, perm) => {
                                      if (!acc[perm.category]) acc[perm.category] = [];
                                      acc[perm.category].push(perm);
                                      return acc;
                                    }, {} as Record<string, typeof PERMISSIONS>)
                                  ).map(([category, perms]) => (
                                    <div key={category} className="border rounded-lg p-4">
                                      <h4 className="font-medium text-sm mb-3 text-gray-700">{category}</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {perms.map(permission => {
                                          const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
                                          const isDefault = defaultPerms.includes(permission.id);
                                          const isGranted = isDefault || editingPermissions.includes(permission.id);
                                          
                                          return (
                                            <div key={permission.id} className="flex items-center space-x-2">
                                              <Checkbox 
                                                checked={isGranted}
                                                disabled={!canEdit || isDefault}
                                                onCheckedChange={() => togglePermission(permission.id)}
                                              />
                                              <span className={`text-sm ${isDefault ? 'font-medium' : ''}`}>
                                                {permission.label}
                                                {isDefault && <span className="text-xs text-gray-500 ml-1">(default)</span>}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {canEdit && (
                                <div className="flex justify-end gap-3 pt-4">
                                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleSavePermissions}
                                    disabled={updatePermissionsMutation.isPending}
                                  >
                                    {updatePermissionsMutation.isPending ? "Saving..." : "Save Changes"}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}