import { useEffect, useState, type FormEvent } from 'react';

import { useInstitutionalUnits } from '../../../application/useInstitutionalUnits.js';
import { useMunicipalities } from '../../../application/useMunicipalities.js';
import { useTrainingCenters } from '../../../application/useTrainingCenters.js';
import { ReferenceDataHttpError } from '../../out/http/referenceDataHttp.js';
import type {
  InstitutionalUnitCreateDto,
  InstitutionalUnitDto,
  InstitutionalUnitType,
  TrainingCenterDto,
} from '../../../domain/institutionalStructure.js';
import styles from './InstitutionalStructure.module.css';

type StatusFilter = 'all' | 'active' | 'inactive';
type Panel = 'centers' | 'units';

const toIsActive = (filter: StatusFilter) =>
  filter === 'all' ? undefined : filter === 'active';

const toStatusFilter = (value: string): StatusFilter =>
  value === 'active' || value === 'inactive' ? value : 'all';

const parseUnitType = (value: FormDataEntryValue | null): InstitutionalUnitType | undefined =>
  value === 'ACADEMIC' || value === 'ADMINISTRATIVE' || value === 'MIXED' ? value : undefined;

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`${styles.statusBadge} ${active ? styles.statusActive : styles.statusInactive}`}>
      <span aria-hidden="true">{active ? '✓' : '🔒'}</span>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function AddLabel({ children }: { children: string }) {
  return (
    <>
      <span aria-hidden="true" className={styles.buttonIcon}>+</span>
      {children}
    </>
  );
}

function StatusSelect({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  return (
    <label className={styles.filter}>
      Mostrar
      <select value={value} onChange={(event) => onChange(toStatusFilter(event.target.value))}>
        <option value="all">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </select>
    </label>
  );
}

function PageControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
    </nav>
  );
}

function CenterPanel({ baseUrl }: { baseUrl?: string }) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const centers = useTrainingCenters(baseUrl, toIsActive(filter));
  const municipalities = useMunicipalities(baseUrl, undefined, true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TrainingCenterDto>();
  const [formError, setFormError] = useState('');
  const [centerCodeError, setCenterCodeError] = useState('');
  const [pendingDeactivate, setPendingDeactivate] = useState<TrainingCenterDto>();
  const [busy, setBusy] = useState(false);
  const [municipalityNames, setMunicipalityNames] = useState<Record<string, string>>({});
  const [municipalityLookupError, setMunicipalityLookupError] = useState('');

  const filteredCenters = centers.items;
  useEffect(() => {
    if (!baseUrl) return;
    const knownMunicipalityIds = new Set([
      ...municipalities.items.map((item) => item.id),
      ...Object.keys(municipalityNames),
    ]);
    const missingMunicipalityIds = [...new Set(centers.items.map((item) => item.municipality_id))]
      .filter((id) => !knownMunicipalityIds.has(id));
    if (missingMunicipalityIds.length === 0) return;

    const controller = new AbortController();
    void Promise.all(missingMunicipalityIds.map((id) => municipalities.getById(id, controller.signal)))
      .then((items) => {
        if (!controller.signal.aborted) {
          setMunicipalityNames((current) => ({
            ...current,
            ...Object.fromEntries(items.map((item) => [item.id, item.name])),
          }));
          setMunicipalityLookupError('');
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setMunicipalityLookupError(
            reason instanceof Error ? reason.message : 'No fue posible resolver el municipio del centro.',
          );
        }
      });
    return () => controller.abort();
  }, [baseUrl, centers.items, municipalityNames, municipalities.getById, municipalities.items]);

  const closeForm = () => {
    setShowForm(false);
    setEditing(undefined);
    setFormError('');
    setCenterCodeError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('center_code') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const municipalityId = String(form.get('municipality_id') ?? '');
    const phone = String(form.get('phone') ?? '').trim();
    const address = String(form.get('address') ?? '').trim();
    setFormError('');
    setCenterCodeError('');
    setBusy(true);
    try {
      if (editing) {
        await centers.update(editing.id, {
          name,
          municipality_id: municipalityId,
          phone,
          address,
        });
      } else {
        await centers.create({
          center_code: code,
          name,
          municipality_id: municipalityId,
          ...(phone ? { phone } : {}),
          ...(address ? { address } : {}),
        });
      }
      closeForm();
    } catch (error) {
      if (!editing && error instanceof ReferenceDataHttpError && error.status === 409) {
        setCenterCodeError('Ya existe un centro con este código.');
      } else {
        setFormError(error instanceof Error ? error.message : 'No fue posible guardar el centro.');
      }
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!pendingDeactivate) return;
    setBusy(true);
    setFormError('');
    try {
      await centers.deactivate(pendingDeactivate.id);
      setPendingDeactivate(undefined);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible desactivar el centro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="training-centers-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="training-centers-title">Centros de formación</h2>
          <p>Cada centro se ubica en un municipio y agrupa sedes/unidades y ambientes.</p>
        </div>
        <div className={styles.actions}>
          <StatusSelect value={filter} onChange={(value) => { setFilter(value); centers.setPage(1); }} />
          <button type="button" className={styles.primaryButton} aria-label="Crear centro" onClick={() => { setEditing(undefined); setFormError(''); setCenterCodeError(''); setShowForm(true); }}>
            <AddLabel>Crear centro</AddLabel>
          </button>
        </div>
      </div>
      {centers.loading ? <p role="status" className={styles.message}>Cargando centros…</p> : null}
      {centers.error ? <p role="alert" className={styles.error}>{centers.error.message}</p> : null}
      {!centers.loading && !centers.error && (
        <div className={styles.tableViewport}>
          <table>
            <thead><tr><th>Código</th><th>Nombre</th><th>Municipio</th><th>Dirección</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filteredCenters.length === 0 ? (
                <tr><td colSpan={7} className={styles.empty}>No hay centros para mostrar.</td></tr>
              ) : filteredCenters.map((center) => (
                <tr key={center.id}>
                  <td>{center.center_code}</td>
                  <td>{center.name}</td>
                  <td>
                    {municipalityNames[center.municipality_id]
                      ?? municipalities.items.find((municipality) => municipality.id === center.municipality_id)?.name
                      ?? center.municipality_id}
                  </td>
                  <td>{center.address || '—'}</td>
                  <td>{center.phone || '—'}</td>
                  <td><StatusBadge active={center.is_active} /></td>
                  <td className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} aria-label="Editar" title="Editar" onClick={() => { setEditing(center); setFormError(''); setCenterCodeError(''); setShowForm(true); }}>
                      <span aria-hidden="true">✏️</span>
                    </button>
                    {center.is_active && <button type="button" onClick={() => setPendingDeactivate(center)}>Desactivar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {centers.pagination && (
        <PageControls page={centers.page} totalPages={centers.pagination.total_pages} onPageChange={centers.setPage} />
      )}
      {municipalities.error && <p role="alert" className={styles.error}>No fue posible cargar los municipios: {municipalities.error.message}</p>}
      {municipalityLookupError && <p role="alert" className={styles.error}>No fue posible cargar un municipio: {municipalityLookupError}</p>}
      {pendingDeactivate && (
        <div className={styles.dialogBackdrop}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="deactivate-center-title" className={styles.dialog}>
            <h3 id="deactivate-center-title">Desactivar centro</h3>
            <p>¿Deseas desactivar “{pendingDeactivate.name}”? El registro seguirá disponible en el filtro de inactivos.</p>
            {formError && <p role="alert" className={styles.error}>{formError}</p>}
            <div className={styles.actions}>
              <button type="button" onClick={() => { setPendingDeactivate(undefined); setFormError(''); }}>Cancelar</button>
              <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void deactivate()}>
                {busy ? 'Desactivando…' : 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      )}
      {showForm && !pendingDeactivate && (
        <div className={styles.formBackdrop}>
          <form className={styles.form} aria-label={editing ? 'Editar centro de formación' : 'Crear centro de formación'} onSubmit={(event) => void save(event)}>
            <h3>{editing ? 'Editar centro de formación' : 'Crear centro de formación'}</h3>
            <label>
              Código del centro <span>(inmutable después de crear)</span>
              <input
                name="center_code"
                defaultValue={editing?.center_code ?? ''}
                required
                maxLength={50}
                disabled={Boolean(editing)}
                aria-invalid={Boolean(centerCodeError)}
                aria-describedby={centerCodeError ? 'center-code-error' : undefined}
                onChange={() => setCenterCodeError('')}
              />
              {centerCodeError && <span id="center-code-error" role="alert" className={styles.error}>{centerCodeError}</span>}
            </label>
            <label>
              Nombre
              <input name="name" defaultValue={editing?.name ?? ''} required maxLength={150} />
            </label>
            <label>
              Municipio
              <select name="municipality_id" defaultValue={editing?.municipality_id ?? ''} required disabled={municipalities.loading || Boolean(municipalities.error)}>
                <option value="">Selecciona un municipio</option>
                {municipalities.items.map((municipality) => (
                  <option key={municipality.id} value={municipality.id}>{municipality.name}</option>
                ))}
              </select>
              {municipalities.loading && <span role="status">Cargando municipios…</span>}
              {municipalities.pagination && municipalities.pagination.total_pages > 1 && (
                <span className={styles.selectPagination}>
                  <button type="button" disabled={municipalities.page <= 1} onClick={() => municipalities.setPage(municipalities.page - 1)}>
                    Municipios anteriores
                  </button>
                  <span>Página {municipalities.page} de {municipalities.pagination.total_pages}</span>
                  <button type="button" disabled={municipalities.page >= municipalities.pagination.total_pages} onClick={() => municipalities.setPage(municipalities.page + 1)}>
                    Más municipios
                  </button>
                </span>
              )}
            </label>
            <label>
              Teléfono
              <input name="phone" type="tel" defaultValue={editing?.phone ?? ''} maxLength={30} autoComplete="tel" />
            </label>
            <label>
              Dirección
              <input name="address" defaultValue={editing?.address ?? ''} maxLength={250} autoComplete="street-address" />
            </label>
            {formError && <p role="alert" className={styles.error}>{formError}</p>}
            <div className={styles.actions}>
              <button type="button" onClick={closeForm}>Cancelar</button>
              <button type="submit" className={styles.primaryButton} disabled={busy || municipalities.loading || Boolean(municipalities.error)}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function UnitsPanel({ baseUrl }: { baseUrl?: string }) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const units = useInstitutionalUnits(baseUrl, toIsActive(filter));
  const centers = useTrainingCenters(baseUrl, undefined, 50);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InstitutionalUnitDto>();
  const [pendingDeactivate, setPendingDeactivate] = useState<InstitutionalUnitDto>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const filteredUnits = units.items;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const unitType = parseUnitType(form.get('unit_type'));
    if (!unitType) {
      setError('Selecciona un tipo de unidad válido.');
      return;
    }
    const payload: InstitutionalUnitCreateDto = {
      training_center_id: String(form.get('training_center_id') ?? ''),
      name: String(form.get('name') ?? '').trim(),
      unit_type: unitType,
    };
    setError('');
    setBusy(true);
    try {
      if (editing) {
        await units.update(editing.id, payload);
      } else {
        await units.create(payload);
      }
      setShowForm(false);
      setEditing(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la sede.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!pendingDeactivate) return;
    setBusy(true);
    setError('');
    try {
      await units.deactivate(pendingDeactivate.id);
      setPendingDeactivate(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible desactivar la sede.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="institutional-units-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="institutional-units-title">Unidades institucionales (sedes)</h2>
          <p>Sedes y unidades asociadas a cada centro de formación.</p>
        </div>
        <div className={styles.actions}>
          <StatusSelect value={filter} onChange={(value) => { setFilter(value); units.setPage(1); }} />
          <button type="button" className={styles.primaryButton} aria-label="Crear sede" onClick={() => { setEditing(undefined); setError(''); setShowForm(true); }}>
            <AddLabel>Crear sede</AddLabel>
          </button>
        </div>
      </div>
      {units.loading ? <p role="status" className={styles.message}>Cargando sedes…</p> : null}
      {units.error ? <p role="alert" className={styles.error}>{units.error.message}</p> : null}
      {!units.loading && !units.error && (
        <div className={styles.tableViewport}>
          <table>
            <thead><tr><th>Sede</th><th>Centro</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr><td colSpan={5} className={styles.empty}>No hay sedes para mostrar.</td></tr>
              ) : filteredUnits.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.name}</td>
                  <td>{centers.items.find((center) => center.id === unit.training_center_id)?.name ?? '—'}</td>
                  <td>{unit.unit_type}</td>
                  <td><StatusBadge active={unit.is_active} /></td>
                  <td className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} aria-label="Editar" title="Editar" onClick={() => { setEditing(unit); setError(''); setShowForm(true); }}>
                      <span aria-hidden="true">✏️</span>
                    </button>
                    {unit.is_active && <button type="button" onClick={() => setPendingDeactivate(unit)}>Desactivar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {units.pagination && <PageControls page={units.page} totalPages={units.pagination.total_pages} onPageChange={units.setPage} />}
      {centers.error && <p role="alert" className={styles.error}>No fue posible cargar los centros: {centers.error.message}</p>}
      {pendingDeactivate && (
        <div className={styles.dialogBackdrop}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="deactivate-unit-title" className={styles.dialog}>
            <h3 id="deactivate-unit-title">Desactivar sede</h3>
            <p>¿Deseas desactivar “{pendingDeactivate.name}”? El registro seguirá disponible en el filtro de inactivos.</p>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button type="button" onClick={() => { setPendingDeactivate(undefined); setError(''); }}>Cancelar</button>
              <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void deactivate()}>
                {busy ? 'Desactivando…' : 'Confirmar'}
              </button>
            </div>
          </section>
        </div>
      )}
      {showForm && !pendingDeactivate && (
        <div className={styles.formBackdrop}>
          <form className={styles.form} aria-label={editing ? 'Editar unidad institucional' : 'Crear unidad institucional'} onSubmit={(event) => void save(event)}>
            <h3>{editing ? 'Editar sede' : 'Crear sede'}</h3>
            <label>
              Centro de formación
              <select name="training_center_id" defaultValue={editing?.training_center_id ?? ''} required disabled={centers.loading || Boolean(centers.error)}>
                <option value="">Selecciona un centro</option>
                {centers.items.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
              {centers.loading && <span role="status">Cargando centros…</span>}
            </label>
            <label>
              Nombre de la sede
              <input name="name" defaultValue={editing?.name ?? ''} required maxLength={150} />
            </label>
            <label>
              Tipo de unidad
              <select name="unit_type" defaultValue={editing?.unit_type ?? ''} required>
                <option value="">Selecciona un tipo</option>
                <option value="ACADEMIC">Académica</option>
                <option value="ADMINISTRATIVE">Administrativa</option>
                <option value="MIXED">Mixta</option>
              </select>
            </label>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button type="button" onClick={() => { setShowForm(false); setEditing(undefined); setError(''); }}>Cancelar</button>
              <button type="submit" className={styles.primaryButton} disabled={busy || centers.loading || Boolean(centers.error)}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export function InstitutionalStructure({ baseUrl }: { baseUrl?: string }) {
  const [panel, setPanel] = useState<Panel>('centers');
  return (
    <section className={styles.root} aria-label="Gestión de centros y sedes">
      {!baseUrl && (
        <p role="status" className={styles.configNotice}>
          Modo demo activo: configura VITE_REFERENCE_DATA_API_BASE_URL para conectar con Reference Data.
        </p>
      )}
      <div className={styles.tabs} role="tablist" aria-label="Centros y sedes">
        <button type="button" role="tab" aria-selected={panel === 'centers'} onClick={() => setPanel('centers')}>
          Centros de formación
        </button>
        <button type="button" role="tab" aria-selected={panel === 'units'} onClick={() => setPanel('units')}>
          Unidades institucionales
        </button>
      </div>
      {panel === 'centers' ? <CenterPanel baseUrl={baseUrl} /> : <UnitsPanel baseUrl={baseUrl} />}
    </section>
  );
}
