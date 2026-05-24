interface DeckToolbarProps {
  theme: any
  searchQuery: string
  setSearchQuery: (val: string) => void
  sortMethod: string
  setSortMethod: (val: string) => void
  viewMode: string
  setViewMode: (val: string) => void
  groupMethod: string
  setGroupMethod: (val: string) => void
  onImportClick: () => void
}

export default function DeckToolbar({
  theme: t,
  searchQuery,
  setSearchQuery,
  sortMethod,
  setSortMethod,
  viewMode,
  setViewMode,
  groupMethod,
  setGroupMethod,
  onImportClick
}: DeckToolbarProps) {
  return (
    <div
      style={{
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '15px'
      }}
    >
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button
          style={{
            height: '34px',
            padding: '0 16px',
            backgroundColor: '#e67e22',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Card search
        </button>
        <button
          onClick={onImportClick}
          style={{
            height: '34px',
            padding: '0 16px',
            backgroundColor: t.primary,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Import
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: t.subText, fontWeight: 'bold' }}>View as</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="stacks">Stacks (Visual)</option>
            <option value="list">List (Text)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: t.subText, fontWeight: 'bold' }}>Group by</span>
          <select
            value={groupMethod}
            onChange={(e) => setGroupMethod(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="section">Categories (Sections)</option>
            <option value="type">Card Type</option>
            <option value="cmc">Mana Value</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: t.subText, fontWeight: 'bold' }}>Sort by</span>
          <select
            value={sortMethod}
            onChange={(e) => setSortMethod(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="name_az">Name (A-Z)</option>
            <option value="name_za">Name (Z-A)</option>
            <option value="cmc_low">Mana (Low to High)</option>
            <option value="cmc_high">Mana (High to Low)</option>
            <option value="price_low">Price (Low to High)</option>
            <option value="price_high">Price (High to Low)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: t.subText, fontWeight: 'bold' }}>Local filter</span>
        <input
          placeholder="Filter deck (eg: Sol Ring)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            height: '34px',
            padding: '0 12px',
            backgroundColor: t.inputBg,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: '4px',
            width: '220px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  )
}
