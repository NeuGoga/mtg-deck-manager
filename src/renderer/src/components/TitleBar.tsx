export default function TitleBar({ theme }: { theme: any }) {
  const isMac = navigator.userAgent.toLowerCase().includes('mac')

  return (
    <div
      style={
        {
          height: '25px',
          width: '100%',
          backgroundColor: theme.panel,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitAppRegion: 'drag',
          userSelect: 'none',
          flexShrink: 0
        } as any
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '15px', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: theme.subText }}>
          MTG Deck Manager
        </span>
      </div>

      {!isMac && (
        <div style={{ display: 'flex', height: '100%', WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => (window as any).api.minimizeWindow()}
            style={{
              width: '45px',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: theme.text,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.element)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            —
          </button>
          <button
            onClick={() => (window as any).api.maximizeWindow()}
            style={{
              width: '45px',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: theme.text,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.element)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ☐
          </button>
          <button
            onClick={() => (window as any).api.closeWindow()}
            style={{
              width: '45px',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: theme.text,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e81123')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
