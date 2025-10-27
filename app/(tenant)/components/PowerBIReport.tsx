'use client';

import { useEffect, useState } from 'react';

interface PowerBIReportProps {
  reportId: string;
  workspaceId: string;
  reportName: string;
}

export default function PowerBIReport({
  reportId,
  workspaceId,
  reportName,
}: PowerBIReportProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          workspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get embed token');
      }

      const data = await response.json();
      console.log('PowerBI Embed Token Response:', data);
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

    // Check if PowerBI library is already loaded
    // @ts-ignore
    if (window.powerbi) {
      embedReport();
      return;
    }

    // Load PowerBI JavaScript library from Microsoft CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.powerbi.com/lib/powerbi.min.js';
    script.async = false; // Load synchronously to ensure it's ready
    script.type = 'text/javascript';

    script.onload = () => {
      console.log('PowerBI script loaded');
      // Wait for window.powerbi to be available
      const checkPowerBI = setInterval(() => {
        // @ts-ignore
        if (window.powerbi && window.powerbi.models) {
          clearInterval(checkPowerBI);
          embedReport();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkPowerBI);
        // @ts-ignore
        if (!window.powerbi || !window.powerbi.models) {
          setError('PowerBI library failed to load. Please refresh the page.');
        }
      }, 5000);
    };

    script.onerror = () => {
      console.error('Failed to load PowerBI script');
      setError('Failed to load PowerBI library. Please check your internet connection.');
    };

    document.head.appendChild(script);

    return () => {
      // Only remove if it exists
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [embedUrl, accessToken]);

  const embedReport = () => {
    // @ts-ignore - PowerBI library loaded via CDN
    const powerbi = window.powerbi;

    console.log('Attempting to embed PowerBI report...');
    console.log('PowerBI library loaded:', !!powerbi);
    console.log('PowerBI models available:', !!powerbi?.models);

    if (!powerbi || !powerbi.models) {
      console.error('PowerBI library not fully loaded');
      setError('PowerBI library not loaded. Please refresh the page.');
      return;
    }

    const embedContainer = document.getElementById('powerbi-container');
    if (!embedContainer) {
      console.error('PowerBI container not found!');
      return;
    }

    console.log('Embed container found:', embedContainer);

    const config = {
      type: 'report',
      tokenType: powerbi.models.TokenType.Embed,
      accessToken: accessToken,
      embedUrl: embedUrl,
      id: reportId,
      permissions: powerbi.models.Permissions.Read,
      settings: {
        panes: {
          filters: {
            expanded: false,
            visible: true,
          },
          pageNavigation: {
            visible: true,
          },
        },
        background: powerbi.models.BackgroundType.Default,
      },
    };

    console.log('Embed config:', config);

    try {
      // Embed the report
      const report = powerbi.embed(embedContainer, config);
      console.log('Report embedded successfully:', report);

      report.on('loaded', () => {
        console.log('Report loaded!');
      });

      report.on('error', (event: any) => {
        console.error('PowerBI Report Error:', event.detail);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
    <div id="powerbi-container" className="w-full h-full" />
  );
}
