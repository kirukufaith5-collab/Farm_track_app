import React, { useState, useEffect } from 'react';

// ── Design tokens ────────────────────────────────────────────────────────
const tokens = {
  bg: '#FAF7F2',
  bgCard: '#FFFFFF',
  ink: '#2B2420',
  inkSoft: '#8A8175',
  hairline: '#E6E0D6',
  sage: '#5B7B5A',
  sageSoft: '#EEF2EC',
  clay: '#B5654A',
  claySoft: '#FBEEEA',
  amber: '#C18A3D',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  errorText: '#B91C1C',
};

// ── Crop icon lookup ────────────────────────────────────────────────────
const CROP_ICON_MAP = [
  { keywords: ['maize', 'corn'], icon: '🌽' },
  { keywords: ['coffee'], icon: '☕' },
  { keywords: ['tea'], icon: '🍃' },
  { keywords: ['avocado'], icon: '🥑' },
  { keywords: ['banana'], icon: '🍌' },
  { keywords: ['bean'], icon: '🫘' },
  { keywords: ['rice'], icon: '🌾' },
  { keywords: ['wheat', 'barley'], icon: '🌾' },
  { keywords: ['potato'], icon: '🥔' },
  { keywords: ['tomato'], icon: '🍅' },
  { keywords: ['mango'], icon: '🥭' },
  { keywords: ['cattle', 'livestock', 'dairy', 'cow'], icon: '🐄' },
  { keywords: ['poultry', 'chicken'], icon: '🐔' },
  { keywords: ['fallow', 'storage', 'shed', 'building'], icon: '🏚️' },
  { keywords: ['orchard', 'fruit'], icon: '🌳' },
];

function getCropIcon(crop) {
  if (!crop || crop === 'Unassigned') return '◌';
  const lower = crop.toLowerCase();
  const match = CROP_ICON_MAP.find(({ keywords }) =>
    keywords.some((kw) => lower.includes(kw))
  );
  return match ? match.icon : '🌱';
}

// ── Validation helpers ───────────────────────────────────────────────────
function validateForm({ farmerCode, ownerName, crop }) {
  const errors = {};

  // Farmer Code: required, any characters allowed, 2–30 chars
  if (!farmerCode || farmerCode.trim() === '') {
    errors.farmerCode = 'Farmer code is required.';
  } else if (farmerCode.trim().length < 2) {
    errors.farmerCode = 'Farmer code must be at least 2 characters.';
  } else if (farmerCode.trim().length > 30) {
    errors.farmerCode = 'Farmer code must be 30 characters or fewer.';
  }

  // Owner Name: required, letters + spaces + hyphens, 2–60 chars
  if (!ownerName || ownerName.trim() === '') {
    errors.ownerName = 'Plot owner name is required.';
  } else if (ownerName.trim().length < 2) {
    errors.ownerName = 'Name must be at least 2 characters.';
  } else if (ownerName.trim().length > 60) {
    errors.ownerName = 'Name must be 60 characters or fewer.';
  } else if (!/^[A-Za-z\s\-'.]+$/.test(ownerName.trim())) {
    errors.ownerName = 'Name may only contain letters, spaces, hyphens, or apostrophes.';
  }

  // Crop: optional, but if provided must be reasonable
  if (crop && crop.trim().length > 50) {
    errors.crop = 'Crop name must be 50 characters or fewer.';
  }

  return errors;
}

// ── Reusable field component ─────────────────────────────────────────────
function FormField({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{
        fontSize: '11.5px',
        fontWeight: '600',
        color: tokens.inkSoft,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        {label}
        {required && (
          <span style={{ color: tokens.clay, fontSize: '11px' }} title="Required">*</span>
        )}
      </label>
      {children}
      {error && (
        <div style={{
          fontSize: '11px',
          color: tokens.errorText,
          backgroundColor: tokens.errorBg,
          border: `1px solid ${tokens.errorBorder}`,
          borderRadius: '5px',
          padding: '4px 8px',
          lineHeight: '1.4',
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  onLocateClick,
  selectedField,
  fields,
  onSaveField,
  onDeleteField,
  onFlyToField,
  saving,
  dbLoading,
  isMobileOpen,
  onMobileClose,
}) {
  const [cropDraft, setCropDraft] = useState('');
  const [farmerCode, setFarmerCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [savedToast, setSavedToast] = useState(false);

  // Reset form state whenever a new field is selected
  useEffect(() => {
    if (selectedField) {
      setCropDraft(selectedField.crop !== 'Unassigned' ? selectedField.crop : '');
      setFarmerCode(selectedField.farmerCode || '');
      setOwnerName(selectedField.ownerName || '');
      setErrors({});
      setTouched({});
    }
  }, [selectedField?.id, selectedField]);

  // Live validation on blur
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateForm({ farmerCode, ownerName, crop: cropDraft });
    setErrors(errs);
  };

  const getInputStyle = (fieldName) => ({
    padding: '10px 12px',
    borderRadius: '7px',
    border: `1px solid ${touched[fieldName] && errors[fieldName] ? tokens.errorBorder : tokens.hairline}`,
    backgroundColor: touched[fieldName] && errors[fieldName] ? tokens.errorBg : tokens.bg,
    fontSize: '13.5px',
    color: tokens.ink,
    outline: 'none',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    width: '100%',
    boxSizing: 'border-box',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mark all fields touched on submit attempt
    setTouched({ farmerCode: true, ownerName: true, crop: true });
    const formData = new FormData(e.target);
    const cropVal = formData.get('crop') || '';
    const errs = validateForm({ farmerCode, ownerName, crop: cropVal });
    setErrors(errs);

    if (Object.keys(errs).length > 0) return; // Stop if errors exist

    onSaveField({
      ...selectedField,
      farmerCode: farmerCode.trim(),
      ownerName: ownerName.trim(),
      crop: cropVal.trim() || 'Unassigned',
      notes: formData.get('notes') || '',
    });

    // Show confirmation toast
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <>
      {/* ── Mobile overlay backdrop ─────────────────────────────────── */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 4,
            display: 'none', // shown via media query in <style> below
          }}
          className="sidebar-backdrop"
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-root {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100dvh !important;
            width: 88vw !important;
            max-width: 360px !important;
            transform: translateX(-100%);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
            z-index: 50 !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.18);
          }
          .sidebar-root.open {
            transform: translateX(0);
          }
          .sidebar-backdrop {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .sidebar-root {
            position: relative !important;
            transform: none !important;
            width: 380px !important;
            box-shadow: none !important;
          }
        }
        input[type="text"]:focus, textarea:focus {
          box-shadow: 0 0 0 2px rgba(91,123,90,0.2);
        }
      `}</style>

      <div
        className={`sidebar-root${isMobileOpen ? ' open' : ''}`}
        style={{
          width: '380px',
          height: '100vh',
          backgroundColor: tokens.bg,
          borderRight: `1px solid ${tokens.hairline}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >

        {/* ── Saved confirmation toast ────────────────────────────────── */}
        {savedToast && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: '#ECFDF5',
            border: '1.5px solid #10B981',
            color: '#065F46',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            whiteSpace: 'nowrap',
            animation: 'sidebarToastIn 0.2s ease',
          }}>
            ✅ Plot saved to database!
            <style>{`@keyframes sidebarToastIn { from { opacity:0; transform:translateX(-50%) translateY(-4px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
          </div>
        )}

        {/* ── Header strip ────────────────────────────────────────────── */}
        <div style={{
          padding: '22px 24px 18px',
          background: `
            repeating-linear-gradient(
              0deg,
              rgba(91,123,90,0.035) 0px,
              rgba(91,123,90,0.035) 1px,
              transparent 1px,
              transparent 4px
            ),
            linear-gradient(180deg, #F3EEE3 0%, ${tokens.bg} 100%)
          `,
          borderBottom: `1px solid ${tokens.hairline}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '21px',
                fontWeight: '700',
                color: tokens.ink,
                letterSpacing: '-0.3px',
              }}>
                FarmTrack
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: tokens.sage,
                backgroundColor: tokens.sageSoft,
                padding: '2px 7px',
                borderRadius: '4px',
              }}>
                Field Ops
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: tokens.inkSoft, lineHeight: '1.5' }}>
              Plot parcels, register crops, manage land records.
            </p>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="sidebar-close-btn"
            aria-label="Close sidebar"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: tokens.inkSoft,
              padding: '2px 4px',
              borderRadius: '5px',
            }}
          />
          <style>{`
            @media (max-width: 768px) {
              .sidebar-close-btn { display: flex !important; align-items: center; justify-content: center; }
              .sidebar-close-btn::after { content: '✕'; }
            }
          `}</style>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>

          {/* GPS button */}
          <button
            onClick={onLocateClick}
            style={{
              width: '100%',
              backgroundColor: tokens.ink,
              color: '#FFFFFF',
              border: 'none',
              padding: '13px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '600',
              letterSpacing: '0.01em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <span aria-hidden="true">⌖</span> Locate Me via GPS
          </button>

          {/* ── Plot editor ─────────────────────────────────────────── */}
          {selectedField && (
            <div style={{
              backgroundColor: tokens.bgCard,
              border: `1px solid ${tokens.hairline}`,
              borderRadius: '10px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* Editor header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    backgroundColor: tokens.sageSoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    flexShrink: 0,
                  }}>
                    {getCropIcon(cropDraft)}
                  </span>
                  <h3 style={{
                    margin: 0,
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: tokens.inkSoft,
                  }}>
                    {selectedField.id ? 'Edit Plot' : 'Register Plot'}
                  </h3>
                </div>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: tokens.sage,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {selectedField.area}
                </span>
              </div>

              {/* Required field note */}
              <p style={{ margin: 0, fontSize: '11px', color: tokens.inkSoft }}>
                Fields marked <span style={{ color: tokens.clay }}>*</span> are required.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* ── Farmer Code ────────────────────────────────────── */}
                <FormField label="Farmer Code" required error={touched.farmerCode && errors.farmerCode}>
                  <input
                    name="farmerCode"
                    type="text"
                    value={farmerCode}
                    onChange={(e) => setFarmerCode(e.target.value)}
                    onBlur={() => handleBlur('farmerCode')}
                    placeholder="e.g. KE-2024-001 or FC/001/2024"
                    maxLength={30}
                    autoComplete="off"
                    style={getInputStyle('farmerCode')}
                  />
                </FormField>

                {/* ── Plot Owner Name ────────────────────────────────── */}
                <FormField label="Plot Owner Name" required error={touched.ownerName && errors.ownerName}>
                  <input
                    name="ownerName"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    onBlur={() => handleBlur('ownerName')}
                    placeholder="e.g. Jane Wambui Mwangi"
                    maxLength={60}
                    autoComplete="name"
                    style={getInputStyle('ownerName')}
                    onFocus={(e) => {
                      if (!errors.ownerName) e.target.style.borderColor = tokens.sage;
                    }}
                  />
                  {ownerName && !errors.ownerName && touched.ownerName && (
                    <span style={{ fontSize: '11px', color: tokens.sage }}>✓ Valid name</span>
                  )}
                </FormField>

                {/* ── Crop ──────────────────────────────────────────── */}
                <FormField label="Crop" error={touched.crop && errors.crop}>
                  <input
                    name="crop"
                    type="text"
                    value={cropDraft}
                    onChange={(e) => setCropDraft(e.target.value)}
                    onBlur={() => handleBlur('crop')}
                    placeholder="e.g. Maize, Coffee, Avocado"
                    maxLength={50}
                    style={getInputStyle('crop')}
                    onFocus={(e) => {
                      if (!errors.crop) e.target.style.borderColor = tokens.sage;
                    }}
                  />
                </FormField>

                {/* ── Notes ──────────────────────────────────────────── */}
                <FormField label="Notes">
                  <textarea
                    name="notes"
                    defaultValue={selectedField.notes}
                    placeholder="Soil treatments, harvest expectations..."
                    rows={3}
                    maxLength={500}
                    style={{
                      ...getInputStyle('notes'),
                      resize: 'vertical',
                      minHeight: '76px',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = tokens.sage; }}
                    onBlur={(e) => { e.target.style.borderColor = tokens.hairline; }}
                  />
                </FormField>

                {/* ── Action buttons ─────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      backgroundColor: saving ? '#9DB59C' : tokens.sage,
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '11px 10px',
                      borderRadius: '7px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save to Database'}
                  </button>

                  {selectedField.id && (
                    <button
                      type="button"
                      onClick={() => onDeleteField(selectedField.id)}
                      title="Delete this plot"
                      style={{
                        backgroundColor: tokens.claySoft,
                        color: tokens.clay,
                        border: 'none',
                        padding: '11px 13px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ── Logged parcels — ledger style ───────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{
                margin: 0,
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: tokens.inkSoft,
              }}>
                Logged Parcels
              </h3>
              <span style={{ fontSize: '12px', color: tokens.inkSoft, fontVariantNumeric: 'tabular-nums' }}>
                {dbLoading ? '···' : `${fields.length} total`}
              </span>
            </div>

            {dbLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    height: '50px',
                    borderBottom: `1px solid ${tokens.hairline}`,
                    background: `linear-gradient(90deg, transparent, ${tokens.hairline}55, transparent)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }} />
                ))}
                <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              </div>
            ) : fields.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                border: `1.5px dashed ${tokens.hairline}`,
                borderRadius: '10px',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '12.5px', color: tokens.inkSoft, lineHeight: '1.5' }}>
                  No plots logged yet.<br />Click the map to start drawing a boundary.
                </p>
              </div>
            ) : (
              <div>
                {fields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => onFlyToField(field)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 4px',
                      borderBottom: `1px solid ${tokens.hairline}`,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      backgroundColor: field.crop === 'Unassigned' ? tokens.bg : tokens.sageSoft,
                      border: field.crop === 'Unassigned' ? `1px dashed ${tokens.hairline}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      flexShrink: 0,
                    }}>
                      {getCropIcon(field.crop)}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: tokens.ink }}>
                        {field.crop}
                      </div>
                      {/* Owner name */}
                      {field.ownerName && (
                        <div style={{
                          fontSize: '11px',
                          color: tokens.sage,
                          fontWeight: '500',
                          marginTop: '1px',
                        }}>
                          👤 {field.ownerName}
                        </div>
                      )}
                      {/* Farmer code — always shown if present */}
                      {field.farmerCode && (
                        <div style={{
                          fontSize: '11px',
                          color: tokens.inkSoft,
                          fontFamily: 'monospace',
                          marginTop: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: tokens.amber,
                            backgroundColor: '#FEF3C7',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontFamily: 'sans-serif',
                          }}>
                            ID
                          </span>
                          {field.farmerCode}
                        </div>
                      )}
                      {field.notes && (
                        <div style={{
                          fontSize: '11.5px',
                          color: tokens.inkSoft,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '1px',
                        }}>
                          {field.notes}
                        </div>
                      )}
                    </div>

                    <div style={{
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: tokens.inkSoft,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
                      {field.area}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      title="Delete this field"
                      style={{
                        backgroundColor: 'transparent',
                        color: tokens.inkSoft,
                        border: 'none',
                        padding: '4px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        lineHeight: 1,
                        flexShrink: 0,
                        transition: 'color 0.15s ease, background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.color = tokens.clay;
                        e.currentTarget.style.backgroundColor = tokens.claySoft;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.color = tokens.inkSoft;
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
