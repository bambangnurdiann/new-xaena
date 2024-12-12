'use client';

import { useCallback, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from 'lucide-react';
import { format, isAfter, isBefore, isEqual } from "date-fns";

interface Ticket {
  Incident: string;
  assignedTo?: string;
  status?: string;
  lastUpdated?: string;
  'Detail Case'?: string;
  Analisa?: string;
  'Escalation Level'?: string;
  level?: string;
}

export default function TicketLog() {
  const [logEntries, setLogEntries] = useState<Ticket[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const fetchLogEntries = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching log entries for date:', date);
      const response = await fetch('/api/tickets');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }
      const data = await response.json();
      console.log('Raw data from API:', data);

      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).getTime();

      const filteredLogs: Ticket[] = data
        .map((ticket: Ticket) => ({
          ...ticket,
          username: ticket.assignedTo || "N/A",
          timestamp: ticket.lastUpdated || "Unknown",
          action: ticket.status || "N/A",
          details: {
            'Detail Case': ticket['Detail Case'] || "N/A",
            Analisa: ticket.Analisa || "N/A",
            'Escalation Level': ticket['Escalation Level'] || "N/A",
            status: ticket.status || "N/A",
          },
        }));

      console.log('Filtered logs:', filteredLogs);
      setLogEntries(filteredLogs);
      setFilteredEntries(filteredLogs);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error('Error fetching ticket logs:', errorMessage);
      setError(`Failed to fetch ticket logs: ${errorMessage}. Please check your network connection and try again.`);
      toast({
        title: "Error",
        description: `Failed to fetch ticket logs. Please try again later.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedDate) {
      fetchLogEntries(selectedDate);
    }
  }, [fetchLogEntries, selectedDate]);

  useEffect(() => {
    const filtered = logEntries.filter(entry =>
      entry.Incident.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [searchTerm, logEntries]);

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const dateA = new Date(a.lastUpdated || '').getTime();
    const dateB = new Date(b.lastUpdated || '').getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedEntries.length / rowsPerPage);
  const paginatedEntries = sortedEntries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSortChange = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleDownloadCSV = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates for download.",
        variant: "destructive",
      });
      return;
    }

    console.log('Date range for CSV:', { startDate, endDate });
    console.log('All log entries before filtering:', logEntries);

    // Adjust the end date to include the entire day
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    const filteredData = logEntries.filter(entry => {
      if (!entry.lastUpdated) {
        console.warn('Entry missing lastUpdated:', entry);
        return false;
      }
      const entryDate = new Date(entry.lastUpdated);
      const isInRange = (entryDate >= startDate && entryDate <= adjustedEndDate);
      if (!isInRange) {
        console.log('Entry out of range:', { entry, entryDate, startDate, adjustedEndDate });
      }
      return isInRange;
    });

    console.log('Filtered data for CSV:', filteredData);

    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data available for the selected date range.",
        variant: undefined,
      });
      return;
    }

    const csvContent = [
      ["Timestamp", "Incident", "User", "Action", "Detail Case", "Analisa", "Escalation Level"],
      ...filteredData.map(entry => [
        entry.lastUpdated || '',
        entry.Incident || '',
        entry.assignedTo || '',
        entry.status || '',
        entry['Detail Case'] || '',
        entry.Analisa || '',
        entry['Escalation Level'] || ''
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

    console.log('CSV content:', csvContent);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `ticket_log_${format(startDate, "yyyyMMdd")}_${format(adjustedEndDate, "yyyyMMdd")}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "CSV file has been downloaded.",
        variant: "default",
      });
    } else {
      toast({
        title: "Error",
        description: "Your browser doesn't support downloading files.",
        variant: "destructive",
      });
    }
  };

  const validateAndLogData = useCallback(() => {
    console.log('All log entries:', logEntries);
    console.log('Filtered entries:', filteredEntries);
    
    if (logEntries.length === 0) {
      console.warn('No log entries available. This might indicate an issue with data fetching or filtering.');
    }
    
    if (filteredEntries.length === 0) {
      console.warn('No filtered entries available. This might indicate an issue with the search or date filtering.');
    }
    
    // Check for any entries with missing or invalid data
    const invalidEntries = logEntries.filter(entry => 
      !entry.Incident || !entry.lastUpdated || !entry.status
    );
    
    if (invalidEntries.length > 0) {
      console.warn('Found entries with missing or invalid data:', invalidEntries);
    }
  }, [logEntries, filteredEntries]);

  useEffect(() => {
    validateAndLogData();
  }, [validateAndLogData, logEntries, filteredEntries]);

  useEffect(() => {
    console.log('logEntries updated:', logEntries);
  }, [logEntries]);

  if (isLoading) {
    return <div>Loading ticket logs...</div>;
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button className="mt-4" onClick={() => fetchLogEntries(selectedDate || new Date())}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Ticket Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate && endDate ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}` : <span>Select date range for CSV</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={{
                    from: startDate,
                    to: endDate,
                  }}
                  onSelect={(range) => {
                    setStartDate(range?.from);
                    setEndDate(range?.to);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleDownloadCSV} disabled={!startDate || !endDate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button onClick={handleSortChange}>
              Sort by {sortOrder === 'newest' ? 'Oldest' : 'Newest'}
            </Button>
            <Select onValueChange={handleRowsPerPageChange} value={rowsPerPage.toString()}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {paginatedEntries.length === 0 ? (
          <div>No ticket logs available.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.lastUpdated!).toLocaleString()}</TableCell>
                    <TableCell>{entry.Incident}</TableCell>
                    <TableCell>{entry.assignedTo || "N/A"}</TableCell>
                    <TableCell>{entry.status || "N/A"}</TableCell>
                    <TableCell>
                      {entry['Detail Case'] || entry.Analisa || entry['Escalation Level'] ? (
                        <ul>
                          {entry['Detail Case'] && <li><strong>Detail Case:</strong> {entry['Detail Case']}</li>}
                          {entry.Analisa && <li><strong>Analisa:</strong> {entry.Analisa}</li>}
                          {entry['Escalation Level'] && <li><strong>Escalation Level:</strong> {entry['Escalation Level']}</li>}
                        </ul>
                      ) : (
                        'No details available'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>Page {currentPage} of {totalPages}</span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

