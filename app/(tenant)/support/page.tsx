'use client';

export default function SupportPage() {
  return (
    <div className="h-full w-full flex flex-col">
      <iframe
        src="https://support.aivii.co.uk/tickets-view"
        className="w-full h-full border-0"
        title="AiVII Support"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
