import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import styles from './GeographyHierarchy.module.css';

export const geographyLevels = [
  { key: 'macroregion', label: 'Macrorregiones', singular: 'Macrorregión' },
  { key: 'microregion', label: 'Microrregiones', singular: 'Microrregión' },
  { key: 'department', label: 'Departamentos', singular: 'Departamento' },
  { key: 'municipality', label: 'Municipios', singular: 'Municipio' },
] as const;

export type GeographyLevel = (typeof geographyLevels)[number]['key'];

export interface GeographyItem {
  id: string;
  name: string;
}

/** View projection used by the presentation layer, not an API DTO. */
export interface GeographyRecordView extends GeographyItem {
  code?: string;
  daneCode?: string;
  parentId?: string;
  /** View projection of the API's is_active field when available. */
  isActive?: boolean;
  /** Marked as a browser-local demonstration record, never persisted. */
  isDemo?: boolean;
}

export type GeographyOptions = Readonly<Record<GeographyLevel, readonly GeographyRecordView[]>>;

export interface GeographyPaginationView {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface GeographyFormValues {
  name: string;
  isActive: boolean | '';
  parentId?: string;
  code?: string;
  daneCode?: string;
}

const fieldRules = {
  macroregion: { name: 100, code: 10 },
  microregion: { name: 100, code: 10 },
  department: { name: 100, daneCode: 5 },
  municipality: { name: 150, daneCode: 8 },
} as const;

const levelParent = (level: GeographyLevel) => {
  const index = geographyLevels.findIndex((item) => item.key === level);
  return index > 0 ? geographyLevels[index - 1] : undefined;
};

const emptyForm = (level: GeographyLevel, parentId?: string): GeographyFormValues => ({
  name: '',
  isActive: '',
  parentId,
  ...('code' in fieldRules[level] ? { code: '' } : { daneCode: '' }),
});

interface GeographyHierarchyProps {
  options: GeographyOptions;
  parentOptions?: Partial<GeographyOptions>;
  pagination?: Partial<Record<GeographyLevel, GeographyPaginationView>>;
  loadingLevel?: GeographyLevel;
  errors?: Partial<Record<GeographyLevel, string>>;
  parentLoading?: Partial<Record<GeographyLevel, boolean>>;
  parentErrors?: Partial<Record<GeographyLevel, string>>;
  unavailable?: boolean;
  unavailableMessage?: string;
  canManage?: boolean;
  allowLocalCreation?: boolean;
  allowLocalEditing?: boolean;
  demoMode?: boolean;
  onSelectionChange?: (level: GeographyLevel, item: GeographyItem | null) => void;
  onRetry?: (level: GeographyLevel) => void;
  onPageChange?: (level: GeographyLevel, page: number) => void;
  /** The recipient applies the new size and resets that level to page 1. */
  onPageSizeChange?: (level: GeographyLevel, pageSize: number, page: 1) => void;
  onSave?: (
    level: GeographyLevel,
    values: GeographyFormValues,
    editing?: GeographyRecordView,
  ) => void | Promise<void>;
  onDeactivate?: (level: GeographyLevel, item: GeographyRecordView) => void | Promise<void>;
}

const emptySelection = (): Partial<Record<GeographyLevel, GeographyItem>> => ({});

const visiblePageNumbers = (page: number, totalPages: number): number[] => {
  const count = Math.min(totalPages, 5);
  const first = Math.max(1, Math.min(page - 2, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => first + index);
};

export function GeographyHierarchy({
  options,
  parentOptions = options,
  pagination = {},
  loadingLevel,
  errors = {},
  parentLoading = {},
  parentErrors = {},
  unavailable = false,
  unavailableMessage,
  canManage = false,
  allowLocalCreation = false,
  allowLocalEditing = false,
  demoMode = false,
  onSelectionChange,
  onRetry,
  onPageChange,
  onPageSizeChange,
  onSave,
  onDeactivate,
}: GeographyHierarchyProps) {
  const [selection, setSelection] = useState(emptySelection);
  const [activeLevel, setActiveLevel] = useState<GeographyLevel>('macroregion');
  const [form, setForm] = useState<{ level: GeographyLevel; item?: GeographyRecordView }>();
  const [formValues, setFormValues] = useState<GeographyFormValues>();
  const [formError, setFormError] = useState<string>();
  const [pendingDeactivate, setPendingDeactivate] = useState<{
    level: GeographyLevel;
    item: GeographyRecordView;
  }>();
  const [deactivateError, setDeactivateError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const deactivateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelDeactivateRef = useRef<HTMLButtonElement | null>(null);
  const confirmDeactivateRef = useRef<HTMLButtonElement | null>(null);
  const formTriggerRef = useRef<HTMLButtonElement | null>(null);
  const formFirstRef = useRef<HTMLSelectElement | null>(null);
  const formCancelRef = useRef<HTMLButtonElement | null>(null);

  const changeActiveLevel = (level: GeographyLevel) => {
    if (level === activeLevel) return;
    setForm(undefined);
    setFormValues(undefined);
    setFormError(undefined);
    setActiveLevel(level);
  };

  useEffect(() => {
    if (pendingDeactivate) {
      cancelDeactivateRef.current?.focus();
      return;
    }

    deactivateTriggerRef.current?.focus();
    deactivateTriggerRef.current = null;
  }, [pendingDeactivate]);

  useEffect(() => {
    if (form) {
      formFirstRef.current?.focus();
      return;
    }
    formTriggerRef.current?.focus();
    formTriggerRef.current = null;
  }, [form]);

  const currentIndex = geographyLevels.findIndex((item) => item.key === activeLevel);
  const current = geographyLevels[currentIndex] ?? geographyLevels[0];
  const createLabel = current.key === 'department' ? 'Nuevo departamento' : current.key === 'municipality' ? 'Nuevo municipio' : 'Nueva ' + current.singular.toLocaleLowerCase('es');
  const currentPage = pagination[current.key];
  const parent = levelParent(current.key);
  const parentColumn = current.key === 'microregion' || current.key === 'municipality' ? parent : undefined;
  const tableColumnCount = parentColumn ? 5 : 4;
  const formLevelInfo = form ? geographyLevels.find((item) => item.key === form.level) : undefined;
  const formParent = form ? levelParent(form.level) : undefined;
  const formRules = form ? fieldRules[form.level] : undefined;
  const formParentChoices = formParent ? (parentOptions[formParent.key] ?? []) : [];
  const formParentLoading = formParent ? Boolean(parentLoading[formParent.key]) : false;
  const formParentError = formParent ? parentErrors[formParent.key] : undefined;
  const formParentUnavailable = Boolean(formParent && (formParentLoading || formParentError || formParentChoices.length === 0));
  const parentNotSelected = Boolean(parent && !selection[parent.key]);
  const visibleRecords = parent && selection[parent.key]
    ? options[current.key].filter((item) => item.parentId === selection[parent.key]?.id)
    : parent
      ? []
      : options[current.key];
  // Let users open child forms before selecting a table row; the form's parent
  // selector supplies that required relationship and explains when no choices exist.
  const canCreate = !unavailable && (canManage || allowLocalCreation) && Boolean(onSave);
  const canEdit = !unavailable && !parentNotSelected && canManage && Boolean(onSave);
  const canDeactivate = !unavailable && !parentNotSelected && canManage && Boolean(onDeactivate);
  const visiblePages = currentPage
    ? visiblePageNumbers(currentPage.page, currentPage.totalPages)
    : [];
  const rangeStart =
    currentPage && currentPage.totalItems > 0
      ? (currentPage.page - 1) * currentPage.pageSize + 1
      : 0;
  const rangeEnd = currentPage
    ? Math.min(currentPage.page * currentPage.pageSize, currentPage.totalItems)
    : 0;

  const selectItem = (levelIndex: number, item: GeographyItem | null) => {
    const levelEntry = geographyLevels[levelIndex];
    if (!levelEntry) return;
    const level = levelEntry.key;
    setSelection((currentSelection) => {
      const next = { ...currentSelection };
      for (const descendant of geographyLevels.slice(levelIndex + 1)) {
        delete next[descendant.key];
      }
      if (item) next[level] = item;
      else delete next[level];
      return next;
    });
    if (item && levelIndex < geographyLevels.length - 1) {
      changeActiveLevel(geographyLevels[levelIndex + 1].key);
    }
    onSelectionChange?.(level, item);
  };

  const focusTab = (index: number) => {
    const level = geographyLevels[index];
    if (!level) return;
    changeActiveLevel(level.key);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % geographyLevels.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + geographyLevels.length) % geographyLevels.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = geographyLevels.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    focusTab(nextIndex);
  };

  const beginCreate = (trigger?: HTMLButtonElement) => {
    formTriggerRef.current = trigger ?? null;
    setForm({ level: current.key });
    setFormValues(emptyForm(current.key, parent ? selection[parent.key]?.id : undefined));
    setFormError(undefined);
  };

  const beginEdit = (item: GeographyRecordView, trigger?: HTMLButtonElement) => {
    formTriggerRef.current = trigger ?? null;
    setForm({ level: current.key, item });
    setFormValues({
      name: item.name,
      isActive: item.isActive ?? '',
      ...(parent ? { parentId: item.parentId ?? selection[parent.key]?.id } : {}),
      ...('code' in fieldRules[current.key]
        ? { code: item.code ?? '' }
        : { daneCode: item.daneCode ?? '' }),
    });
    setFormError(undefined);
  };

  const updateFormValue = (key: keyof GeographyFormValues, value: string) => {
    setFormValues((currentValues) => currentValues ? { ...currentValues, [key]: value } : currentValues);
    setFormError(undefined);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !formValues || !onSave || (!canManage && !allowLocalCreation && !allowLocalEditing) || (form.item && !canManage && !(allowLocalEditing && form.item.isDemo)) || unavailable) return;
    const rules = fieldRules[form.level];
    const name = formValues.name.trim();
    if (!name) {
      setFormError('Ingresa el nombre.');
      return;
    }
    if (name.length > rules.name) {
      setFormError('El nombre admite máximo ' + rules.name + ' caracteres.');
      return;
    }
    if (
      formParent &&
      (!formValues.parentId || !formParentChoices.some((item) => item.id === formValues.parentId))
    ) {
      setFormError('Selecciona una ' + formParent.singular.toLocaleLowerCase('es') + '.');
      return;
    }
    const hasCode = 'code' in rules;
    const codeKey = hasCode ? 'code' : 'daneCode';
    const code = (hasCode ? formValues.code : formValues.daneCode)?.trim() ?? '';
    if (!code) {
      setFormError(codeKey === 'code' ? 'Ingresa el código.' : 'Ingresa el código DANE.');
      return;
    }
    const maxCodeLength = hasCode ? rules.code : rules.daneCode;
    if (code.length > maxCodeLength) {
      setFormError('El código admite máximo ' + maxCodeLength + ' caracteres.');
      return;
    }
    if (formValues.isActive === '') {
      setFormError('Selecciona un estado.');
      return;
    }

    setSaving(true);
    setFormError(undefined);
    try {
      const values = {
        name,
        isActive: formValues.isActive,
        ...(formParent ? { parentId: formValues.parentId } : {}),
        ...(codeKey === 'code' ? { code } : { daneCode: code }),
      };
      if (form.item) await onSave(form.level, values, form.item);
      else await onSave(form.level, values);
      setForm(undefined);
      setFormValues(undefined);
    } catch (error) {
      setFormError(
        error instanceof Error && error.name === 'ReferenceDataHttpError'
          ? error.message
          : 'No fue posible guardar el registro. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate || !onDeactivate || !canManage || unavailable) return;
    setDeactivating(true);
    setDeactivateError(undefined);
    try {
      await onDeactivate(pendingDeactivate.level, pendingDeactivate.item);
      setPendingDeactivate(undefined);
    } catch (error) {
      setDeactivateError(
        error instanceof Error && error.name === 'ReferenceDataHttpError'
          ? error.message
          : 'No fue posible desactivar el registro. Intenta de nuevo.',
      );
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <section className={styles.root} aria-label="Gestión de la jerarquía geográfica">
      <div className={styles.tabs} role="tablist" aria-label="Niveles geográficos">
        {geographyLevels.map((level, index) => (
          <button
            key={level.key}
            ref={(element) => { tabRefs.current[index] = element; }}
            id={'geography-tab-' + level.key}
            type="button"
            role="tab"
            aria-selected={activeLevel === level.key}
            aria-controls={'geography-panel-' + level.key}
            tabIndex={activeLevel === level.key ? 0 : -1}
            className={activeLevel === level.key ? styles.activeTab : styles.tab}
            onClick={() => changeActiveLevel(level.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div
        id={'geography-panel-' + current.key}
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={'geography-tab-' + current.key}
        aria-live="polite"
        tabIndex={0}
      >
        <div className={styles.levelHeading}>
          <h2>{current.label}</h2>
          <button type="button" className={styles.primaryButton} onClick={(event) => beginCreate(event.currentTarget)} disabled={!canCreate}>
            <span aria-hidden="true" className={styles.plus}>+</span>
            {createLabel}
          </button>
        </div>

        {!canManage && !unavailable && !allowLocalCreation && (
          <p className={[styles.permissionNotice, styles.visuallyHidden].join(' ')}>
            Las acciones de gestión están deshabilitadas hasta verificar el permiso correspondiente.
          </p>
        )}
        {allowLocalCreation && !unavailable && (
          <p className={[styles.permissionNotice, styles.visuallyHidden].join(' ')}>
            Crear y editar solo modifican registros locales de demostracion; no se guardan en el servidor y desactivar sigue deshabilitado.
          </p>
        )}

        {unavailable ? (
          <p className={styles.stateMessage} role="status">
            {unavailableMessage ?? 'La gestión geográfica no está disponible temporalmente.'}
          </p>
        ) : loadingLevel === current.key ? (
          <p className={styles.stateMessage} role="status">
            Cargando {current.label.toLocaleLowerCase('es')}…
          </p>
        ) : errors[current.key] ? (
          <div>
            <p className={styles.errorMessage} role="alert">{errors[current.key]}</p>
            {onRetry && (
              <button type="button" className={styles.pageButton} onClick={() => onRetry(current.key)}>
                Reintentar consulta
              </button>
            )}
          </div>
        ) : parentNotSelected ? (
          <p className={styles.stateMessage} role="status">
            Selecciona primero una {parent?.singular.toLocaleLowerCase('es')} para consultar este nivel.
          </p>
        ) : (
          <div className={styles.tableViewport} role="region" aria-label={'Registros de ' + current.label} tabIndex={0}>
            <table className={[styles.table, parentColumn ? styles.tableWithParent : ''].filter(Boolean).join(' ')}>
              <caption className={styles.visuallyHidden}>{current.label}</caption>
              <thead>
                <tr>
                  <th scope="col">{current.key === 'department' || current.key === 'municipality' ? 'DANE' : 'C\u00d3DIGO'}</th>
                  <th scope="col">Nombre</th>
                  {parentColumn && <th scope="col">{parentColumn.key === 'macroregion' ? 'Macrorregi\u00f3n' : 'Departamento'}</th>}
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.length === 0 ? (
                  <tr>
                    <td className={styles.emptyCell} colSpan={tableColumnCount}>
                      {demoMode ? 'No hay registros locales de demostracion para mostrar.' : 'No hay registros para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  visibleRecords.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.codeCell}>{item.code ?? item.daneCode ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.recordName}
                          aria-pressed={selection[current.key]?.id === item.id}
                          onClick={() => selectItem(currentIndex, item)}
                        >
                          {item.name}
                        </button>
                      </td>
                      {parentColumn && (
                        <td className={styles.parentCell}>
                          {(parentOptions[parentColumn.key] ?? []).find((parentItem) => parentItem.id === item.parentId)?.name
                            ?? selection[parentColumn.key]?.name
                            ?? '—'}
                        </td>
                      )}
                      <td>
                        <span
                          className={[
                            styles.statusBadge,
                            item.isActive === true
                              ? styles.activeStatus
                              : item.isActive === false
                                ? styles.inactiveStatus
                                : styles.unknownStatus,
                          ].join(' ')}
                        >
                          {item.isActive === true ? (
                            <svg className={styles.statusIcon} aria-hidden="true" viewBox="0 0 16 16">
                              <circle cx="8" cy="8" r="6.25" />
                              <path d="m5.2 8 1.8 1.8 3.8-4" />
                            </svg>
                          ) : item.isActive === false ? (
                            <svg className={styles.statusIcon} aria-hidden="true" viewBox="0 0 16 16">
                              <rect x="3.5" y="7" width="9" height="7" rx="1" />
                              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                            </svg>
                          ) : null}
                          {item.isActive === true
                            ? 'Activo'
                            : item.isActive === false
                              ? 'Inactivo'
                              : 'No informado'}
                        </span>
                        {item.isDemo && <span className={styles.demoBadge}>Demo local</span>}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={(event) => beginEdit(item, event.currentTarget)}
            disabled={!canEdit && !(allowLocalEditing && item.isDemo && !unavailable && !parentNotSelected && Boolean(onSave))}
                            aria-label={'Editar ' + item.name}
                            title="Editar"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={[styles.deactivateButton, !canDeactivate ? styles.visuallyHidden : ''].filter(Boolean).join(' ')}
                            onClick={(event) => {
                              deactivateTriggerRef.current = event.currentTarget;
                              setPendingDeactivate({ level: current.key, item });
                              setDeactivateError(undefined);
                            }}
                            disabled={!canDeactivate}
                            aria-label={'Desactivar ' + item.name}
                          >
                            Desactivar
                            <span className={styles.visuallyHidden}> {item.name}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {currentPage && !unavailable && !parentNotSelected && (
          <nav className={styles.pagination} aria-label={'Paginación de ' + current.label.toLowerCase()}>
            <span className={styles.paginationSummary}>
              Mostrando {rangeStart}–{rangeEnd} de {currentPage.totalItems}
            </span>
            <div className={styles.pageControls}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => onPageChange?.(current.key, currentPage.page - 1)}
                disabled={!onPageChange || currentPage.page <= 1 || loadingLevel === current.key}
              >
                ‹ Anterior
              </button>
              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={page === currentPage.page ? styles.currentPageButton : styles.pageButton}
                  aria-current={page === currentPage.page ? 'page' : undefined}
                  onClick={() => onPageChange?.(current.key, page)}
                  disabled={!onPageChange || loadingLevel === current.key}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => onPageChange?.(current.key, currentPage.page + 1)}
                disabled={
                  !onPageChange ||
                  currentPage.totalPages === 0 ||
                  currentPage.page >= currentPage.totalPages ||
                  loadingLevel === current.key
                }
              >
                Siguiente ›
              </button>
            </div>
            <label className={styles.pageSizeControl}>
              <select
                aria-label="Registros por página"
                value={currentPage.pageSize}
                onChange={(event) => {
                  const pageSize = Number(event.target.value);
                  if (pageSize === 10 || pageSize === 20 || pageSize === 50) {
                    onPageSizeChange?.(current.key, pageSize, 1);
                  }
                }}
                disabled={!onPageSizeChange || loadingLevel === current.key}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>por página</span>
            </label>
          </nav>
        )}
      </div>

      {form && formValues && formRules && formLevelInfo && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setForm(undefined);
              setFormValues(undefined);
              setFormError(undefined);
            }
          }}
        >
        <section
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="geography-form-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !saving) {
              event.preventDefault();
              setForm(undefined);
              setFormValues(undefined);
              setFormError(undefined);
            } else if (event.key === 'Tab') {
              const first = formFirstRef.current;
              const last = formCancelRef.current;
              if (event.shiftKey && document.activeElement === first && last) {
                event.preventDefault(); last.focus();
              } else if (!event.shiftKey && document.activeElement === last && first) {
                event.preventDefault(); first.focus();
              }
            }
          }}
        >
        <form
          className={styles.form}
          aria-label={(form.item ? 'Editar ' : 'Crear ') + formLevelInfo.label}
          onSubmit={submitForm}
        >
          <h2 id="geography-form-title">{form.item ? 'Editar ' : 'Crear '}{formLevelInfo.singular.toLocaleLowerCase('es')}</h2>
          {formParent && (
            <label>
              {formParent.singular} <span>(obligatorio)</span>
              <select
                ref={formFirstRef}
                value={formValues.parentId ?? ''}
                required
                disabled={formParentLoading || Boolean(formParentError) || formParentChoices.length === 0}
                onChange={(event) => {
                  const parentIndex = geographyLevels.findIndex((item) => item.key === formParent.key);
                  const parentItem = formParentChoices.find((item) => item.id === event.target.value);
                  updateFormValue('parentId', event.target.value);
                  selectItem(parentIndex, parentItem ?? null);
                }}
              >
                <option value="">Selecciona una opción</option>
                {formParentChoices.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {formParentLoading ? (
                <span role="status">Cargando opciones de {formParent.singular.toLocaleLowerCase('es')}…</span>
              ) : formParentError ? (
                <span className={styles.errorMessage} role="alert">
                  No fue posible cargar las opciones de {formParent.singular.toLocaleLowerCase('es')}: {formParentError}
                  {onRetry && (
                    <button type="button" className={styles.pageButton} onClick={() => onRetry(formParent.key)}>
                      Reintentar opciones
                    </button>
                  )}
                </span>
              ) : formParentChoices.length === 0 ? (
                <span role="status">No hay {formParent.label.toLocaleLowerCase('es')} disponibles. Carga primero un registro válido del nivel superior.</span>
              ) : null}
            </label>
          )}
          <label>
            Nombre <span>(máximo {formRules.name} caracteres)</span>
            <input
              name="name"
              value={formValues.name}
              maxLength={formRules.name}
              required
              onChange={(event) => updateFormValue('name', event.target.value)}
            />
          </label>
          <label>
            Estado <span>(obligatorio)</span>
            <select
              ref={formParent ? undefined : formFirstRef}
              name="isActive"
              value={formValues.isActive === '' ? '' : String(formValues.isActive)}
              required
              onChange={(event) => {
                const value = event.target.value;
                setFormValues((currentValues) => currentValues
                  ? { ...currentValues, isActive: value === '' ? '' : value === 'true' }
                  : currentValues);
                setFormError(undefined);
              }}
            >
              <option value="">Selecciona una opción</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          {'code' in formRules ? (
            <label>
              Código <span>(máximo {formRules.code} caracteres)</span>
              <input
                name="code"
                value={formValues.code ?? ''}
                maxLength={formRules.code}
                required
                onChange={(event) => updateFormValue('code', event.target.value)}
              />
            </label>
          ) : (
            <label>
              Código DANE <span>(máximo {formRules.daneCode} caracteres)</span>
              <input
                name="daneCode"
                value={formValues.daneCode ?? ''}
                maxLength={formRules.daneCode}
                required
                onChange={(event) => updateFormValue('daneCode', event.target.value)}
              />
            </label>
          )}
          {formError && <p className={styles.errorMessage} role="alert">{formError}</p>}
          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => {
              setForm(undefined);
              setFormValues(undefined);
              setFormError(undefined);
            }} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" ref={formCancelRef} className={styles.primaryButton} disabled={saving || formParentUnavailable}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
        </section>
        </div>
      )}

      {pendingDeactivate && (
        <div
          className={styles.confirmation}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !deactivating) {
              event.preventDefault();
              setPendingDeactivate(undefined);
              setDeactivateError(undefined);
              return;
            }
            if (event.key !== 'Tab') return;

            const first = cancelDeactivateRef.current;
            const last = confirmDeactivateRef.current;
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <h2 id="deactivate-title">¿Desactivar {pendingDeactivate.item.name}?</h2>
          <p>Confirma si deseas solicitar la desactivación de este registro.</p>
          {deactivateError && <p className={styles.errorMessage} role="alert">{deactivateError}</p>}
          <div className={styles.formActions}>
            <button
              type="button"
              ref={cancelDeactivateRef}
              className={styles.secondaryButton}
              onClick={() => setPendingDeactivate(undefined)}
              disabled={deactivating}
            >
              Cancelar
            </button>
            <button
              type="button"
              ref={confirmDeactivateRef}
              className={styles.primaryButton}
              onClick={confirmDeactivate}
              disabled={deactivating || !canDeactivate}
            >
              {deactivating ? 'Procesando…' : 'Confirmar desactivación'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
