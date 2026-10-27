import { useState, useMemo } from 'react';
import { tokens as t } from '../theme.js';
import { getAreaHa, formatHa, exportCSV, exportGeoJSON } from '../utils.js';

// ── Styles ───────────────────────────────────────────────────────────────
const CSS = `
.ft-side{position:relative;width:380px;flex-shrink:0;height:100vh;background:${t.bg};border-right:1px solid ${t.hairline};display:flex;flex-direction:column;z-index:5;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:${t.ink}}
.ft-head{padding:22px 24px 18px;border-bottom:1px solid ${t.hairline};display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(180deg,#F3EEE3 0%,${t.bg} 100%)}
.ft-body{flex:1;overflow-y:auto;padding:20px 24px 24px;display:flex;flex-direction:column;gap:20px}
.ft-btn{border:none;border-radius:7px;padding:11px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
.ft-btn:hover:not(:disabled){opacity:.88}
.ft-btn:disabled{cursor:not-allowed;opacity:.65}
.ft-link{background:none;border:none;padding:0;font:inherit;font-size:12px;color:${t.sage};font-weight:600;cursor:pointer}
.ft-input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:7px;border:1px solid ${t.hairline};background:${t.bg};font-size:13.5px;font-family:inherit;color:${t.ink}}
.ft-input.bad{border-color:${t.errorBorder};background:${t.errorBg}}
.ft-btn:focus-visible,.ft-input:focus-visible,.ft-row:focus-visible,.ft-link:focus-visible,.ft-x:focus-visible{outline:2px solid ${t.sage};outline-offset:2px}
.ft-row{display:flex;align-items:center;gap:10px;padding:11px 6px;border-bottom:1px solid ${t.hairline};cursor:pointer;border-radius:6px}
.ft-row:hover,.ft-row.on{background:${t.sageSoft}}
.ft-x{background:transparent;border:none;color:${t.inkSoft};padding:4px 6px;border-radius:5px;cursor:pointer;font-size:13px;line-height:1}
.ft-x:hover{color:${t.clay};background:${t.claySoft}}
.ft-close,.ft-backdrop{display:none}
@media (max-width:768px){
.ft-side{position:fixed;top:0;left:0;height:100dvh;width:88vw;max-width:360px;transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);z-index:50;box-shadow:4px 0 24px rgba(0,0,0,.18)}
.ft-side.open{transform:none}
.ft-close{display:block;background:transparent;border:none;font-size:18px;color:${t.inkSoft};cursor:pointer;padding:2px 6px}
.ft-backdrop{display:block;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:49}
}
@media (prefers-reduced-motion:reduce){.ft-side{transition:none}}
`;

const sectionTitle = {
  margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: t.inkSoft,
};

// ── Crop icons ───────────────────────────────────────────────────────────
const CROP_ICONS = [
  [['maize', 'corn'], '🌽'], [['coffee'], '☕'], [['tea'], '🍃'], [['avocado'], '🥑'],
  [['banana'], '🍌'], [['bean'], '🫘'], [['rice', 'wheat', 'barley'], '🌾'],
  [['potato'], '🥔'], [['tomato'], '🍅'], [['mango'], '🥭'],
  [['cattle', 'livestock', 'dairy', 'cow'], '🐄'], [['poultry', 'chicken'], '🐔'],
  [['fallow', 'storage', 'shed', 'building'], '🏚️'], [['orchard', 'fruit'], '🌳'],
];

function getCropIcon(crop) {
  if (!crop || crop === 'Unassigned') return '◌';
  const lower = crop.toLowerCase();
  const hit = CROP_ICONS.find(([words]) => words.some((w) => lower.includes(w)));
  return hit ? hit[1] : '🌱';
}

// ── Validation ───────────────────────────────────────────────────────────
function validateForm({ farmerCode, ownerName, crop }) {
  const errors = {};
  const code = farmerCode.trim();
  const name = ownerName.trim();

  if (!code) errors.farmerCode = 'Farmer code is required.';
  else if (code.length < 2) errors.farmerCode = 'Farmer code must be at least 2 characters.';

  if (!name) errors.ownerName = 'Plot owner name is required.';
  else if (name.length < 2) errors.ownerName = 'Name must be at least 2 characters.';
  else if (!/^[\p{L}\s'’.-]+$/u.test(name)) {
    errors.ownerName = 'Name may only contain letters, spaces, hyphens, or apostrophes.';
  }

  if (crop.trim().length > 50) errors.crop = 'Crop name must be 50 characters or fewer.';
  return errors;
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: t.inkSoft }}>
        <span>
          {label}
          {required && <span style={{ color: t.clay }} title="Required"> *</span>}
        </span>
        {children}
      </label>
      {error && (
        <div role="alert" style={{
          fontSize: '11px', color: t.errorText, backgroundColor: t.errorBg,
          border: `1px solid ${t.errorBorder}`, borderRadius: '5px', padding: '4px 8px',
        }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// ── Plot editor ──────────────────────────────────────────────────────────
// App gives this a `key` per plot, so its state resets by remounting;
// no effect is needed to copy props into state.
function PlotEditor({ field, saving, onSave, onCancel, onDelete }) {
  const [values, setValues] = useState(() => ({
    farmerCode: field.farmerCode || '',
    ownerName: field.ownerName || '',
    crop: field.crop && field.crop !== 'Unassigned' ? field.crop : '',
    notes: field.notes || '',
  }));
  const [touched, setTouched] = useState({});
  const errors = validateForm(values);

  const bind = (name) => {
    const bad = Boolean(touched[name] && errors[name]);
    return {
      name,
      value: values[name],
      onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
      onBlur: () => setTouched((x) => ({ ...x, [name]: true })),
      className: `ft-input${bad ? ' bad' : ''}`,
      'aria-invalid': bad,
    };
  };
  const shown = (name) => (touched[name] ? errors[name] : undefined);

  const submit = (e) => {
    e.preventDefault();
    setTouched({ farmerCode: true, ownerName: true, crop: true });
    if (Object.keys(errors).length) return;
    onSave({
      farmerCode: values.farmerCode.trim(),
      ownerName: values.ownerName.trim(),
      crop: values.crop.trim() || 'Unassigned',
      notes: values.notes.trim(),
    });
  };

  return (
    <div style={{
      backgroundColor: t.bgCard, border: `1px solid ${t.hairline}`, borderRadius: '10px',
      padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '26px', height: '26px', borderRadius: '7px', backgroundColor: t.sageSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
          }}>
            {getCropIcon(values.crop)}
          </span>
          <h2 style={sectionTitle}>{field.id ? 'Edit plot' : 'Register plot'}</h2>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: t.sage }}>{field.area}</span>
      </div>

      <p style={{ margin: 0, fontSize: '11px', color: t.inkSoft }}>
        Fields marked <span style={{ color: t.clay }}>*</span> are required.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Field label="Farmer code" required error={shown('farmerCode')}>
          <input {...bind('farmerCode')} type="text" maxLength={30} autoComplete="off"
            placeholder="e.g. KE-2024-001 or FC/001/2024" />
        </Field>

        <Field label="Plot owner name" required error={shown('ownerName')}>
          <input {...bind('ownerName')} type="text" maxLength={60} autoComplete="name"
            placeholder="e.g. Jane Wambui Mwangi" />
        </Field>

        <Field label="Crop" error={shown('crop')}>
          <input {...bind('crop')} type="text" maxLength={50} placeholder="e.g. Maize, Coffee, Avocado" />
        </Field>

        <Field label="Notes">
          <textarea {...bind('notes')} rows={3} maxLength={500}
            placeholder="Soil treatments, harvest expectations…"
            style={{ resize: 'vertical', minHeight: '76px' }} />
        </Field>

        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          <button type="submit" disabled={saving} className="ft-btn"
            style={{ flex: 1, backgroundColor: t.sage, color: '#fff' }}>
            {saving ? 'Saving…' : 'Save plot'}
          </button>
          <button type="button" onClick={onCancel} disabled={saving} className="ft-btn"
            style={{ backgroundColor: t.bg, color: t.inkSoft, border: `1px solid ${t.hairline}` }}>
            Cancel
          </button>
          {field.id && (
            <button type="button" onClick={() => onDelete(field.id)} disabled={saving} className="ft-btn"
              style={{ backgroundColor: t.claySoft, color: t.clay }}>
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({
  onLocateClick, locating, selectedField, fields, onSaveField, onCancel, onDeleteField,
  onFlyToField, saving, dbLoading, isMobileOpen, onMobileClose, userEmail, onSignOut,
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((f) =>
      [f.crop, f.ownerName, f.farmerCode, f.notes].some((v) => v?.toLowerCase().includes(q))
    );
  }, [fields, query]);

  const totalHa = useMemo(() => fields.reduce((sum, f) => sum + getAreaHa(f), 0), [fields]);

  return (
    <>
      <style>{CSS}</style>
      {isMobileOpen && <div className="ft-backdrop" onClick={onMobileClose} aria-hidden="true" />}

      <aside className={`ft-side${isMobileOpen ? ' open' : ''}`} aria-label="Parcel manager">
        <header className="ft-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 700, letterSpacing: '-0.3px' }}>FarmTrack</h1>
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: t.sage, backgroundColor: t.sageSoft, padding: '2px 7px', borderRadius: '4px',
              }}>
                Field Ops
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: t.inkSoft, lineHeight: 1.5 }}>
              Plot parcels, register crops, manage land records.
            </p>
          </div>
          <button type="button" className="ft-close" onClick={onMobileClose} aria-label="Close sidebar">✕</button>
        </header>

        <div className="ft-body">
          <button type="button" onClick={onLocateClick} disabled={locating} className="ft-btn"
            style={{ width: '100%', backgroundColor: t.ink, color: '#fff', padding: '13px 16px', fontSize: '13.5px' }}>
            <span aria-hidden="true">⌖</span> {locating ? 'Locating…' : 'Locate me via GPS'}
          </button>

          {selectedField && (
            <PlotEditor
              key={selectedField.id ?? selectedField.draftKey}
              field={selectedField}
              saving={saving}
              onSave={onSaveField}
              onCancel={onCancel}
              onDelete={onDeleteField}
            />
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={sectionTitle}>Logged parcels</h2>
              <span style={{ fontSize: '12px', color: t.inkSoft, fontVariantNumeric: 'tabular-nums' }}>
                {dbLoading ? '···' : `${fields.length} · ${formatHa(totalHa)}`}
              </span>
            </div>

            {fields.length > 0 && (
              <>
                <input
                  type="search"
                  className="ft-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by owner, code, crop or notes"
                  aria-label="Filter parcels"
                />
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button type="button" className="ft-link" onClick={() => exportCSV(visible)}>⬇ Export CSV</button>
                  <button type="button" className="ft-link" onClick={() => exportGeoJSON(visible)}>⬇ Export GeoJSON</button>
                </div>
              </>
            )}

            {dbLoading ? (
              <p style={{ margin: 0, fontSize: '12.5px', color: t.inkSoft }}>Loading your parcels…</p>
            ) : fields.length === 0 ? (
              <div style={{ padding: '32px 16px', border: `1.5px dashed ${t.hairline}`, borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '12.5px', color: t.inkSoft, lineHeight: 1.5 }}>
                  No plots logged yet.<br />Click the map to start drawing a boundary.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12.5px', color: t.inkSoft }}>No parcels match “{query}”.</p>
            ) : (
              <div>
                {visible.map((f) => (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    className={`ft-row${selectedField?.id === f.id ? ' on' : ''}`}
                    onClick={() => onFlyToField(f)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlyToField(f); }
                    }}
                  >
                    <span style={{
                      width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, fontSize: '15px',
                      backgroundColor: f.crop === 'Unassigned' ? t.bg : t.sageSoft,
                      border: f.crop === 'Unassigned' ? `1px dashed ${t.hairline}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {getCropIcon(f.crop)}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{f.crop}</div>
                      {f.ownerName && (
                        <div style={{ fontSize: '11px', color: t.sage, fontWeight: 500, marginTop: '1px' }}>
                          👤 {f.ownerName}
                        </div>
                      )}
                      {f.farmerCode && (
                        <div style={{ fontSize: '11px', color: t.inkSoft, fontFamily: 'monospace', marginTop: '1px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', color: t.amber,
                            backgroundColor: '#FEF3C7', padding: '1px 4px', borderRadius: '3px',
                            fontFamily: 'sans-serif', marginRight: '4px',
                          }}>
                            ID
                          </span>
                          {f.farmerCode}
                        </div>
                      )}
                      {f.notes && (
                        <div style={{
                          fontSize: '11.5px', color: t.inkSoft, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px',
                        }}>
                          {f.notes}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: t.inkSoft, flexShrink: 0 }}>
                      {formatHa(getAreaHa(f))}
                    </span>

                    <button
                      type="button"
                      className="ft-x"
                      aria-label={`Delete parcel ${f.farmerCode || f.crop}`}
                      onClick={(e) => { e.stopPropagation(); onDeleteField(f.id); }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer style={{
            marginTop: 'auto', paddingTop: '14px', borderTop: `1px solid ${t.hairline}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
          }}>
            <span style={{
              fontSize: '11.5px', color: t.inkSoft, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {userEmail}
            </span>
            <button type="button" className="ft-link" onClick={onSignOut}>Sign out</button>
          </footer>
        </div>
      </aside>
    </>
  );
}