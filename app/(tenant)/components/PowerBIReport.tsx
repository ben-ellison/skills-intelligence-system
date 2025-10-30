'use client';

import { useEffect, useState, useRef } from 'react';
import * as pbi from 'powerbi-client';
import * as models from 'powerbi-models';

interface PowerBIReportProps {
  reportId: string;
  workspaceId: string;
  reportName: string;
  pageName?: string | null; // Optional: specific page to navigate to
  templateReportId: string; // Template report ID for embed token lookup
}

export default function PowerBIReport({
  reportId,
  workspaceId,
  reportName,
  pageName,
  templateReportId,
}: PowerBIReportProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const reportRef = useRef<pbi.Embed | null>(null);

  useEffect(() => {
    // Reset state when switching to a different report
    setEmbedUrl('');
    setAccessToken('');
    setReportLoading(true);
    reportRef.current = null;
    fetchEmbedToken();
  }, [reportId, templateReportId, workspaceId]);

  const fetchEmbedToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/powerbi/embed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateReportId: templateReportId,
          // The API will look up the organization's deployed instance
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

  // Navigate to a specific page when pageName changes
  useEffect(() => {
    if (!reportRef.current || !pageName) return;

    const navigateToPage = async () => {
      try {
        const report = reportRef.current as pbi.Report;
        const reportPages = await report.getPages();
        const targetPage = reportPages.find((page: any) =>
          page.name === pageName || page.displayName === pageName
        );

        if (targetPage) {
          await targetPage.setActive();
          console.log('Navigated to page:', pageName);
        } else {
          console.warn('Page not found:', pageName);
        }
      } catch (err) {
        console.error('Error navigating to page:', err);
      }
    };

    navigateToPage();
  }, [pageName]);

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

      // Reset the container to remove any previously embedded reports
      powerbi.reset(embedContainer);

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
          navContentPaneEnabled: false, // Hide the top page navigation bar
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
          // If a specific page was requested, navigate to it
          if (pageName) {
            const reportPages = await report.getPages();
            const targetPage = reportPages.find((page: any) => page.name === pageName || page.displayName === pageName);
            if (targetPage) {
              await targetPage.setActive();
              console.log('Navigated to specified page:', pageName);
            } else {
              console.warn('Specified page not found:', pageName);
            }
          }
        } catch (err) {
          console.error('Error navigating to page:', err);
        }
      });

      report.on('rendered', () => {
        console.log('Report rendered!');
        // Hide loading overlay once report is fully rendered
        setTimeout(() => {
          setReportLoading(false);
        }, 500); // Small delay to ensure smooth transition
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
    <div className="h-full flex flex-col relative">
      {/* PowerBI Report Container */}
      {/* Note: Page navigation tabs are handled at the module level in page.tsx */}
      {/* Each module tab corresponds to a specific PowerBI report page */}
      <div id="powerbi-container" className="flex-1 w-full" />

      {/* Loading Overlay - Covers PowerBI logo during initial load */}
      {reportLoading && (
        <div className="absolute inset-0 bg-[#033c3a] flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#00e5c0] mx-auto"></div>
            <p className="mt-6 text-[#e6ffff] text-lg font-medium">Loading report...</p>
          </div>
        </div>
      )}
    </div>
  );
}
