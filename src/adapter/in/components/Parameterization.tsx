import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useCatalogs } from "../../../application/useCatalogs.js";
import { useCatalogDetails } from "../../../application/useCatalogDetails.js";
import { useParameters } from "../../../application/useParameters.js";
import { useParameterizationDemo } from "../../../application/useParameterizationDemo.js";
import type {
  CatalogDetailDto,
  CatalogDto,
  ParameterDto,
  ParameterValueType,
} from "../../../domain/catalog.js";
import { VALUE_TYPES } from "../../../domain/catalog.js";
import { ReferenceDataHttpError } from "../../out/http/referenceDataHttp.js";
import styles from "./Parameterization.module.css";

export interface ParameterizationProps {
  baseUrl?: string;
  demoMode?: boolean;
  canViewCatalogs: boolean;
  canManageCatalogs: boolean;
  canViewParameters: boolean;
  canManageParameters: boolean;
}

const errorMessage = (
  error: unknown,
  fallback: string,
  conflict = "Este código ya existe en este catálogo.",
) => {
  if (error instanceof ReferenceDataHttpError) {
    if (error.status === 401) return "Tu sesión no es válida o ha expirado.";
    if (error.status === 403)
      return "No tienes permisos para realizar esta operación.";
    if (error.status === 404) return "El recurso solicitado no existe.";
    if (error.status === 409) return conflict;
    if (error.status >= 500)
      return "El servicio no está disponible. Intenta nuevamente.";
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const pageText = (page?: { page: number; page_size: number; total_items: number }, loading = false) => loading ? "Cargando…" : page ? `Mostrando ${page.total_items === 0 ? 0 : (page.page - 1) * page.page_size + 1}–${Math.min(page.page * page.page_size, page.total_items)} de ${page.total_items}` : "No hay registros disponibles.";

const normalizeSearch = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const isCatalogCode = (value: string) => /^[A-Z0-9_]+$/.test(value.trim());

function Pagination({
  pagination,
  page,
  pageSize,
  setPage,
  setPageSize,
  label,
  loading,
}: {
  pagination?: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  label: string;
  loading: boolean;
}) {
  const totalPages = pagination?.total_pages ?? 0;
  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).slice(0, 5);
  if (!loading && pagination?.total_items === 0) {
    return <div className={styles.pagination}><span>No hay registros disponibles.</span></div>;
  }
  return (
    <div className={styles.pagination}>
      <span>{pageText(pagination, loading)}</span>
      <div
        className={styles.paginationControls}
        aria-label={`Paginación de ${label}`}
      >
        <button
          className={styles.secondary}
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          ‹ Anterior
        </button>
        {pages.map((item) => (
          <button
            className={`${styles.secondary} ${styles.pageButton}`}
            aria-current={item === page ? "page" : undefined}
            type="button"
            key={item}
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
        <button
          className={styles.secondary}
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Siguiente ›
        </button>
        <label>
          <span className={styles.srOnly}>Registros por página</span>
          <select
            className={styles.select}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>{" "}
          por página
        </label>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error?: string;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, onClose]);
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parameterization-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="parameterization-modal-title">{title}</h2>
          <button
            className={styles.close}
            type="button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          {children}
          {error && (
            <div className={styles.formError} role="alert">
              {error}
            </div>
          )}
          <div className={styles.modalFooter}>
            <button
              className={styles.secondary}
              type="button"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className={styles.primary} type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({
  catalog,
  item,
  onClose,
  onSave,
}: {
  catalog: CatalogDto;
  item?: CatalogDetailDto;
  onClose: () => void;
  onSave: (
    body: {
      code: string;
      label: string;
      display_order: number | null;
      is_active: boolean;
    },
    id?: string,
  ) => Promise<void>;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [order, setOrder] = useState(
    item?.display_order == null ? "" : String(item.display_order),
  );
  const [active, setActive] = useState(item?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim() || !label.trim()) {
      setError("Código y etiqueta son obligatorios.");
      return;
    }
    if (order && !Number.isInteger(Number(order))) {
      setError("El orden debe ser un número entero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          code: code.trim(),
          label: label.trim(),
          display_order: order ? Number(order) : null,
          is_active: active,
        },
        item?.id,
      );
      onClose();
    } catch (reason) {
      setError(errorMessage(reason, "No se pudo guardar el valor."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={item ? "Editar valor de catálogo" : "Nuevo valor de catálogo"}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      error={error}
    >
      <div className={styles.field}>
        <label htmlFor="detail-parent">Catálogo padre</label>
        <input
          className={styles.input}
          id="detail-parent"
          value={`${catalog.code} — ${catalog.name}`}
          readOnly
        />
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="detail-code">Código</label>
          <input
            className={styles.input}
            id="detail-code"
            value={code}
            maxLength={50}
            required
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="detail-label">Etiqueta</label>
          <input
            className={styles.input}
            id="detail-label"
            value={label}
            maxLength={255}
            required
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="detail-order">Orden</label>
        <input
          className={styles.input}
          id="detail-order"
          type="number"
          step="1"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />{" "}
        Activo
      </label>
    </Modal>
  );
}

function CatalogModal({
  item,
  onClose,
  onSave,
}: {
  item?: CatalogDto;
  onClose: () => void;
  onSave: (
    body: {
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
    },
    id?: string,
  ) => Promise<void>;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [active, setActive] = useState(item?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Código y nombre son obligatorios.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          is_active: active,
        },
        item?.id,
      );
      onClose();
    } catch (reason) {
      setError(
        errorMessage(
          reason,
          "No se pudo guardar el catálogo.",
          "El código de catálogo ya existe.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={item ? "Editar catálogo" : "Nuevo catálogo"}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      error={error}
    >
      <div className={`${styles.formGrid} ${styles.catalogFormGrid}`}>
        <div className={styles.field}>
          <label htmlFor="catalog-code">Código</label>
          <input
            className={styles.input}
            id="catalog-code"
            value={code}
            maxLength={50}
            required
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="catalog-name">Nombre</label>
          <input
            className={styles.input}
            id="catalog-name"
            value={name}
            maxLength={100}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label htmlFor="catalog-description">Descripción</label>
          <textarea
            className={styles.input}
            id="catalog-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />{" "}
        Activo
      </label>
    </Modal>
  );
}

function ParameterModal({
  item,
  onClose,
  onSave,
}: {
  item?: ParameterDto;
  onClose: () => void;
  onSave: (
    body: {
      key: string;
      value: string;
      value_type: ParameterValueType;
      description: string | null;
    },
    id?: string,
  ) => Promise<void>;
}) {
  const [key, setKey] = useState(item?.key ?? "");
  const [value, setValue] = useState(item?.value ?? "");
  const [type, setType] = useState<ParameterValueType>(
    item?.value_type ?? "string",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!key.trim() || !value.trim()) {
      setError("Clave y valor son obligatorios.");
      return;
    }
    if (type === "integer" && !/^-?\d+$/.test(value.trim())) {
      setError("El valor debe ser un entero.");
      return;
    }
    if (
      type === "boolean" &&
      !["true", "false"].includes(value.trim().toLowerCase())
    ) {
      setError("El valor booleano debe ser true o false.");
      return;
    }
    if (type === "json") {
      try {
        JSON.parse(value);
      } catch {
        setError("El valor debe ser JSON válido.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          key: key.trim(),
          value: value.trim(),
          value_type: type,
          description: description.trim() || null,
        },
        item?.id,
      );
      onClose();
    } catch (reason) {
      setError(
        errorMessage(
          reason,
          "No se pudo guardar el parámetro.",
          "La clave del parámetro ya existe.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={item ? "Editar parámetro" : "Nuevo parámetro"}
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
      error={error}
    >
      <div className={styles.field}>
        <label htmlFor="parameter-key">Clave</label>
        <input
          className={styles.input}
          id="parameter-key"
          value={key}
          maxLength={100}
          required
          disabled={Boolean(item)}
          onChange={(event) => setKey(event.target.value)}
        />
      </div>
      <div className={`${styles.formGrid} ${styles.parameterFormGrid}`}>
        <div className={styles.field}>
          <label htmlFor="parameter-value">Valor</label>
          <input
            className={styles.input}
            id="parameter-value"
            value={value}
            required
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="parameter-type">Tipo de valor</label>
          <select
            className={styles.select}
            id="parameter-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as ParameterValueType)
            }
          >
            {VALUE_TYPES.map((valueType) => (
              <option key={valueType} value={valueType}>
                {valueType}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="parameter-description">Descripción</label>
        <textarea
          className={styles.input}
          id="parameter-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function Parameterization({
  baseUrl,
  demoMode = false,
  canViewCatalogs,
  canManageCatalogs,
  canViewParameters,
  canManageParameters,
}: ParameterizationProps) {
  const [tab, setTab] = useState<"catalogs" | "parameters">(
    canViewCatalogs ? "catalogs" : "parameters",
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [parameterSearch, setParameterSearch] = useState("");
  const catalogCodeSearch = isCatalogCode(catalogSearch)
    ? catalogSearch.trim()
    : "";
  const httpCatalogs = useCatalogs(baseUrl, catalogCodeSearch);
  const [selected, setSelected] = useState<CatalogDto>();
  const httpDetails = useCatalogDetails(
    baseUrl,
    selected?.id,
    detailSearch.includes(" ") ? "" : detailSearch,
  );
  const httpParameters = useParameters(
    baseUrl,
    parameterSearch,
    tab === "parameters",
  );
  const demo = useParameterizationDemo(demoMode, catalogSearch, selected?.id, detailSearch, parameterSearch);
  const catalogs = demoMode ? demo.catalogs : httpCatalogs;
  const details = demoMode ? demo.details : httpDetails;
  const parameters = demoMode ? demo.parameters : httpParameters;
  const visibleCatalogs = useMemo(() => {
    const needle = normalizeSearch(catalogSearch);
    if (!needle || catalogCodeSearch) return catalogs.items;
    return catalogs.items.filter(
      (item) =>
        normalizeSearch(item.name).includes(needle) ||
        normalizeSearch(item.code).includes(needle),
    );
  }, [catalogCodeSearch, catalogSearch, catalogs.items]);
  const [detailModal, setDetailModal] = useState<
    CatalogDetailDto | "new" | null
  >(null);
  const [catalogModal, setCatalogModal] = useState<CatalogDto | "new" | null>(
    null,
  );
  const [parameterModal, setParameterModal] = useState<
    ParameterDto | "new" | null
  >(null);
  if (!canViewCatalogs && !canViewParameters)
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          No tienes permisos para consultar esta sección.
        </div>
      </div>
    );
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "catalogs"}
            aria-current={tab === "catalogs" ? "page" : undefined}
            onClick={() => setTab("catalogs")}
            disabled={!canViewCatalogs}
          >
            Catálogos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "parameters"}
            aria-current={tab === "parameters" ? "page" : undefined}
            onClick={() => setTab("parameters")}
            disabled={!canViewParameters}
          >
            Parámetros del sistema
          </button>
        </div>
        {tab === "catalogs" && canViewCatalogs ? (
          <div className={styles.catalogLayout}>
            <aside className={styles.catalogList}>
              <label htmlFor="catalog-search">
                Buscar catálogo
                <input
                  className={styles.input}
                  id="catalog-search"
                  placeholder="Código o nombre"
                  value={catalogSearch}
                  onChange={(event) => {
                    setCatalogSearch(event.target.value);
                    catalogs.setPage(1);
                  }}
                />
              </label>
              {canManageCatalogs && (
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => setCatalogModal("new")}
                >
                  ＋ Nuevo catálogo
                </button>
              )}
              {catalogs.loading && (
                <div className={styles.notice}>Cargando catálogos…</div>
              )}
              {catalogs.error && (
                <div className={styles.error} role="alert">
                  {errorMessage(
                    catalogs.error,
                    "No se pudieron cargar los catálogos.",
                  )}{" "}
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={catalogs.refresh}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!catalogs.loading &&
                !catalogs.error &&
                visibleCatalogs.length === 0 && (
                  <div className={styles.empty}>
                    No hay catálogos para mostrar.
                  </div>
                )}
              {visibleCatalogs.map((item) => (
                <button
                  className={styles.catalogItem}
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelected(item);
                    setDetailSearch("");
                  }}
                >
                  {
                    <>
                      <span className={styles.catalogCode}>{item.code}</span>
                      <span className={styles.catalogName}>{item.name}</span>
                    </>
                  }
                </button>
              ))}
              <Pagination
                pagination={catalogs.pagination}
                page={catalogs.page}
                pageSize={catalogs.pageSize}
                setPage={catalogs.setPage}
                setPageSize={catalogs.setPageSize}
                label="catálogos"
                loading={catalogs.loading}
              />
            </aside>
            <section className={styles.card} aria-label="Detalles del catálogo">
              {selected ? (
                <>
                  <div className={styles.detailHeader}>
                    <div>
                      <h2>{selected.name}</h2>
                      <p className={styles.subtle}>{selected.code}</p>
                    </div>
                    <div className={styles.headerActions}>
                      {canManageCatalogs && (
                        <button
                          className={styles.iconButton}
                          type="button"
                          aria-label={`Editar catálogo ${selected.code}`}
                          title="Editar catálogo"
                          onClick={() => setCatalogModal(selected)}
                        >
                          ✎
                        </button>
                      )}
                      <button
                        className={styles.primary}
                        type="button"
                        disabled={!canManageCatalogs || !selected}
                        onClick={() => setDetailModal("new")}
                      >
                        Agregar valor
                      </button>
                    </div>
                  </div>
                  <label
                    className={styles.field}
                    style={{ margin: "0 1.5rem 1rem" }}
                    htmlFor="detail-search"
                  >
                    Buscar valor
                    <input
                      className={styles.input}
                      id="detail-search"
                      placeholder="Código"
                      value={detailSearch}
                      onChange={(event) => {
                        setDetailSearch(event.target.value);
                        details.setPage(1);
                      }}
                    />
                  </label>
                  {details.error && (
                    <div className={styles.error} role="alert">
                      {errorMessage(
                        details.error,
                        "No se pudieron cargar los detalles.",
                      )}{" "}
                      <button
                        className={styles.secondary}
                        type="button"
                        onClick={details.refresh}
                      >
                        Reintentar
                      </button>
                    </div>
                  )}
                  {details.loading ? (
                    <div className={styles.notice}>Cargando valores…</div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Etiqueta</th>
                            <th>Orden</th>
                            <th>Activo</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.code}</td>
                              <td>{item.label}</td>
                              <td>{item.display_order ?? "—"}</td>
                              <td>
                                <span className={styles.status}>
                                  {item.is_active ? "✓ Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td>
                                {canManageCatalogs && (
                                  <button
                                    className={styles.secondary}
                                    type="button"
                                    onClick={() => setDetailModal(item)}
                                  >
                                    Editar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {details.items.length === 0 && (
                        <div className={styles.empty}>
                          No hay valores para mostrar.
                        </div>
                      )}
                    </div>
                  )}
                  <Pagination
                    pagination={details.pagination}
                    page={details.page}
                    pageSize={details.pageSize}
                    setPage={details.setPage}
                    setPageSize={details.setPageSize}
                    label="valores de catálogo"
                    loading={details.loading}
                  />
                </>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <div>
                      <h2>Detalle del catálogo</h2>
                      <p className={styles.subtle}>Selecciona un catálogo para consultar sus valores.</p>
                    </div>
                    <div className={styles.headerActions}>
                      <button className={styles.primary} type="button" disabled aria-disabled="true">
                        Agregar valor
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>CÓDIGO</th><th>ETIQUETA</th><th>ORDEN</th><th>ACTIVO</th><th>ACCIÓN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className={styles.empty}>Selecciona un catálogo para consultar sus valores.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : (
          <section>
            <div className={styles.sectionHeader}>
              <h2>Parámetros del sistema</h2>
              {canManageParameters && (
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => setParameterModal("new")}
                >
                  Nuevo parámetro
                </button>
              )}
            </div>
            <label
              className={styles.field}
              style={{ margin: "0 1.5rem 1rem" }}
              htmlFor="parameter-search"
            >
              Buscar parámetro
              <input
                className={styles.input}
                id="parameter-search"
                placeholder="Clave"
                value={parameterSearch}
                onChange={(event) => {
                  setParameterSearch(event.target.value);
                  parameters.setPage(1);
                }}
              />
            </label>
            {parameters.loading && (
              <div className={styles.notice}>Cargando parámetros…</div>
            )}
            {parameters.error && (
              <div className={styles.error} role="alert">
                {errorMessage(
                  parameters.error,
                  "No se pudieron cargar los parámetros.",
                )}{" "}
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={parameters.refresh}
                >
                  Reintentar
                </button>
              </div>
            )}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Valor</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.key}</td>
                      <td>{item.value}</td>
                      <td>{item.value_type}</td>
                      <td>{item.description ?? "—"}</td>
                      <td>
                        {canManageParameters && (
                          <button
                            className={styles.secondary}
                            type="button"
                            onClick={() => setParameterModal(item)}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!parameters.loading &&
                !parameters.error &&
                parameters.items.length === 0 && (
                  <div className={styles.empty}>
                    No hay parámetros para mostrar.
                  </div>
                )}
            </div>
            <Pagination
              pagination={parameters.pagination}
              page={parameters.page}
              pageSize={parameters.pageSize}
              setPage={parameters.setPage}
              setPageSize={parameters.setPageSize}
              label="parámetros"
              loading={parameters.loading}
            />
          </section>
        )}
      </div>
      {detailModal && selected && (
        <DetailModal
          catalog={selected}
          item={detailModal === "new" ? undefined : detailModal}
          onClose={() => setDetailModal(null)}
          onSave={(body, id) =>
            id ? details.update(id, body) : details.create(body)
          }
        />
      )}
      {catalogModal && (
        <CatalogModal
          item={catalogModal === "new" ? undefined : catalogModal}
          onClose={() => setCatalogModal(null)}
          onSave={(body, id) =>
            id ? catalogs.update(id, body) : catalogs.create(body)
          }
        />
      )}
      {parameterModal && (
        <ParameterModal
          item={parameterModal === "new" ? undefined : parameterModal}
          onClose={() => setParameterModal(null)}
          onSave={(body, id) =>
            id
              ? parameters.update(id, {
                  value: body.value,
                  value_type: body.value_type,
                  description: body.description,
                })
              : parameters.create(body)
          }
        />
      )}
    </div>
  );
}
