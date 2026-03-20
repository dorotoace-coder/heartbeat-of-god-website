import React from 'react';

// Preview page showing ministry department accounts, conferencing platform, and member chat
// Data is sourced from the mcp_config.json configuration (hard‑coded here for preview purposes).

const previewData = {
  departmentAccounts: {
    "Pastoral leadership": "pastoral@heartbeat.org",
    "Evangelism / Outreach": "outreach@heartbeat.org",
    "Prayer / Intercession": "prayer@heartbeat.org",
    "Teaching / Discipleship": "teaching@heartbeat.org",
    "Media / Music": "media@heartbeat.org",
  },
  conferencingPlatform: {
    name: "Zoom",
    url: "https://zoom.us/heartbeat",
  },
  memberChat: {
    platform: "Discord",
    inviteLink: "https://discord.gg/heartbeat",
  },
};

export default function PreviewPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Ministry Configuration Preview</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Department Accounts</h2>
        <ul className="list-disc pl-6 space-y-2">
          {Object.entries(previewData.departmentAccounts).map(([dept, email]) => (
            <li key={dept}>
              <strong>{dept}:</strong> <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Conferencing Platform</h2>
        <p>
          <strong>{previewData.conferencingPlatform.name}</strong>: <a href={previewData.conferencingPlatform.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{previewData.conferencingPlatform.url}</a>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Member Chat</h2>
        <p>
          <strong>{previewData.memberChat.platform}</strong>: <a href={previewData.memberChat.inviteLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Join Chat</a>
        </p>
      </section>
    </main>
  );
}
