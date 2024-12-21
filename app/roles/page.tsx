'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface User {
  username: string;
  role: string;
  canUploadTickets: boolean;
}

const ManageRolesPermissions = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/getUsers');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (username: string, newRole: string) => {
    try {
      const response = await fetch('/api/updateUserRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update user role');

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.username === username ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: "Role Updated",
        description: `User ${username}'s role updated to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePermissionToggle = async (username: string, canUploadTickets: boolean) => {
    try {
      const response = await fetch('/api/updateUserPermission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, canUploadTickets }),
      });

      if (!response.ok) throw new Error('Failed to update user permission');

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.username === username ? { ...user, canUploadTickets } : user
        )
      );

      toast({
        title: "Permission Updated",
        description: `User ${username}'s permission updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update user permission. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Roles & Permissions</h1>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Upload Tickets Permission</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.username}>
              <TableCell>{user.username}</TableCell>
              <TableCell>
                <Select
                  onValueChange={(value) => handleRoleChange(user.username, value)}
                  defaultValue={user.role}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant={user.canUploadTickets ? "default" : "secondary"}
                  onClick={() => handlePermissionToggle(user.username, !user.canUploadTickets)}
                >
                  {user.canUploadTickets ? 'Enabled' : 'Disabled'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ManageRolesPermissions;
