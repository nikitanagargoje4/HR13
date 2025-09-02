import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiStepEmployeeForm } from "@/components/employees/multi-step-employee-form";
import { Plus, Pencil, Trash2, Eye, Mail, Phone, MapPin, Calendar, Building2, User as UserIcon, Search } from "lucide-react";
import { User, Department } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch employees data
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });
  
  // Fetch departments for the form
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Employee deleted",
        description: "The employee has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for the edit button
  const handleEdit = (employee: User) => {
    setSelectedEmployee(employee);
    setIsEditOpen(true);
  };

  // Handler for the view button
  const handleView = (employee: User) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
  };
  
  // Handler for the delete button
  const handleDelete = (id: number) => {
    deleteEmployeeMutation.mutate(id);
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.position?.toLowerCase().includes(searchLower)) ||
      employee.role.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 -mx-6 -mt-6 px-6 py-8 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Our Team</h1>
              <p className="text-slate-600">Manage and view employee profiles</p>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 h-auto">
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <MultiStepEmployeeForm 
                  departments={departments}
                  onSuccess={() => {
                    setIsAddOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-2 border-slate-200 focus:border-teal-500 rounded-lg"
            />
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="font-medium">{filteredEmployees.length}</span>
            <span className="ml-1">employee{filteredEmployees.length !== 1 ? 's' : ''} found</span>
          </div>
        </div>
        
        {/* Employee Cards Grid */}
        {isLoadingEmployees ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded"></div>
                    <div className="w-24 h-3 bg-slate-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee) => {
              const department = departments.find(d => d.id === employee.departmentId);
              return (
                <Card key={employee.id} className="group hover:shadow-xl transition-all duration-300 border-2 border-slate-100 hover:border-teal-200 bg-white overflow-hidden">
                  <CardContent className="p-0">
                    {/* Card Header with Background */}
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 h-24 relative">
                      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                      <Badge 
                        variant={employee.isActive ? "default" : "destructive"}
                        className="absolute top-3 right-3 bg-white/90 text-slate-700 border-0 shadow-sm"
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Employee Photo and Info */}
                    <div className="relative px-6 pb-6">
                      <div className="flex flex-col items-center -mt-12">
                        {/* Employee Photo */}
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 overflow-hidden">
                          {employee.photoUrl ? (
                            <img 
                              src={employee.photoUrl} 
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                              <UserIcon className="w-10 h-10 text-slate-500" />
                            </div>
                          )}
                        </div>

                        {/* Employee Details */}
                        <div className="text-center mt-4 space-y-2 w-full">
                          <h3 className="text-lg font-bold text-slate-900 truncate">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          
                          <p className="text-sm text-slate-600 truncate">
                            {employee.position || "No Position"}
                          </p>
                          
                          <div className="flex items-center justify-center">
                            <Badge variant="outline" className="text-xs capitalize font-medium">
                              {employee.role}
                            </Badge>
                          </div>

                          {/* Department */}
                          <div className="flex items-center justify-center text-xs text-slate-500 truncate">
                            <Building2 className="w-3 h-3 mr-1" />
                            {department?.name || "Unassigned"}
                          </div>

                          {/* Contact Info Preview */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-center text-xs text-slate-500 truncate">
                              <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{employee.email}</span>
                            </div>
                            {employee.phoneNumber && (
                              <div className="flex items-center justify-center text-xs text-slate-500">
                                <Phone className="w-3 h-3 mr-1" />
                                {employee.phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center space-x-2 mt-4 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(employee)}
                            className="flex-1 h-9 text-xs border-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="flex-1 h-9 text-xs border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3 h-9 text-xs border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{employee.firstName} {employee.lastName}</strong>? This action cannot be undone and will permanently remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(employee.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingEmployees && filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchQuery ? "No employees found" : "No employees yet"}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchQuery 
                ? "Try adjusting your search terms"
                : "Get started by adding your first employee"
              }
            </p>
            {!searchQuery && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Employee
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        )}
        
        {/* View Employee Modal */}
        {selectedEmployee && (
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900">Employee Profile</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-8">
                {/* Header Section with Photo */}
                <div className="bg-gradient-to-r from-teal-50 to-slate-50 -mx-6 -mt-6 px-6 py-8 border-b border-slate-200">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      {selectedEmployee.photoUrl ? (
                        <img 
                          src={selectedEmployee.photoUrl} 
                          alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                          <UserIcon className="w-16 h-16 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h2>
                      <p className="text-lg text-slate-600 mb-3">
                        {selectedEmployee.position || "No Position Assigned"}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <Badge variant="outline" className="capitalize font-medium">
                          {selectedEmployee.role}
                        </Badge>
                        <Badge variant={selectedEmployee.isActive ? "default" : "destructive"}>
                          {selectedEmployee.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="secondary">
                          ID: {selectedEmployee.id}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Email</p>
                          <p className="text-slate-900">{selectedEmployee.email}</p>
                        </div>
                      </div>
                      
                      {selectedEmployee.phoneNumber && (
                        <div className="flex items-start space-x-3">
                          <Phone className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Phone</p>
                            <p className="text-slate-900">{selectedEmployee.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.address && (
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Address</p>
                            <p className="text-slate-900">{selectedEmployee.address}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.dateOfBirth && (
                        <div className="flex items-start space-x-3">
                          <Calendar className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Date of Birth</p>
                            <p className="text-slate-900">{format(new Date(selectedEmployee.dateOfBirth), "PPP")}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.gender && (
                        <div className="flex items-start space-x-3">
                          <UserIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Gender</p>
                            <p className="text-slate-900 capitalize">{selectedEmployee.gender.replace('_', ' ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Company Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Building2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Department</p>
                          <p className="text-slate-900">
                            {departments.find(d => d.id === selectedEmployee.departmentId)?.name || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <UserIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Username</p>
                          <p className="text-slate-900">{selectedEmployee.username}</p>
                        </div>
                      </div>
                      
                      {selectedEmployee.joinDate && (
                        <div className="flex items-start space-x-3">
                          <Calendar className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Date of Joining</p>
                            <p className="text-slate-900">{format(new Date(selectedEmployee.joinDate), "PPP")}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.salary && (
                        <div className="flex items-start space-x-3">
                          <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-slate-700">Annual Salary</p>
                            <p className="text-slate-900 font-semibold">₹{selectedEmployee.salary.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Information (if available) */}
                {(selectedEmployee.bankAccountNumber || selectedEmployee.bankName) && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Bank Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEmployee.bankAccountNumber && (
                        <div>
                          <p className="text-sm font-medium text-slate-700">Account Number</p>
                          <p className="text-slate-900 font-mono">{selectedEmployee.bankAccountNumber}</p>
                        </div>
                      )}
                      {selectedEmployee.bankName && (
                        <div>
                          <p className="text-sm font-medium text-slate-700">Bank Name</p>
                          <p className="text-slate-900">{selectedEmployee.bankName}</p>
                        </div>
                      )}
                      {selectedEmployee.bankIFSCCode && (
                        <div>
                          <p className="text-sm font-medium text-slate-700">IFSC Code</p>
                          <p className="text-slate-900 font-mono">{selectedEmployee.bankIFSCCode}</p>
                        </div>
                      )}
                      {selectedEmployee.bankAccountHolderName && (
                        <div>
                          <p className="text-sm font-medium text-slate-700">Account Holder</p>
                          <p className="text-slate-900">{selectedEmployee.bankAccountHolderName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
                  <Button
                    onClick={() => {
                      setIsViewOpen(false);
                      handleEdit(selectedEmployee);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Employee
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Employee Modal */}
        {selectedEmployee && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Edit Employee</DialogTitle>
              </DialogHeader>
              <MultiStepEmployeeForm 
                employee={selectedEmployee}
                departments={departments}
                onSuccess={() => {
                  setIsEditOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
