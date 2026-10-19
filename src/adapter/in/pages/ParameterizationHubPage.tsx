import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  AVAILABLE_PARAMETERIZATION_CARDS,
  getVisibleParameterizationCards,
  type ParameterizationIcon,
} from '../../../domain/parameterizationHub.js';
import styles from './ParameterizationHubPage.module.css';

interface ParameterizationHubPageProps {
  permissions: readonly string[];
}

function CardIcon({ name }: { name: ParameterizationIcon }) {
  const paths: Record<ParameterizationIcon, ReactNode> = {
    book: <><path d="M3 3.5h4.25A1.75 1.75 0 0 1 9 5.25V14a2 2 0 0 0-2-2H3z" /><path d="M15 3.5h-4.25A1.75 1.75 0 0 0 9 5.25V14a2 2 0 0 1 2-2h4z" /></>,
    building: <><path d="M3 15V5l6-3 6 3v10" /><path d="M6 7h1m4 0h1M6 10h1m4 0h1M8 15v-2h2v2" /></>,
    clock: <><circle cx="9" cy="9" r="6.5" /><path d="M9 5.5V9l2.5 1.5" /></>,
    folder: <path d="M2.5 5.5h5l1.5 2h6.5v7h-13zM2.5 5.5V4h4l1.5 1.5" />,
    key: <><circle cx="6" cy="8" r="3" /><path d="M8.5 9.5 15 16m-2.5-2.5 1.5-1.5" /></>,
    map: <><path d="m2.5 4 4-2 5 2 4-2v12l-4 2-5-2-4 2z" /><path d="M6.5 2v12m5-10v12" /></>,
    settings: <><circle cx="9" cy="9" r="2.5" /><path d="M9 2v2m0 10v2M2 9h2m10 0h2M4.1 4.1l1.4 1.4m7 7 1.4 1.4m0-9.8-1.4 1.4m-7 7-1.4 1.4" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 18 18">{paths[name]}</svg>;
}

export function ParameterizationHubPage({ permissions }: ParameterizationHubPageProps) {
  const visibleCards = getVisibleParameterizationCards(AVAILABLE_PARAMETERIZATION_CARDS, permissions);

  return (
    <main className={styles.root} data-mfe="reference-data">
      <header className={styles.header}>
        <h1>Parametrización</h1>
        <p>Configure los catálogos y datos maestros que requieren los procesos del sistema.</p>
      </header>

      <section className={styles.notice} aria-label="Información de parametrización">
        <CardIcon name="settings" />
        <p>
          Complete primero los datos maestros requeridos: las fichas necesitan currículo,
          los horarios necesitan jornadas y los ambientes necesitan sus tipos.
        </p>
      </section>

      {visibleCards.length > 0 ? (
        <nav className={styles.grid} aria-label="Pantallas de parametrización disponibles">
          {visibleCards.map((card) => (
            <Link className={styles.card} key={card.id} to={card.route}>
              <span className={styles.icon}><CardIcon name={card.icon} /></span>
              <span className={styles.cardContent}>
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      ) : (
        <section className={styles.emptyState} role="status">
          <h2>No hay pantallas de parametrización disponibles</h2>
          <p>Su usuario no tiene permisos para acceder a estas opciones.</p>
        </section>
      )}
    </main>
  );
}

export default ParameterizationHubPage;
