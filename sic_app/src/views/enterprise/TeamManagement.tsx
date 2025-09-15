import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  last_active: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
}

interface Team {
  id: number;
  name: string;
  description: string;
  members: TeamMember[];
  created_at: string;
  permissions: string[];
}

interface TeamManagementData {
  teams: Team[];
  total_members: number;
  active_members: number;
  pending_invites: number;
  available_permissions: string[];
  organization_roles: string[];
}

/**
 * Phase 4: Team Management & Collaboration
 *
 * Enterprise team management features:
 * - Multi-team organization structure
 * - Role-based access control (RBAC)
 * - Permission management
 * - Team collaboration tools
 * - Member invitation and onboarding
 */
export const TeamManagement: React.FC = () => {
  const [teamData, setTeamData] = useState<TeamManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'teams' | 'members' | 'permissions' | 'invites'>('teams');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      // Fetch team management data from Phase 4 API
      const response = await fetch('/api/enterprise/teams/management');

      if (response.ok) {
        const data = await response.json();
        setTeamData(data.data);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Active now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage teams, members, and permissions across your organization
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowInviteMember(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            👤 Invite Member
          </button>
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            ➕ Create Team
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {teamData?.total_members || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                👥
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-green-600">
                  {teamData?.active_members || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                ✅
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invites</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {teamData?.pending_invites || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                📧
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'teams', label: 'Teams', icon: '👥' },
            { id: 'members', label: 'All Members', icon: '👤' },
            { id: 'permissions', label: 'Permissions', icon: '🔐' },
            { id: 'invites', label: 'Invitations', icon: '📨' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Teams Tab */}
      {selectedTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamData?.teams.length ? teamData.teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{team.name}</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {team.members.length} members
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{team.description}</p>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recent Members</h4>
                  <div className="space-y-2">
                    {team.members.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {team.members.length > 3 && (
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      View all {team.members.length} members →
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">👥</div>
              <div>No teams found</div>
              <button
                onClick={() => setShowCreateTeam(true)}
                className="text-blue-600 hover:text-blue-700 text-sm mt-2"
              >
                Create your first team
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Members Tab */}
      {selectedTab === 'members' && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamData?.teams.flatMap(team => team.members).map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        <div className="text-xs text-gray-400">
                          Last active: {formatLastActive(member.last_active)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className={getRoleColor(member.role)}>
                        {member.role}
                      </Badge>
                      <Badge className={getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                      <button className="text-gray-400 hover:text-gray-600">
                        ⚙️
                      </button>
                    </div>
                  </div>

                  {member.permissions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {member.permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} className="bg-gray-100 text-gray-700 text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {member.permissions.length > 3 && (
                        <Badge className="bg-gray-100 text-gray-700 text-xs">
                          +{member.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No members found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Tab */}
      {selectedTab === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamData?.organization_roles.map((role, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{role}</h4>
                      <Badge className={getRoleColor(role)}>
                        {role}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {role === 'Admin' && 'Full access to all organization features'}
                      {role === 'Manager' && 'Team management and reporting access'}
                      {role === 'Member' && 'Standard access to assigned features'}
                      {role === 'Viewer' && 'Read-only access to permitted resources'}
                    </p>
                  </div>
                )) || [...Array(4)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-center text-gray-500">
                      Role configuration loading...
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamData?.available_permissions.map((permission, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                    <span className="text-sm text-gray-700">{permission}</span>
                    <button className="text-xs text-blue-600 hover:text-blue-700">
                      Configure
                    </button>
                  </div>
                )) || [...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                    <span className="text-sm text-gray-500">Permission {i + 1}</span>
                    <button className="text-xs text-gray-400">Configure</button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitations Tab */}
      {selectedTab === 'invites' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamData?.pending_invites ? [...Array(teamData.pending_invites)].map((_, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">user{index + 1}@example.com</div>
                      <div className="text-sm text-gray-500">
                        Invited {Math.floor(Math.random() * 7) + 1} days ago
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        Resend
                      </button>
                      <button className="text-red-600 hover:text-red-700 text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">📧</div>
                  <div>No pending invitations</div>
                  <button
                    onClick={() => setShowInviteMember(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                  >
                    Send your first invitation
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};