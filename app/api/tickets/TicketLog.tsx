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
import { format, startOfDay, endOfDay } from "date-fns";

interface Ticket {
  timestamp: string | number | Date;
  action: string;
  Incident: string;
  assignedTo?: string;
  status?: string;
  lastUpdated?: string;
  'Detail Case'?: string;
  Analisa?: string;
  'Escalation Level'?: string;
  level?: string;
  closedAt?: string;
  lastAssignedTime?: string;
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { toast } = useToast();

  const fetchLogEntries = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/tickets?view=log&date=${formattedDate}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ticket logs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // Filter tickets for the exact selected date
      const selectedDayStart = startOfDay(date).getTime();
      const selectedDayEnd = endOfDay(date).getTime();

      const processedLogs: Ticket[] = data
        .map((ticket: Ticket) => ({
          ...ticket,
          username: ticket.assignedTo || "N/A",
          timestamp: ticket.lastUpdated || ticket.closedAt || ticket.lastAssignedTime || "Unknown",
          action: ticket.closedAt ? "Closed" : ticket.status || "N/A",
        }))
        .filter((ticket: Ticket) => {
          const ticketTime = new Date(ticket.timestamp).getTime();
          return ticketTime >= selectedDayStart && ticketTime <= selectedDayEnd;
        });

      setLogEntries(processedLogs);
      setFilteredEntries(processedLogs);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error('Error fetching ticket logs:', errorMessage);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
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
    const dateA = new Date(a.lastUpdated || a.closedAt || '').getTime();
    const dateB = new Date(b.lastUpdated || b.closedAt || '').getTime();
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

  const handleExportCSV = async () => {
    try {
      setIsLoading(true);
      // Fetch tickets for the specified date range
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);

      // First fetch all tickets in the date range
      const response = await fetch(`/api/tickets?view=log&startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket logs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        toast({
          title: "No Data",
          description: "No tickets found in the specified date range",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Format the data for export
      const exportData = data.map(entry => ({
        Timestamp: new Date(entry.timestamp || entry.lastUpdated || entry.closedAt || '').toLocaleString(),
        Incident: entry.Incident,
        User: entry.assignedTo || 'N/A',
        Status: entry.status || entry.action || 'N/A',
        'Detail Case': entry['Detail Case'] || '',
        Analisa: entry.Analisa || '',
        'Escalation Level': entry['Escalation Level'] || '',
        Level: entry.level || '',
        'Closed At': entry.closedAt ? new Date(entry.closedAt).toLocaleString() : ''
      }));

      // Send to the exportTicketLog endpoint
      const exportResponse = await fetch('/api/exportTicketLog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tickets: exportData,
          startDate: format(rangeStart, 'yyyy-MM-dd'),
          endDate: format(rangeEnd, 'yyyy-MM-dd')
        }),
      });

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json();
        throw new Error(errorData.error || 'Failed to export ticket logs');
      }

      // Handle successful response
      const blob = await exportResponse.blob();
      if (blob.size === 0) {
        throw new Error('Received empty blob from server');
      }

      // Create and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ticket_log_${format(rangeStart, 'yyyy-MM-dd')}_to_${format(rangeEnd, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Ticket logs have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Error",
        description: error instanceof Error ? error.message : 'Failed to export ticket logs',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Ticket Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">Loading ticket logs...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Ticket Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Ticket Log</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </div>
              <Button onClick={handleExportCSV} disabled={!startDate || !endDate}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
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
                <PopoverContent className="w-auto p-0" align="start">
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
              <Button variant="outline" onClick={handleSortChange}>
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
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No data to show for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "the selected date"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{entry.Incident}</TableCell>
                      <TableCell>{entry.assignedTo || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          entry.action === 'Pending' ? 'bg-yellow-200 text-yellow-800' :
                          entry.action === 'Active' ? 'bg-green-200 text-green-800' :
                          entry.action === 'Completed' ? 'bg-blue-200 text-blue-800' :
                          entry.action === 'Closed' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {entry.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry['Detail Case'] || entry.Analisa || entry['Escalation Level'] || entry.level ? (
                          <ul className="list-none space-y-1">
                            {entry['Detail Case'] && (
                              <li><span className="font-semibold">Detail Case:</span> {entry['Detail Case']}</li>
                            )}
                            {entry.Analisa && (
                              <li><span className="font-semibold">Analisa:</span> {entry.Analisa}</li>
                            )}
                            {entry['Escalation Level'] && (
                              <li><span className="font-semibold">Escalation Level:</span> {entry['Escalation Level']}</li>
                            )}
                            {entry.level && (
                              <li><span className="font-semibold">Level:</span> {entry.level}</li>
                            )}
                            {entry.closedAt && (
                              <li><span className="font-semibold">Closed At:</span> {new Date(entry.closedAt).toLocaleString()}</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">No details available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {paginatedEntries.length > 0 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

