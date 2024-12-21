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
import { CalendarIcon } from 'lucide-react';
import { format } from "date-fns";

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

      const processedLogs: Ticket[] = data.map((ticket: Ticket) => ({
        ...ticket,
        username: ticket.assignedTo || "N/A",
        timestamp: ticket.lastUpdated || ticket.closedAt || "Unknown",
        action: ticket.closedAt ? "Closed" : ticket.status || "N/A",
      }));

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

  if (isLoading) {
    return <div>Loading ticket logs...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{entry.Incident}</TableCell>
                    <TableCell>{entry.assignedTo || "N/A"}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      {entry['Detail Case'] || entry.Analisa || entry['Escalation Level'] || entry.level ? (
                        <ul>
                          {entry['Detail Case'] && <li><strong>Detail Case:</strong> {entry['Detail Case']}</li>}
                          {entry.Analisa && <li><strong>Analisa:</strong> {entry.Analisa}</li>}
                          {entry['Escalation Level'] && <li><strong>Escalation Level:</strong> {entry['Escalation Level']}</li>}
                          {entry.level && <li><strong>Level:</strong> {entry.level}</li>}
                          {entry.closedAt && <li><strong>Closed At:</strong> {new Date(entry.closedAt).toLocaleString()}</li>}
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

