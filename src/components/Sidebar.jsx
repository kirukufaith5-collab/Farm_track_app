import React from 'react';

export default function Sidebar({
  onLocateClick,
  selectedField,
  fields,
  onSaveField,
  onDeleteField,
  saving,       // true while a Firestore write is in progress
  dbLoading,    // true while initial fields are being fetched
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSaveField({
      ...selectedField,
      crop: formData.get('crop') || 'Unassigned',
      notes: formData.get('notes') || '',
    });
  };

  return (
    <div style={{
      width: '360px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      padding: '28px 24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      zIndex: 5,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto',
    }}>

      {/* Branding Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '24px' }}>🌱</span>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
            FarmTrack
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
          Plot farm parcels, register crops, and manage land registries across your team.
        </p>
      </div>

      {/* GPS Button */}
      <button
        onClick={onLocateClick}
        style={{
          width: '100%',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: 'none',
          padding: '14px 16px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#1e293b';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#0f172a';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        📍 Locate Me via GPS
      </button>

      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

      {/* Plot Editor — shown after a polygon is drawn */}
      {selectedField && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✏️ {selectedField.id ? 'Edit Plot Details' : 'Register New Plot'}
          </h3>

          {/* Area display */}
          <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Total Land Size</span>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
              {selectedField.area}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Crop Registration</label>
              <input
                name="crop"
                type="text"
                defaultValue={selectedField.crop !== 'Unassigned' ? selectedField.crop : ''}
                placeholder="e.g. Maize, Coffee, Avocado"
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Field Notes</label>
              <textarea
                name="notes"
                defaultValue={selectedField.notes}
                placeholder="Soil treatments, harvest expectations..."
                rows={3}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? '#6ee7b7' : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '11px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.2)',
                  transition: 'background-color 0.2s',
                }}
              >
                {saving ? 'Saving...' : 'Save to Database'}
              </button>

              {/* Only show delete for existing (already-saved) fields */}
              {selectedField.id && (
                <button
                  type="button"
                  onClick={() => onDeleteField(selectedField.id)}
                  style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '11px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  🗑
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Logged Parcels List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Logged Parcels</span>
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
            {dbLoading ? '...' : fields.length}
          </span>
        </h3>

        {/* Firestore loading skeleton */}
        {dbLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: '64px', borderRadius: '10px', backgroundColor: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #e2e8f0', borderRadius: '12px', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>🚜</span>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4' }}>
              No plots saved yet. Click on the map to start drawing a boundary.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fields.map((field) => (
              <div
                key={field.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => onSaveField(field)}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{field.crop}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                      {field.area}
                    </span>
                    {/* Quick-delete button on the card itself.
                        e.stopPropagation() is essential here — without it, the click
                        would bubble up to the parent card's onClick and open the edit
                        form instead of (or as well as) deleting. */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      title="Delete this field"
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: 'none',
                        padding: '4px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {field.notes && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {field.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
