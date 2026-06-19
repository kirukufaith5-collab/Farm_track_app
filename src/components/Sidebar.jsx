import React, { useState, useEffect } from 'react';

// ── Design tokens ────────────────────────────────────────────────────────
// A working field-ops palette: warm parchment instead of clinical white,
// loam brown for text, sage for the primary action color (echoes crops/land
// rather than a generic SaaS green), clay for delete/danger states.
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
};

// ── Crop icon lookup ────────────────────────────────────────────────────
// Since crop is still free-text (not a fixed category list), this matches
// on keywords found anywhere in what the manager typed, case-insensitive.
// Order matters: more specific terms are checked before generic ones.
// Falls back to a neutral plot icon for anything unrecognized, and a
// dashed-circle for plots that haven't been assigned a crop yet.
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
  { keywords: ['flower', 'rose'], icon: '🌷' },
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
  return match ? match.icon : '🌱'; // generic plant icon for unrecognized crop names
}

export default function Sidebar({
  onLocateClick,
  selectedField,
  fields,
  onSaveField,
  onDeleteField,
  saving,
  dbLoading,
}) {
  // Tracks the crop input live (separate from form submission) purely so the
  // icon preview next to the field can update as the manager types, instead
  // of only showing the icon after saving. Resets whenever a different plot
  // is selected for editing.
  const [cropDraft, setCropDraft] = useState('');

  useEffect(() => {
    if (selectedField) {
      setCropDraft(selectedField.crop !== 'Unassigned' ? selectedField.crop : '');
    }
  }, [selectedField?.id, selectedField]);

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
      width: '380px',
      height: '100vh',
      backgroundColor: tokens.bg,
      borderRight: `1px solid ${tokens.hairline}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 5,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Header strip ───────────────────────────────────────────────
          A subtle horizontal grain texture grounds the header in "soil"
          without being literal or decorative-for-its-own-sake. */}
      <div style={{
        padding: '28px 28px 22px',
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
      }}>
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

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 28px 28px',
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

        {/* ── Plot editor ──────────────────────────────────────────── */}
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: tokens.inkSoft }}>Crop</label>
                <input
                  name="crop"
                  type="text"
                  value={cropDraft}
                  onChange={(e) => setCropDraft(e.target.value)}
                  placeholder="e.g. Maize, Coffee, Avocado"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '7px',
                    border: `1px solid ${tokens.hairline}`,
                    backgroundColor: tokens.bg,
                    fontSize: '13.5px',
                    color: tokens.ink,
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = tokens.sage; }}
                  onBlur={(e) => { e.target.style.borderColor = tokens.hairline; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '600', color: tokens.inkSoft }}>Notes</label>
                <textarea
                  name="notes"
                  defaultValue={selectedField.notes}
                  placeholder="Soil treatments, harvest expectations..."
                  rows={3}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '7px',
                    border: `1px solid ${tokens.hairline}`,
                    backgroundColor: tokens.bg,
                    fontSize: '13.5px',
                    color: tokens.ink,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = tokens.sage; }}
                  onBlur={(e) => { e.target.style.borderColor = tokens.hairline; }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    backgroundColor: saving ? '#9DB59C' : tokens.sage,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px',
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
                      padding: '10px 13px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
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
                  onClick={() => onSaveField(field)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '11px 4px',
                    borderBottom: `1px solid ${tokens.hairline}`,
                    cursor: 'pointer',
                  }}
                >
                  {/* Crop icon badge — gives instant visual recognition of what's
                      planted without reading text, matched from free-text input */}
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
  );
}
