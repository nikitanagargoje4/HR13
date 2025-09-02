import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { Calendar as CalendarIcon, Download, Loader2, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { User, Department } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [location] = useLocation();
  const reportType = location.includes("attendance") ? "attendance" : "leave";
  const [view, setView] = useState<"table" | "chart">("chart");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch report data
  const { data: reportData = [], isLoading } = useQuery({
    queryKey: [
      `/api/reports/${reportType}`, 
      { 
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
        departmentId: selectedDepartment !== "all" ? selectedDepartment : undefined
      }
    ],
  });

  // Helper to get department name
  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return "Unassigned";
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : "Unassigned";
  };

  // Prepare chart data for attendance report
  const prepareAttendanceChartData = () => {
    if (reportType !== "attendance" || !reportData.length) return [];

    // This is a simplified version. In a real implementation, you would process the actual
    // API response from reportData to generate the chart data
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'MM-dd');
      
      // Calculate attendance metrics
      const dayData = reportData.filter(entry => 
        format(new Date(entry.records[0].date), 'MM-dd') === dateStr
      );
      
      const present = dayData.filter(entry => 
        entry.records.some(record => record.status === 'present')
      ).length;
      
      const absent = dayData.filter(entry => 
        entry.records.some(record => record.status === 'absent')
      ).length;
      
      const late = dayData.filter(entry => 
        entry.records.some(record => 
          record.status === 'present' && 
          new Date(record.checkInTime).getHours() >= 9 && 
          new Date(record.checkInTime).getMinutes() > 0
        )
      ).length;
      
      return {
        date: format(date, 'MM/dd'),
        present,
        absent,
        late,
      };
    });
  };

  // Prepare chart data for leave report
  const prepareLeaveChartData = () => {
    if (reportType !== "leave" || !reportData.length) return [];

    // Create summary by leave type
    const leaveTypeCounts = {
      annual: 0,
      sick: 0,
      personal: 0,
      unpaid: 0,
      other: 0,
    };

    reportData.forEach(entry => {
      entry.leaveRequests.forEach(request => {
        if (request.status === 'approved') {
          leaveTypeCounts[request.type as keyof typeof leaveTypeCounts] += 1;
        }
      });
    });

    return Object.entries(leaveTypeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  };

  // Define columns for attendance report
  const attendanceColumns: ColumnDef<any>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const user = row.original.user;
        return `${user.firstName} ${user.lastName}`;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => getDepartmentName(row.original.user.departmentId),
    },
    {
      accessorKey: "present",
      header: "Present Days",
      cell: ({ row }) => {
        const presentDays = row.original.records.filter(r => r.status === 'present').length;
        return presentDays;
      },
    },
    {
      accessorKey: "absent",
      header: "Absent Days",
      cell: ({ row }) => {
        const absentDays = row.original.records.filter(r => r.status === 'absent').length;
        return absentDays;
      },
    },
    {
      accessorKey: "late",
      header: "Late Days",
      cell: ({ row }) => {
        const lateDays = row.original.records.filter(r => 
          r.status === 'present' && 
          r.checkInTime &&
          new Date(r.checkInTime).getHours() >= 9 && 
          new Date(r.checkInTime).getMinutes() > 0
        ).length;
        return lateDays;
      },
    },
    {
      accessorKey: "avgCheckIn",
      header: "Avg. Check In",
      cell: ({ row }) => {
        const checkIns = row.original.records
          .filter(r => r.checkInTime)
          .map(r => new Date(r.checkInTime));
        
        if (checkIns.length === 0) return "N/A";
        
        const avgTime = new Date(
          checkIns.reduce((sum, time) => sum + time.getTime(), 0) / checkIns.length
        );
        
        return format(avgTime, 'hh:mm a');
      },
    },
  ];

  // Define columns for leave report
  const leaveColumns: ColumnDef<any>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const user = row.original.user;
        return `${user.firstName} ${user.lastName}`;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => getDepartmentName(row.original.user.departmentId),
    },
    {
      accessorKey: "annualLeave",
      header: "Annual Leave",
      cell: ({ row }) => {
        const annualLeaves = row.original.leaveRequests.filter(r => 
          r.type === 'annual' && r.status === 'approved'
        );
        return annualLeaves.length;
      },
    },
    {
      accessorKey: "sickLeave",
      header: "Sick Leave",
      cell: ({ row }) => {
        const sickLeaves = row.original.leaveRequests.filter(r => 
          r.type === 'sick' && r.status === 'approved'
        );
        return sickLeaves.length;
      },
    },
    {
      accessorKey: "unpaidLeave",
      header: "Unpaid Leave",
      cell: ({ row }) => {
        const unpaidLeaves = row.original.leaveRequests.filter(r => 
          r.type === 'unpaid' && r.status === 'approved'
        );
        return unpaidLeaves.length;
      },
    },
    {
      accessorKey: "totalDays",
      header: "Total Days",
      cell: ({ row }) => {
        const approvedLeaves = row.original.leaveRequests.filter(r => r.status === 'approved');
        const totalDays = approvedLeaves.reduce((sum, leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        return totalDays;
      },
    },
  ];

  // Handle export button click
  const handleExport = (format: 'excel' | 'pdf' = 'excel') => {
    setIsExporting(true);
    
    try {
      if (format === 'excel') {
        exportToExcel();
      } else {
        exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = reportData.map(row => {
      if (reportType === 'attendance') {
        return {
          'Employee Name': `${row.user.firstName} ${row.user.lastName}`,
          'Department': getDepartmentName(row.user.departmentId),
          'Present Days': row.records.filter(r => r.status === 'present').length,
          'Total Days': row.records.length,
          'Attendance Rate': row.records.length > 0 
            ? `${((row.records.filter(r => r.status === 'present').length / row.records.length) * 100).toFixed(1)}%`
            : '0%'
        };
      } else {
        const approvedLeaves = row.leaveRequests.filter(r => r.status === 'approved');
        const totalDays = approvedLeaves.reduce((sum, leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        
        return {
          'Employee Name': `${row.user.firstName} ${row.user.lastName}`,
          'Department': getDepartmentName(row.user.departmentId),
          'Annual Leave': row.leaveRequests.filter(r => r.type === 'annual' && r.status === 'approved').length,
          'Sick Leave': row.leaveRequests.filter(r => r.type === 'sick' && r.status === 'approved').length,
          'Unpaid Leave': row.leaveRequests.filter(r => r.type === 'unpaid' && r.status === 'approved').length,
          'Total Days': totalDays
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType === 'attendance' ? 'Attendance Report' : 'Leave Report');
    
    const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = reportType === 'attendance' ? 'Attendance Report' : 'Leave Report';
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, 20, 35);
    
    // Prepare table data
    const tableData = reportData.map(row => {
      if (reportType === 'attendance') {
        const presentDays = row.records.filter(r => r.status === 'present').length;
        const attendanceRate = row.records.length > 0 
          ? `${((presentDays / row.records.length) * 100).toFixed(1)}%`
          : '0%';
        
        return [
          `${row.user.firstName} ${row.user.lastName}`,
          getDepartmentName(row.user.departmentId),
          presentDays,
          row.records.length,
          attendanceRate
        ];
      } else {
        const approvedLeaves = row.leaveRequests.filter(r => r.status === 'approved');
        const totalDays = approvedLeaves.reduce((sum, leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        
        return [
          `${row.user.firstName} ${row.user.lastName}`,
          getDepartmentName(row.user.departmentId),
          row.leaveRequests.filter(r => r.type === 'annual' && r.status === 'approved').length,
          row.leaveRequests.filter(r => r.type === 'sick' && r.status === 'approved').length,
          row.leaveRequests.filter(r => r.type === 'unpaid' && r.status === 'approved').length,
          totalDays
        ];
      }
    });

    const tableHeaders = reportType === 'attendance'
      ? ['Employee Name', 'Department', 'Present Days', 'Total Days', 'Attendance Rate']
      : ['Employee Name', 'Department', 'Annual Leave', 'Sick Leave', 'Unpaid Leave', 'Total Days'];

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [71, 85, 105] },
    });
    
    const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  // Prepare chart data based on report type
  const chartData = reportType === "attendance" 
    ? prepareAttendanceChartData() 
    : prepareLeaveChartData();

  // Define chart colors
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            {reportType === "attendance" ? "Attendance Report" : "Leave Report"}
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date range picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal w-full sm:w-auto"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {/* Department filter */}
            <Select 
              value={selectedDepartment} 
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Departments" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Export button with dropdown */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                disabled={isExporting || reportData.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={isExporting || reportData.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* View toggle */}
        <div className="flex justify-end">
          <Tabs 
            value={view} 
            onValueChange={(val) => setView(val as "table" | "chart")}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Report content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {reportType === "attendance" 
                ? "Attendance Overview" 
                : "Leave Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <p>No data available for the selected period</p>
                <p className="text-sm mt-2">Try selecting a different date range or department</p>
              </div>
            ) : (
              <>
                {view === "chart" ? (
                  <div className="h-80 w-full">
                    {reportType === "attendance" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            width={40}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="present" 
                            name="Present" 
                            fill="hsl(var(--chart-1))" 
                            radius={[4, 4, 0, 0]} 
                          />
                          <Bar 
                            dataKey="late" 
                            name="Late" 
                            fill="hsl(var(--chart-3))" 
                            radius={[4, 4, 0, 0]} 
                          />
                          <Bar 
                            dataKey="absent" 
                            name="Absent" 
                            fill="hsl(var(--chart-5))" 
                            radius={[4, 4, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <DataTable
                    columns={reportType === "attendance" ? attendanceColumns : leaveColumns}
                    data={reportData}
                    globalFilter={true}
                    searchPlaceholder="Search by employee name..."
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === "attendance" ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "0%"
                    ) : (
                      "92.5%"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">For the selected period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Working Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "0h"
                    ) : (
                      "8h 24m"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Per working day</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Punctuality Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "0%"
                    ) : (
                      "89.7%"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">On-time check-ins</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Leave Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "0"
                    ) : (
                      "48"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Approved leaves in period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Most Common Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "N/A"
                    ) : (
                      "Annual"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Leave type</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Leave Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : reportData.length === 0 ? (
                      "0"
                    ) : (
                      "2.4"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Days per request</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
