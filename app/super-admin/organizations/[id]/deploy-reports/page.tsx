'use client';

/**
 * Bulk PowerBI Report Deployment Interface
 *
 * Features:
 * 1. Auto-detect matching reports based on provider configuration
 * 2. Manual fetch from PowerBI workspace
 * 3. CSV bulk import
 * 4. Preview and deploy in bulk
 */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface MatchingReport {
  id: string;
  name: string;
  category: string;
  providerCode?: string;
  matchType: string;
  matchScore: number;
  isDeployed: boolean;
  lmsCode?: string;
  englishMathsCode?: string;
  crmCode?: string;
  hrCode?: string;
  roleName?: string;
  version?: string;
}

interface DeploymentStats {
  totalMatching: number;
  deployed: number;
  pending: number;
}

const matchTypeColors = {
  exact_match: 'bg-green-100 text-green-800',
  core_match: 'bg-blue-100 text-blue-800',
  partial_match: 'bg-yellow-100 text-yellow-800',
  lms_only: 'bg-orange-100 text-orange-800',
  universal: 'bg-purple-100 text-purple-800',
};

const matchTypeLabels = {
  exact_match: 'Exact Match',
  core_match: 'Core Match',
  partial_match: 'Partial',
  lms_only: 'LMS Only',
  universal: 'Universal',
};

export default function DeployReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [reports, setReports] = useState<MatchingReport[]>([]);
  const [stats, setStats] = useState<DeploymentStats | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load matching reports
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/super-admin/organizations/${organizationId}/deploy-reports`
      );

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [organizationId]);

  // Toggle report selection
  const toggleReport = (reportId: string) => {
    const newSelection = new Set(selectedReports);
    if (newSelection.has(reportId)) {
      newSelection.delete(reportId);
    } else {
      newSelection.add(reportId);
    }
    setSelectedReports(newSelection);
  };

  // Select all undeployed reports
  const selectAllUndeployed = () => {
    const undeployed = reports
      .filter((r) => !r.isDeployed)
      .map((r) => r.id);
    setSelectedReports(new Set(undeployed));
  };

  // Deploy selected reports
  const deployReports = async () => {
    if (selectedReports.size === 0) {
      setError('Please select at least one report to deploy');
      return;
    }

    try {
      setDeploying(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(
        `/api/super-admin/organizations/${organizationId}/deploy-reports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'auto',
            reportIds: Array.from(selectedReports),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deploy reports');
      }

      const data = await response.json();
      setSuccess(`Successfully deployed ${data.deployed} report(s)`);
      setSelectedReports(new Set());

      // Reload reports to show updated status
      await loadReports();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  // Export matching reports to CSV
  const exportToCSV = () => {
    const csv = [
      ['Template ID', 'Report Name', 'Provider Code', 'Category', 'Match Type', 'Match Score', 'Deployed'].join(','),
      ...reports.map((r) =>
        [
          r.id,
          `"${r.name}"`,
          r.providerCode || '',
          r.category,
          r.matchType,
          r.matchScore,
          r.isDeployed ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matching-reports-${organizationId}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          ← Back
        </Button>
        <h1 className="text-3xl font-bold">Deploy PowerBI Reports</h1>
        <p className="text-muted-foreground mt-2">
          Bulk deploy reports matching this organization's provider configuration
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Matching Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMatching}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deployed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.deployed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto">Auto-Detect</TabsTrigger>
          <TabsTrigger value="manual">Manual Fetch</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
        </TabsList>

        {/* Auto-Detect Tab */}
        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Matching Reports</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reports that match this organization's provider configuration
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadReports}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={selectAllUndeployed}
                    disabled={reports.filter((r) => !r.isDeployed).length === 0}
                  >
                    Select All Undeployed
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No matching reports found for this organization
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Report Name</TableHead>
                          <TableHead>Provider Code</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Match Type</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedReports.has(report.id)}
                                onChange={() => toggleReport(report.id)}
                                disabled={report.isDeployed}
                                className="w-4 h-4"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {report.name}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {report.providerCode || 'Universal'}
                              </code>
                            </TableCell>
                            <TableCell>{report.category}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  matchTypeColors[report.matchType as keyof typeof matchTypeColors]
                                }
                                variant="secondary"
                              >
                                {matchTypeLabels[report.matchType as keyof typeof matchTypeLabels]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{report.matchScore}</span>
                            </TableCell>
                            <TableCell>
                              {report.isDeployed ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Deployed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Deploy Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedReports.size} report(s) selected
                    </p>
                    <Button
                      onClick={deployReports}
                      disabled={selectedReports.size === 0 || deploying}
                    >
                      {deploying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>Deploy Selected Reports</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Fetch Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual Fetch from PowerBI</CardTitle>
              <p className="text-sm text-muted-foreground">
                Fetch reports from an organization's PowerBI workspace
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                Manual fetch feature coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Import Tab */}
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle>CSV Bulk Import</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with report mappings
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                CSV import feature coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
