'use client';

import { importTemplateCsv, productStatusLabels } from '@pyp/shared';
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  downloadText,
  errorsCsv,
  existingSkus,
  ImportBatchError,
  ImportFileError,
  type ImportPreview,
  type ImportProgress,
  previewRows,
  readImportFile,
  runImport,
} from '@/lib/admin/importer';
import { PRODUCTS_ROUTES } from '@/lib/admin/products';
import { getSupabase } from '@/lib/supabase/browser';
import type { ImportResult } from '@pyp/shared';
import { Button } from '../ui/button';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { cn } from '../ui/cn';
import { BulkPhotos } from './BulkPhotos';

type Stage =
  | { step: 'file'; error?: string; reading?: boolean }
  | { step: 'review'; fileName: string; preview: ImportPreview }
  | {
      step: 'importing';
      fileName: string;
      preview: ImportPreview;
      progress: ImportProgress;
    }
  | {
      step: 'done';
      fileName: string;
      preview: ImportPreview;
      result: ImportResult;
      /** Set when a batch could not be sent: importing again continues from it. */
      stoppedAt?: number;
    };

const STEPS = ['Archivo', 'Revisar', 'Resultado'] as const;
const PREVIEW_LIMIT = 100;

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex gap-2" aria-label="Pasos">
      {STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'type-caption flex items-center gap-2 font-semibold',
            index === current ? 'text-noche' : 'text-grafito-suave',
          )}
        >
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full border',
              index === current ? 'bg-noche text-blanco border-noche' : 'border-borde-control',
            )}
          >
            {index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone?: 'error' }) {
  return (
    <div className="border-linea flex flex-col rounded-sm border p-3">
      <span className={cn('type-number', tone === 'error' ? 'text-rojo-profundo' : 'text-noche')}>
        {value.toLocaleString('es-MX')}
      </span>
      <span className="type-small text-grafito">{label}</span>
    </div>
  );
}

/**
 * /admin/productos/importar (UI/UX §9, APP-FLOW §8.3): template or file → preview with the
 * errors of each row → import in batches of 50 with progress → result and the errors as CSV.
 * Below, the photos in bulk by SKU.
 */
export function ImportPage() {
  const [stage, setStage] = useState<Stage>({ step: 'file' });
  const inputRef = useRef<HTMLInputElement>(null);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setStage({ step: 'file', reading: true });
    try {
      const table = await readImportFile(file);
      const preview = previewRows(table, await existingSkus(supabase, table));
      setStage({ step: 'review', fileName: file.name, preview });
    } catch (error) {
      setStage({
        step: 'file',
        error:
          error instanceof ImportFileError
            ? error.message
            : 'No pudimos revisar el archivo. Revisa tu conexión e inténtalo de nuevo.',
      });
    }
  }

  async function start(
    fileName: string,
    preview: ImportPreview,
    from = 0,
    previous?: ImportResult,
  ) {
    const supabase = getSupabase();
    if (!supabase) return;
    const rows = preview.valid.map((row) => row.raw);
    const batches = Math.ceil(rows.length / 50);
    setStage({ step: 'importing', fileName, preview, progress: { batch: from + 1, batches } });
    try {
      const result = await runImport(supabase, rows, {
        from,
        previous,
        onProgress: (progress) => setStage({ step: 'importing', fileName, preview, progress }),
      });
      setStage({ step: 'done', fileName, preview, result });
    } catch (error) {
      if (error instanceof ImportBatchError) {
        setStage({
          step: 'done',
          fileName,
          preview,
          result: error.done,
          stoppedAt: error.failedBatch,
        });
      } else throw error;
    }
  }

  const stepIndex = stage.step === 'file' ? 0 : stage.step === 'review' ? 1 : 2;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link
          href={PRODUCTS_ROUTES.list}
          className="type-small text-noche inline-flex items-center gap-1 self-start font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Productos
        </Link>
        <h1 className="type-h2 text-noche">Importar productos</h1>
        <Steps current={stepIndex} />
      </header>

      {stage.step === 'file' && (
        <Card className="gap-4">
          <CardTitle>1 · Elige el archivo</CardTitle>
          <CardDescription>
            Un producto por fila, en CSV o Excel (.xlsx), con las columnas de la plantilla. Las
            listas van separadas por <strong>|</strong> (tallas <code>CH|M|G</code>); escribe{' '}
            <code>unitalla</code> si no tiene tallas y <code>A elegir</code> si el color no es una
            variante. Un SKU que ya existe se actualiza; no se duplica.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => downloadText('plantilla-productos.csv', importTemplateCsv())}
            >
              <Download aria-hidden="true" />
              Descargar plantilla
            </Button>
            <Button
              onClick={() => inputRef.current?.click()}
              loading={stage.reading}
              loadingText="Revisando…"
            >
              <FileSpreadsheet aria-hidden="true" />
              Elegir archivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={choose}
              data-testid="importar-input"
            />
          </div>
          {stage.error && (
            <p
              role="alert"
              className="type-small text-rojo-profundo flex items-start gap-2 font-medium"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {stage.error}
            </p>
          )}
        </Card>
      )}

      {stage.step === 'review' && (
        <ReviewStep
          fileName={stage.fileName}
          preview={stage.preview}
          onImport={() => void start(stage.fileName, stage.preview)}
          onOther={() => setStage({ step: 'file' })}
        />
      )}

      {stage.step === 'importing' && (
        <Card className="gap-3">
          <CardTitle>Importando {stage.fileName}</CardTitle>
          <p role="status" className="type-body text-noche flex items-center gap-2">
            <Spinner />
            Importando lote {stage.progress.batch} de {stage.progress.batches}… No cierres esta
            página.
          </p>
          <progress
            className="accent-noche h-2 w-full"
            max={stage.progress.batches}
            value={stage.progress.batch - 1}
            aria-label="Avance de la importación"
          />
        </Card>
      )}

      {stage.step === 'done' && (
        <ResultStep
          stage={stage}
          onResume={() =>
            void start(stage.fileName, stage.preview, stage.stoppedAt ?? 0, stage.result)
          }
          onOther={() => setStage({ step: 'file' })}
        />
      )}

      <BulkPhotos />
    </div>
  );
}

function ReviewStep({
  fileName,
  preview,
  onImport,
  onOther,
}: {
  fileName: string;
  preview: ImportPreview;
  onImport: () => void;
  onOther: () => void;
}) {
  const { valid, invalid, rows } = preview;
  const updates = valid.filter((row) => row.exists).length;
  return (
    <>
      <Card className="gap-4">
        <CardTitle>2 · Revisa antes de importar</CardTitle>
        <CardDescription>{fileName}</CardDescription>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Count value={rows.length} label="filas" />
          <Count value={valid.length - updates} label="nuevos" />
          <Count value={updates} label="se actualizan" />
          <Count
            value={invalid.length}
            label="con error"
            tone={invalid.length ? 'error' : undefined}
          />
        </div>
        {invalid.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="type-body-strong text-rojo-profundo flex items-start gap-2">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {invalid.length === 1 ? '1 fila tiene' : `${invalid.length} filas tienen`} errores y
              no se importará{invalid.length === 1 ? '' : 'n'}. Corrígelas en el archivo y vuelve a
              subirlo, o continúa solo con las válidas.
            </p>
            <div className="border-linea max-h-80 overflow-auto rounded-sm border">
              <table className="w-full text-left">
                <caption className="sr-only">Filas con error</caption>
                <thead className="bg-gis type-small text-grafito sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Fila
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-linea type-small divide-y">
                  {invalid.map((row) => (
                    <tr key={row.line}>
                      <td className="px-3 py-2 tabular-nums">{row.line}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.sku || '—'}</td>
                      <td className="text-rojo-profundo px-3 py-2">{row.messages.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => downloadText('errores-importacion.csv', errorsCsv(invalid, null))}
            >
              <Download aria-hidden="true" />
              Descargar errores (CSV)
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={valid.length === 0} onClick={onImport}>
            {invalid.length && valid.length
              ? `Importar solo ${valid.length === 1 ? 'la válida' : `las ${valid.length} válidas`}`
              : `Importar ${valid.length === 1 ? '1 producto' : `${valid.length} productos`}`}
          </Button>
          <Button variant="ghost" onClick={onOther}>
            Elegir otro archivo
          </Button>
        </div>
      </Card>

      {valid.length > 0 && (
        <Card className="gap-3">
          <CardTitle>Filas válidas</CardTitle>
          <div className="border-linea max-h-96 overflow-auto rounded-sm border">
            <table className="w-full text-left">
              <caption className="sr-only">Productos que se importarán</caption>
              <thead className="bg-gis type-small text-grafito sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Fila
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Nombre
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">
                    Categoría
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">
                    Variantes
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-linea type-small divide-y">
                {valid.slice(0, PREVIEW_LIMIT).map(({ line, row, exists }) => (
                  <tr key={line}>
                    <td className="px-3 py-2 tabular-nums">{line}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.sku}</td>
                    <td className="px-3 py-2">
                      {row.name}
                      {exists && <span className="text-grafito-suave"> · se actualiza</span>}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">{row.category}</td>
                    <td className="hidden px-3 py-2 tabular-nums sm:table-cell">
                      {row.variantCount}
                    </td>
                    <td className="px-3 py-2">{productStatusLabels[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {valid.length > PREVIEW_LIMIT && (
            <p className="type-small text-grafito">Y {valid.length - PREVIEW_LIMIT} más.</p>
          )}
        </Card>
      )}
    </>
  );
}

function ResultStep({
  stage,
  onResume,
  onOther,
}: {
  stage: Extract<Stage, { step: 'done' }>;
  onResume: () => void;
  onOther: () => void;
}) {
  const { result, preview, stoppedAt } = stage;
  const errorCount = result.errors.length + preview.invalid.length;
  return (
    <Card className="gap-4">
      <CardTitle>3 · Resultado</CardTitle>
      {stoppedAt !== undefined ? (
        <p role="alert" className="type-body-strong text-rojo-profundo flex items-start gap-2">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Se cortó la conexión en el lote {stoppedAt + 1}. Lo anterior ya quedó guardado; continúa
          para importar el resto.
        </p>
      ) : (
        <p role="status" className="type-body-strong text-noche flex items-start gap-2">
          <CircleCheck aria-hidden="true" className="text-exito mt-0.5 size-5 shrink-0" />
          Importación terminada. Los cambios se verán en el sitio cuando publiques desde Inicio.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Count value={result.created} label="creados" />
        <Count value={result.updated} label="actualizados" />
        <Count value={errorCount} label="con error" tone={errorCount ? 'error' : undefined} />
      </div>
      {result.warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="type-small text-noche flex items-center gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="size-4" />
            Avisos
          </p>
          <ul className="type-small text-grafito flex flex-col gap-1">
            {result.warnings.map((warning) => (
              <li key={`${warning.row}-${warning.message}`}>
                Fila {warning.row} ({warning.sku}): {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.errors.length > 0 && (
        <ul className="type-small text-rojo-profundo flex flex-col gap-1">
          {result.errors.map((error) => (
            <li key={`${error.row}-${error.message}`}>
              Fila {error.row} ({error.sku ?? 'sin SKU'}): {error.message}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {stoppedAt !== undefined && (
          <Button onClick={onResume}>
            <RefreshCw aria-hidden="true" />
            Continuar la importación
          </Button>
        )}
        {errorCount > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              downloadText('errores-importacion.csv', errorsCsv(preview.invalid, result))
            }
          >
            <Download aria-hidden="true" />
            Descargar errores (CSV)
          </Button>
        )}
        <Link
          href={PRODUCTS_ROUTES.list}
          className="type-body text-noche inline-flex h-12 items-center px-2 font-semibold underline-offset-4 hover:underline"
        >
          Ver productos
        </Link>
        <Button variant="ghost" onClick={onOther}>
          Importar otro archivo
        </Button>
      </div>
    </Card>
  );
}
