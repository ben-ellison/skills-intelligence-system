'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Settings, List, Eye, EyeOff } from 'lucide-react';

interface GlobalRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_role_id: string | null;
  role_category: string | null;
  role_level: number;
}

interface RoleTreeNode extends GlobalRole {
  children: RoleTreeNode[];
}

interface HierarchyViewProps {
  roles: GlobalRole[];
  onEdit: (role: GlobalRole) => void;
  onDelete: (role: GlobalRole) => void;
  onCreateChild: (parentRole: GlobalRole) => void;
  onManagePermissions: (role: GlobalRole) => void;
  onManageTabPermissions: (role: GlobalRole) => void;
}

export default function HierarchyView({
  roles,
  onEdit,
  onDelete,
  onCreateChild,
  onManagePermissions,
  onManageTabPermissions
}: HierarchyViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure
  const buildTree = (roles: GlobalRole[]): RoleTreeNode[] => {
    const roleMap = new Map<string, RoleTreeNode>();
    const rootNodes: RoleTreeNode[] = [];

    // Create nodes
    roles.forEach(role => {
      roleMap.set(role.id, { ...role, children: [] });
    });

    // Build hierarchy
    roles.forEach(role => {
      const node = roleMap.get(role.id)!;
      if (role.parent_role_id) {
        const parent = roleMap.get(role.parent_role_id);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort children by sort_order
    const sortChildren = (node: RoleTreeNode) => {
      node.children.sort((a, b) => a.sort_order - b.sort_order);
      node.children.forEach(sortChildren);
    };

    rootNodes.forEach(sortChildren);
    return rootNodes.sort((a, b) => a.sort_order - b.sort_order);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: RoleTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indent = level * 32;

    return (
      <div key={node.id}>
        <div
          className="flex items-center py-3 px-4 hover:bg-slate-50 border-b border-slate-100 group"
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          {/* Expand/Collapse */}
          <button
            onClick={() => toggleNode(node.id)}
            className="mr-2 w-6 h-6 flex items-center justify-center"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Role Info */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-sm font-medium text-slate-900">{node.display_name}</span>
              {!node.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Inactive
                </span>
              )}
            </div>

            <span className="text-xs text-slate-500 font-mono min-w-[150px]">{node.name}</span>

            <div className="flex items-center gap-2">
              {node.role_level > 0 && (
                <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                  Level {node.role_level}
                </span>
              )}
              {node.role_category && (
                <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700">
                  {node.role_category}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 flex-1 truncate">
              {node.description || <span className="italic text-slate-400">No description</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCreateChild(node)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Add child role"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onManagePermissions(node)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Manage module permissions"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => onManageTabPermissions(node)}
              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Manage tab permissions"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(node)}
              className="p-1.5 text-[#00e5c0] hover:bg-[#00e5c0]/10 rounded transition-colors"
              title="Edit role"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(node)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete role"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(roles);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="w-6"></div>
          <div className="min-w-[200px]">Role</div>
          <div className="min-w-[150px]">System Name</div>
          <div className="flex gap-2">Tags</div>
          <div className="flex-1">Description</div>
          <div className="w-32 text-right">Actions</div>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-500">
          No roles found. Click "Add Role" to create one.
        </div>
      ) : (
        <div>
          {tree.map(node => renderNode(node))}
        </div>
      )}
    </div>
  );
}
