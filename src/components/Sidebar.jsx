import React from 'react';

export default function Sidebar({ onLocateClick, selectedField, fields, onSaveField, onDeleteField }) {
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
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
      padding: '28px 24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      zIndex: 5,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto'
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
          Select custom search regions, lock parcel coordinates, and manage plot registries.
        </p>
      </div>

      {/* GPS Action Button Component */}
      <button
        onClick={onLocateClick}
        style={{
          width: '100%',
          backgroundColor: '#0f172a', /* Sleek Dark Slate Theme */
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
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
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
        🎯 Locate Me via GPS
      </button>

      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

      {/* Dynamic Interactive Plot Form Editor */}
      {selectedField ? (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✏️ Edit Plot Boundaries
          </h3>
          
          <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', block: 'block' }}>Total Land Size:</span>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedField.area}</div>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Crop Registration</label>
              <input 
                name="crop"
                type="text" 
                defaultValue={selectedField.crop !== 'Unassigned' ? selectedField.crop : ''}
                placeholder="e.g. Maize, Coffee, Avocado"
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Field Performance Notes</label>
              <textarea 
                name="notes"
                defaultValue={selectedField.notes}
                placeholder="Record soil treatments or harvest expectations..."
                rows={3}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button 
                type="submit"
                style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)' }}
              >
                Save Details
              </button>
              {selectedField.crop !== 'Unassigned' && (
                <button 
                  type="button"
                  onClick={() => onDeleteField(selectedField.id)}
                  style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '11px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  🗑️
                </button>
              )}
            </div>
          </form>
        </div>
      ) : null}

      {/* Dynamic Land Registry Inventory Cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🗺️ Logged Parcels</span>
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{fields.length}</span>
        </h3>

        {fields.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #e2e8f0', borderRadius: '12px', backgroundColor: '#fafafa' }}>
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>🚜</span>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4' }}>
              No active farm plots mapped out yet. Click points on the map satellite layer to get started.
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
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onSaveField(field)}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{field.crop}</strong>
                  <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>{field.area}</span>
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