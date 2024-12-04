'use client';

import { useCallback, useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { toast } = useToast();

// Fetch log entries function wrapped in `useCallback`
const fetchLogEntries = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/tickets');
    if (!response.ok) {
      throw new Error(`Failed to fetch ticket logs: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();

    const filteredLogs: Ticket[] = data
      .filter((ticket: Ticket) => {
        const ticketTime = new Date(ticket.lastUpdated || '').getTime();
        return (
          ticket.status === 'Completed' &&
          ticketTime >= startOfDay &&
          ticketTime <= endOfDay
        );
      })
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

      setLogEntries(filteredLogs);
    } catch (err: unknown) {
      // Use a type guard to narrow the error
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
  }, [toast]); // Include dependencies here

  useEffect(() => {
    fetchLogEntries();
  }, [fetchLogEntries]);

  const sortedEntries = [...logEntries].sort((a, b) => {
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
