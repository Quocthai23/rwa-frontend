type RowChevron = {
  label: string;
  value: string;
};

type RowToggle = {
  label: string;
  description?: string;
  enabled: boolean;
};

const popupRows: RowChevron[] = [{ label: 'Event Popup', value: 'Always' }];

const emailRows: RowToggle[] = [
  {
    label: 'Promotional Email',
    description: 'Get the latest news on member benefits and ongoing activities.',
    enabled: true,
  },
];

const pushRows: RowChevron[] = [{ label: 'System Notification', value: 'Off' }];

const messageCenterRows: RowToggle[] = [
  { label: 'Promotions', enabled: true },
  { label: 'Copy Trading', enabled: true },
  { label: 'Social', enabled: true },
  { label: 'Promotions', enabled: true },
];

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        enabled ? 'bg-[#0B63F6]' : 'bg-[#CFD3DC]',
      ].join(' ')}
      aria-hidden="true"
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="px-4 py-3 text-[22px] leading-none font-semibold text-[#222]">{title}</h2>;
}

function ChevronRow({ row }: { row: RowChevron }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[15px] font-medium text-[#333]">{row.label}</span>
      <div className="flex items-center gap-2 text-[15px] text-[#8D93A1]">
        <span>{row.value}</span>
        <span className="text-[18px] leading-none">&gt;</span>
      </div>
    </div>
  );
}

function ToggleRow({ row }: { row: RowToggle }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-medium text-[#333]">{row.label}</span>
        <Toggle enabled={row.enabled} />
      </div>
      {row.description ? (
        <p className="mt-1 text-[13px] leading-5 text-[#9AA0AA]">{row.description}</p>
      ) : null}
    </div>
  );
}

export default function NotificationSettingsPage() {
  return (
    <main className="bg-background min-h-screen w-full py-4">
      <div className="bg-background mx-auto w-full max-w-[420px] rounded-none text-[#111]">
        <header className="relative flex items-center justify-center px-4 pt-2 pb-4">
          <button
            type="button"
            className="absolute top-2 left-4 text-2xl leading-none font-normal text-[#4A4F59]"
            aria-label="Back"
          >
            &lt;
          </button>
          <h1 className="text-[22px] font-semibold text-[#1A1D24]">Settings</h1>
        </header>

        <section className="bg-white">
          <SectionHeader title="Popup" />
          {popupRows.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <ChevronRow row={row} />
            </div>
          ))}
        </section>

        <section className="mt-3 bg-white">
          <SectionHeader title="Email" />
          {emailRows.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <ToggleRow row={row} />
            </div>
          ))}
        </section>

        <section className="mt-3 bg-white">
          <SectionHeader title="App Push" />
          {pushRows.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <ChevronRow row={row} />
            </div>
          ))}
        </section>

        <section className="mt-3 bg-white">
          <SectionHeader title="Message Center" />
          {messageCenterRows.map((row, index) => (
            <div key={`${row.label}-${index}`}>
              <ToggleRow row={row} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
