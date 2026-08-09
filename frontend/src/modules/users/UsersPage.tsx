import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../shared/services/api.js';
import { useAuthStore } from '../../shared/hooks/useAuthStore.js';
import { useToastStore } from '../../shared/hooks/useToastStore.js';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Shield,
  User,
  Key,
} from 'lucide-react';

const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Admin', 'Employee']),
});

const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  role: z.enum(['Admin', 'Employee']),
});

type CreateFormValues = z.infer<typeof userCreateSchema>;
type UpdateFormValues = z.infer<typeof userUpdateSchema>;

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Fetch all users
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateFormValues) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User created successfully!');
      setIsModalOpen(false);
      resetCreate();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to create user', 'error');
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFormValues }) => {
      const payload: any = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      if (data.password) {
        payload.password = data.password;
      }
      return api.put(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User updated successfully!');
      setIsModalOpen(false);
      setEditingUser(null);
      resetUpdate();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to update user', 'error');
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast('User deleted successfully!');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'Failed to delete user', 'error');
    },
  });

  // React Hook Form for Create User
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      role: 'Employee',
    },
  });

  // React Hook Form for Edit User
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    formState: { errors: errorsUpdate },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
  });

  const openEditModal = (u: any) => {
    setEditingUser(u);
    resetUpdate({
      name: u.name,
      email: u.email,
      role: u.role?.name || u.role,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    resetCreate();
    resetUpdate();
  };

  const onSubmitCreate = (data: CreateFormValues) => {
    createMutation.mutate(data);
  };

  const onSubmitUpdate = (data: UpdateFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    }
  };

  const handleDeleteUser = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Search & Filter filters
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const userRole = u.role?.name || u.role;
    const matchesRole = selectedRole ? userRole === selectedRole : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Team Management</h2>
          <p className="text-sm text-text-secondary">Manage CRM employee accounts, security credentials, and access roles.</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-border p-5 rounded-lg shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-premium pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input-premium bg-white"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Employee">Employee</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center shadow-card">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary text-sm font-medium">Loading team directory...</p>
        </div>
      ) : isError ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center text-danger shadow-card">
          <p className="font-semibold text-base mb-1">Error Loading Directory</p>
          <p className="text-sm text-text-secondary">{(error as any)?.response?.data?.error || 'Failed to connect to users service.'}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center shadow-card">
          <User className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="font-semibold text-text-primary text-base mb-1">No Team Members Found</p>
          <p className="text-sm text-text-secondary">Try refining your search terms or filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-text-secondary font-semibold text-[13px] uppercase tracking-wider">
                  <th className="p-4">Member Info</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role Badge</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u: any) => {
                  const userRole = u.role?.name || u.role;
                  return (
                    <tr key={u.id} className="hover:bg-bg transition-colors h-12 text-[14px]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs select-none">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary flex items-center gap-1.5">
                              {u.name}
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] bg-slate-100 text-text-secondary px-1.5 py-0.5 rounded font-medium">You</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-text-secondary font-medium">{u.email}</td>
                      <td className="p-4">
                        <span className={`text-[12px] px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${
                          userRole === 'Admin' 
                            ? 'bg-indigo-50 text-primary border border-indigo-100' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {userRole === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {userRole}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            className="w-8 h-8 flex items-center justify-center text-primary hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit User Info"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="w-8 h-8 flex items-center justify-center text-danger hover:bg-red-50 rounded-md transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-border rounded-lg w-full max-w-md overflow-hidden shadow-card animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
              <h3 className="font-bold text-text-primary text-[16px]">
                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
              </h3>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={
                editingUser
                  ? handleSubmitUpdate(onSubmitUpdate)
                  : handleSubmitCreate(onSubmitCreate)
              }
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Full Name</label>
                <input
                  type="text"
                  {...(editingUser ? registerUpdate('name') : registerCreate('name'))}
                  className={`input-premium ${
                    (editingUser ? errorsUpdate.name : errorsCreate.name) ? 'border-danger' : ''
                  }`}
                  placeholder="John Doe"
                />
                {(editingUser ? errorsUpdate.name : errorsCreate.name) && (
                  <p className="text-xs text-danger mt-1">
                    {(editingUser ? errorsUpdate.name : errorsCreate.name)?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Email Address</label>
                <input
                  type="email"
                  {...(editingUser ? registerUpdate('email') : registerCreate('email'))}
                  className={`input-premium ${
                    (editingUser ? errorsUpdate.email : errorsCreate.email) ? 'border-danger' : ''
                  }`}
                  placeholder="johndoe@alphacmr.com"
                />
                {(editingUser ? errorsUpdate.email : errorsCreate.email) && (
                  <p className="text-xs text-danger mt-1">
                    {(editingUser ? errorsUpdate.email : errorsCreate.email)?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">
                  {editingUser ? 'Reset Password (Optional)' : 'Password'}
                </label>
                <input
                  type="password"
                  {...(editingUser ? registerUpdate('password') : registerCreate('password'))}
                  className={`input-premium ${
                    (!editingUser && errorsCreate.password) ? 'border-danger' : ''
                  }`}
                  placeholder={editingUser ? 'Leave blank to keep current' : '••••••'}
                />
                {!editingUser && errorsCreate.password && (
                  <p className="text-xs text-danger mt-1">{errorsCreate.password.message}</p>
                )}
                {editingUser && errorsUpdate.password && (
                  <p className="text-xs text-danger mt-1">{errorsUpdate.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Access Role</label>
                <select
                  {...(editingUser ? registerUpdate('role') : registerCreate('role'))}
                  className="input-premium bg-white"
                >
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                </select>
                {(editingUser ? errorsUpdate.role : errorsCreate.role) && (
                  <p className="text-xs text-danger mt-1">
                    {(editingUser ? errorsUpdate.role : errorsCreate.role)?.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                  )}
                  <span>{editingUser ? 'Save Changes' : 'Create Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
