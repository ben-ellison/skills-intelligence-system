'use client';

import { useEffect, useState, useRef } from 'react';
import * as pbi from 'powerbi-client';
import * as models from 'powerbi-models';

interface PowerBIReportProps {
  reportId: string;
  workspaceId: string;
  reportName: string;
  pageName?: string | null; // Optional: specific page to navigate to
}

interface ReportPage {
  name: string;
  displayName: string;
  isActive: boolean;
}

export default function PowerBIReport({
  reportId,
  workspaceId,
  reportName,
  pageName,
}: PowerBIReportProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<ReportPage[]>([]);
  const [activePage, setActivePage] = useState<string>('');
  const reportRef = useRef<pbi.Embed | null>(null);

  useEffect(() => {
    fetchEmbedToken();
  }, [reportId, workspaceId]);

  const fetchEmbedToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/powerbi/embed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          // workspaceId is now fetched from organization settings server-side
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get embed token:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to get embed token');
      }

      const data = await response.json();
      console.log('PowerBI Embed Token Response:', data);

      if (!data.embedUrl || !data.accessToken) {
        console.error('Missing embedUrl or accessToken in response:', data);
        throw new Error('Received invalid embed token response - missing embedUrl or accessToken');
      }

      setEmbedUrl(data.embedUrl);
      setAccessToken(data.accessToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!embedUrl || !accessToken) return;
    embedReport();
  }, [embedUrl, accessToken]);

  const embedReport = async () => {
    const embedContainer = document.getElementById('powerbi-container');
    if (!embedContainer) {
      console.error('PowerBI container not found!');
      return;
    }

    console.log('Attempting to embed PowerBI report...');
    console.log('Report ID:', reportId);
    console.log('Embed URL:', embedUrl);

    try {
      // Create PowerBI service instance
      const powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );

      const config: pbi.IEmbedConfiguration = {
        type: 'report',
        tokenType: models.TokenType.Embed,
        accessToken: accessToken,
        embedUrl: embedUrl,
        id: reportId,
        permissions: models.Permissions.Read,
        settings: {
          panes: {
            filters: {
              expanded: false,
              visible: false,
            },
            pageNavigation: {
              visible: false, // Hide the bottom page tabs
            },
          },
          background: models.BackgroundType.Default,
        },
      };

      console.log('Embed config created');

      // Embed the report
      const report = powerbi.embed(embedContainer, config) as pbi.Report;
      reportRef.current = report;
      console.log('Report embedded successfully');

      report.on('loaded', async () => {
        console.log('Report loaded!');

        try {
          // Get all pages from the report
          const reportPages = await report.getPages();
          console.log('Report pages:', reportPages);

          const pageList: ReportPage[] = reportPages.map((page: any) => ({
            name: page.name,
            displayName: page.displayName,
            isActive: page.isActive,
          }));

          setPages(pageList);

          // If a specific page was requested, navigate to it
          if (pageName) {
            const targetPage = reportPages.find((page: any) => page.name === pageName);
            if (targetPage) {
              await targetPage.setActive();
              setActivePage(pageName);
              console.log('Navigated to specified page:', pageName);
            } else {
              console.warn('Specified page not found:', pageName);
              // Fall back to active page
              const active = pageList.find(p => p.isActive);
              if (active) {
                setActivePage(active.name);
              }
            }
          } else {
            // No specific page requested, use the active page
            const active = pageList.find(p => p.isActive);
            if (active) {
              setActivePage(active.name);
            }
          }
        } catch (err) {
          console.error('Error getting pages:', err);
        }
      });

      report.on('error', (event: any) => {
        console.error('PowerBI Report Error:', event.detail);
        setError('PowerBI error: ' + JSON.stringify(event.detail));
      });
    } catch (error) {
      console.error('Error embedding report:', error);
      setError('Failed to embed report: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handlePageChange = async (pageName: string) => {
    if (!reportRef.current) return;

    try {
      const report = reportRef.current as pbi.Report;
      const pages = await report.getPages();
      const targetPage = pages.find((page: any) => page.name === pageName);

      if (targetPage) {
        await targetPage.setActive();
        setActivePage(pageName);
        console.log('Switched to page:', pageName);
      }
    } catch (error) {
      console.error('Error switching page:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading {reportName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error Loading Report
          </h3>
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchEmbedToken}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Navigation Tabs */}
      {pages.length > 1 && (
        <div className="bg-[#e6ffff] border-b border-[#0eafaa]">
          <div className="px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {pages.map((page) => (
                <button
                  key={page.name}
                  onClick={() => handlePageChange(page.name)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activePage === page.name
                      ? 'border-[#00e5c0] text-[#033c3a] bg-white'
                      : 'border-transparent text-[#033c3a]/70 hover:text-[#033c3a] hover:bg-[#00f9e3]/20'
                  }`}
                >
                  {page.displayName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PowerBI Report Container */}
      <div id="powerbi-container" className="flex-1 w-full" />
    </div>
  );
}
