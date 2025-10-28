'use client';

import { useEffect, useState } from 'react';
import * as pbi from 'powerbi-client';
import * as models from 'powerbi-models';

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
    embedReport();
  }, [embedUrl, accessToken]);

  const embedReport = () => {
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
              visible: true,
            },
            pageNavigation: {
              visible: false,
            },
          },
          background: models.BackgroundType.Default,
        },
      };

      console.log('Embed config created');

      // Embed the report
      const report = powerbi.embed(embedContainer, config);
      console.log('Report embedded successfully');

      report.on('loaded', () => {
        console.log('Report loaded!');
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
