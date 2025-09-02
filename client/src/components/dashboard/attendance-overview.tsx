import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Attendance } from "@shared/schema";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function AttendanceOverview() {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const today = new Date();
  
  // Calculate date range based on view
  const startDate = view === "weekly" 
    ? subDays(today, 6) // Last 7 days
    : subDays(today, 29); // Last 30 days
  
  // Get attendance data
  const { data: attendanceData = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { startDate: format(startDate, 'yyyy-MM-dd') }],
  });
  
  // Generate dates for the range
  const dateRange = eachDayOfInterval({ start: startDate, end: today });
  
  // Prepare data for chart
  const chartData = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayRecords = attendanceData.filter(record => 
      format(new Date(record.date), 'yyyy-MM-dd') === dateStr
    );
    
    const present = dayRecords.filter(record => record.status === 'present').length;
    const absent = dayRecords.filter(record => record.status === 'absent').length;
    const late = dayRecords.filter(record => 
      record.status === 'present' && 
      new Date(record.checkInTime).getHours() >= 9 && 
      new Date(record.checkInTime).getMinutes() > 0
    ).length;
    
    return {
      date: format(date, view === "weekly" ? 'EEE' : 'MM/dd'),
      present,
      late,
      absent,
    };
  });
  
  // Calculate averages
  const calculateAverage = (recordsFn: (record: Attendance) => boolean) => {
    const filtered = attendanceData.filter(recordsFn);
    return filtered.length === 0 ? "N/A" : format(
      new Date(
        filtered.reduce((acc, record) => acc + new Date(record.checkInTime).getTime(), 0) / filtered.length
      ),
      'hh:mm a'
    );
  };
  
  const avgCheckIn = calculateAverage(record => !!record.checkInTime);
  
  const avgCheckOut = calculateAverage(record => !!record.checkOutTime);
  
  const calculateAvgWorkingHours = () => {
    const recordsWithBoth = attendanceData.filter(record => 
      record.checkInTime && record.checkOutTime
    );
    
    if (recordsWithBoth.length === 0) return "N/A";
    
    const totalMs = recordsWithBoth.reduce((acc, record) => {
      const checkIn = new Date(record.checkInTime!);
      const checkOut = new Date(record.checkOutTime!);
      return acc + (checkOut.getTime() - checkIn.getTime());
    }, 0);
    
    const avgMs = totalMs / recordsWithBoth.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const mins = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${mins}m`;
  };
  
  const avgWorkingHours = calculateAvgWorkingHours();
  
  const calculatePunctualityRate = () => {
    const recordsWithCheckIn = attendanceData.filter(record => 
      record.status === 'present' && record.checkInTime
    );
    
    if (recordsWithCheckIn.length === 0) return "N/A";
    
    const punctualRecords = recordsWithCheckIn.filter(record => {
      const checkIn = new Date(record.checkInTime!);
      return checkIn.getHours() < 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() <= 0);
    });
    
    return `${((punctualRecords.length / recordsWithCheckIn.length) * 100).toFixed(1)}%`;
  };
  
  const punctualityRate = calculatePunctualityRate();

  return (
    <Card>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Attendance Overview</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant={view === "weekly" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("weekly")}
              className={view === "weekly" ? "bg-teal-100 text-teal-700" : ""}
            >
              Weekly
            </Button>
            <Button
              variant={view === "monthly" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("monthly")}
              className={view === "monthly" ? "bg-teal-100 text-teal-700" : ""}
            >
              Monthly
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barGap={2}
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
                width={30}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Average Check-in Time</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{avgCheckIn}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Average Check-out Time</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{avgCheckOut}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Average Working Hours</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{avgWorkingHours}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Punctuality Rate</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{punctualityRate}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
