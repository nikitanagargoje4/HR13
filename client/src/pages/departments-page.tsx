import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DepartmentForm } from "@/components/departments/department-form";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Department, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnDef } from "@tanstack/react-table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // Fetch departments data
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  // Fetch all employees data
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });
  
  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Department deleted",
        description: "The department has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete department: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for the edit button
  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditOpen(true);
  };
  
  // Handler for the delete button
  const handleDelete = (id: number) => {
    deleteDepartmentMutation.mutate(id);
  };
  
  // Handler for viewing department employees
  const handleViewEmployees = (department: Department) => {
    setSelectedDepartment(department);
    setIsEmployeesOpen(true);
  };
  
  // Get employees for selected department
  const departmentEmployees = selectedDepartment
    ? employees.filter(emp => emp.departmentId === selectedDepartment.id)
    : [];
  
  // Define table columns
  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="text-sm text-slate-600">{row.getValue("description") || "No description"}</div>,
    },
    {
      id: "employees",
      header: "Employees",
      cell: ({ row }) => {
        const empCount = employees.filter(emp => emp.departmentId === row.original.id).length;
        return (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleViewEmployees(row.original)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Users className="h-4 w-4 mr-2" />
            <span>View ({empCount})</span>
          </Button>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleEdit(row.original)}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-500"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the department and could affect employees assigned to it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDelete(row.original.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
              </DialogHeader>
              <DepartmentForm 
                onSuccess={() => {
                  setIsAddOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Department summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((department) => (
            <Card key={department.id}>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{department.name}</h3>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(department)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {department.description || "No description available"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <DataTable 
          columns={columns} 
          data={departments} 
          searchColumn="name"
          searchPlaceholder="Search departments..."
        />
        
        {/* Edit department dialog */}
        {selectedDepartment && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Department</DialogTitle>
              </DialogHeader>
              <DepartmentForm 
                department={selectedDepartment}
                onSuccess={() => {
                  setIsEditOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Department employees dialog */}
        <Dialog open={isEmployeesOpen} onOpenChange={setIsEmployeesOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Employees in {selectedDepartment?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {departmentEmployees.length > 0 ? (
                <div className="space-y-3">
                  {departmentEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                          {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-slate-500">{employee.email}</div>
                          {employee.position && (
                            <div className="text-xs text-slate-400">{employee.position}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {employee.role}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No employees found in this department</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
